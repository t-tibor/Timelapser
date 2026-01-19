'use client';

import { useState, useCallback, useRef } from 'react';
import {
  ConnectionSession,
  ConnectionStatus,
  ErrorDetails,
  ErrorType,
  StreamMetadata
} from '@/types/connection';
import { apiClient, ApiError } from '@/services/api';

interface UseCameraReturn {
  session: ConnectionSession;
  connect: (rtspUrl: string, username?: string, password?: string) => Promise<void>;
  disconnect: () => Promise<void>;
  clearError: () => void;
  isConnecting: boolean;
  isConnected: boolean;
  getSessionCredentials: (url: string) => { username?: string; password?: string } | null;
  reconnect: () => Promise<void>;
  cancelReconnect: () => void;
  isReconnecting: boolean;
}

export function useCamera(): UseCameraReturn {
  const [session, setSession] = useState<ConnectionSession>({
    cameraUrl: '',
    status: ConnectionStatus.IDLE,
    reconnectAttempts: 0,
  });

  const [isConnecting, setIsConnecting] = useState(false);
  
  // Session-only credential storage (not persisted)
  const sessionCredentials = useRef<Map<string, { username: string; password: string }>>(new Map());
  
  // Reconnection state
  const [isReconnecting, setIsReconnecting] = useState(false);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const maxReconnectAttempts = 3;
  const reconnectDelays = [2000, 4000, 8000]; // 2s, 4s, 8s

  const clearError = useCallback(() => {
    setSession((prev) => ({
      ...prev,
      error: undefined,
      status: ConnectionStatus.IDLE,
    }));
    reconnectAttemptsRef.current = 0;
  }, []);
  
  const cancelReconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    setIsReconnecting(false);
    reconnectAttemptsRef.current = 0;
    setSession((prev) => ({
      ...prev,
      status: ConnectionStatus.ERROR,
      reconnectAttempts: 0,
    }));
  }, []);
  
  const reconnect = useCallback(async () => {
    if (!session.cameraUrl) {
      console.warn('No camera URL to reconnect to');
      return;
    }
    
    if (reconnectAttemptsRef.current >= maxReconnectAttempts) {
      console.error('Max reconnection attempts reached');
      setIsReconnecting(false);
      setSession((prev) => ({
        ...prev,
        status: ConnectionStatus.ERROR,
        error: {
          type: ErrorType.UNREACHABLE,
          message: `Failed to reconnect after ${maxReconnectAttempts} attempts. Please check your connection and try again.`,
        },
        reconnectAttempts: reconnectAttemptsRef.current,
      }));
      return;
    }
    
    reconnectAttemptsRef.current++;
    setIsReconnecting(true);
    
    setSession((prev) => ({
      ...prev,
      status: ConnectionStatus.RECONNECTING,
      reconnectAttempts: reconnectAttemptsRef.current,
    }));
    
    console.log(`Reconnection attempt ${reconnectAttemptsRef.current} of ${maxReconnectAttempts}`);
    
    try {
      // Get stored credentials if available
      const credentials = sessionCredentials.current.get(session.cameraUrl);
      
      // Attempt to reconnect
      const response = await apiClient.connectCamera({
        rtspUrl: session.cameraUrl,
        username: credentials?.username,
        password: credentials?.password,
      });
      
      // Success! Reset reconnection state
      reconnectAttemptsRef.current = 0;
      setIsReconnecting(false);
      
      setSession({
        cameraUrl: session.cameraUrl,
        status: ConnectionStatus.CONNECTED,
        connectedAt: new Date().toISOString(),
        sessionId: response.sessionId,
        hlsPlaylistUrl: response.hlsPlaylistUrl,
        streamMetadata: response.streamMetadata,
        reconnectAttempts: 0,
      });
      
      console.log('Reconnection successful');
    } catch (error) {
      console.error(`Reconnection attempt ${reconnectAttemptsRef.current} failed:`, error);
      
      // Schedule next attempt with exponential backoff
      if (reconnectAttemptsRef.current < maxReconnectAttempts) {
        const delay = reconnectDelays[reconnectAttemptsRef.current - 1];
        console.log(`Scheduling next reconnection attempt in ${delay}ms`);
        
        reconnectTimeoutRef.current = setTimeout(() => {
          reconnect();
        }, delay);
      } else {
        // Max attempts reached
        setIsReconnecting(false);
        setSession((prev) => ({
          ...prev,
          status: ConnectionStatus.ERROR,
          error: {
            type: ErrorType.UNREACHABLE,
            message: `Failed to reconnect after ${maxReconnectAttempts} attempts. Please check your connection and try again.`,
          },
          reconnectAttempts: reconnectAttemptsRef.current,
        }));
      }
    }
  }, [session.cameraUrl]);

  const connect = useCallback(
    async (rtspUrl: string, username?: string, password?: string) => {
      // Clear previous errors and set connecting state
      setIsConnecting(true);
      setSession({
        cameraUrl: rtspUrl,
        status: ConnectionStatus.CONNECTING,
        reconnectAttempts: 0,
      });

      try {
        // Store credentials in session if provided
        if (username && password) {
          sessionCredentials.current.set(rtspUrl, { username, password });
        }
        
        // Call API to connect
        const response = await apiClient.connectCamera({
          rtspUrl,
          username,
          password,
        });

        // Update session with connection details
        setSession({
          cameraUrl: rtspUrl,
          status: ConnectionStatus.CONNECTED,
          connectedAt: new Date().toISOString(),
          sessionId: response.sessionId,
          hlsPlaylistUrl: response.hlsPlaylistUrl,
          streamMetadata: response.streamMetadata,
          reconnectAttempts: 0,
        });
      } catch (error) {
        console.error('Connection error:', error);

        let errorDetails: ErrorDetails;

        if (error instanceof ApiError) {
          errorDetails = {
            type: error.type as ErrorType,
            message: error.message,
            details: error.details,
          };
        } else {
          errorDetails = {
            type: ErrorType.INTERNAL_ERROR,
            message: 'An unexpected error occurred. Please try again.',
          };
        }

        setSession({
          cameraUrl: rtspUrl,
          status: ConnectionStatus.ERROR,
          error: errorDetails,
          reconnectAttempts: 0,
        });
      } finally {
        setIsConnecting(false);
      }
    },
    []
  );

  const disconnect = useCallback(async () => {
    if (!session.sessionId) {
      console.warn('No active session to disconnect');
      return;
    }
    
    // Cancel any pending reconnection
    cancelReconnect();

    try {
      await apiClient.disconnectCamera({
        sessionId: session.sessionId,
      });

      setSession({
        cameraUrl: '',
        status: ConnectionStatus.DISCONNECTED,
        reconnectAttempts: 0,
      });

      // Reset to idle after a brief delay
      setTimeout(() => {
        setSession((prev) => ({
          ...prev,
          status: ConnectionStatus.IDLE,
          cameraUrl: '',
          sessionId: undefined,
          hlsPlaylistUrl: undefined,
          streamMetadata: undefined,
        }));
      }, 1000);
    } catch (error) {
      console.error('Disconnect error:', error);
      
      // Even if disconnect fails, reset the session
      setSession({
        cameraUrl: '',
        status: ConnectionStatus.IDLE,
        reconnectAttempts: 0,
      });
    }
  }, [session.sessionId, cancelReconnect]);
  
  const getSessionCredentials = useCallback((url: string) => {
    return sessionCredentials.current.get(url) || null;
  }, []);

  return {
    session,
    connect,
    disconnect,
    clearError,
    isConnecting,
    isConnected: session.status === ConnectionStatus.CONNECTED,
    getSessionCredentials,
    reconnect,
    cancelReconnect,
    isReconnecting,
  };
}
