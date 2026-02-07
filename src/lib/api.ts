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
export async function getPrediction(formData: FormData): Promise<any> {
  try {
    // Transform frontend format to backend expected format
    const requestBody = {
      soil: {
        nitrogen: formData.soil.nitrogen,
        phosphorus: formData.soil.phosphorus,
        potassium: formData.soil.potassium,
        carbon: formData.soil.carbon,
        pH: formData.soil.pH,
        soilType: formData.soil.soilType,
        moisture: formData.soil.moisture,
      },
      environmental: {
        rainfall: formData.environmental.rainfall,
        temperature: formData.environmental.temperature,
        humidity: formData.environmental.humidity,
      },
      field: {
        region: formData.field.region,
        landSize: formData.field.landSize,
        irrigationType: formData.field.irrigationType,
        previousCrop: formData.field.previousCrop,
      },
    };

    console.log('Sending request to backend:', requestBody);

    const response = await fetch(`${API_BASE_URL}/predict`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(
        errorData.detail || 
        errorData.message || 
        `Backend error: ${response.status} ${response.statusText}`
      );
    }

    const data = await response.json();
    console.log('Received response from backend:', data);

    return data;
  } catch (error) {
    console.error('Prediction API error:', error);
    
    if (error instanceof TypeError && error.message.includes('fetch')) {
      throw new Error(
        'Cannot connect to ML backend. Please ensure the backend server is running on ' + API_BASE_URL
      );
    }
    
    throw error;
  }
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