'use client';

import { useState, useEffect } from 'react';
import { SavedCamera } from '@/services/storage';

interface CameraFormProps {
  onConnect: (rtspUrl: string, username?: string, password?: string) => void;
  isConnecting: boolean;
  isConnected: boolean;
  onDisconnect: () => void;
  onSave?: (name: string, rtspUrl: string, requiresAuth: boolean) => Promise<void>;
  savedCameras?: SavedCamera[];
  canSave?: boolean;
  currentUrl?: string;
}

export default function CameraForm({
  onConnect,
  isConnecting,
  isConnected,
  onDisconnect,
  onSave,
  savedCameras = [],
  canSave = false,
  currentUrl = '',
}: CameraFormProps) {
  const [rtspUrl, setRtspUrl] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showAuth, setShowAuth] = useState(false);
  const [urlError, setUrlError] = useState('');
  const [selectedCameraId, setSelectedCameraId] = useState('');
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [cameraName, setCameraName] = useState('');
  const [saveError, setSaveError] = useState('');

  // Update form when a saved camera is selected
  useEffect(() => {
    if (selectedCameraId && savedCameras.length > 0) {
      const camera = savedCameras.find(c => c.id === selectedCameraId);
      if (camera) {
        setRtspUrl(camera.rtspUrl);
        setShowAuth(camera.requiresAuth);
        if (!camera.requiresAuth) {
          setUsername('');
          setPassword('');
        }
      }
    }
  }, [selectedCameraId, savedCameras]);

  const validateUrl = (url: string): boolean => {
    // Support both rtsp://host:port/path and rtsp://user:pass@host:port/path
    const rtspPattern = /^rtsp:\/\/(?:[\w\.\-]+(?::[\w\.\-]+)?@)?[\w\.\-]+(?::\d{1,5})?(?:\/[\w\-\.\/]*)?$/;
    return rtspPattern.test(url);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Clear previous errors
    setUrlError('');
    
    // Validate URL format
    if (!rtspUrl) {
      setUrlError('Please enter an RTSP URL');
      return;
    }
    
    if (!validateUrl(rtspUrl)) {
      setUrlError('Invalid RTSP URL format. Expected: rtsp://hostname:port/path');
      return;
    }
    
    // Call connect callback
    onConnect(
      rtspUrl,
      showAuth && username ? username : undefined,
      showAuth && password ? password : undefined
    );
  };

  const handleDisconnect = () => {
    onDisconnect();
    // Clear form on disconnect
    setRtspUrl('');
    setUsername('');
    setPassword('');
    setShowAuth(false);
    setUrlError('');
    setSelectedCameraId('');
  };
  
  const handleSave = async () => {
    if (!onSave) return;
    
    setSaveError('');
    
    if (!cameraName.trim()) {
      setSaveError('Please enter a camera name');
      return;
    }
    
    try {
      await onSave(cameraName.trim(), currentUrl, showAuth);
      setShowSaveDialog(false);
      setCameraName('');
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : 'Failed to save camera');
    }
  };

  return (
    <div className="camera-form">
      <form onSubmit={handleSubmit}>
        {!isConnected && savedCameras.length > 0 && (
          <div className="form-group">
            <label htmlFor="savedCamera">Select Saved Camera</label>
            <select
              id="savedCamera"
              value={selectedCameraId}
              onChange={(e) => setSelectedCameraId(e.target.value)}
              disabled={isConnecting}
              className="select-camera"
            >
              <option value="">-- Enter URL manually --</option>
              {savedCameras.map((camera) => (
                <option key={camera.id} value={camera.id}>
                  {camera.name} ({camera.rtspUrl})
                </option>
              ))}
            </select>
          </div>
        )}

        <div className="form-group">
          <label htmlFor="rtspUrl">RTSP Camera URL</label>
          <input
            id="rtspUrl"
            type="text"
            value={rtspUrl}
            onChange={(e) => {
              setRtspUrl(e.target.value);
              setSelectedCameraId('');
            }}
            placeholder="rtsp://192.168.1.100:554/stream"
            disabled={isConnecting || isConnected}
            className={urlError ? 'input-error' : ''}
          />
          {urlError && (
            <span className="error-message">{urlError}</span>
          )}
        </div>

        {!isConnected && (
          <div className="form-group">
            <label>
              <input
                type="checkbox"
                checked={showAuth}
                onChange={(e) => setShowAuth(e.target.checked)}
                disabled={isConnecting}
              />
              Camera requires authentication
            </label>
          </div>
        )}

        {showAuth && !isConnected && (
          <>
            <div className="form-group">
              <label htmlFor="username">Username</label>
              <input
                id="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="admin"
                disabled={isConnecting}
              />
            </div>

            <div className="form-group">
              <label htmlFor="password">Password</label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="password"
                disabled={isConnecting}
              />
            </div>
          </>
        )}

        <div className="form-actions">
          {!isConnected ? (
            <button
              type="submit"
              disabled={isConnecting || !rtspUrl}
              className="btn btn-primary"
            >
              {isConnecting ? 'Connecting...' : 'Connect'}
            </button>
          ) : (
            <>
              <button
                type="button"
                onClick={handleDisconnect}
                className="btn btn-danger"
              >
                Disconnect
              </button>
              {onSave && canSave && (
                <button
                  type="button"
                  onClick={() => setShowSaveDialog(true)}
                  className="btn btn-secondary"
                >
                  Save Camera
                </button>
              )}
            </>
          )}
        </div>
      </form>

      {showSaveDialog && (
        <div className="save-dialog-overlay" onClick={() => setShowSaveDialog(false)}>
          <div className="save-dialog" onClick={(e) => e.stopPropagation()}>
            <h3>Save Camera</h3>
            <div className="form-group">
              <label htmlFor="cameraName">Camera Name</label>
              <input
                id="cameraName"
                type="text"
                value={cameraName}
                onChange={(e) => setCameraName(e.target.value)}
                placeholder="Living Room Camera"
                autoFocus
              />
              {saveError && (
                <span className="error-message">{saveError}</span>
              )}
            </div>
            <div className="dialog-actions">
              <button onClick={handleSave} className="btn btn-primary">
                Save
              </button>
              <button
                onClick={() => {
                  setShowSaveDialog(false);
                  setCameraName('');
                  setSaveError('');
                }}
                className="btn btn-secondary"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        .camera-form {
          background: #fff;
          border-radius: 8px;
          padding: 24px;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
          max-width: 500px;
        }

        .form-group {
          margin-bottom: 16px;
        }

        label {
          display: block;
          margin-bottom: 8px;
          font-weight: 500;
          color: #333;
        }

        input[type="text"],
        input[type="password"] {
          width: 100%;
          padding: 10px 12px;
          border: 1px solid #ddd;
          border-radius: 4px;
          font-size: 14px;
          box-sizing: border-box;
        }

        input[type="text"]:focus,
        input[type="password"]:focus {
          outline: none;
          border-color: #0070f3;
        }

        input[type="text"]:disabled,
        input[type="password"]:disabled {
          background-color: #f5f5f5;
          cursor: not-allowed;
        }

        input[type="checkbox"] {
          margin-right: 8px;
        }

        .input-error {
          border-color: #e00;
        }

        .error-message {
          display: block;
          color: #e00;
          font-size: 12px;
          margin-top: 4px;
        }

        .form-actions {
          margin-top: 24px;
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

        .btn-danger {
          background-color: #e00;
          color: white;
        }

        .btn-danger:hover {
          background-color: #c00;
        }
        
        .btn-secondary {
          background-color: #6b7280;
          color: white;
          margin-left: 8px;
        }
        
        .btn-secondary:hover {
          background-color: #4b5563;
        }
        
        .select-camera {
          width: 100%;
          padding: 10px 12px;
          border: 1px solid #ddd;
          border-radius: 4px;
          font-size: 14px;
          box-sizing: border-box;
          background-color: white;
        }
        
        .select-camera:disabled {
          background-color: #f5f5f5;
          cursor: not-allowed;
        }
        
        .save-dialog-overlay {
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
        
        .save-dialog {
          background: white;
          border-radius: 8px;
          padding: 24px;
          min-width: 400px;
          box-shadow: 0 4px 16px rgba(0, 0, 0, 0.2);
        }
        
        .save-dialog h3 {
          margin: 0 0 16px 0;
          color: #111827;
        }
        
        .dialog-actions {
          display: flex;
          gap: 8px;
          margin-top: 16px;
        }
      `}</style>
    </div>
  );
}
