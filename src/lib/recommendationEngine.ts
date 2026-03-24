import type {
  FormData,
  Recommendation,
  CropRecommendation,
  FertilizerRecommendation,
} from '@/types';
import { getPrediction } from './api';

// Generate unique ID
function generateId(): string {
  return `rec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Main recommendation generator — fetches data from ML backend.
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
    throw error;
  }
}

/**
 * Convert raw API response to the app's Recommendation shape.
 *
 * Backend confidence values are 0–1 floats; we multiply by 100 and round
 * so the UI always works with 0–100 integers.
 */
export function convertApiResponseToRecommendation(
  formData: FormData,
  apiResponse: any,
): Recommendation {
  const id = generateId();

  const crop = apiResponse.crop ?? {};
  const fertilizer = apiResponse.fertilizer ?? {};

  const cropRecommendation: CropRecommendation = {
    label: crop.label ?? 'Unknown',
    crop: crop.label,                                       // keep legacy field in sync
    confidence: Math.round((crop.confidence ?? 0) * 100),
    suitabilityScore: crop.suitabilityScore,
    modelConfidence: crop.modelConfidence,
    expectedYieldMin: crop.expectedYieldMin,
    expectedYieldMax: crop.expectedYieldMax,
    yieldUnit: crop.yieldUnit,
    marketPriceTrend: crop.marketPriceTrend,
    growingSeasonStart: crop.growingSeasonStart,
    growingSeasonEnd: crop.growingSeasonEnd,
    icon: crop.icon,
    top_k: crop.top_k,
  };

  const fertilizerRecommendation: FertilizerRecommendation = formatFertilizerRecommendation(fertilizer);

  return {
    id,
    timestamp: apiResponse.meta?.timestamp
      ? new Date(apiResponse.meta.timestamp)
      : new Date(),
    inputData: formData,
    crop: cropRecommendation,
    fertilizer: fertilizerRecommendation,
    featureImportance: Array.isArray(apiResponse.featureImportance)
      ? apiResponse.featureImportance
      : [],
    alternativeCrops: Array.isArray(apiResponse.alternativeCrops)
      ? apiResponse.alternativeCrops.map((alt: any) => ({
          crop: alt.crop,
          confidence: alt.confidence,
          reason: alt.reason,
        }))
      : [],
    riskFactors: Array.isArray(apiResponse.riskFactors)
      ? apiResponse.riskFactors
      : [],
    warnings: Array.isArray(apiResponse.warnings) ? apiResponse.warnings : [],
    remark: apiResponse.remark,
  };
}

/**
 * Map the raw fertilizer object from the backend into FertilizerRecommendation.
 * `confidence` coming from the backend is a 0–1 float — convert to 0–100.
 */
export function formatFertilizerRecommendation(fertilizer: any): FertilizerRecommendation {
  return {
    label: fertilizer.label ?? fertilizer.type ?? 'Unknown',
    type: fertilizer.type ?? fertilizer.label,
    components: Array.isArray(fertilizer.components) ? fertilizer.components : [],
    applicationSchedule: Array.isArray(fertilizer.applicationSchedule)
      ? fertilizer.applicationSchedule
      : [],
    baseRatePerAcre: fertilizer.baseRatePerAcre,
    pricePerKg: fertilizer.pricePerKg,
    costUnit: fertilizer.costUnit,
    confidence: Math.round((fertilizer.confidence ?? 0) * 100),
    suitabilityScore: fertilizer.suitabilityScore,
    modelConfidence: fertilizer.modelConfidence,
    environmentalImpact: fertilizer.environmentalImpact,
    top_k: fertilizer.top_k,
  };
}