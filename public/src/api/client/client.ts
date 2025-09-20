// Generated TypeScript API client from OpenAPI specification

import {
  ERData,
  LayoutData,
  AllData,
  DDLResponse,
  BuildInfo,
  SuccessResponse,
  ErrorResponse
} from './types.js';

// Base API client configuration
interface ApiClientConfig {
  baseUrl?: string;
  fetch?: typeof fetch;
}

// API response wrapper
type ApiResponse<T> = Promise<T | ErrorResponse>;

export class ERViewerApiClient {
  private baseUrl: string;
  private fetch: typeof fetch;

  constructor(config: ApiClientConfig = {}) {
    this.baseUrl = config.baseUrl || '';
    this.fetch = config.fetch || globalThis.fetch;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): ApiResponse<T> {
    try {
      const url = `${this.baseUrl}${endpoint}`;
      const response = await this.fetch(url, {
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
        },
        ...options,
      });

      const data = await response.json();
      
      if (!response.ok) {
        return data as ErrorResponse;
      }
      
      return data as T;
    } catch (error) {
      return {
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      } as ErrorResponse;
    }
  }

  // Get ER data
  async getERData(): ApiResponse<ERData> {
    return this.request<ERData>('/api/er-data');
  }

  // Reverse engineer database to generate ER data
  async reverseEngineer(): ApiResponse<ERData> {
    return this.request<ERData>('/api/reverse-engineer', {
      method: 'POST',
    });
  }

  // Save layout data
  async saveLayout(layoutData: LayoutData): ApiResponse<SuccessResponse> {
    return this.request<SuccessResponse>('/api/layout', {
      method: 'POST',
      body: JSON.stringify(layoutData),
    });
  }

  // Get layout data
  async getLayout(): ApiResponse<LayoutData> {
    return this.request<LayoutData>('/api/layout');
  }

  // Save all data (ER + layout)
  async saveAllData(allData: AllData): ApiResponse<SuccessResponse> {
    return this.request<SuccessResponse>('/api/data/all', {
      method: 'POST',
      body: JSON.stringify(allData),
    });
  }

  // Get all data (ER + layout)
  async getAllData(): ApiResponse<AllData> {
    return this.request<AllData>('/api/data/all');
  }

  // Get table DDL
  async getTableDDL(tableName: string): ApiResponse<DDLResponse> {
    return this.request<DDLResponse>(`/api/table/${encodeURIComponent(tableName)}/ddl`);
  }

  // Get build information
  async getBuildInfo(): ApiResponse<BuildInfo> {
    return this.request<BuildInfo>('/api/build-info');
  }
}

// Default client instance
export const apiClient = new ERViewerApiClient();

// Type guard to check if response is an error
export function isErrorResponse(response: any): response is ErrorResponse {
  return response && typeof response === 'object' && 'error' in response;
}

// Export types for convenience
export * from './types.js';
