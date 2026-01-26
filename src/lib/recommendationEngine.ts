import { FormData, Recommendation, CropRecommendation, FertilizerRecommendation, FeatureImportance } from '@/types';

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
export function generateRecommendation(data: FormData): Recommendation {
  // Score all crops
  const scoredCrops = cropDatabase.map(crop => ({
    ...crop,
    score: calculateCropScore(crop, data),
  })).sort((a, b) => b.score - a.score);

  const topCrop = scoredCrops[0];
  const marketTrends: ('rising' | 'stable' | 'falling')[] = ['rising', 'stable', 'falling'];

  const cropRecommendation: CropRecommendation = {
    crop: topCrop.name,
    confidence: Math.round(topCrop.score),
    expectedYieldMin: topCrop.yieldRange[0],
    expectedYieldMax: topCrop.yieldRange[1],
    yieldUnit: topCrop.yieldUnit,
    marketPriceTrend: marketTrends[Math.floor(Math.random() * 3)],
    growingSeasonStart: topCrop.season.start,
    growingSeasonEnd: topCrop.season.end,
    icon: topCrop.icon,
  };

  const fertilizerRecommendation = generateFertilizerRecommendation(data, topCrop.name);
  const featureImportance = generateFeatureImportance(data);

  const alternativeCrops = scoredCrops.slice(1, 4).map(crop => ({
    crop: crop.name,
    confidence: Math.round(crop.score),
    reason: crop.score < topCrop.score - 20 
      ? 'Lower suitability due to soil conditions'
      : 'Good alternative with similar conditions',
  }));

  const riskFactors = [];
  if (data.soil.pH < 5.0 || data.soil.pH > 8.0) {
    riskFactors.push({
      factor: 'Extreme soil pH may affect nutrient uptake',
      mitigation: 'Apply lime or gypsum to adjust pH gradually',
    });
  }
  if (data.environmental.rainfall < 100) {
    riskFactors.push({
      factor: 'Low rainfall may cause water stress',
      mitigation: 'Ensure reliable irrigation or choose drought-tolerant variety',
    });
  }
  if (data.soil.nitrogen > 200) {
    riskFactors.push({
      factor: 'High nitrogen may cause excessive vegetative growth',
      mitigation: 'Reduce nitrogen fertilizer application',
    });
  }

  return {
    id: generateId(),
    timestamp: new Date(),
    inputData: data,
    crop: cropRecommendation,
    fertilizer: fertilizerRecommendation,
    featureImportance,
    alternativeCrops,
    riskFactors,
  };
}

// Demo recommendations with pre-configured data
export const demoRecommendations: { name: string; data: FormData }[] = [
  {
    name: 'Rice Paddy - Central Province',
    data: {
      soil: { nitrogen: 120, phosphorus: 45, potassium: 90, pH: 6.2, moisture: 'high' },
      environmental: { rainfall: 220, temperature: 27, humidity: 80 },
      field: { previousCrop: 'Rice', irrigationType: 'flood', landSize: 3, region: 'Central' },
    },
  },
  {
    name: 'Tea Garden - Uva',
    data: {
      soil: { nitrogen: 80, phosphorus: 35, potassium: 70, pH: 4.8, moisture: 'medium' },
      environmental: { rainfall: 180, temperature: 22, humidity: 75 },
      field: { previousCrop: 'Tea', irrigationType: 'rainfed', landSize: 5, region: 'Uva' },
    },
  },
  {
    name: 'Vegetable Farm - Western',
    data: {
      soil: { nitrogen: 150, phosphorus: 60, potassium: 120, pH: 6.8, moisture: 'medium' },
      environmental: { rainfall: 160, temperature: 29, humidity: 70 },
      field: { previousCrop: 'Vegetables', irrigationType: 'drip', landSize: 1.5, region: 'Western' },
    },
  },
  {
    name: 'Coconut Plantation - Southern',
    data: {
      soil: { nitrogen: 60, phosphorus: 40, potassium: 100, pH: 6.5, moisture: 'low' },
      environmental: { rainfall: 140, temperature: 30, humidity: 65 },
      field: { previousCrop: 'Coconut', irrigationType: 'rainfed', landSize: 8, region: 'Southern' },
    },
  },
  {
    name: 'Maize Field - North Central',
    data: {
      soil: { nitrogen: 100, phosphorus: 50, potassium: 85, pH: 6.0, moisture: 'medium' },
      environmental: { rainfall: 120, temperature: 32, humidity: 60 },
      field: { previousCrop: 'Maize', irrigationType: 'sprinkler', landSize: 4, region: 'North Central' },
    },
  },
];
