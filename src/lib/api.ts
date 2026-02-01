import { FormData, Recommendation } from '@/types';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';

export interface ApiError {
  success: false;
  error: string;
  details?: Record<string, any>;
}

export interface PredictionResponse {
  success: true;
  crop: {
    label: string;
    confidence: number;
    top_k: Array<{
      label: string;
      prob: number;
    }>;
  };
  fertilizer: {
    label: string;
    confidence: number;
    top_k: Array<{
      label: string;
      prob: number;
    }>;
  };
  remark: string;
  meta: {
    model_version: string;
    timestamp: string;
  };
}

export interface HealthResponse {
  status: 'healthy' | 'initializing' | 'unhealthy';
  models_loaded: boolean;
  model_version: string;
  timestamp: string;
}

class ApiClient {
  private baseUrl: string;

  constructor(baseUrl: string = API_BASE_URL) {
    this.baseUrl = baseUrl;
  }

  /**
   * Make a request to the API
   */
  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    
    const defaultHeaders: HeadersInit = {
      'Content-Type': 'application/json',
    };

    const config: RequestInit = {
      ...options,
      headers: {
        ...defaultHeaders,
        ...options.headers,
      },
    };

    try {
      const response = await fetch(url, config);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || `HTTP error! status: ${response.status}`);
      }

      return data;
    } catch (error) {
      console.error('API request failed:', error);
      throw error;
    }
  }

  /**
   * Check API health status
   */
  async checkHealth(): Promise<HealthResponse> {
    return this.request<HealthResponse>('/health');
  }

  /**
   * Get prediction from the ML backend
   */
  async getPrediction(formData: FormData): Promise<PredictionResponse> {
    // Transform frontend FormData to backend API format
    const requestPayload = {
      soil: {
        nitrogen: formData.soil.nitrogen,
        phosphorus: formData.soil.phosphorus, // Note: backend expects 'phosphorus'
        potassium: formData.soil.potassium,
        carbon: formData.soil.carbon || 30, // Default value if not provided
        pH: formData.soil.pH,
        soilType: formData.soil.soilType,
        moisture: this.mapMoistureToNumber(formData.soil.moisture),
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

    const response = await this.request<PredictionResponse>('/predict', {
      method: 'POST',
      body: JSON.stringify(requestPayload),
    });

    console.log('Backend response:', response);
    
    return response;
  }

  /**
   * Get crop prediction only
   */
  async getCropPrediction(formData: FormData): Promise<any> {
    const requestPayload = this.buildRequestPayload(formData);
    return this.request('/predict/crop', {
      method: 'POST',
      body: JSON.stringify(requestPayload),
    });
  }

  /**
   * Get fertilizer prediction only
   */
  async getFertilizerPrediction(formData: FormData): Promise<any> {
    const requestPayload = this.buildRequestPayload(formData);
    return this.request('/predict/fertilizer', {
      method: 'POST',
      body: JSON.stringify(requestPayload),
    });
  }

  /**
   * Helper: Map moisture level to numeric value
   */
  private mapMoistureToNumber(moisture: 'low' | 'medium' | 'high'): number {
    const moistureMap = {
      low: 30,
      medium: 60,
      high: 85,
    };
    return moistureMap[moisture] || 60;
  }

  /**
   * Helper: Build request payload
   */
  private buildRequestPayload(formData: FormData) {
    return {
      soil: {
        nitrogen: formData.soil.nitrogen,
        phosphorus: formData.soil.phosphorus,
        potassium: formData.soil.potassium,
        carbon: formData.soil.carbon || 30,
        pH: formData.soil.pH,
        soilType: formData.soil.soilType,
        moisture: this.mapMoistureToNumber(formData.soil.moisture),
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
  }
}

// Export singleton instance
export const apiClient = new ApiClient();

// Export utility functions
export const checkBackendHealth = () => apiClient.checkHealth();
export const getPrediction = (formData: FormData) => apiClient.getPrediction(formData);
export const getCropPrediction = (formData: FormData) => apiClient.getCropPrediction(formData);
export const getFertilizerPrediction = (formData: FormData) => apiClient.getFertilizerPrediction(formData);
