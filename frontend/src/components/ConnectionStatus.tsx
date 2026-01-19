'use client';

import { ConnectionStatus as Status, StreamMetadata, ErrorDetails } from '@/types/connection';

interface ConnectionStatusProps {
  status: Status;
  streamMetadata?: StreamMetadata;
  error?: ErrorDetails;
  reconnectAttempts?: number;
}

export default function ConnectionStatus({
  status,
  streamMetadata,
  error,
  reconnectAttempts = 0
}: ConnectionStatusProps) {
  const getStatusColor = (): string => {
    switch (status) {
      case Status.CONNECTED:
        return '#10b981'; // green
      case Status.CONNECTING:
      case Status.RECONNECTING:
        return '#f59e0b'; // orange
      case Status.ERROR:
        return '#ef4444'; // red
      case Status.DISCONNECTED:
      case Status.IDLE:
        return '#6b7280'; // gray
      default:
        return '#6b7280';
    }
  };

  const getStatusText = (): string => {
    switch (status) {
      case Status.IDLE:
        return 'Not connected';
      case Status.CONNECTING:
        return 'Connecting...';
      case Status.CONNECTED:
        return 'Connected';
      case Status.DISCONNECTED:
        return 'Disconnected';
      case Status.ERROR:
        return 'Connection error';
      case Status.RECONNECTING:
        return `Reconnecting... (Attempt ${reconnectAttempts} of 3)`;
      default:
        return 'Unknown';
    }
  };

  const getStatusIcon = (): string => {
    switch (status) {
      case Status.CONNECTED:
        return '●'; // filled circle
      case Status.CONNECTING:
      case Status.RECONNECTING:
        return '◌'; // empty circle (animated)
      case Status.ERROR:
        return '✕';
      case Status.DISCONNECTED:
      case Status.IDLE:
        return '○'; // empty circle
      default:
        return '○';
    }
  };

  return (
    <div className="connection-status">
      <div className="status-header">
        <span className="status-icon" style={{ color: getStatusColor() }}>
          {getStatusIcon()}
        </span>
        <span className="status-text">{getStatusText()}</span>
      </div>

      {streamMetadata && status === Status.CONNECTED && (
        <div className="stream-info">
          <div className="info-item">
            <span className="info-label">Resolution:</span>
            <span className="info-value">{streamMetadata.resolution}</span>
          </div>
          <div className="info-item">
            <span className="info-label">Codec:</span>
            <span className="info-value">{streamMetadata.codec.toUpperCase()}</span>
          </div>
          <div className="info-item">
            <span className="info-label">FPS:</span>
            <span className="info-value">{streamMetadata.fps}</span>
          </div>
        </div>
      )}

      {error && status === Status.ERROR && (
        <div className="error-details">
          <p className="error-message">{error.message}</p>
          {error.details && (
            <p className="error-type">Error type: {error.type}</p>
          )}
        </div>
      )}

      <style jsx>{`
        .connection-status {
          background: #f9fafb;
          border: 1px solid #e5e7eb;
          border-radius: 8px;
          padding: 16px;
          margin-bottom: 16px;
        }

        .status-header {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 16px;
          font-weight: 500;
        }

        .status-icon {
          font-size: 20px;
          line-height: 1;
        }

        @keyframes pulse {
          0%, 100% {
            opacity: 1;
          }
          50% {
            opacity: 0.5;
          }
        }

        .status-icon:has(+ .status-text:is([data-loading])) {
          animation: pulse 1.5s ease-in-out infinite;
        }

        .status-text {
          color: #374151;
        }

        .stream-info {
          margin-top: 12px;
          padding-top: 12px;
          border-top: 1px solid #e5e7eb;
          display: flex;
          gap: 16px;
        }

        .info-item {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .info-label {
          font-size: 12px;
          color: #6b7280;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        .info-value {
          font-size: 14px;
          color: #111827;
          font-weight: 500;
        }

        .error-details {
          margin-top: 12px;
          padding: 12px;
          background: #fee2e2;
          border-radius: 4px;
        }

        .error-message {
          color: #991b1b;
          font-size: 14px;
          margin: 0;
        }

        .error-type {
          color: #991b1b;
          font-size: 12px;
          margin: 4px 0 0 0;
          opacity: 0.8;
        }
      `}</style>
    </div>
  );
}
