// API client for backend communication
import {
  ConnectRequest,
  ConnectResponse,
  DisconnectRequest,
  DisconnectResponse,
  StatusResponse,
  ErrorResponse
} from '@/types/connection';

export class ApiError extends Error {
  constructor(
    message: string,
    public type: string,
    public statusCode: number,
    public details?: Record<string, any>
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export class ApiClient {
  private baseUrl: string;

  constructor(baseUrl: string = process.env.NEXT_PUBLIC_API_URL || '/api') {
    this.baseUrl = baseUrl;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    
    const defaultHeaders = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    };

    try {
      const response = await fetch(url, {
        ...options,
        headers: {
          ...defaultHeaders,
          ...options.headers,
        },
      });

      // Handle error responses
      if (!response.ok) {
        const errorData: ErrorResponse = await response.json();
        throw new ApiError(
          errorData.error.message,
          errorData.error.type,
          response.status,
          errorData.error.details
        );
      }

      return await response.json();
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      
      // Network or other errors
      throw new ApiError(
        'Network error. Please check your connection and try again.',
        'network_error',
        0
      );
    }
  }

  async connectCamera(request: ConnectRequest): Promise<ConnectResponse> {
    return this.request<ConnectResponse>('/camera/connect', {
      method: 'POST',
      body: JSON.stringify(request),
    });
  }

  async disconnectCamera(request: DisconnectRequest): Promise<DisconnectResponse> {
    return this.request<DisconnectResponse>('/camera/disconnect', {
      method: 'POST',
      body: JSON.stringify(request),
    });
  }

  async getStatus(sessionId: string): Promise<StatusResponse> {
    return this.request<StatusResponse>(`/camera/status/${sessionId}`, {
      method: 'GET',
    });
  }

  getStreamUrl(sessionId: string): string {
    return `${this.baseUrl}/camera/stream/${sessionId}/playlist.m3u8`;
  }
}

// Global API client instance
export const apiClient = new ApiClient();