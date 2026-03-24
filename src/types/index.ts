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

// Environmental Data
export interface EnvironmentalData {
  rainfall: number;    // 0–500 mm
  temperature: number; // 15–40 °C
  humidity: number;    // 0–100 %
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