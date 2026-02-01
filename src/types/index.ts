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

// Field Context
export interface FieldData {
  previousCrop: string;
  irrigationType: 'rainfed' | 'drip' | 'sprinkler' | 'flood';
  landSize: number; // acres
  region: string;
}

// Complete Form Data
export interface FormData {
  soil: {
    nitrogen: number;
    phosphorus: number;
    potassium: number;
    carbon?: number; // Optional, backend will use default if not provided
    pH: number;
    soilType: string; // REQUIRED - must be present
    moisture: 'low' | 'medium' | 'high';
  };
  environmental: {
    rainfall: number;
    temperature: number;
    humidity: number;
  };
  field: {
    previousCrop: string;
    irrigationType: 'rainfed' | 'drip' | 'sprinkler' | 'flood';
    landSize: number;
    region: string;
  };
}

// Feature Importance for explainability
export interface FeatureImportance {
  feature: string;
  impact: number; // -1 to 1
  explanation: string;
}

// Crop Recommendation
export interface CropRecommendation {
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
  type: string;
  components: string[];
  quantityPerAcre: string;
  applicationSchedule: { week: number; action: string }[];
  estimatedCost: number;
  costUnit: string;
  environmentalImpact: 'low' | 'medium' | 'high';
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

// Region options for Sri Lanka
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

// Previous crops
export const PREVIOUS_CROPS = [
  'Rice',
  'Maize',
  'Wheat',
  'Sugarcane',
  'Cotton',
  'Groundnut',
  'Soybean',
  'Vegetables',
  'Tea',
  'Coconut',
  'Rubber',
  'Pepper',
  'None (Fallow)',
] as const;

// Irrigation types
export const IRRIGATION_TYPES = [
  { value: 'rainfed', label: 'Rainfed (Natural)' },
  { value: 'drip', label: 'Drip Irrigation' },
  { value: 'sprinkler', label: 'Sprinkler System' },
  { value: 'flood', label: 'Flood Irrigation' },
] as const;

// Moisture levels
export const MOISTURE_LEVELS = [
  { value: 'low', label: 'Low (Dry)' },
  { value: 'medium', label: 'Medium (Moist)' },
  { value: 'high', label: 'High (Wet)' },
] as const;

// Soil types for Sri Lanka
export const SOIL_TYPES = [
  'Loamy',
  'Sandy',
  'Clay',
  'Black',
  'Red',
  'Laterite',
  'Alluvial',
] as const;
