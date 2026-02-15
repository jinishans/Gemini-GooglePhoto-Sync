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

  // Debugging Helper: Log the origin to help fix "redirect_uri_mismatch"
  const currentOrigin = window.location.origin;
  console.log(`[GoogleAuth] Initializing. Current Origin: ${currentOrigin}`);
  
  try {
    tokenClient = window.google.accounts.oauth2.initTokenClient({
      client_id: clientId,
      // photoslibrary.readonly is a sensitive scope.
      // Ensure the user is added to 'Test Users' in Google Cloud Console if app is in Testing mode.
      scope: 'https://www.googleapis.com/auth/userinfo.profile https://www.googleapis.com/auth/userinfo.email https://www.googleapis.com/auth/photoslibrary.readonly',
      callback: async (response: any) => {
        if (response.error) {
          console.error("Google Auth Error:", response);
          if (response.error === 'access_denied') {
            alert("Login Failed: Access Denied.\n\nMost likely cause:\n1. Your email is not added to 'Test Users' in Google Cloud Console.\n2. The 'Google Photos Library API' is not enabled.\n\nPlease check the README for setup instructions.");
          }
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
            token: response.access_token // This token now has Photos access
          };

          callback(user);
        } catch (err) {
          console.error("Failed to fetch user profile", err);
        }
      },
    });
  } catch (e) {
    console.error("Error initializing Token Client:", e);
  }
};

/**
 * Triggers the Google Popup Login Flow.
 * @param forceConsent If true, forces the consent screen to appear again. Useful for missing scopes.
 */
export const performGoogleLogin = async (forceConsent: boolean = false): Promise<void> => {
  if (!tokenClient) {
    alert("Google Auth not initialized. Check console for details.");
    return;
  }
  
  // Request an access token. This triggers the popup.
  // Use prompt: 'consent' to ensure the user is asked for permissions again
  // This fixes the "insufficient authentication scopes" error if the user previously skipped permissions.
  const config = forceConsent ? { prompt: 'consent' } : {};
  tokenClient.requestAccessToken(config);
};