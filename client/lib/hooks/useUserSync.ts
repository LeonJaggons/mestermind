import { usersApi, UserRole } from '@/lib/api/users';
import { API_BASE_URL } from "@/lib/api/config";

export interface SyncUserOptions {
  email: string;
  role?: UserRole;
  firebaseUid?: string;
}

/**
 * Sync a user to the database after Firebase authentication
 * Creates the user if they don't exist, or returns existing user
 */
export async function syncUserToDatabase(
  options: SyncUserOptions
): Promise<void> {
  try {
    // Try to get the user by email first
    try {
      const existingUser = await usersApi.getByEmail(options.email);
      
      // Update user if firebase_uid or role needs to be updated
      const needsUpdate = 
        (options.firebaseUid && !existingUser.firebase_uid) ||
        (options.role && existingUser.role !== options.role);
      
      if (needsUpdate) {
        await fetch(`${API_BASE_URL}/api/v1/users/${existingUser.id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            email: existingUser.email,
            role: options.role || existingUser.role,
            firebase_uid: options.firebaseUid || existingUser.firebase_uid,
          }),
        });
        console.log('Updated user with new data');
      }
      
      // User already exists
      console.log('User already exists in database');
      return;
    } catch (error) {
      // User doesn't exist, create them
      const userData = {
        email: options.email,
        role: options.role || 'customer' as UserRole,
        firebase_uid: options.firebaseUid,
      };
      
      await usersApi.create(userData);
      console.log('User created in database');
    }
  } catch (error) {
    console.error('Error syncing user to database:', error);
    // Don't throw - we don't want to block authentication if DB sync fails
    // The user is still authenticated in Firebase
  }
}
