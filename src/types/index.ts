// Soil Information
export interface SoilData {
  nitrogen: number; // 0-400 ppm
  phosphorus: number; // 0-150 ppm
  potassium: number; // 0-300 ppm
  pH: number; // 3.5-9.0
  moisture: 'low' | 'medium' | 'high';
}

// Environmental Data
export interface EnvironmentalData {
  rainfall: number; // 0-500 mm
  temperature: number; // 15-40 °C
  humidity: number; // 0-100 %
}

// Complete Form Data
export type FormData = {
  field: any;
  soil: any;
  soilParameters: {
    nitrogen: number;
    phosphorous: number;
    potassium: number;
    ph: number;
    carbon: number;
    moisture: number;
    soil: string;
  };
  environmentalFactors: {
    temperature: number;
    rainfall: number;
    humidity: number;
  };
};

// Feature Importance for explainability
export interface FeatureImportance {
  feature: string;
  impact: number; // -1 to 1
  explanation: string;
}

// Crop Recommendation
export interface CropRecommendation {
  label: string;
  crop: string;
  confidence: number; // 0-100
  expectedYieldMin: number;
  expectedYieldMax: number;
  yieldUnit: string;
  marketPriceTrend: 'rising' | 'stable' | 'falling';
  growingSeasonStart: string;
  growingSeasonEnd: string;
  icon: string;
}

// Fertilizer Recommendation
export interface FertilizerRecommendation {
  label: ReactNode;
  type: string;
  components: string[];
  quantityPerAcre: string;
  applicationSchedule: { week: number; action: string }[];
  confidence: number; // 0-100
  estimatedCost: number;
  costUnit: string;
  environmentalImpact: 'low' | 'medium' |'moderate'| 'high';
}

// Complete Recommendation
export interface Recommendation {
  id: string;
  timestamp: Date;
  inputData: FormData; // This is the key field that was missing!
  crop: CropRecommendation;
  fertilizer: FertilizerRecommendation;
  featureImportance: FeatureImportance[];
  alternativeCrops: { crop: string; confidence: number; reason: string }[];
  riskFactors: { factor: string; mitigation: string }[];
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
  'Loamy Soil',
  'Peaty Soil',
  'Acidic Soil',
  'Neutral Soil',
  'Alkaline Soil',
] as const;

// Optional compatibility only (remove once all imports are cleaned up)
export const MOISTURE_LEVELS = [
  { value: 0.2, label: "Low (Dry)" },
  { value: 0.5, label: "Medium (Moist)" },
  { value: 0.8, label: "High (Wet)" },
] as const;

// Compatibility export (prefer removing imports instead)
export const REGIONS = [
  "Western",
  "Central",
  "Southern",
  "Northern",
  "Eastern",
  "North Western",
  "North Central",
  "Uva",
  "Sabaragamuwa",
] as const;
