import { User } from '../types';

// Declare global Google object to avoid TS errors without @types/google.accounts
declare global {
  interface Window {
    google: any;
  }
}

let tokenClient: any;

/**
 * Initializes the Google Identity Services Client.
 * Must be called when the app/component mounts.
 */
export const initializeGoogleAuth = (clientId: string, callback: (user: User) => void) => {
  if (!window.google) {
    console.error("Google Identity Script not loaded");
    return;
  }

  tokenClient = window.google.accounts.oauth2.initTokenClient({
    client_id: clientId,
    scope: 'https://www.googleapis.com/auth/userinfo.profile https://www.googleapis.com/auth/userinfo.email',
    callback: async (response: any) => {
      if (response.error) {
        console.error(response);
        return;
      }
      
      // Use the access token to fetch user details
      try {
        const userInfoRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
          headers: { Authorization: `Bearer ${response.access_token}` },
        });
        
        const profile = await userInfoRes.json();
        
        const user: User = {
          id: profile.sub,
          name: profile.name,
          email: profile.email,
          avatarUrl: profile.picture,
          token: response.access_token
        };

        callback(user);
      } catch (err) {
        console.error("Failed to fetch user profile", err);
      }
    },
  });
};

/**
 * Triggers the Google Popup Login Flow.
 */
export const performGoogleLogin = async (): Promise<void> => {
  if (!tokenClient) {
    alert("Google Auth not initialized. Check your Client ID in .env");
    return;
  }
  
  // Request an access token. This triggers the popup.
  // We use requestAccessToken for API access, or if you just wanted ID, we'd use OneTap/Login.
  tokenClient.requestAccessToken();
};
