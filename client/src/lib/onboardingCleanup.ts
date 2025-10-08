/**
 * Onboarding cleanup utilities for handling abandoned onboarding flows
 */

import { storage } from '@/firebase';
import { ref, deleteObject } from 'firebase/storage';
import { cleanupOnboardingByEmail } from './api';

export interface OnboardingCleanupOptions {
  draftId?: string;
  email?: string;
  cleanupStorage?: boolean;
}

/**
 * Clean up onboarding data from local storage
 */
export function cleanupOnboardingLocalStorage(): void {
  try {
    // Remove onboarding draft ID from localStorage
    localStorage.removeItem('onboarding_draft_id');
    
    // Remove any other onboarding-related localStorage items
    const keysToRemove = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('onboarding_')) {
        keysToRemove.push(key);
      }
    }
    
    keysToRemove.forEach(key => localStorage.removeItem(key));
    
    console.log('Cleaned up onboarding data from localStorage');
  } catch (error) {
    console.error('Error cleaning up localStorage:', error);
  }
}

/**
 * Clean up Firebase Storage files for a specific draft
 */
export async function cleanupOnboardingStorage(draftId: string): Promise<void> {
  try {
    // Delete logo file if it exists
    const logoPath = `mesters/${draftId}/logo`;
    const logoRef = ref(storage, logoPath);
    
    try {
      await deleteObject(logoRef);
      console.log(`Deleted logo file for draft ${draftId}`);
    } catch (error: any) {
      // File might not exist, which is fine
      if (error.code !== 'storage/object-not-found') {
        console.warn(`Error deleting logo file:`, error);
      }
    }
    
    // Delete any other files in the mesters/{draftId}/ directory
    // Note: Firebase Storage doesn't have a direct way to list files,
    // so we'll try to delete common file patterns
    const commonFiles = ['logo', 'profile-image', 'business-photo'];
    
    for (const fileName of commonFiles) {
      try {
        const fileRef = ref(storage, `mesters/${draftId}/${fileName}`);
        await deleteObject(fileRef);
        console.log(`Deleted file ${fileName} for draft ${draftId}`);
      } catch (error: any) {
        if (error.code !== 'storage/object-not-found') {
          console.warn(`Error deleting file ${fileName}:`, error);
        }
      }
    }
  } catch (error) {
    console.error('Error cleaning up Firebase Storage:', error);
  }
}

/**
 * Clean up onboarding data from the server
 */
export async function cleanupOnboardingServer(options: OnboardingCleanupOptions): Promise<void> {
  try {
    const { draftId, email } = options;
    
    if (email) {
      // Clean up all drafts for this email using the API
      await cleanupOnboardingByEmail(email);
      console.log(`Cleaned up server drafts for email: ${email}`);
    } else if (draftId) {
      // Clean up specific draft - this would need a separate API endpoint
      // For now, we'll skip this as the main use case is email-based cleanup
      console.log(`Skipping individual draft cleanup for ${draftId}`);
    }
  } catch (error) {
    console.error('Error cleaning up server data:', error);
  }
}

/**
 * Comprehensive cleanup of onboarding data
 */
export async function cleanupOnboardingData(options: OnboardingCleanupOptions = {}): Promise<void> {
  const { draftId, email, cleanupStorage = true } = options;
  
  try {
    // Clean up local storage
    cleanupOnboardingLocalStorage();
    
    // Clean up Firebase Storage if requested and we have a draft ID
    if (cleanupStorage && draftId) {
      await cleanupOnboardingStorage(draftId);
    }
    
    // Clean up server data
    await cleanupOnboardingServer({ draftId, email });
    
    console.log('Onboarding cleanup completed successfully');
  } catch (error) {
    console.error('Error during onboarding cleanup:', error);
    // Don't throw - cleanup should be best-effort
  }
}

/**
 * Check if user is currently in onboarding flow
 */
export function isInOnboardingFlow(): boolean {
  if (typeof window === 'undefined') return false;
  
  const draftId = localStorage.getItem('onboarding_draft_id');
  const currentPath = window.location.pathname;
  
  return Boolean(draftId) && currentPath.includes('/pro/onboarding');
}

/**
 * Get current onboarding draft ID from localStorage
 */
export function getCurrentOnboardingDraftId(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('onboarding_draft_id');
}

/**
 * Set up cleanup on page unload
 */
export function setupOnboardingCleanupOnUnload(): () => void {
  if (typeof window === 'undefined') return () => {};
  
  const handleBeforeUnload = async () => {
    const draftId = getCurrentOnboardingDraftId();
    if (draftId && isInOnboardingFlow()) {
      // Use sendBeacon for reliable cleanup on page unload
      try {
        const cleanupData = {
          draftId,
          timestamp: Date.now(),
        };
        
        // Send cleanup request using sendBeacon
        const blob = new Blob([JSON.stringify(cleanupData)], {
          type: 'application/json',
        });
        
        navigator.sendBeacon('/api/onboarding/drafts/cleanup/abandoned', blob);
      } catch (error) {
        console.error('Error sending cleanup beacon:', error);
      }
    }
  };
  
  window.addEventListener('beforeunload', handleBeforeUnload);
  
  // Return cleanup function
  return () => {
    window.removeEventListener('beforeunload', handleBeforeUnload);
  };
}
