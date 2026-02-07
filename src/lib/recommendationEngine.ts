import { FormData, Recommendation, CropRecommendation, FertilizerRecommendation, FeatureImportance } from '@/types';
import { getPrediction } from './api';

// Generate unique ID
function generateId(): string {
  return `rec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Main recommendation generator - fetches data from ML backend
 */
export async function fetchRecommendation(formData: FormData): Promise<Recommendation> {
  try {
    console.log('Calling backend with formData:', formData);
    const apiResponse = await getPrediction(formData);
    console.log('Backend response:', apiResponse);
    
    if (!apiResponse.success) {
      throw new Error('Backend returned unsuccessful response');
    }
    
    const recommendation = convertApiResponseToRecommendation(formData, apiResponse);
    console.log('Converted recommendation:', recommendation);
    
    return recommendation;
  } catch (error) {
    console.error('Failed to get prediction from backend:', error);
    throw error; // Re-throw to handle in UI
  }
}

/**
 * Convert API response to Recommendation format
 */
export function convertApiResponseToRecommendation(
  formData: FormData,
  apiResponse: any
): Recommendation {
  const id = generateId();
  
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
      type: apiResponse.fertilizer.label || apiResponse.fertilizer.type,
      components: apiResponse.fertilizer.components,
      quantityPerAcre: apiResponse.fertilizer.quantityPerAcre,
      applicationSchedule: apiResponse.fertilizer.applicationSchedule,
      estimatedCost: apiResponse.fertilizer.estimatedCost,
      costUnit: apiResponse.fertilizer.costUnit,
      confidence: Math.round(apiResponse.fertilizer.confidence * 100),
      environmentalImpact: apiResponse.fertilizer.environmentalImpact,
    },
    featureImportance: apiResponse.featureImportance,
    alternativeCrops: apiResponse.alternativeCrops.map((alt: any) => ({
      crop: alt.crop,
      confidence: alt.confidence,
      reason: alt.reason,
    })),
    riskFactors: apiResponse.riskFactors,
  };
}

