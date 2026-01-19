/**
 * localStorage service for saving and managing camera configurations
 */

export interface SavedCamera {
  id: string;
  name: string;
  rtspUrl: string;
  requiresAuth: boolean;
  savedAt: string;
}

const STORAGE_KEY = 'timelapser_saved_cameras';
const MAX_CAMERAS = 5;

export class StorageService {
  /**
   * Get all saved cameras from localStorage
   */
  static getSavedCameras(): SavedCamera[] {
    // Check if we're in the browser
    if (typeof window === 'undefined') {
      return [];
    }
    
    try {
      const data = localStorage.getItem(STORAGE_KEY);
      if (!data) {
        return [];
      }
      const cameras = JSON.parse(data);
      return Array.isArray(cameras) ? cameras : [];
    } catch (error) {
      console.error('Error reading saved cameras:', error);
      return [];
    }
  }

  /**
   * Save a camera configuration (without credentials)
   */
  static saveCamera(camera: Omit<SavedCamera, 'id' | 'savedAt'>): SavedCamera | null {
    if (typeof window === 'undefined') {
      throw new Error('Cannot save cameras on server side');
    }
    
    try {
      const cameras = this.getSavedCameras();
      
      // Check camera limit
      if (cameras.length >= MAX_CAMERAS) {
        throw new Error(`Cannot save more than ${MAX_CAMERAS} cameras`);
      }
      
      // Check for duplicate URL
      const existing = cameras.find(c => c.rtspUrl === camera.rtspUrl);
      if (existing) {
        throw new Error('Camera with this URL is already saved');
      }
      
      // Create new camera entry
      const newCamera: SavedCamera = {
        id: this.generateId(),
        ...camera,
        savedAt: new Date().toISOString(),
      };
      
      cameras.push(newCamera);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(cameras));
      
      return newCamera;
    } catch (error) {
      console.error('Error saving camera:', error);
      throw error;
    }
  }

  /*if (typeof window === 'undefined') {
      throw new Error('Cannot update cameras on server side');
    }
    
    *
   * Update a saved camera configuration
   */
  static updateCamera(id: string, updates: Partial<Omit<SavedCamera, 'id' | 'savedAt'>>): boolean {
    try {
      const cameras = this.getSavedCameras();
      const index = cameras.findIndex(c => c.id === id);
      
      if (index === -1) {
        throw new Error('Camera not found');
      }
      
      cameras[index] = {
        ...cameras[index],
        ...updates,
      };
      
      localStorage.setItem(STORAGE_KEY, JSON.stringify(cameras));
      return true;
    } catch (error) {
      console.error('Error updating camera:', error);
      throw error;
    }
  }

  /*if (typeof window === 'undefined') {
      return false;
    }
    
    *
   * Delete a saved camera
   */
  static deleteCamera(id: string): boolean {
    try {
      const cameras = this.getSavedCameras();
      const filtered = cameras.filter(c => c.id !== id);
      
      if (filtered.length === cameras.length) {
        return false; // Camera not found
      }
      
      localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
      return true;
    } catch (error) {
      console.error('Error deleting camera:', error);
      throw error;
    }
  }

  /**
   * Get a specific camera by ID
   */
  static getCamera(id: string): SavedCamera | null {
    const cameras = this.getSavedCameras();
    return cameras.find(c => c.id === id) || null;
  }

  /**
   * Check if camera limit is reached
   */
  static isLimitReached(): boolean {
    return this.getSavedCameras().length >= MAX_CAMERAS;
  }

  /**
   * Get remaining camera slots
   */
  static getRemainingSlots(): number {
    return Math.max(0, MAX_CAMERAS - this.getSavedCameras().length);
  }

  /**
   * Generate a unique ID for a camera
   */
  private static generateId(): string {
    return `cam_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}
