'use client';

import { SavedCamera } from '@/services/storage';
import { useState } from 'react';

interface SavedCamerasProps {
  cameras: SavedCamera[];
  onSelect: (camera: SavedCamera) => void;
  onDelete: (id: string) => void;
  disabled?: boolean;
}

export default function SavedCameras({
  cameras,
  onSelect,
  onDelete,
  disabled = false,
}: SavedCamerasProps) {
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const handleDelete = (id: string) => {
    setDeleteConfirmId(id);
  };

  const confirmDelete = (id: string) => {
    onDelete(id);
    setDeleteConfirmId(null);
  };

  const cancelDelete = () => {
    setDeleteConfirmId(null);
  };

  if (cameras.length === 0) {
    return (
      <div className="saved-cameras empty">
        <p className="empty-message">No saved cameras yet</p>
        
        <style jsx>{`
          .saved-cameras.empty {
            background: #f9fafb;
            border: 1px dashed #d1d5db;
            border-radius: 8px;
            padding: 24px;
            text-align: center;
          }

          .empty-message {
            color: #6b7280;
            margin: 0;
          }
        `}</style>
      </div>
    );
  }

  return (
    <div className="saved-cameras">
      <h3 className="title">Saved Cameras ({cameras.length}/5)</h3>
      
      <div className="camera-list">
        {cameras.map((camera) => (
          <div key={camera.id} className="camera-item">
            <div className="camera-info">
              <div className="camera-name">{camera.name}</div>
              <div className="camera-url">{camera.rtspUrl}</div>
              {camera.requiresAuth && (
                <div className="camera-badge">Requires Authentication</div>
              )}
            </div>
            
            <div className="camera-actions">
              {deleteConfirmId === camera.id ? (
                <div className="confirm-delete">
                  <span className="confirm-text">Delete?</span>
                  <button
                    onClick={() => confirmDelete(camera.id)}
                    className="btn btn-confirm"
                    disabled={disabled}
                  >
                    Yes
                  </button>
                  <button
                    onClick={cancelDelete}
                    className="btn btn-cancel"
                    disabled={disabled}
                  >
                    No
                  </button>
                </div>
              ) : (
                <>
                  <button
                    onClick={() => onSelect(camera)}
                    className="btn btn-select"
                    disabled={disabled}
                  >
                    Connect
                  </button>
                  <button
                    onClick={() => handleDelete(camera.id)}
                    className="btn btn-delete"
                    disabled={disabled}
                  >
                    ✕
                  </button>
                </>
              )}
            </div>
          </div>
        ))}
      </div>

      <style jsx>{`
        .saved-cameras {
          background: #fff;
          border-radius: 8px;
          padding: 24px;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
        }

        .title {
          font-size: 18px;
          font-weight: 600;
          color: #111827;
          margin: 0 0 16px 0;
        }

        .camera-list {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .camera-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 12px;
          border: 1px solid #e5e7eb;
          border-radius: 6px;
          transition: border-color 0.2s;
        }

        .camera-item:hover {
          border-color: #d1d5db;
        }

        .camera-info {
          flex: 1;
          min-width: 0;
        }

        .camera-name {
          font-size: 16px;
          font-weight: 500;
          color: #111827;
          margin-bottom: 4px;
        }

        .camera-url {
          font-size: 13px;
          color: #6b7280;
          font-family: 'Courier New', monospace;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .camera-badge {
          display: inline-block;
          margin-top: 6px;
          padding: 2px 8px;
          background: #fef3c7;
          color: #92400e;
          font-size: 11px;
          border-radius: 4px;
          font-weight: 500;
        }

        .camera-actions {
          display: flex;
          gap: 8px;
          align-items: center;
        }

        .confirm-delete {
          display: flex;
          gap: 8px;
          align-items: center;
        }

        .confirm-text {
          font-size: 14px;
          color: #6b7280;
          font-weight: 500;
        }

        .btn {
          padding: 8px 16px;
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

        .btn-select {
          background-color: #0070f3;
          color: white;
        }

        .btn-select:hover:not(:disabled) {
          background-color: #0051cc;
        }

        .btn-delete {
          background-color: #f3f4f6;
          color: #ef4444;
          padding: 8px 12px;
        }

        .btn-delete:hover:not(:disabled) {
          background-color: #fee2e2;
        }

        .btn-confirm {
          background-color: #ef4444;
          color: white;
          padding: 6px 12px;
        }

        .btn-confirm:hover:not(:disabled) {
          background-color: #dc2626;
        }

        .btn-cancel {
          background-color: #f3f4f6;
          color: #6b7280;
          padding: 6px 12px;
        }

        .btn-cancel:hover:not(:disabled) {
          background-color: #e5e7eb;
        }
      `}</style>
    </div>
  );
}
