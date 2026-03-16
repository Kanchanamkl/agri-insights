import { FormData } from '@/types';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

/**
 * Check if the ML backend is healthy
 */
export async function checkHealth(): Promise<{ status: string; message: string }> {
  try {
    const response = await fetch(`${API_BASE_URL}/health`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Health check failed: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Health check error:', error);
    throw error;
  }
}

/**
 * Alias for backward compatibility
 */
export const checkBackendHealth = checkHealth;

/**
 * Get crop and fertilizer prediction from ML backend
 */
export async function getPrediction(payload: any): Promise<any> {
  // payload is already in the backend format:
  // { soilParameters: {...}, environmentalFactors: {...} }

  const response = await fetch(`${API_BASE_URL}/predict`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const text = await response.text().catch(() => '');
    throw new Error(`Prediction request failed: ${response.status} ${text}`);
  }

  return response.json();
}

/**
 * Get model metadata
 */
export async function getModelMetadata(): Promise<any> {
  try {
    const response = await fetch(`${API_BASE_URL}/model/info`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch model metadata: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Model metadata error:', error);
    throw error;
  }
}