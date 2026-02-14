import React, { useState } from 'react';
import { performGoogleLogin } from '../services/authService';
import { User } from '../types';
import { Loader2, Plus, User as UserIcon, LogIn, ArrowRight } from 'lucide-react';

interface LoginScreenProps {
  existingUsers: User[];
  onLoginSuccess: (user: User) => void;
  onSelectUser: (user: User) => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ existingUsers, onLoginSuccess, onSelectUser }) => {
  const [isLoading, setIsLoading] = useState(false);

  const handleGoogleLogin = async () => {
    setIsLoading(true);
    try {
      const user = await performGoogleLogin();
      onLoginSuccess(user);
    } catch (error) {
      console.error("Login failed", error);
    } finally {
      setIsLoading(false);
    }
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
           <p className="text-slate-500 dark:text-slate-400 mt-2">AI-Powered Local & Cloud Gallery Management</p>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
          
          {/* Header */}
          <div className="p-6 border-b border-slate-100 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/50">
             <h2 className="text-lg font-semibold text-slate-800 dark:text-white">
               {existingUsers.length > 0 ? 'Choose an account' : 'Sign in'}
             </h2>
             <p className="text-sm text-slate-500">to continue to Gemini PhotoSync</p>
          </div>

          {/* User List */}
          <div className="p-2">
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

            {/* Add Account Button */}
            <button
              onClick={handleGoogleLogin}
              disabled={isLoading}
              className={`w-full flex items-center gap-4 p-4 hover:bg-slate-50 dark:hover:bg-slate-700/50 rounded-xl transition-colors text-left ${existingUsers.length > 0 ? 'border-t border-slate-100 dark:border-slate-700 mt-2' : ''}`}
            >
               <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center text-slate-500">
                  {isLoading ? <Loader2 size={20} className="animate-spin" /> : <Plus size={20} />}
               </div>
               <div className="flex-1">
                  <p className="font-medium text-slate-900 dark:text-white">
                    {existingUsers.length > 0 ? 'Use another account' : 'Sign in with Google'}
                  </p>
                  {existingUsers.length === 0 && (
                     <div className="flex items-center gap-2 mt-1">
                        <img src="https://www.google.com/favicon.ico" className="w-3 h-3 opacity-70" alt="Google" />
                        <span className="text-xs text-slate-500">Access Google Photos Library</span>
                     </div>
                  )}
               </div>
            </button>
          </div>
        </div>

        {/* Footer */}
        <p className="text-center text-xs text-slate-400 mt-8">
           By continuing, you grant access to your Google Photos library for syncing and AI analysis. 
           Local albums are stored securely on your device.
        </p>
      </div>
    </div>
  );
};