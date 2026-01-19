export interface CameraConfiguration {
  id: string;
  name: string;
  rtspUrl: string;
  createdAt: string; // ISO 8601 timestamp
  lastUsedAt?: string; // ISO 8601 timestamp
  requiresAuth: boolean;
}

export interface SaveCameraRequest {
  name: string;
  rtspUrl: string;
  requiresAuth: boolean;
}