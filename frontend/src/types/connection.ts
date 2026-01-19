export enum ConnectionStatus {
  IDLE = 'idle',
  CONNECTING = 'connecting', 
  CONNECTED = 'connected',
  DISCONNECTED = 'disconnected',
  ERROR = 'error',
  RECONNECTING = 'reconnecting'
}

export enum ErrorType {
  INVALID_URL = 'invalid_url',
  UNREACHABLE = 'unreachable',
  AUTH_REQUIRED = 'auth_required', 
  TIMEOUT = 'timeout',
  UNSUPPORTED_CODEC = 'unsupported_codec',
  CONNECTION_LIMIT = 'connection_limit',
  INTERNAL_ERROR = 'internal_error'
}

export interface StreamMetadata {
  resolution: string; // e.g. "1920x1080"
  codec: 'h264' | 'h265';
  fps: number;
}

export interface ErrorDetails {
  type: ErrorType;
  message: string;
  details?: Record<string, any>;
}

export interface ConnectionSession {
  cameraUrl: string;
  status: ConnectionStatus;
  connectedAt?: string; // ISO 8601 timestamp
  error?: ErrorDetails;
  streamMetadata?: StreamMetadata;
  reconnectAttempts: number;
  hlsPlaylistUrl?: string;
  sessionId?: string;
}

export interface Credentials {
  username: string;
  password: string;
}

// API Request/Response types
export interface ConnectRequest {
  rtspUrl: string;
  username?: string;
  password?: string;
}

export interface ConnectResponse {
  status: 'connected';
  sessionId: string;
  hlsPlaylistUrl: string;
  streamMetadata: StreamMetadata;
}

export interface DisconnectRequest {
  sessionId: string;
}

export interface DisconnectResponse {
  status: 'disconnected';
  sessionId: string;
}

export interface StatusResponse {
  status: ConnectionStatus;
  sessionId: string;
  connectedAt?: string;
  streamMetadata?: StreamMetadata;
  lastActivity?: string;
}

export interface ErrorResponse {
  error: {
    type: string;
    message: string;
    details?: any;
  };
}