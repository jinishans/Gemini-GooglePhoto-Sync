import React from 'react';
import { Cloud, CheckCircle2, RotateCw, Pause, Play, FolderOpen, Settings, X } from 'lucide-react';
import { SyncStatus } from '../types';

interface TrayPopupProps {
  status: SyncStatus;
  onClose: () => void;
  onOpenApp: () => void;
  onToggleSync: () => void;
}

export const TrayPopup: React.FC<TrayPopupProps> = ({ status, onClose, onOpenApp, onToggleSync }) => {
  const percentage = Math.round((status.syncedFiles / status.totalFiles) * 100) || 0;

  return (
    <div className="fixed bottom-4 right-4 w-80 bg-white dark:bg-slate-800 rounded-xl shadow-2xl border border-slate-200 dark:border-slate-700 overflow-hidden z-50 flex flex-col animate-in slide-in-from-bottom-5 fade-in duration-300">
      {/* Header */}
      <div className="bg-slate-100 dark:bg-slate-900 p-4 flex justify-between items-center border-b border-slate-200 dark:border-slate-700">
        <div className="flex items-center gap-2">
          <div className="bg-blue-600 p-1.5 rounded-lg text-white">
            <Cloud size={16} fill="currentColor" />
          </div>
          <span className="font-semibold text-sm">Gemini PhotoSync</span>
        </div>
        <button onClick={onClose} className="text-slate-500 hover:text-slate-800 dark:hover:text-slate-200">
          <X size={16} />
        </button>
      </div>

      {/* Sync Status */}
      <div className="p-5 flex flex-col gap-4">
        <div className="flex justify-between items-end">
          <div>
            <h3 className="text-lg font-bold">
              {status.isSyncing ? 'Syncing...' : 'Up to date'}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {status.syncedFiles} of {status.totalFiles} items synced
            </p>
          </div>
          <div className="text-right">
             <span className="text-2xl font-light text-blue-600 dark:text-blue-400">{percentage}%</span>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="h-2 w-full bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
          <div 
            className="h-full bg-blue-600 transition-all duration-500 ease-out" 
            style={{ width: `${percentage}%` }}
          />
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-4 gap-2 mt-2">
          <button 
            onClick={onToggleSync}
            className="flex flex-col items-center justify-center gap-1 p-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors group"
          >
            <div className="bg-slate-100 dark:bg-slate-700 p-2 rounded-full group-hover:bg-blue-50 dark:group-hover:bg-blue-900/30">
              {status.isSyncing ? <Pause size={16} className="text-slate-600 dark:text-slate-300" /> : <Play size={16} className="text-blue-600" />}
            </div>
            <span className="text-[10px] font-medium text-slate-500">{status.isSyncing ? 'Pause' : 'Resume'}</span>
          </button>

          <button 
            onClick={onOpenApp}
            className="flex flex-col items-center justify-center gap-1 p-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors group"
          >
            <div className="bg-slate-100 dark:bg-slate-700 p-2 rounded-full group-hover:bg-blue-50 dark:group-hover:bg-blue-900/30">
              <FolderOpen size={16} className="text-slate-600 dark:text-slate-300" />
            </div>
            <span className="text-[10px] font-medium text-slate-500">Open Folder</span>
          </button>

          <button className="flex flex-col items-center justify-center gap-1 p-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors group">
            <div className="bg-slate-100 dark:bg-slate-700 p-2 rounded-full group-hover:bg-blue-50 dark:group-hover:bg-blue-900/30">
              <RotateCw size={16} className="text-slate-600 dark:text-slate-300" />
            </div>
            <span className="text-[10px] font-medium text-slate-500">Check Now</span>
          </button>

          <button 
            onClick={onOpenApp}
            className="flex flex-col items-center justify-center gap-1 p-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors group"
          >
            <div className="bg-slate-100 dark:bg-slate-700 p-2 rounded-full group-hover:bg-blue-50 dark:group-hover:bg-blue-900/30">
              <Settings size={16} className="text-slate-600 dark:text-slate-300" />
            </div>
            <span className="text-[10px] font-medium text-slate-500">Settings</span>
          </button>
        </div>
      </div>
      
      {/* Footer */}
      <div className="bg-slate-50 dark:bg-slate-900/50 px-5 py-3 border-t border-slate-200 dark:border-slate-700 flex justify-between items-center text-xs text-slate-500">
        <span className="flex items-center gap-1">
          <CheckCircle2 size={12} className="text-green-500" /> 
          Last synced: {status.lastSynced}
        </span>
        <span>{status.storageUsed} used</span>
      </div>
    </div>
  );
};
