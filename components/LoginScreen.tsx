import React, { useEffect, useState } from 'react';
import { initializeGoogleAuth, performGoogleLogin } from '../services/authService';
import { User } from '../types';
import { Loader2, Plus, ArrowRight, AlertTriangle } from 'lucide-react';

interface LoginScreenProps {
  existingUsers: User[];
  onLoginSuccess: (user: User) => void;
  onSelectUser: (user: User) => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ existingUsers, onLoginSuccess, onSelectUser }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load Client ID from Env
  const GOOGLE_CLIENT_ID = process.env.REACT_APP_GOOGLE_CLIENT_ID || '';

  useEffect(() => {
    if (!GOOGLE_CLIENT_ID) {
      setError("Missing REACT_APP_GOOGLE_CLIENT_ID in .env file.");
      return;
    }

    // Common Mistake Check: API Key vs Client ID
    if (GOOGLE_CLIENT_ID.startsWith('AIza')) {
      setError("Configuration Error: You provided a Google API Key (starts with 'AIza'), but an OAuth 2.0 Client ID is required. It usually ends with '.apps.googleusercontent.com'. Check your Google Cloud Credentials.");
      return;
    }

    // Initialize the Google SDK with a callback to handle successful login
    const checkGoogle = setInterval(() => {
      if (window.google) {
        initializeGoogleAuth(GOOGLE_CLIENT_ID, (user) => {
            setIsLoading(false);
            onLoginSuccess(user);
        });
        clearInterval(checkGoogle);
      }
    }, 500);

    return () => clearInterval(checkGoogle);
  }, [GOOGLE_CLIENT_ID, onLoginSuccess]);

  const handleLoginClick = () => {
    if (!GOOGLE_CLIENT_ID) {
      alert("Please configure REACT_APP_GOOGLE_CLIENT_ID in .env");
      return;
    }
    setIsLoading(true);
    // Force consent to ensure we get the photoslibrary scope
    performGoogleLogin(true);
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Brand */}
        <div className="text-center mb-10">
           <div className="w-16 h-16 bg-gradient-to-tr from-blue-500 to-purple-500 rounded-2xl flex items-center justify-center text-white mx-auto mb-4 shadow-xl shadow-blue-500/20">
             <ArrowRight size={32} className="text-white/90" />
           </div>
           <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Gemini PhotoSync</h1>
           <p className="text-slate-500 dark:text-slate-400 mt-2">AI-Powered Cloud Gallery</p>
        </div>

        {error && (
            <div className="mb-4 p-4 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-3 text-amber-800 text-sm">
                <AlertTriangle className="shrink-0" size={18} />
                <div>
                    <p className="font-bold">Configuration Error</p>
                    <p>{error}</p>
                </div>
            </div>
        )}

        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
          
          <div className="p-6 border-b border-slate-100 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/50">
             <h2 className="text-lg font-semibold text-slate-800 dark:text-white">Sign In</h2>
             <p className="text-sm text-slate-500">Connect your Google Account</p>
          </div>

          <div className="p-4 space-y-2">
            {/* Existing Session List (In-memory for this demo) */}
            {existingUsers.map(user => (
              <button
                key={user.id}
                onClick={() => onSelectUser(user)}
                className="w-full flex items-center gap-4 p-4 hover:bg-slate-50 dark:hover:bg-slate-700/50 rounded-xl transition-colors text-left group"
              >
                <img src={user.avatarUrl} alt={user.name} className="w-10 h-10 rounded-full bg-slate-200" />
                <div className="flex-1">
                  <p className="font-medium text-slate-900 dark:text-white">{user.name}</p>
                  <p className="text-sm text-slate-500 group-hover:text-blue-500 transition-colors">{user.email}</p>
                </div>
                <ArrowRight size={18} className="text-slate-300 opacity-0 group-hover:opacity-100 transition-all -translate-x-2 group-hover:translate-x-0" />
              </button>
            ))}

            <button
              onClick={handleLoginClick}
              disabled={isLoading || !!error}
              className="w-full flex items-center justify-center gap-3 p-4 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-medium rounded-xl transition-all shadow-sm active:scale-[0.98]"
            >
               {isLoading ? (
                  <Loader2 size={20} className="animate-spin text-blue-600" />
               ) : (
                  <>
                    <img src="https://www.google.com/favicon.ico" className="w-5 h-5" alt="Google" />
                    <span>Sign in with Google</span>
                  </>
               )}
            </button>
          </div>
        </div>

        <p className="text-center text-xs text-slate-400 mt-8 max-w-xs mx-auto">
           Gemini PhotoSync uses the Google Photos Library API to visualize your cloud media.
           <br/><br/>
           <span className="font-bold text-amber-600">Important:</span> Ensure you tick all checkboxes in the Google consent screen to allow photo access.
        </p>
      </div>
    </div>
  );
};