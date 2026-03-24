import { ReactNode } from 'react';

// Soil Information
export interface SoilData {
  nitrogen: number;   // 0–400 ppm
  phosphorus: number; // 0–150 ppm
  potassium: number;  // 0–300 ppm
  carbon: number;
  pH: number;         // 3.5–9.0
  soilType: string;
  moisture: number;   // numeric (e.g. 0.2 / 0.5 / 0.8) — backend expects a number
}

// Environmental Data — extended with weather fetch metadata
export interface EnvironmentalData {
  rainfall: number | null;      // 0–500 mm (7-day accumulated) or null until known
  temperature: number | null;   // 15–40 °C (7-day mean) or null until known
  humidity: number | null;      // 0–100 % (7-day mean) or null until known
  // weather fetch metadata (optional — only present after a successful API fetch)
  district?: string;              // e.g. "Kandy"
  weatherFetchedAt?: string;      // ISO string timestamp of last successful fetch
  weatherSource?: 'api' | 'manual'; // lets the backend / logging know the data origin
}

// Field / agronomic context
export interface FieldData {
  previousCrop: string;
  irrigationType: string;
  landSize: number;
  region: string;
}

// Complete Form Data (single canonical definition)
export interface FormData {
  soil: SoilData;
  environmental: EnvironmentalData;
  field: FieldData;
}

// Feature Importance for explainability
export interface FeatureImportance {
  feature: string;
  impact: number; // roughly –1 to 1
  explanation: string;
}

// Top-K crop entry returned by backend
export interface TopKCrop {
  label: string;
  modelProb: number;
  prob: number;
  ruleScore: number;
}

// Crop Recommendation — matches backend shape
export interface CropRecommendation {
  label: string;             // primary display name
  /** @deprecated use label */
  crop?: string;
  confidence: number;        // 0–100 (already multiplied in convertApiResponse)
  suitabilityScore?: number;
  modelConfidence?: number;
  expectedYieldMin?: number;
  expectedYieldMax?: number;
  yieldUnit?: string;
  marketPriceTrend?: 'rising' | 'stable' | 'falling';
  growingSeasonStart?: string;
  growingSeasonEnd?: string;
  icon?: string;
  top_k?: TopKCrop[];
}

// Top-K fertilizer entry returned by backend
export interface TopKFertilizer {
  label: string;
  prob: number;
}

// Fertilizer Recommendation — matches backend shape
export interface FertilizerRecommendation {
  label: string;             // display name (e.g. "General Purpose Fertilizer")
  type?: string;
  components: string[];
  applicationSchedule: { week: number; action: string }[];
  baseRatePerAcre?: number;  // kg/acre
  pricePerKg?: number;
  costUnit?: string;
  confidence: number;        // 0–100
  suitabilityScore?: number;
  modelConfidence?: number;
  environmentalImpact?: 'low' | 'medium' | 'moderate' | 'high';
  top_k?: TopKFertilizer[];
  /** @deprecated keep for backwards compatibility */
  quantityPerAcre?: string;
  /** @deprecated keep for backwards compatibility */
  estimatedCost?: number;
}

// Warning object returned by backend
export interface RecommendationWarning {
  type: string;
  message: string;
}

// Complete Recommendation stored in app state
export interface Recommendation {
  id: string;
  timestamp: Date;
  inputData: FormData;
  crop: CropRecommendation;
  fertilizer: FertilizerRecommendation;
  featureImportance: FeatureImportance[];
  alternativeCrops: { crop: string; confidence: number; reason: string }[];
  riskFactors: { factor: string; mitigation: string }[];
  warnings?: RecommendationWarning[];
  remark?: string;
}

// Dashboard Statistics
export interface DashboardStats {
  totalRecommendations: number;
  successRate: number;
  costSaved: number;
  costUnit: string;
}

// Soil types for Sri Lanka
export const SOIL_TYPES = [
  'Loamy',
  'Peaty',
  'Acidic',
  'Neutral',
  'Alkaline',
  'Sandy',
  'Clay',
] as const;

export const MOISTURE_LEVELS = [
  { value: 0.2, label: 'Low (Dry)' },
  { value: 0.5, label: 'Medium (Moist)' },
  { value: 0.8, label: 'High (Wet)' },
] as const;

export const REGIONS = [
  'Western',
  'Central',
  'Southern',
  'Northern',
  'Eastern',
  'North Western',
  'North Central',
  'Uva',
  'Sabaragamuwa',
] as const;

// ─── Sri Lanka district data ──────────────────────────────────────────────────
// 25 administrative districts with province grouping and centroid coordinates.
// Coordinates are the approximate centre of each district, suitable for a
// point-based weather API query (Open-Meteo, OWM, etc.).

export interface SriLankaDistrict {
  name: string;
  province: string;
  lat: number;
  lng: number;
}

export const SRI_LANKA_DISTRICTS: SriLankaDistrict[] = [
  // Western Province
  { name: 'Colombo',       province: 'Western',       lat:  6.927, lng: 79.861 },
  { name: 'Gampaha',       province: 'Western',       lat:  7.091, lng: 80.001 },
  { name: 'Kalutara',      province: 'Western',       lat:  6.585, lng: 80.009 },
  // Central Province
  { name: 'Kandy',         province: 'Central',       lat:  7.291, lng: 80.636 },
  { name: 'Matale',        province: 'Central',       lat:  7.470, lng: 80.623 },
  { name: 'Nuwara Eliya',  province: 'Central',       lat:  6.970, lng: 80.782 },
  // Southern Province
  { name: 'Galle',         province: 'Southern',      lat:  6.053, lng: 80.220 },
  { name: 'Matara',        province: 'Southern',      lat:  5.948, lng: 80.536 },
  { name: 'Hambantota',    province: 'Southern',      lat:  6.124, lng: 81.119 },
  // Northern Province
  { name: 'Jaffna',        province: 'Northern',      lat:  9.668, lng: 80.007 },
  { name: 'Kilinochchi',   province: 'Northern',      lat:  9.380, lng: 80.401 },
  { name: 'Mannar',        province: 'Northern',      lat:  8.976, lng: 79.904 },
  { name: 'Mullaitivu',    province: 'Northern',      lat:  9.267, lng: 80.812 },
  { name: 'Vavuniya',      province: 'Northern',      lat:  8.751, lng: 80.497 },
  // Eastern Province
  { name: 'Ampara',        province: 'Eastern',       lat:  7.297, lng: 81.674 },
  { name: 'Batticaloa',    province: 'Eastern',       lat:  7.717, lng: 81.700 },
  { name: 'Trincomalee',   province: 'Eastern',       lat:  8.589, lng: 81.233 },
  // North Western Province
  { name: 'Kurunegala',    province: 'North Western', lat:  7.487, lng: 80.363 },
  { name: 'Puttalam',      province: 'North Western', lat:  8.031, lng: 79.843 },
  // North Central Province
  { name: 'Anuradhapura',  province: 'North Central', lat:  8.335, lng: 80.411 },
  { name: 'Polonnaruwa',   province: 'North Central', lat:  7.940, lng: 81.000 },
  // Uva Province
  { name: 'Badulla',       province: 'Uva',           lat:  6.993, lng: 81.055 },
  { name: 'Monaragala',    province: 'Uva',           lat:  6.872, lng: 81.350 },
  // Sabaragamuwa Province
  { name: 'Ratnapura',     province: 'Sabaragamuwa',  lat:  6.693, lng: 80.399 },
  { name: 'Kegalle',       province: 'Sabaragamuwa',  lat:  7.251, lng: 80.346 },
] as const;

// Derive province list in display order (preserves insertion order)
export const SRI_LANKA_PROVINCES: string[] = [
  ...new Set(SRI_LANKA_DISTRICTS.map((d) => d.province)),
];