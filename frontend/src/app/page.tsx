'use client';

import { useCamera } from '@/hooks/useCamera';
import { useSavedCameras } from '@/hooks/useSavedCameras';
import CameraForm from '@/components/CameraForm';
import VideoPlayer from '@/components/VideoPlayer';
import ConnectionStatus from '@/components/ConnectionStatus';
import ErrorMessage from '@/components/ErrorMessage';
import SavedCameras from '@/components/SavedCameras';
import { ConnectionStatus as Status, ErrorType } from '@/types/connection';
import { apiClient } from '@/services/api';
import { SavedCamera } from '@/services/storage';
import { useState } from 'react';

export default function HomePage() {
  const { 
    session, 
    connect, 
    disconnect, 
    clearError, 
    isConnecting, 
    isConnected, 
    getSessionCredentials,
    reconnect,
    cancelReconnect,
    isReconnecting,
  } = useCamera();
  const { savedCameras, saveCamera, deleteCamera, isLimitReached, remainingSlots } = useSavedCameras();
  const [authPrompt, setAuthPrompt] = useState<{ url: string; camera: SavedCamera } | null>(null);

  const handleConnect = async (rtspUrl: string, username?: string, password?: string) => {
    await connect(rtspUrl, username, password);
  };

  const handleDisconnect = async () => {
    await disconnect();
  };
  
  const handleSaveCamera = async (name: string, rtspUrl: string, requiresAuth: boolean) => {
    if (isLimitReached) {
      throw new Error(`Cannot save more than 5 cameras. Delete a camera first.`);
    }
    
    await saveCamera({
      name,
      rtspUrl,
      requiresAuth,
    });
  };
  
  const handleSelectSavedCamera = async (camera: SavedCamera) => {
    // Check if we have session credentials for this URL
    const credentials = getSessionCredentials(camera.rtspUrl);
    
    if (camera.requiresAuth && !credentials) {
      // Prompt for credentials
      setAuthPrompt({ url: camera.rtspUrl, camera });
    } else {
      // Connect with stored credentials or without auth
      await handleConnect(
        camera.rtspUrl,
        credentials?.username,
        credentials?.password
      );
    }
  };
  
  const handleAuthPromptSubmit = async (username: string, password: string) => {
    if (authPrompt) {
      await handleConnect(authPrompt.url, username, password);
      setAuthPrompt(null);
    }
  };

  const handleVideoError = (error: string) => {
    console.error('Video player error:', error);
    // Trigger reconnection on video error
    if (isConnected && !isReconnecting) {
      reconnect();
    }
  };

  const handleVideoStalled = () => {
    console.warn('Video playback stalled');
    // Trigger reconnection on stall
    if (isConnected && !isReconnecting) {
      reconnect();
    }
  };

  return (
    <div className="container">
      <header className="header">
        <h1>Timelapser</h1>
        <p className="subtitle">RTSP Camera Connection and Video Preview</p>
      </header>

      <main className="main">
        <div className="content">
          <ConnectionStatus
            status={session.status}
            streamMetadata={session.streamMetadata}
            error={session.error}
            reconnectAttempts={session.reconnectAttempts}
          />

          {session.error && (
            <>
              <ErrorMessage error={session.error} onDismiss={clearError} />
              
              {session.error.type === ErrorType.UNREACHABLE && (
                <div className="reconnect-controls">
                  <button
                    onClick={() => reconnect()}
                    className="btn btn-primary"
                    disabled={isReconnecting}
                  >
                    {isReconnecting ? 'Reconnecting...' : 'Retry Connection'}
                  </button>
                  {isReconnecting && (
                    <button
                      onClick={cancelReconnect}
                      className="btn btn-secondary"
                    >
                      Cancel
                    </button>
                  )}
                </div>
              )}
            </>
          )}
          
          {savedCameras.length > 0 && !isConnected && (
            <div className="saved-cameras-section">
              <SavedCameras
                cameras={savedCameras}
                onSelect={handleSelectSavedCamera}
                onDelete={deleteCamera}
                disabled={isConnecting}
              />
            </div>
          )}

          <CameraForm
            onConnect={handleConnect}
            isConnecting={isConnecting}
            isConnected={isConnected}
            onDisconnect={handleDisconnect}
            onSave={handleSaveCamera}
            savedCameras={savedCameras}
            canSave={!isLimitReached}
            currentUrl={session.cameraUrl}
          />

          {isConnected && session.sessionId && (
            <div className="video-container">
              <VideoPlayer
                hlsUrl={apiClient.getStreamUrl(session.sessionId)}
                onError={handleVideoError}
                onStalled={handleVideoStalled}
              />
            </div>
          )}
        </div>
      </main>
      
      {authPrompt && (
        <AuthPrompt
          cameraName={authPrompt.camera.name}
          onSubmit={handleAuthPromptSubmit}
          onCancel={() => setAuthPrompt(null)}
        />
      )}

      <style jsx>{`
        .container {
          min-height: 100vh;
          background: linear-gradient(to bottom, #f3f4f6, #e5e7eb);
          padding: 24px;
        }

        .header {
          text-align: center;
          margin-bottom: 48px;
        }

        h1 {
          font-size: 48px;
          font-weight: 700;
          color: #111827;
          margin: 0 0 8px 0;
        }

        .subtitle {
          font-size: 18px;
          color: #6b7280;
          margin: 0;
        }

        .main {
          display: flex;
          justify-content: center;
        }

        .content {
          width: 100%;
          max-width: 900px;
        }
        
        .saved-cameras-section {
          margin-bottom: 24px;
        }
        
        .reconnect-controls {
          display: flex;
          gap: 8px;
          margin-bottom: 16px;
        }
        
        .btn {
          padding: 10px 20px;
          border: none;
          border-radius: 4px;
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s;
        }
        
        .btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
        
        .btn-primary {
          background-color: #0070f3;
          color: white;
        }
        
        .btn-primary:hover:not(:disabled) {
          background-color: #0051cc;
        }
        
        .btn-secondary {
          background-color: #6b7280;
          color: white;
        }
        
        .btn-secondary:hover:not(:disabled) {
          background-color: #4b5563;
        }

        .video-container {
          margin-top: 24px;
        }

        @media (max-width: 768px) {
          .container {
            padding: 16px;
          }

          h1 {
            font-size: 36px;
          }

          .subtitle {
            font-size: 16px;
          }
        }
      `}</style>
    </div>
  );
}

// Auth prompt component
interface AuthPromptProps {
  cameraName: string;
  onSubmit: (username: string, password: string) => void;
  onCancel: () => void;
}

function AuthPrompt({ cameraName, onSubmit, onCancel }: AuthPromptProps) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (username && password) {
      onSubmit(username, password);
    }
  };

  return (
    <div className="auth-prompt-overlay" onClick={onCancel}>
      <div className="auth-prompt" onClick={(e) => e.stopPropagation()}>
        <h3>Authentication Required</h3>
        <p>Please enter credentials for <strong>{cameraName}</strong></p>
        
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Username</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="admin"
              autoFocus
            />
          </div>
          
          <div className="form-group">
            <label>Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="password"
            />
          </div>
          
          <div className="auth-actions">
            <button type="submit" className="btn btn-primary" disabled={!username || !password}>
              Connect
            </button>
            <button type="button" onClick={onCancel} className="btn btn-secondary">
              Cancel
            </button>
          </div>
        </form>
      </div>
      
      <style jsx>{`
        .auth-prompt-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background-color: rgba(0, 0, 0, 0.5);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
        }
        
        .auth-prompt {
          background: white;
          border-radius: 8px;
          padding: 24px;
          min-width: 400px;
          box-shadow: 0 4px 16px rgba(0, 0, 0, 0.2);
        }
        
        .auth-prompt h3 {
          margin: 0 0 8px 0;
          color: #111827;
        }
        
        .auth-prompt p {
          margin: 0 0 16px 0;
          color: #6b7280;
        }
        
        .form-group {
          margin-bottom: 16px;
        }
        
        .form-group label {
          display: block;
          margin-bottom: 8px;
          font-weight: 500;
          color: #333;
        }
        
        .form-group input {
          width: 100%;
          padding: 10px 12px;
          border: 1px solid #ddd;
          border-radius: 4px;
          font-size: 14px;
          box-sizing: border-box;
        }
        
        .auth-actions {
          display: flex;
          gap: 8px;
          margin-top: 16px;
        }
        
        .btn {
          padding: 12px 24px;
          border: none;
          border-radius: 4px;
          font-size: 16px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s;
        }
        
        .btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
        
        .btn-primary {
          background-color: #0070f3;
          color: white;
        }
        
        .btn-primary:hover:not(:disabled) {
          background-color: #0051cc;
        }
        
        .btn-secondary {
          background-color: #6b7280;
          color: white;
        }
        
        .btn-secondary:hover {
          background-color: #4b5563;
        }
      `}</style>
    </div>
  );
}
