'use client';

import { ErrorDetails } from '@/types/connection';

interface ErrorMessageProps {
  error: ErrorDetails | null;
  onDismiss?: () => void;
}

export default function ErrorMessage({ error, onDismiss }: ErrorMessageProps) {
  if (!error) return null;

  return (
    <div className="error-message-container">
      <div className="error-content">
        <div className="error-icon">⚠</div>
        <div className="error-text">
          <p className="error-title">{error.message}</p>
          {error.details && (
            <p className="error-details">
              {JSON.stringify(error.details, null, 2)}
            </p>
          )}
        </div>
        {onDismiss && (
          <button onClick={onDismiss} className="error-dismiss">
            ✕
          </button>
        )}
      </div>

      <style jsx>{`
        .error-message-container {
          background: #fee2e2;
          border: 1px solid #fca5a5;
          border-radius: 8px;
          padding: 16px;
          margin-bottom: 16px;
        }

        .error-content {
          display: flex;
          gap: 12px;
          align-items: flex-start;
        }

        .error-icon {
          font-size: 24px;
          color: #dc2626;
          flex-shrink: 0;
        }

        .error-text {
          flex: 1;
        }

        .error-title {
          color: #991b1b;
          font-size: 14px;
          font-weight: 500;
          margin: 0 0 4px 0;
        }

        .error-details {
          color: #991b1b;
          font-size: 12px;
          margin: 0;
          opacity: 0.8;
          font-family: monospace;
          white-space: pre-wrap;
        }

        .error-dismiss {
          background: none;
          border: none;
          color: #991b1b;
          font-size: 20px;
          cursor: pointer;
          padding: 0;
          width: 24px;
          height: 24px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 4px;
          transition: background-color 0.2s;
        }

        .error-dismiss:hover {
          background-color: rgba(0, 0, 0, 0.1);
        }
      `}</style>
    </div>
  );
}
