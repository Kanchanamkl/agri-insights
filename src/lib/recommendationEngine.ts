import { FormData, Recommendation } from '@/types';
import { getPrediction, PredictionResponse } from './api';

/**
 * Convert API response to Recommendation format
 */
export function convertApiResponseToRecommendation(
  formData: FormData,
  apiResponse: PredictionResponse
): Recommendation {
  const id = `rec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  return {
    id,
    data: formData,
    crop: {
      name: apiResponse.crop.label,
      confidence: Math.round(apiResponse.crop.confidence * 100),
      alternatives: apiResponse.crop.top_k.slice(1, 4).map((alt) => ({
        name: alt.label,
        confidence: Math.round(alt.prob * 100),
      })),
      reasons: generateCropReasons(formData, apiResponse.crop.label),
    },
    fertilizer: {
      name: apiResponse.fertilizer.label,
      confidence: Math.round(apiResponse.fertilizer.confidence * 100),
      alternatives: apiResponse.fertilizer.top_k.slice(1, 4).map((alt) => ({
        name: alt.label,
        confidence: Math.round(alt.prob * 100),
      })),
      npkRatio: extractNPKRatio(apiResponse.fertilizer.label),
      applicationRate: calculateApplicationRate(
        apiResponse.fertilizer.label,
        formData.field.landSize
      ),
      instructions: parseInstructions(apiResponse.remark),
    },
    timestamp: new Date().toISOString(),
    modelVersion: apiResponse.meta.model_version,
  };
}

/**
 * Generate crop recommendation (calls ML backend)
 */
export async function generateRecommendation(
  formData: FormData
): Promise<Recommendation> {
  try {
    const apiResponse = await getPrediction(formData);
    return convertApiResponseToRecommendation(formData, apiResponse);
  } catch (error) {
    console.error('Failed to get prediction from backend:', error);
    // Fallback to mock data if backend is unavailable
    console.warn('Using fallback mock recommendation');
    return generateMockRecommendation(formData);
  }
}

/**
 * Generate crop reasons based on soil and environmental data
 */
function generateCropReasons(formData: FormData, cropName: string): string[] {
  const reasons: string[] = [];
  
  // Soil-based reasons
  if (formData.soil.pH >= 6.0 && formData.soil.pH <= 7.0) {
    reasons.push('Optimal soil pH for this crop');
  }
  
  if (formData.soil.nitrogen > 100) {
    reasons.push('High nitrogen levels support vigorous growth');
  }
  
  // Climate-based reasons
  if (formData.environmental.temperature >= 20 && formData.environmental.temperature <= 30) {
    reasons.push('Temperature range is ideal for growth');
  }
  
  if (formData.environmental.rainfall > 100) {
    reasons.push('Adequate rainfall for water requirements');
  }
  
  // Region-based
  reasons.push(`Commonly cultivated in ${formData.field.region} province`);
  
  // Rotation benefit
  if (formData.field.previousCrop && formData.field.previousCrop !== cropName) {
    reasons.push('Good rotation choice after previous crop');
  }
  
  return reasons.slice(0, 4); // Return top 4 reasons
}

/**
 * Extract NPK ratio from fertilizer name
 */
function extractNPKRatio(fertilizerName: string): string {
  // Common NPK ratios for different fertilizers
  const npkMap: Record<string, string> = {
    'Urea': '46-0-0',
    'DAP': '18-46-0',
    'NPK': '20-20-20',
    'TSP': '0-46-0',
    'MOP': '0-0-60',
    'Ammonium Sulfate': '21-0-0',
    'Calcium Nitrate': '15.5-0-0',
    'Potassium Nitrate': '13-0-46',
  };
  
  return npkMap[fertilizerName] || '20-20-20';
}

/**
 * Calculate application rate
 */
function calculateApplicationRate(fertilizerName: string, landSize: number): string {
  // Base rates per acre
  const baseRates: Record<string, number> = {
    'Urea': 50,
    'DAP': 100,
    'NPK': 150,
    'TSP': 75,
    'MOP': 60,
  };
  
  const baseRate = baseRates[fertilizerName] || 100;
  const totalAmount = baseRate * landSize;
  
  return `${totalAmount.toFixed(0)} kg total (${baseRate} kg/acre)`;
}

/**
 * Parse instructions from remark
 */
function parseInstructions(remark: string): string[] {
  if (!remark) {
    return ['Apply as per soil test recommendations', 'Split application for better results'];
  }
  
  // If remark contains sentences, split them
  const sentences = remark.split(/[.!]/).filter(s => s.trim().length > 0);
  if (sentences.length > 0) {
    return sentences.map(s => s.trim());
  }
  
  return [remark];
}

/**
 * Fallback: Generate mock recommendation (for development/offline mode)
 */
function generateMockRecommendation(formData: FormData): Recommendation {
  const id = `rec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  return {
    id,
    data: formData,
    crop: {
      name: 'Rice',
      confidence: 92,
      alternatives: [
        { name: 'Maize', confidence: 78 },
        { name: 'Wheat', confidence: 65 },
      ],
      reasons: [
        'Optimal soil pH for rice cultivation',
        'High moisture content suitable for paddy',
        'Temperature range ideal for growth',
        'Good rotation choice after previous crop',
      ],
    },
    fertilizer: {
      name: 'Urea',
      confidence: 88,
      alternatives: [
        { name: 'DAP', confidence: 72 },
        { name: 'NPK 20-20-20', confidence: 68 },
      ],
      npkRatio: '46-0-0',
      applicationRate: `${(50 * formData.field.landSize).toFixed(0)} kg total (50 kg/acre)`,
      instructions: [
        'Apply in 3 split doses during the growing season',
        'First dose at planting, second at tillering, third at panicle initiation',
        'Mix with soil before application',
      ],
    },
    timestamp: new Date().toISOString(),
    modelVersion: 'v1.0_mock',
  };
}

// ...existing code for demoRecommendations...
export const demoRecommendations: Array<Recommendation & { name: string }> = [
  // ...existing demo data...
];
