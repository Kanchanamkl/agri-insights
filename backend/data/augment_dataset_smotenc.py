"""
augment_dataset_smotenc.py
==========================
Data preprocessing and augmentation pipeline for the MICFRS crop/fertilizer dataset.

What this script does
---------------------
1. Loads the original CSV
2. Validates and cleans data (removes rows violating agricultural bounds)
3. Re-engineers derived features (NPK_Sum, PH_Stress, Rain_Temp_Balance)
4. Analyses class distributions and flags under-represented classes
5. Augments CROP label distribution to a target count per class using SMOTE-NC
   (SMOTE-NC handles the mixed numerical + categorical 'Soil' column natively)
6. Re-balances FERTILIZER label distribution with the same approach
7. Re-computes all derived features on augmented rows
8. Validates the augmented dataset (range checks, no nulls, class counts)
9. Saves the final augmented CSV ready for the training notebook

Usage
-----
    python augment_dataset_smotenc.py \
        --input  enhanced_crop_fertlizer_dataset.csv \
        --output enhanced_crop_fertlizer_dataset-v1.csv\
        --crop_target   300 \
        --fert_min      150 \
        --random_state  42

Dependencies
------------
    pip install pandas numpy scikit-learn imbalanced-learn
"""

import argparse
import sys
import warnings
import json
from pathlib import Path

import numpy as np
import pandas as pd
from imblearn.over_sampling import SMOTENC
from sklearn.preprocessing import LabelEncoder

warnings.filterwarnings("ignore")

# ── Agricultural validity bounds ─────────────────────────────────────────────
BOUNDS = {
    "Temperature":  (0.0,   60.0),
    "Moisture":     (0.0,    1.0),
    "Rainfall":     (0.0, 5000.0),
    "PH":           (3.0,   10.0),
    "Nitrogen":     (0.0,  300.0),
    "Phosphorous":  (0.0,  300.0),
    "Potassium":    (0.0,  300.0),
    "Carbon":       (0.0,   10.0),
    "Humidity":     (0.0,  100.0),
}

RAW_NUMERICAL = [
    "Temperature", "Moisture", "Rainfall", "PH",
    "Nitrogen", "Phosphorous", "Potassium", "Carbon", "Humidity",
]
CATEGORICAL_COL = "Soil"


# ─────────────────────────────────────────────────────────────────────────────
# Step helpers
# ─────────────────────────────────────────────────────────────────────────────

def load_data(path):
    df = pd.read_csv(path)
    print(f"[load]   {len(df):,} rows, {df.shape[1]} columns — {path}")
    return df


def validate_and_clean(df):
    """Remove rows that violate hard agricultural bounds."""
    original_len = len(df)
    mask = pd.Series([True] * len(df), index=df.index)
    for col, (lo, hi) in BOUNDS.items():
        if col in df.columns:
            bad = ~df[col].between(lo, hi)
            if bad.any():
                print(f"  [clean] Dropping {bad.sum()} rows: {col} outside [{lo}, {hi}]")
            mask &= ~bad
    df = df[mask].reset_index(drop=True)
    print(f"[clean]  {original_len - len(df)} invalid rows removed → {len(df):,} remain")
    return df


def engineer_features(df):
    """(Re-)compute derived features from raw columns."""
    df = df.copy()
    df["NPK_Sum"] = df["Nitrogen"] + df["Phosphorous"] + df["Potassium"]
    df["PH_Stress"] = df["PH"].apply(
        lambda ph: 0.0 if 6.5 <= ph <= 7.0 else (6.5 - ph if ph < 6.5 else ph - 7.0)
    )
    df["Rain_Temp_Balance"] = df.apply(
        lambda r: r["Rainfall"] / r["Temperature"] if r["Temperature"] != 0 else 0.0,
        axis=1,
    )
    return df


def print_distribution(series, label):
    counts = series.value_counts().sort_index()
    print(f"\n[dist]  {label} ({series.nunique()} classes):")
    for cls, cnt in counts.items():
        bar = "█" * min(cnt // 10, 35)
        flag = "  ⚠ LOW (<100)" if cnt < 100 else ""
        print(f"  {str(cls):<35} {cnt:>5}  {bar}{flag}")
    print(f"  {'TOTAL':<35} {counts.sum():>5}")


def clip_to_bounds(df):
    """Clip synthetic numerical values back to valid agricultural ranges."""
    df = df.copy()
    for col, (lo, hi) in BOUNDS.items():
        if col in df.columns:
            clipped = df[col].clip(lo, hi)
            n_clipped = (df[col] != clipped).sum()
            if n_clipped:
                print(f"  [clip]  {n_clipped} synthetic {col} values clipped to [{lo}, {hi}]")
            df[col] = clipped
    return df


# ─────────────────────────────────────────────────────────────────────────────
# Core augmentation using SMOTE-NC
# ─────────────────────────────────────────────────────────────────────────────

def smotenc_augment(df, target_col, target_count, random_state=42):
    """
    Oversample minority classes in `target_col` to reach `target_count`
    samples each, using SMOTE-NC (handles the categorical Soil column).

    Only classes below `target_count` are synthesised.
    Classes already at or above the target are untouched.

    Returns the full augmented DataFrame (original + synthetic rows).
    """
    work_cols = RAW_NUMERICAL + [CATEGORICAL_COL]
    X = df[work_cols].copy()
    y = df[target_col].copy()

    # SMOTE-NC needs the categorical feature encoded as an integer
    le_soil = LabelEncoder()
    X[CATEGORICAL_COL] = le_soil.fit_transform(X[CATEGORICAL_COL])

    # Encode target labels to integers
    le_target = LabelEncoder()
    y_enc = le_target.fit_transform(y)

    counts = pd.Series(y_enc).value_counts()

    # Only oversample classes that are below the target count
    sampling_strategy = {
        cls_int: target_count
        for cls_int, cnt in counts.items()
        if cnt < target_count
    }

    if not sampling_strategy:
        print(f"  [smotenc] All {target_col} classes already >= {target_count} — skipped")
        return df.copy()

    classes_to_aug = [le_target.classes_[i] for i in sampling_strategy]
    print(f"  [smotenc] Oversampling {len(classes_to_aug)} {target_col} classes → {target_count}:")
    for cls in sorted(classes_to_aug):
        orig = counts[le_target.transform([cls])[0]]
        print(f"    {str(cls):<35} {orig:>5} → {target_count}  (+{target_count - orig})")

    # k_neighbors must be < smallest minority class size
    min_class_size = min(counts.values)
    k = max(1, min(5, min_class_size - 1))

    cat_idx = work_cols.index(CATEGORICAL_COL)

    smote = SMOTENC(
        categorical_features=[cat_idx],
        sampling_strategy=sampling_strategy,
        random_state=random_state,
        k_neighbors=k,
    )

    X_res, y_res = smote.fit_resample(X.values, y_enc)

    # Rebuild DataFrame from resampled arrays
    X_res_df = pd.DataFrame(X_res, columns=work_cols)

    # Decode Soil back to original string categories
    soil_ints = X_res_df[CATEGORICAL_COL].round().astype(int).clip(
        0, len(le_soil.classes_) - 1
    )
    X_res_df[CATEGORICAL_COL] = le_soil.inverse_transform(soil_ints)

    # Ensure numerical columns are float
    for col in RAW_NUMERICAL:
        X_res_df[col] = X_res_df[col].astype(float)

    # Decode target labels back to strings
    y_res_labels = le_target.inverse_transform(y_res)

    aug_df = X_res_df.copy()
    aug_df[target_col] = y_res_labels

    # Carry over the OTHER target column ─────────────────────────────────────
    # Original rows (index < len(df)) keep their actual value.
    # Synthetic rows get the most common value for their class in the original data.
    other_target = "Fertilizer" if target_col == "Crop" else "Crop"
    if other_target in df.columns:
        class_mode_map = (
            df.groupby(target_col)[other_target]
            .agg(lambda x: x.mode().iloc[0])
            .to_dict()
        )
        n_orig = len(df)
        other_vals_orig = df[other_target].values
        other_vals_synth = aug_df[target_col].map(class_mode_map)
        aug_df[other_target] = np.where(
            np.arange(len(aug_df)) < n_orig,
            np.concatenate([other_vals_orig,
                            np.full(len(aug_df) - n_orig, np.nan, dtype=object)]),
            other_vals_synth,
        )
        # Fill any NaN that slipped through (shouldn't happen, but safe)
        aug_df[other_target].fillna(other_vals_synth, inplace=True)

    # Carry Remark from Fertilizer label
    if "Remark" in df.columns:
        remark_map_local = df.groupby("Fertilizer")["Remark"].first().to_dict()
        fert_col = "Fertilizer" if "Fertilizer" in aug_df.columns else target_col
        aug_df["Remark"] = aug_df[fert_col].map(remark_map_local).fillna("")

    return aug_df


# ─────────────────────────────────────────────────────────────────────────────
# Post-augmentation validation
# ─────────────────────────────────────────────────────────────────────────────

def validate_augmented(df):
    print("\n[validate] Post-augmentation checks ...")
    ok = True

    nulls = df.isnull().sum()
    if nulls.any():
        print(f"  ⚠  Null values:\n{nulls[nulls > 0]}")
        ok = False
    else:
        print("  ✓  No null values")

    for col, (lo, hi) in BOUNDS.items():
        if col in df.columns:
            out = ~df[col].between(lo, hi)
            if out.any():
                print(f"  ⚠  {out.sum()} rows: {col} outside [{lo}, {hi}]")
                ok = False

    if ok:
        print("  ✓  All numerical columns within valid bounds")

    for col in ["Crop", "Fertilizer"]:
        if col in df.columns:
            vc = df[col].value_counts()
            print(f"  ✓  {col}: {df[col].nunique()} classes, "
                  f"min={vc.min()}, max={vc.max()}, total={vc.sum()}")

    return ok


# ─────────────────────────────────────────────────────────────────────────────
# Entry point
# ─────────────────────────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(
        description="SMOTE-NC augmentation pipeline for the MICFRS dataset"
    )
    parser.add_argument("--input",        required=True,  help="Input CSV path")
    parser.add_argument("--output",       required=True,  help="Output CSV path")
    parser.add_argument("--crop_target",  type=int, default=300,
                        help="Target samples per crop class (default: 300)")
    parser.add_argument("--fert_min",     type=int, default=150,
                        help="Minimum samples per fertilizer class (default: 150)")
    parser.add_argument("--random_state", type=int, default=42,
                        help="Random seed (default: 42)")
    parser.add_argument("--stats_json",   default=None,
                        help="Optional JSON path for augmentation statistics")
    args = parser.parse_args()

    print("=" * 65)
    print("  MICFRS Dataset Augmentation Pipeline  (SMOTE-NC)")
    print("=" * 65)
    print(f"  Input          : {args.input}")
    print(f"  Output         : {args.output}")
    print(f"  Crop target    : {args.crop_target} samples/class")
    print(f"  Fert minimum   : {args.fert_min} samples/class")
    print(f"  Random state   : {args.random_state}")
    print()

    # 1. Load
    df = load_data(args.input)

    # 2. Clean
    df = validate_and_clean(df)

    # 3. Engineer features
    df = engineer_features(df)

    # 4. Show pre-augmentation distributions
    print_distribution(df["Crop"],       "Crop  (before augmentation)")
    print_distribution(df["Fertilizer"], "Fertilizer  (before augmentation)")

    n_before = len(df)

    # 5. Augment CROP
    print(f"\n{'─'*65}")
    print(f"[step 5] Crop augmentation → {args.crop_target} samples/class")
    print(f"{'─'*65}")
    df_aug = smotenc_augment(df, "Crop", args.crop_target, args.random_state)
    df_aug = clip_to_bounds(df_aug)

    # 6. Augment FERTILIZER on the already-augmented frame
    print(f"\n{'─'*65}")
    print(f"[step 6] Fertilizer augmentation → {args.fert_min} samples/class")
    print(f"{'─'*65}")
    df_aug = smotenc_augment(df_aug, "Fertilizer", args.fert_min, args.random_state)
    df_aug = clip_to_bounds(df_aug)

    # 7. Re-engineer derived features (synthetic rows need fresh calculations)
    print("\n[step 7] Re-engineering derived features on augmented data ...")
    df_aug = engineer_features(df_aug)

    # 8. Post distributions
    print_distribution(df_aug["Crop"],       "Crop  (after augmentation)")
    print_distribution(df_aug["Fertilizer"], "Fertilizer  (after augmentation)")

    n_after = len(df_aug)
    print(f"\n[summary] {n_before:,} → {n_after:,} rows  (+{n_after - n_before:,} synthetic, "
          f"{100*(n_after-n_before)/n_before:.1f}% increase)")

    # 9. Validate
    ok = validate_augmented(df_aug)
    if not ok:
        print("\n⚠  Validation warnings above — review before training.")

    # 10. Save output CSV in a consistent column order
    Path(args.output).parent.mkdir(parents=True, exist_ok=True)
    col_order = (
        RAW_NUMERICAL
        + [CATEGORICAL_COL, "NPK_Sum", "PH_Stress", "Rain_Temp_Balance"]
        + ["Crop", "Fertilizer"]
        + (["Remark"] if "Remark" in df_aug.columns else [])
    )
    col_order = [c for c in col_order if c in df_aug.columns]
    df_aug = df_aug[col_order]
    df_aug.to_csv(args.output, index=False)
    print(f"\n✓  Augmented dataset → {args.output}  {df_aug.shape}")

    # 11. Optional statistics JSON
    if args.stats_json:
        stats = {
            "input_rows":  n_before,
            "output_rows": n_after,
            "synthetic_rows": n_after - n_before,
            "crop_target_per_class": args.crop_target,
            "fert_min_per_class": args.fert_min,
            "crop_distribution_after":  df_aug["Crop"].value_counts().sort_index().to_dict(),
            "fert_distribution_after":  df_aug["Fertilizer"].value_counts().sort_index().to_dict(),
        }
        with open(args.stats_json, "w") as f:
            json.dump(stats, f, indent=2)
        print(f"✓  Statistics → {args.stats_json}")

    print("\nNext step: update DATA_PATH in the training notebook to point")
    print(f"  to '{args.output}' and re-run all cells.")
    print("=" * 65)


if __name__ == "__main__":
    main()
