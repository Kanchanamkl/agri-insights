import { useParams, Link, useNavigate } from 'react-router-dom';
import { useApp } from '@/context/AppContext';
import { useState } from 'react';
import type { CSSProperties } from 'react';

const styles: Record<string, CSSProperties> = {
  container: {
    maxWidth: '700px',
    margin: '0 auto',
    padding: '40px 24px',
    fontFamily: 'system-ui, -apple-system, sans-serif',
    lineHeight: 1.5,
    color: '#1a1a1a',
  },
  card: {
    border: '1px solid #e5e5e5',
    borderRadius: '8px',
    padding: '24px',
    backgroundColor: '#ffffff',
    marginBottom: '24px',
  },
  cardHeader: {
    marginBottom: '16px',
  },
  cardTitle: {
    fontSize: '18px',
    fontWeight: 600,
    marginBottom: '4px',
  },
  cardDescription: {
    fontSize: '13px',
    color: '#666',
  },
  button: {
    padding: '8px 16px',
    backgroundColor: '#f5f5f5',
    border: '1px solid #d4d4d4',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: 500,
    fontFamily: 'inherit',
  },
  buttonPrimary: {
    padding: '8px 20px',
    backgroundColor: '#2c5f2d',
    color: '#ffffff',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: 500,
    fontFamily: 'inherit',
  },
  badge: {
    padding: '4px 8px',
    backgroundColor: '#f5f5f5',
    border: '1px solid #e5e5e5',
    borderRadius: '4px',
    fontSize: '11px',
    fontWeight: 500,
  },
  badgeSecondary: {
    padding: '4px 8px',
    backgroundColor: '#f0f0f0',
    borderRadius: '4px',
    fontSize: '11px',
    fontWeight: 500,
  },
  warning: {
    padding: '12px',
    border: '1px solid #fed7aa',
    borderRadius: '6px',
    backgroundColor: '#fffbeb',
    marginBottom: '12px',
  },
  warningTitle: {
    fontSize: '13px',
    fontWeight: 600,
    color: '#92400e',
    marginBottom: '4px',
  },
  warningMessage: {
    fontSize: '12px',
    color: '#b45309',
  },
  remark: {
    padding: '14px 16px',
    border: '1px solid #bfdbfe',
    borderRadius: '8px',
    backgroundColor: '#eff6ff',
    marginBottom: '24px',
    fontSize: '13px',
    color: '#1e40af',
    lineHeight: 1.6,
  },
  remarkIcon: {
    fontSize: '16px',
    marginRight: '8px',
  },
  explanationBox: {
    padding: '12px 14px',
    border: '1px solid #e5e5e5',
    borderRadius: '6px',
    backgroundColor: '#fafafa',
    fontSize: '13px',
    color: '#374151',
    lineHeight: 1.7,
    marginTop: '12px',
    fontStyle: 'italic',
  },
  accordionItem: {
    border: '1px solid #e5e5e5',
    borderRadius: '8px',
    marginBottom: '12px',
    overflow: 'hidden',
  },
  accordionTrigger: {
    width: '100%',
    padding: '16px',
    backgroundColor: '#ffffff',
    border: 'none',
    textAlign: 'left',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: 500,
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontFamily: 'inherit',
  },
  accordionContent: {
    padding: '16px',
    borderTop: '1px solid #e5e5e5',
    backgroundColor: '#fafafa',
  },
  progressBar: {
    height: '8px',
    backgroundColor: '#e5e5e5',
    borderRadius: '4px',
    overflow: 'hidden',
    marginBottom: '8px',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#2c5f2d',
    borderRadius: '4px',
  },
  grid2: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '16px',
  },
  statBox: {
    padding: '12px',
    backgroundColor: '#fafafa',
    borderRadius: '6px',
    border: '1px solid #e5e5e5',
  },
  infoRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '8px 0',
    borderBottom: '1px solid #f0f0f0',
    fontSize: '13px',
  },
  infoLabel: {
    color: '#6b7280',
  },
  infoValue: {
    fontWeight: 500,
    color: '#111827',
  },
};

function FeatureImportanceBar({
  feature,
  impact,
  explanation,
}: {
  feature: string;
  impact: number;
  explanation: string;
}) {
  const isPositive = impact > 0;
  const width = Math.min(Math.abs(impact) * 100, 100);

  return (
    <div style={{ marginBottom: '16px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
        <span style={{ fontSize: '14px', fontWeight: 500 }}>{feature}</span>
        <span style={{ fontSize: '14px', color: isPositive ? '#2c5f2d' : '#d97706' }}>
          {isPositive ? '+' : ''}{impact.toFixed(2)}
        </span>
      </div>
      <div style={styles.progressBar}>
        <div
          style={{
            width: `${width}%`,
            height: '100%',
            backgroundColor: isPositive ? '#2c5f2d' : '#d97706',
            borderRadius: '4px',
          }}
        />
      </div>
      <p style={{ fontSize: '12px', color: '#666', marginTop: '4px' }}>{explanation}</p>
    </div>
  );
}

/** Small confidence bar used inside top-k tables */
function MiniBar({ value, max = 100 }: { value: number; max?: number }) {
  const pct = Math.min((value / max) * 100, 100);
  return (
    <div style={{ ...styles.progressBar, marginBottom: 0, width: '80px', display: 'inline-block', verticalAlign: 'middle' }}>
      <div style={{ ...styles.progressFill, width: `${pct}%` }} />
    </div>
  );
}

export default function Recommendations() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { state } = useApp();
  const [openSections, setOpenSections] = useState<string[]>([]);
  const [expertPlan, setExpertPlan] = useState<string | null>(null);
  const [isPlanLoading, setIsPlanLoading] = useState(false);
  const [planError, setPlanError] = useState<string | null>(null);

  const recommendation = state.recommendations.find((r) => r.id === id);

  const fetchExpertPlan = async () => {
    if (!recommendation || isPlanLoading) return;
    
    console.log("🖱️ [FRONTEND] 'Generate Expert Plan' button clicked.");
    setIsPlanLoading(true);
    setPlanError(null);
    
    try {
      console.log("🌐 [FRONTEND] Sending POST request to /predict/plan...");
      const response = await fetch('http://localhost:5000/predict/plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          crop: recommendation.crop.label,
          fertilizer: recommendation.fertilizer.label,
        })
      });
      
      const data = await response.json();
      console.log("📥 [FRONTEND] Response received from backend:", data);

      if (data.success && data.rag_schedule) {
        console.log("  [FRONTEND] Plan loaded successfully.");
        setExpertPlan(data.rag_schedule);
      } else {
        console.warn("⚠️ [FRONTEND] Backend returned an error:", data.error);
        setPlanError(data.error || 'Failed to fetch expert plan');
      }
    } catch (err) {
      console.error("💥 [FRONTEND] FETCH ERROR:", err);
      setPlanError('Network error. Please try again.');
    } finally {
      setIsPlanLoading(false);
    }
  };

  const toggleSection = (section: string) => {
    setOpenSections(prev =>
      prev.includes(section) ? prev.filter(s => s !== section) : [...prev, section]
    );
  };

  const toPercent = (v: unknown) => {
    const n = typeof v === 'number' ? v : Number(v);
    if (!Number.isFinite(n)) return 0;
    return n <= 1 ? Math.round(n * 100) : Math.round(n);
  };

  if (!recommendation) {
    return (
      <div style={{ textAlign: 'center', padding: '80px 24px' }}>
        <h1 style={{ fontSize: '24px', fontWeight: 600, marginBottom: '12px' }}>Recommendation Not Found</h1>
        <p style={{ color: '#666', marginBottom: '24px' }}>
          This recommendation may have expired or doesn't exist.
        </p>
        <Link to="/input">
          <button style={styles.buttonPrimary}>Get New Recommendation</button>
        </Link>
      </div>
    );
  }

  const { crop, fertilizer, featureImportance, alternativeCrops, riskFactors } = recommendation;
  const warnings = Array.isArray((recommendation as any)?.warnings)
    ? (recommendation as any).warnings
    : [];
  const remark: string = (recommendation as any)?.remark ?? '';
  const ragSchedule: string = (recommendation as any)?.rag_schedule ?? '';

  const cropPercent = toPercent(crop?.confidence);
  const fertPercent = toPercent(fertilizer?.confidence);

  const showCropExtras =
    crop?.expectedYieldMin != null || crop?.expectedYieldMax != null || crop?.marketPriceTrend != null;

  const hasGrowingSeason =
    crop?.growingSeasonStart && crop?.growingSeasonStart !== 'Season-dependent' &&
    crop?.growingSeasonEnd   && crop?.growingSeasonEnd   !== 'Season-dependent';

  const cropExplanation: string   = (crop as any)?.explanation ?? '';
  const fertExplanation: string   = (fertilizer as any)?.explanation ?? '';
  const fertTopK: any[]           = (fertilizer as any)?.top_k ?? [];
  const cropTopK: any[]           = (crop as any)?.top_k ?? [];

  const fertBaseRate: number | undefined = (fertilizer as any)?.baseRatePerAcre;
  const fertPricePerKg: number | undefined = (fertilizer as any)?.pricePerKg;
  const fertCostUnit: string = (fertilizer as any)?.costUnit ?? 'LKR';

  const handleDownload = () => {
    const cropLabel = crop?.label ?? 'Crop';
    const reportData = {
      generatedAt: recommendation.timestamp?.toLocaleString() || new Date().toLocaleString(),
      cropRecommendation: crop,
      fertilizerPlan: fertilizer,
      featureImportance,
      alternativeCrops,
      riskFactors,
      remark,
    };
    const dataStr = JSON.stringify(reportData, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `MICFRS_Recommendation_${cropLabel}_${Date.now()}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '32px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <button
            onClick={() => navigate(-1)}
            style={{ ...styles.button, marginBottom: '8px' }}
          >
            ← Back
          </button>
          <h1 style={{ fontSize: '28px', fontWeight: 600, marginBottom: '4px' }}>Your Recommendation</h1>
          <p style={{ fontSize: '14px', color: '#666' }}>Based on your field conditions</p>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button onClick={handleDownload} style={styles.button}>
            Export
          </button>
        </div>
      </div>

      {/* Warnings */}
      {warnings.length > 0 && (
        <div style={{ marginBottom: '24px' }}>
          {warnings.map((warning: any, i: number) => (
            <div key={i} style={styles.warning}>
              <div style={styles.warningTitle}>
                ⚠ {(warning?.type ?? 'WARNING').replace(/_/g, ' ').toLowerCase()}
              </div>
              <div style={styles.warningMessage}>{String(warning?.message ?? '')}</div>
            </div>
          ))}
        </div>
      )}

      {/* Remark — agronomist note from remark_map */}
      {remark && (
        <div style={styles.remark}>
          <span style={styles.remarkIcon}>📋</span>
          <strong>Agronomist Note: </strong>{remark}
        </div>
      )}

      {/* Main Cards */}
      <div style={styles.grid2}>
        {/* Crop Card */}
        <div style={styles.card}>
          <div style={styles.cardHeader}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
              <span style={{ fontSize: '32px' }}>{crop.icon || '🌱'}</span>
              <div>
                <div style={styles.cardTitle}>{crop?.label ?? 'N/A'}</div>
                <div style={styles.cardDescription}>Recommended Crop</div>
              </div>
            </div>
          </div>
          <div>
            <div style={{ marginBottom: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                <span style={{ fontSize: '13px', color: '#666' }}>Suitability Score</span>
                <span style={{ fontSize: '14px', fontWeight: 600, color: '#2c5f2d' }}>
                  {cropPercent}%
                </span>
              </div>
              <div style={styles.progressBar}>
                <div style={{ ...styles.progressFill, width: `${cropPercent}%` }} />
              </div>
            </div>

            {showCropExtras ? (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div style={styles.statBox}>
                  <div style={{ fontSize: '11px', color: '#666', marginBottom: '4px' }}>Expected Yield</div>
                  <div style={{ fontSize: '14px', fontWeight: 500 }}>
                    {crop?.expectedYieldMin ?? 'N/A'} – {crop?.expectedYieldMax ?? 'N/A'}
                  </div>
                  <div style={{ fontSize: '10px', color: '#666' }}>{crop.yieldUnit}</div>
                </div>
                <div style={styles.statBox}>
                  <div style={{ fontSize: '11px', color: '#666', marginBottom: '4px' }}>Market Trend</div>
                  <div style={{ fontSize: '14px', fontWeight: 500, textTransform: 'capitalize' }}>
                    {crop.marketPriceTrend}
                  </div>
                </div>
              </div>
            ) : (
              <div style={{ ...styles.statBox, fontSize: '12px', color: '#666' }}>
                ℹ️ Agronomic yield and season data are not available for this crop.
              </div>
            )}

            {/* Growing Season */}
            {hasGrowingSeason && (
              <div style={{ ...styles.statBox, marginTop: '12px' }}>
                <div style={{ fontSize: '11px', color: '#666', marginBottom: '6px' }}>🌿 Growing Season</div>
                <div style={styles.infoRow}>
                  <span style={styles.infoLabel}>Start</span>
                  <span style={styles.infoValue}>{crop.growingSeasonStart}</span>
                </div>
                <div style={{ ...styles.infoRow, borderBottom: 'none' }}>
                  <span style={styles.infoLabel}>End</span>
                  <span style={styles.infoValue}>{crop.growingSeasonEnd}</span>
                </div>
              </div>
            )}

            {/* SHAP natural-language explanation */}
            {cropExplanation && (
              <div style={styles.explanationBox}>
                {cropExplanation}
              </div>
            )}
          </div>
        </div>

        {/* Fertilizer Card */}
        <div style={styles.card}>
          <div style={styles.cardHeader}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
              <span style={{ fontSize: '24px' }}>🧪</span>
              <div>
                <div style={styles.cardTitle}>{fertilizer?.label ?? 'N/A'}</div>
                <div style={styles.cardDescription}>Targeted Soil Nutrition</div>
              </div>
            </div>
            <div style={{ ...styles.badgeSecondary, display: 'inline-block', marginTop: '8px' }}>
              {fertilizer.environmentalImpact || 'Standard'} Impact
            </div>
          </div>
          <div>
            <div style={{ marginBottom: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                <span style={{ fontSize: '13px', color: '#666' }}>Fertilizer Match Score</span>
                <span style={{ fontSize: '14px', fontWeight: 600, color: '#2c5f2d' }}>
                  {fertPercent}%
                </span>
              </div>
              <div style={styles.progressBar}>
                <div style={{ ...styles.progressFill, width: `${fertPercent}%` }} />
              </div>
            </div>

            <div style={styles.statBox}>
              <div style={{ fontSize: '11px', color: '#666', marginBottom: '4px' }}>Components</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '10px' }}>
                {Array.isArray(fertilizer?.components) && fertilizer.components.length > 0 ? (
                  fertilizer.components.map((component: string, i: number) => (
                    <span key={i} style={styles.badge}>{component}</span>
                  ))
                ) : (
                  <span style={styles.badgeSecondary}>No component data</span>
                )}
              </div>
            </div>

            {/* Cost & rate details */}
            {/* {(fertBaseRate != null || fertPricePerKg != null) && (
              <div style={{ ...styles.statBox, marginTop: '12px' }}>
                <div style={{ fontSize: '11px', color: '#666', marginBottom: '6px' }}>💰 Application & Cost</div>
                {fertBaseRate != null && (
                  <div style={styles.infoRow}>
                    <span style={styles.infoLabel}>Base rate</span>
                    <span style={styles.infoValue}>{fertBaseRate} kg/acre</span>
                  </div>
                )}
                {fertPricePerKg != null && (
                  <div style={{ ...styles.infoRow, borderBottom: 'none' }}>
                    <span style={styles.infoLabel}>Price / kg</span>
                    <span style={styles.infoValue}>{fertCostUnit} {fertPricePerKg}</span>
                  </div>
                )}
                {fertBaseRate != null && fertPricePerKg != null && (
                  <div style={{
                    marginTop: '8px',
                    padding: '6px 10px',
                    backgroundColor: '#f0fdf4',
                    borderRadius: '4px',
                    fontSize: '12px',
                    color: '#166534',
                    fontWeight: 500,
                  }}>
                    Est. cost / acre: {fertCostUnit} {(fertBaseRate * fertPricePerKg).toLocaleString()}
                  </div>
                )}
              </div>
            )} */}

            {/* SHAP explanation */}
            {fertExplanation && (
              <div style={styles.explanationBox}>
                {fertExplanation}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Feature Importance */}
      {/* <div style={styles.card}>
        <div style={styles.cardHeader}>
          <div style={styles.cardTitle}>Why This Recommendation?</div>
          <div style={styles.cardDescription}>Environmental and soil factors influencing this result</div>
        </div>
        {Array.isArray(featureImportance) && featureImportance.length > 0 ? (
          featureImportance.map((item: any, i: number) => (
            <FeatureImportanceBar
              key={i}
              feature={String(item?.feature ?? '')}
              impact={Number(item?.impact ?? 0)}
              explanation={String(item?.explanation ?? '')}
            />
          ))
        ) : (
          <div style={{ ...styles.statBox, fontSize: '12px', color: '#666' }}>
            ℹ️ No feature-importance data available.
          </div>
        )}
      </div> */}

      {/* Expandable Sections */}

      {/* Alternative Crops */}
      {alternativeCrops && alternativeCrops.length > 0 && (
        <div style={styles.accordionItem}>
          <button onClick={() => toggleSection('alternatives')} style={styles.accordionTrigger}>
            🌿 Alternative Crops
            <span style={{ marginLeft: 'auto' }}>{openSections.includes('alternatives') ? '▼' : '▶'}</span>
          </button>
          {openSections.includes('alternatives') && (
            <div style={styles.accordionContent}>
              {alternativeCrops.map((alt, i) => (
                <div key={i} style={{ ...styles.statBox, marginBottom: '12px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                    <span style={{ fontWeight: 500, textTransform: 'capitalize' }}>{alt.crop}</span>
                    <span style={styles.badgeSecondary}>{alt.confidence}% Match</span>
                  </div>
                  <p style={{ fontSize: '12px', color: '#666', margin: 0 }}>{alt.reason}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}




      {/* Expert Plan Trigger Button */}
      {!expertPlan && (
        <div style={{ ...styles.card, textAlign: 'center', border: '1px dashed #2c5f2d', backgroundColor: '#f0fdf4' }}>
          <h3 style={{ fontSize: '18px', fontWeight: 600, color: '#2c5f2d', marginBottom: '8px' }}>
            Elevate Your Harvest with Expert Guidance
          </h3>
          <p style={{ fontSize: '14px', color: '#166534', marginBottom: '20px' }}>
            Get a precision-tailored Fertilizer and Watering schedule extracted from our 
            certified horticultural knowledge base.
          </p>
          <button 
            onClick={fetchExpertPlan} 
            disabled={isPlanLoading}
            style={{ 
              ...styles.buttonPrimary, 
              padding: '12px 32px', 
              fontSize: '16px',
              opacity: isPlanLoading ? 0.7 : 1,
              transition: 'all 0.2s ease',
              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
            }}
          >
            {isPlanLoading ? '📖 Consulting Knowledge Base...' : '  Generate Expert Cultivation Plan'}
          </button>
          {planError && (
            <p style={{ color: '#dc2626', fontSize: '13px', marginTop: '12px', fontWeight: 500 }}>
              {planError}
            </p>
          )}
        </div>
      )}

      {/* Risk Factors */}
      {riskFactors && riskFactors.length > 0 && (
        <div style={styles.accordionItem}>
          <button onClick={() => toggleSection('risks')} style={styles.accordionTrigger}>
            ⚠️ Risk Factors & Mitigation
            <span style={{ marginLeft: 'auto' }}>{openSections.includes('risks') ? '▼' : '▶'}</span>
          </button>
          {openSections.includes('risks') && (
            <div style={styles.accordionContent}>
              {riskFactors.map((risk, i) => (
                <div key={i} style={{ marginBottom: '12px' }}>
                  <div style={{ fontWeight: 500, fontSize: '13px', marginBottom: '4px' }}>{risk.factor}</div>
                  <p style={{ fontSize: '12px', color: '#2c5f2d', margin: 0 }}>Action: {risk.mitigation}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Expert RAG Schedule */}
      {expertPlan && (
        <div style={{ ...styles.card, border: '2px solid #2c5f2d', boxShadow: '0 4px 12px rgba(44, 95, 45, 0.1)' }}>
          <div style={styles.cardHeader}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
              <span style={{ fontSize: '32px' }}>📋</span>
              <div>
                <div style={{ ...styles.cardTitle, color: '#2c5f2d' }}>Expert Cultivation Plan</div>
                <div style={styles.cardDescription}>AI-Generated from FAISS Knowledge Base · Powered by Gemini</div>
              </div>
            </div>
          </div>
          <div 
            style={{ 
              fontSize: '14px', 
              lineHeight: '1.7', 
              color: '#1f2937',
              padding: '20px',
              backgroundColor: '#ffffff',
              borderRadius: '8px',
              border: '1px solid #e5e5e5',
              overflowX: 'auto',
            }}
            dangerouslySetInnerHTML={{ 
              __html: expertPlan
                // Convert markdown tables to HTML tables
                .replace(/\|(.+)\|\s*\n\|([-| :]{3,})\|\s*\n/g, (match: string, header: string) => {
                  const cols = header.split('|').map((c: string) => c.trim()).filter(Boolean);
                  return '<table style="width:100%;border-collapse:collapse;margin:16px 0;font-size:13px"><thead><tr>' + 
                    cols.map((c: string) => `<th style="border:1px solid #d1d5db;padding:10px 12px;background:#f0fdf4;color:#15803d;font-weight:600;text-align:left">${c}</th>`).join('') + 
                    '</tr></thead><tbody>';
                })
                .replace(/\|(.+)\|/g, (match: string, row: string) => {
                  // Skip if it's just a separator line that didn't match the header regex
                  if (row.trim().match(/^[-| :]+$/)) return '';
                  const cells = row.split('|').map((c: string) => c.trim()).filter(Boolean);
                  if (cells.length === 0) return '';
                  return '<tr>' + cells.map((c: string) => `<td style="border:1px solid #e5e7eb;padding:8px 12px">${c}</td>`).join('') + '</tr>';
                })
                // Close table
                .replace(/<\/tr>\n(?!(?:<tr>|<\/tbody>))/g, '</tr></tbody></table>\n')
                // Headings
                .replace(/### (.*)/g, '<h3 style="font-weight:700;font-size:1.05em;margin:1.2em 0 0.5em;color:#111827">$1</h3>')
                .replace(/## (.*)/g, '<h2 style="font-weight:800;font-size:1.15em;margin:1.5em 0 0.75em;color:#111827;border-bottom:1px solid #e5e5e5;padding-bottom:0.4em">$1</h2>')
                // Bold
                .replace(/\*\*(.*?)\*\*/g, '<strong style="color:#111827">$1</strong>')
                // Bullet points
                .replace(/^- (.*)/gm, '<li style="margin:4px 0;padding-left:4px">$1</li>')
                .replace(/(<li.*<\/li>\n?)+/g, '<ul style="margin:8px 0;padding-left:20px">$&</ul>')
                // Paragraphs
                .split('\n').map((line: string) => {
                  const trimmed = line.trim();
                  if (!trimmed || trimmed.startsWith('<')) return line;
                  return `<p style="margin:4px 0">${trimmed}</p>`;
                }).join('\n')
            }}
          />
          <div style={{ fontSize: '11px', color: '#6b7280', marginTop: '12px', fontStyle: 'italic', textAlign: 'right' }}>
            Source: Agri-Insights FAISS Knowledge Base · RAG Pipeline · Gemini LLM
          </div>
        </div>
      )}

      {/* Fertilization Schedule (Legacy Fallback) */}
      {!expertPlan && fertilizer.applicationSchedule && fertilizer.applicationSchedule.length > 0 && (
        <div style={styles.accordionItem}>
          <button onClick={() => toggleSection('schedule')} style={styles.accordionTrigger}>
            📅 Fertilization Schedule (Legacy)
            <span style={{ marginLeft: 'auto' }}>{openSections.includes('schedule') ? '▼' : '▶'}</span>
          </button>
          {openSections.includes('schedule') && (
            <div style={styles.accordionContent}>
              {fertilizer.applicationSchedule.map((item, i) => (
                <div key={i} style={{ display: 'flex', gap: '12px', marginBottom: '12px' }}>
                  <div style={{
                    minWidth: '48px',
                    fontWeight: 600,
                    fontSize: '12px',
                    color: '#2c5f2d',
                    backgroundColor: '#f0fdf4',
                    borderRadius: '4px',
                    padding: '4px 6px',
                    textAlign: 'center',
                    alignSelf: 'flex-start',
                  }}>
                    Wk {item.week}
                  </div>
                  <div style={{ fontSize: '13px', color: '#374151', paddingTop: '4px' }}>{item.action}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Footer Actions */}
      <div style={{ display: 'flex', justifyContent: 'center', gap: '12px', marginTop: '32px' }}>
        <Link to="/input">
          <button style={styles.button}>New Prediction</button>
        </Link>
        <Link to="/dashboard">
          <button style={styles.buttonPrimary}>Go to Dashboard</button>
        </Link>
      </div>
    </div>
  );
}