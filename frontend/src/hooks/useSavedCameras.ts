'use client';

import { useState, useEffect, useCallback } from 'react';
import { SavedCamera, StorageService } from '@/services/storage';

interface UseSavedCamerasReturn {
  savedCameras: SavedCamera[];
  saveCamera: (camera: Omit<SavedCamera, 'id' | 'savedAt'>) => Promise<SavedCamera>;
  updateCamera: (id: string, updates: Partial<Omit<SavedCamera, 'id' | 'savedAt'>>) => Promise<void>;
  deleteCamera: (id: string) => Promise<void>;
  getCamera: (id: string) => SavedCamera | null;
  isLimitReached: boolean;
  remainingSlots: number;
  refresh: () => void;
}

export function useSavedCameras(): UseSavedCamerasReturn {
  const [savedCameras, setSavedCameras] = useState<SavedCamera[]>([]);
  const [isClient, setIsClient] = useState(false);

  // Set client flag on mount
  useEffect(() => {
    setIsClient(true);
  }, []);

  // Load cameras on mount
  const loadCameras = useCallback(() => {
    if (typeof window !== 'undefined') {
      const cameras = StorageService.getSavedCameras();
      setSavedCameras(cameras);
    }
  }, []);

  useEffect(() => {
    if (isClient) {
      loadCameras();
    }
  }, [isClient, loadCameras]);

  const saveCamera = useCallback(
    async (camera: Omit<SavedCamera, 'id' | 'savedAt'>): Promise<SavedCamera> => {
      const saved = StorageService.saveCamera(camera);
      if (!saved) {
        throw new Error('Failed to save camera');
      }
      loadCameras();
      return saved;
    },
    [loadCameras]
  );

  const updateCamera = useCallback(
    async (id: string, updates: Partial<Omit<SavedCamera, 'id' | 'savedAt'>>) => {
      StorageService.updateCamera(id, updates);
      loadCameras();
    },
    [loadCameras]
  );

  const deleteCamera = useCallback(
    async (id: string) => {
      const success = StorageService.deleteCamera(id);
      if (success) {
        loadCameras();
      }
    },
    [loadCameras]
  );

  const getCamera = useCallback((id: string): SavedCamera | null => {
    return StorageService.getCamera(id);
  }, []);

  return {
    savedCameras,
    saveCamera,
    updateCamera,
    deleteCamera,
    getCamera,
    isLimitReached: isClient ? StorageService.isLimitReached() : false,
    remainingSlots: isClient ? StorageService.getRemainingSlots() : 5,
    refresh: loadCameras,
  };
}
