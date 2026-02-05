import { FormData, Recommendation, CropRecommendation, FertilizerRecommendation, FeatureImportance } from '@/types';
import { getPrediction, PredictionResponse } from './api';

// Generate unique ID
function generateId(): string {
  return `rec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// Crop database with conditions
const cropDatabase = [
  {
    name: 'Rice',
    icon: '🌾',
    idealConditions: { pHMin: 5.5, pHMax: 7.0, nMin: 80, tempMin: 22, tempMax: 35, rainfallMin: 150 },
    yieldRange: [3.5, 5.5],
    yieldUnit: 'tons/ha',
    season: { start: 'October', end: 'February' },
  },
  {
    name: 'Tea',
    icon: '🍵',
    idealConditions: { pHMin: 4.5, pHMax: 5.5, nMin: 60, tempMin: 15, tempMax: 25, rainfallMin: 200 },
    yieldRange: [1.5, 2.5],
    yieldUnit: 'tons/ha',
    season: { start: 'March', end: 'November' },
  },
  {
    name: 'Maize',
    icon: '🌽',
    idealConditions: { pHMin: 5.8, pHMax: 7.0, nMin: 100, tempMin: 20, tempMax: 32, rainfallMin: 100 },
    yieldRange: [4, 7],
    yieldUnit: 'tons/ha',
    season: { start: 'April', end: 'August' },
  },
  {
    name: 'Coconut',
    icon: '🥥',
    idealConditions: { pHMin: 5.0, pHMax: 8.0, nMin: 40, tempMin: 25, tempMax: 35, rainfallMin: 120 },
    yieldRange: [8000, 12000],
    yieldUnit: 'nuts/ha',
    season: { start: 'Year-round', end: '' },
  },
  {
    name: 'Vegetables',
    icon: '🥬',
    idealConditions: { pHMin: 6.0, pHMax: 7.5, nMin: 120, tempMin: 18, tempMax: 28, rainfallMin: 80 },
    yieldRange: [15, 25],
    yieldUnit: 'tons/ha',
    season: { start: 'Any', end: 'season' },
  },
  {
    name: 'Sugarcane',
    icon: '🎋',
    idealConditions: { pHMin: 5.0, pHMax: 8.0, nMin: 80, tempMin: 25, tempMax: 38, rainfallMin: 100 },
    yieldRange: [60, 100],
    yieldUnit: 'tons/ha',
    season: { start: 'December', end: 'November' },
  },
  {
    name: 'Pepper',
    icon: '🌶️',
    idealConditions: { pHMin: 5.5, pHMax: 7.0, nMin: 60, tempMin: 20, tempMax: 30, rainfallMin: 150 },
    yieldRange: [2, 4],
    yieldUnit: 'tons/ha',
    season: { start: 'May', end: 'January' },
  },
];

// Calculate crop suitability score
function calculateCropScore(crop: typeof cropDatabase[0], data: FormData): number {
  const { soil, environmental } = data;
  let score = 100;

  // pH scoring
  if (soil.pH < crop.idealConditions.pHMin) {
    score -= (crop.idealConditions.pHMin - soil.pH) * 15;
  } else if (soil.pH > crop.idealConditions.pHMax) {
    score -= (soil.pH - crop.idealConditions.pHMax) * 15;
  }

  // Nitrogen scoring
  if (soil.nitrogen < crop.idealConditions.nMin) {
    score -= (crop.idealConditions.nMin - soil.nitrogen) * 0.2;
  }

  // Temperature scoring
  if (environmental.temperature < crop.idealConditions.tempMin) {
    score -= (crop.idealConditions.tempMin - environmental.temperature) * 5;
  } else if (environmental.temperature > crop.idealConditions.tempMax) {
    score -= (environmental.temperature - crop.idealConditions.tempMax) * 5;
  }

  // Rainfall scoring
  if (environmental.rainfall < crop.idealConditions.rainfallMin) {
    score -= (crop.idealConditions.rainfallMin - environmental.rainfall) * 0.1;
  }

  return Math.max(0, Math.min(100, score));
}

// Generate fertilizer recommendation
function generateFertilizerRecommendation(data: FormData, crop: string): FertilizerRecommendation {
  const { soil } = data;
  const components: string[] = [];
  let costEstimate = 0;

  // Nitrogen deficiency
  if (soil.nitrogen < 100) {
    components.push('Urea');
    costEstimate += 2500;
  }

  // Phosphorus deficiency
  if (soil.phosphorus < 40) {
    components.push('TSP (Triple Super Phosphate)');
    costEstimate += 3000;
  } else if (soil.phosphorus < 70) {
    components.push('SSP (Single Super Phosphate)');
    costEstimate += 1800;
  }

  // Potassium deficiency
  if (soil.potassium < 80) {
    components.push('MOP (Muriate of Potash)');
    costEstimate += 3500;
  }

  // pH adjustment
  if (soil.pH < 5.5) {
    components.push('Agricultural Lime');
    costEstimate += 1500;
  } else if (soil.pH > 7.5) {
    components.push('Gypsum');
    costEstimate += 1200;
  }

  if (components.length === 0) {
    components.push('Balanced NPK (15-15-15)');
    costEstimate = 2800;
  }

  const schedule = [
    { week: 1, action: 'Apply basal fertilizer (50% of total)' },
    { week: 4, action: 'First top dressing (25%)' },
    { week: 8, action: 'Second top dressing (25%)' },
  ];

  return {
    type: components.join(' + '),
    components,
    quantityPerAcre: `${Math.round(50 + (150 - soil.nitrogen) * 0.5)} kg Urea, ${Math.round(25 + (50 - soil.phosphorus) * 0.3)} kg Phosphate, ${Math.round(30 + (100 - soil.potassium) * 0.3)} kg Potash`,
    applicationSchedule: schedule,
    estimatedCost: costEstimate,
    costUnit: 'LKR/acre',
    environmentalImpact: soil.nitrogen > 200 || soil.phosphorus > 100 ? 'high' : soil.nitrogen > 100 ? 'medium' : 'low',
  };
}

// Generate feature importance (SHAP-style explanation)
function generateFeatureImportance(data: FormData): FeatureImportance[] {
  const { soil, environmental } = data;
  const features: FeatureImportance[] = [];

  // Nitrogen impact
  if (soil.nitrogen < 80) {
    features.push({
      feature: 'Nitrogen (N)',
      impact: -0.35,
      explanation: `Low Nitrogen (${soil.nitrogen} ppm) → Additional urea fertilizer recommended`,
    });
  } else if (soil.nitrogen > 150) {
    features.push({
      feature: 'Nitrogen (N)',
      impact: 0.25,
      explanation: `Adequate Nitrogen (${soil.nitrogen} ppm) → Good for leafy crops`,
    });
  }

  // Potassium impact
  if (soil.potassium < 100) {
    features.push({
      feature: 'Potassium (K)',
      impact: -0.28,
      explanation: `Low Potassium (${soil.potassium} ppm) → MOP fertilizer needed for fruit quality`,
    });
  }

  // pH impact
  if (soil.pH >= 5.5 && soil.pH <= 7.0) {
    features.push({
      feature: 'Soil pH',
      impact: 0.32,
      explanation: `Optimal pH (${soil.pH}) → Excellent nutrient availability`,
    });
  } else {
    features.push({
      feature: 'Soil pH',
      impact: -0.25,
      explanation: `Suboptimal pH (${soil.pH}) → May need lime/gypsum amendment`,
    });
  }

  // Rainfall impact
  if (environmental.rainfall > 150) {
    features.push({
      feature: 'Rainfall',
      impact: 0.22,
      explanation: `Good rainfall (${environmental.rainfall}mm) → Suitable for water-loving crops`,
    });
  } else {
    features.push({
      feature: 'Rainfall',
      impact: -0.18,
      explanation: `Low rainfall (${environmental.rainfall}mm) → Irrigation recommended`,
    });
  }

  // Temperature impact
  features.push({
    feature: 'Temperature',
    impact: environmental.temperature >= 22 && environmental.temperature <= 30 ? 0.15 : -0.12,
    explanation: `Temperature (${environmental.temperature}°C) → ${environmental.temperature >= 22 && environmental.temperature <= 30 ? 'Ideal for most crops' : 'May limit crop options'}`,
  });

  return features.sort((a, b) => Math.abs(b.impact) - Math.abs(a.impact)).slice(0, 5);
}

// Main recommendation generator
export async function generateRecommendation(
  formData: FormData
): Promise<Recommendation> {
  try {
    console.log('Calling backend with formData:', formData);
    const apiResponse = await getPrediction(formData);
    console.log('Backend response:', apiResponse);
    
    const recommendation = convertApiResponseToRecommendation(formData, apiResponse);
    console.log('Converted recommendation:', recommendation);
    
    return recommendation;
  } catch (error) {
    console.error('Failed to get prediction from backend:', error);
    // Fallback to mock data if backend is unavailable
    console.warn('Using fallback mock recommendation');
    // return generateMockRecommendation(formData);
  }
}

/**
 * Convert API response to Recommendation format
 * Now ALL data comes from backend!
 */
export function convertApiResponseToRecommendation(
  formData: FormData,
  apiResponse: any // Extended response type
): Recommendation {
  const id = `rec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  return {
    id,
    timestamp: new Date(apiResponse.meta.timestamp),
    inputData: formData,
    crop: {
      crop: apiResponse.crop.label,
      confidence: Math.round(apiResponse.crop.confidence * 100),
      expectedYieldMin: apiResponse.crop.expectedYieldMin,
      expectedYieldMax: apiResponse.crop.expectedYieldMax,
      yieldUnit: apiResponse.crop.yieldUnit,
      marketPriceTrend: apiResponse.crop.marketPriceTrend,
      growingSeasonStart: apiResponse.crop.growingSeasonStart,
      growingSeasonEnd: apiResponse.crop.growingSeasonEnd,
      icon: apiResponse.crop.icon,
    },
    fertilizer: {
      type: apiResponse.fertilizer.type,
      components: apiResponse.fertilizer.components,
      quantityPerAcre: apiResponse.fertilizer.quantityPerAcre,
      applicationSchedule: apiResponse.fertilizer.applicationSchedule,
      estimatedCost: apiResponse.fertilizer.estimatedCost,
      costUnit: apiResponse.fertilizer.costUnit,
      environmentalImpact: apiResponse.fertilizer.environmentalImpact,
    },
    featureImportance: apiResponse.featureImportance,
    alternativeCrops: apiResponse.alternativeCrops,
    riskFactors: apiResponse.riskFactors,
  };
}

/**
 * Extract fertilizer components
 */
function extractComponents(fertilizerName: string): string[] {
  const componentMap: Record<string, string[]> = {
    'Urea': ['Nitrogen (46%)'],
    'DAP': ['Nitrogen (18%)', 'Phosphorus (46%)'],
    'NPK': ['Nitrogen (20%)', 'Phosphorus (20%)', 'Potassium (20%)'],
    'General Purpose Fertilizer': ['Nitrogen', 'Phosphorus', 'Potassium', 'Micronutrients'],
    'TSP': ['Phosphorus (46%)'],
    'MOP': ['Potassium (60%)'],
  };
  
  return componentMap[fertilizerName] || ['Balanced nutrients'];
}

/**
 * Calculate quantity per acre
 */
function calculateQuantityPerAcre(fertilizerName: string, landSize: number): string {
  const baseRates: Record<string, number> = {
    'Urea': 50,
    'DAP': 100,
    'NPK': 150,
    'General Purpose Fertilizer': 120,
    'TSP': 75,
    'MOP': 60,
  };
  
  const baseRate = baseRates[fertilizerName] || 100;
  const totalAmount = baseRate * landSize;
  
  return `${totalAmount.toFixed(0)} kg total (${baseRate} kg/acre)`;
}

/**
 * Generate application schedule
 */
function generateSchedule(fertilizerName: string): Array<{ week: number; action: string }> {
  return [
    { week: 1, action: `Apply base dose of ${fertilizerName}` },
    { week: 4, action: 'First top dressing application' },
    { week: 8, action: 'Second top dressing application' },
    { week: 12, action: 'Final application if needed' },
  ];
}

/**
 * Calculate estimated cost
 */
function calculateCost(fertilizerName: string, landSize: number): number {
  const pricePerKg: Record<string, number> = {
    'Urea': 80,
    'DAP': 120,
    'NPK': 150,
    'General Purpose Fertilizer': 100,
    'TSP': 110,
    'MOP': 90,
  };
  
  const baseRates: Record<string, number> = {
    'Urea': 50,
    'DAP': 100,
    'NPK': 150,
    'General Purpose Fertilizer': 120,
    'TSP': 75,
    'MOP': 60,
  };
  
  const price = pricePerKg[fertilizerName] || 100;
  const rate = baseRates[fertilizerName] || 100;
  
  return Math.round(price * rate * landSize);
}

/**
 * Generate feature importance
 */
// function -generateFeatureImportance(formData: FormData): Array<{ feature: string; impact: number; explanation: string }> {
//   return [
//     {
//       feature: 'Soil pH',
//       impact: 0.85,
//       explanation: `pH of ${formData.soil.pH} is optimal for most crops`,
//     },
//     {
//       feature: 'Nitrogen',
//       impact: 0.72,
//       explanation: `Nitrogen level of ${formData.soil.nitrogen} ppm supports good growth`,
//     },
//     {
//       feature: 'Temperature',
//       impact: 0.68,
//       explanation: `${formData.environmental.temperature}°C is within ideal range`,
//     },
//     {
//       feature: 'Rainfall',
//       impact: 0.55,
//       explanation: `${formData.environmental.rainfall}mm provides adequate water`,
//     },
//   ];
// }

/**
 * Generate risk factors
 */
function generateRiskFactors(formData: FormData): Array<{ factor: string; mitigation: string }> {
  const risks: Array<{ factor: string; mitigation: string }> = [];
  
  if (formData.soil.pH < 5.5) {
    risks.push({
      factor: 'Acidic soil (pH < 5.5)',
      mitigation: 'Apply lime to raise pH to 6.0-6.5',
    });
  }
  
  if (formData.environmental.humidity > 80) {
    risks.push({
      factor: 'High humidity may increase disease risk',
      mitigation: 'Ensure good air circulation and apply preventive fungicides',
    });
  }
  
  if (formData.soil.nitrogen < 50) {
    risks.push({
      factor: 'Low nitrogen levels',
      mitigation: 'Increase nitrogen fertilizer application',
    });
  }
  
  if (risks.length === 0) {
    risks.push({
      factor: 'No major risks detected',
      mitigation: 'Continue with regular monitoring and maintenance',
    });
  }
  
  return risks;
}

/**
 * Fallback: Generate mock recommendation (for development/offline mode)
 */
function generateMockRecommendation(formData: FormData): Recommendation {
  const id = `rec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  return {
    id,
    timestamp: new Date(),
    inputData: formData,
    crop: {
      crop: 'Rice',
      confidence: 92,
      expectedYieldMin: 2000,
      expectedYieldMax: 3000,
      yieldUnit: 'kg/acre',
      marketPriceTrend: 'stable',
      growingSeasonStart: 'March',
      growingSeasonEnd: 'July',
      icon: '🌾',
    },
    fertilizer: {
      type: 'Urea',
      components: ['Nitrogen (46%)'],
      quantityPerAcre: `${(50 * formData.field.landSize).toFixed(0)} kg total (50 kg/acre)`,
      applicationSchedule: [
        { week: 1, action: 'Apply base dose of Urea' },
        { week: 4, action: 'First top dressing application' },
        { week: 8, action: 'Second top dressing application' },
      ],
      estimatedCost: 4000,
      costUnit: 'LKR',
      environmentalImpact: 'low',
    },
    featureImportance: generateFeatureImportance(formData),
    alternativeCrops: [
      { crop: 'Maize', confidence: 78, reason: 'Good alternative for this soil type' },
      { crop: 'Wheat', confidence: 65, reason: 'Suitable for current climate' },
    ],
    riskFactors: generateRiskFactors(formData),
  };
}

// Demo recommendations with pre-configured data
export const demoRecommendations: Array<Recommendation & { name: string }> = [
  {
    id: 'demo_1',
    name: 'Rice Paddy - Wet Zone',
    timestamp: new Date('2024-01-15'),
    inputData: {
      soil: {
        nitrogen: 100,
        phosphorus: 50,
        potassium: 100,
        carbon: 30,
        pH: 6.5,
        soilType: 'Loamy',
        moisture: 'high',
      },
      environmental: {
        rainfall: 250,
        temperature: 28,
        humidity: 85,
      },
      field: {
        region: 'Western',
        landSize: 2,
        irrigationType: 'flood',
        previousCrop: 'Rice',
      },
    },
    crop: {
      crop: 'Rice',
      confidence: 95,
      expectedYieldMin: 2500,
      expectedYieldMax: 3500,
      yieldUnit: 'kg/acre',
      marketPriceTrend: 'stable',
      growingSeasonStart: 'March',
      growingSeasonEnd: 'July',
      icon: '🌾',
    },
    fertilizer: {
      type: 'Urea',
      components: ['Nitrogen (46%)'],
      quantityPerAcre: '100 kg total (50 kg/acre)',
      applicationSchedule: [
        { week: 1, action: 'Apply base dose' },
        { week: 4, action: 'First top dressing' },
        { week: 8, action: 'Second top dressing' },
      ],
      estimatedCost: 8000,
      costUnit: 'LKR',
      environmentalImpact: 'low',
    },
    featureImportance: [
      { feature: 'Soil pH', impact: 0.9, explanation: 'Optimal pH for rice' },
      { feature: 'Moisture', impact: 0.85, explanation: 'High moisture suits paddy' },
      { feature: 'Temperature', impact: 0.75, explanation: 'Ideal temperature range' },
    ],
    alternativeCrops: [
      { crop: 'Maize', confidence: 75, reason: 'Good rotation option' },
    ],
    riskFactors: [
      { factor: 'High humidity', mitigation: 'Monitor for fungal diseases' },
    ],
  },
];
