import React, { useState } from 'react';
import { Globe, Server, Wifi, Play, StopCircle, Smartphone, Monitor, Cast, ExternalLink } from 'lucide-react';

export const GalleryServer: React.FC = () => {
  const [isServerRunning, setIsServerRunning] = useState(false);
  const [port, setPort] = useState(3000);

  const localIp = "192.168.1.45";
  const serverUrl = `http://${localIp}:${port}`;

  const toggleServer = () => {
    setIsServerRunning(!isServerRunning);
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Globe className="text-blue-500" /> Local Gallery Server
          </h2>
          <p className="text-slate-500 dark:text-slate-400 mt-1">
            Host your own photo website on your local network. Access your albums from any device in your home.
          </p>
        </div>
        
        <div className="flex items-center gap-4 bg-white dark:bg-slate-800 p-2 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700">
           <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium ${isServerRunning ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-400'}`}>
              <div className={`w-2 h-2 rounded-full ${isServerRunning ? 'bg-green-500 animate-pulse' : 'bg-slate-400'}`} />
              {isServerRunning ? 'Online' : 'Offline'}
           </div>
           <button 
             onClick={toggleServer}
             className={`px-6 py-2 rounded-lg font-bold text-white shadow-lg transition-all transform active:scale-95 flex items-center gap-2
               ${isServerRunning 
                 ? 'bg-red-500 hover:bg-red-600 shadow-red-500/20' 
                 : 'bg-green-500 hover:bg-green-600 shadow-green-500/20'
               }`}
           >
             {isServerRunning ? <><StopCircle size={18} /> Stop Server</> : <><Play size={18} /> Start Server</>}
           </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Connection Info Panel */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-sm border border-slate-200 dark:border-slate-700">
            <h3 className="font-semibold text-lg mb-4 flex items-center gap-2">
                <Wifi size={20} className="text-slate-400" /> Connection Details
            </h3>
            
            {isServerRunning ? (
                <div className="space-y-6">
                    <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-xl border border-blue-100 dark:border-blue-800">
                        <p className="text-xs text-blue-600 dark:text-blue-400 uppercase font-bold tracking-wider mb-1">Local Network URL</p>
                        <div className="flex items-center justify-between">
                            <code className="text-xl font-mono text-slate-800 dark:text-slate-200">{serverUrl}</code>
                            <a href="#" className="text-blue-500 hover:text-blue-600"><ExternalLink size={18} /></a>
                        </div>
                    </div>

                    <div className="flex justify-center py-4">
                        {/* Simulated QR Code */}
                        <div className="bg-white p-4 rounded-xl border-2 border-slate-100 dark:border-slate-600 shadow-sm">
                            <div className="w-40 h-40 bg-slate-900 dark:bg-slate-200 flex items-center justify-center text-xs text-white dark:text-slate-900">
                                [QR Code Placeholder]
                            </div>
                        </div>
                    </div>

                    <div className="text-center text-sm text-slate-500">
                        Scan with your phone to view gallery
                    </div>
                </div>
            ) : (
                <div className="h-64 flex flex-col items-center justify-center text-slate-400 text-center border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-xl">
                    <Server size={48} className="mb-4 opacity-50" />
                    <p>Server is stopped.</p>
                    <p className="text-sm mt-1">Click "Start Server" to enable access.</p>
                </div>
            )}
        </div>

        {/* Device Compatibility & Features */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-sm border border-slate-200 dark:border-slate-700 flex flex-col justify-between">
            <div>
                <h3 className="font-semibold text-lg mb-4">Supported Devices</h3>
                <div className="space-y-4">
                    <div className="flex items-center gap-4 p-3 hover:bg-slate-50 dark:hover:bg-slate-700/50 rounded-lg transition-colors">
                        <div className="bg-purple-100 dark:bg-purple-900/30 p-2.5 rounded-lg text-purple-600"><Monitor size={20} /></div>
                        <div>
                            <p className="font-medium">Desktop & Laptop</p>
                            <p className="text-xs text-slate-500">Chrome, Safari, Edge, Firefox</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-4 p-3 hover:bg-slate-50 dark:hover:bg-slate-700/50 rounded-lg transition-colors">
                        <div className="bg-blue-100 dark:bg-blue-900/30 p-2.5 rounded-lg text-blue-600"><Smartphone size={20} /></div>
                        <div>
                            <p className="font-medium">Mobile & Tablet</p>
                            <p className="text-xs text-slate-500">Responsive touch interface</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-4 p-3 hover:bg-slate-50 dark:hover:bg-slate-700/50 rounded-lg transition-colors">
                        <div className="bg-orange-100 dark:bg-orange-900/30 p-2.5 rounded-lg text-orange-600"><Cast size={20} /></div>
                        <div>
                            <p className="font-medium">Smart TV</p>
                            <p className="text-xs text-slate-500">Cast slideshows to big screen</p>
                        </div>
                    </div>
                </div>
            </div>
            
            <div className="mt-6 pt-6 border-t border-slate-100 dark:border-slate-700">
                <h4 className="font-medium text-sm mb-2">Web Server Settings</h4>
                <div className="flex items-center justify-between bg-slate-50 dark:bg-slate-900 p-3 rounded-lg">
                    <span className="text-sm text-slate-600 dark:text-slate-400">Port</span>
                    <input 
                        type="number" 
                        value={port} 
                        onChange={(e) => setPort(Number(e.target.value))}
                        className="w-20 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded px-2 py-1 text-right text-sm"
                        disabled={isServerRunning}
                    />
                </div>
            </div>
        </div>

        {/* Live Preview (Simulated Website) */}
        <div className="bg-slate-900 rounded-2xl p-2 shadow-xl border-4 border-slate-800 flex flex-col overflow-hidden relative group">
             <div className="absolute top-4 left-1/2 -translate-x-1/2 w-20 h-6 bg-black rounded-b-xl z-20 flex justify-center items-center">
                 <div className="w-12 h-1 bg-slate-800 rounded-full"></div>
             </div>
             
             {/* Simulated Browser Bar */}
             <div className="bg-slate-800 p-2 flex items-center gap-2 rounded-t-lg mb-1">
                 <div className="flex gap-1">
                     <div className="w-2 h-2 rounded-full bg-red-500"></div>
                     <div className="w-2 h-2 rounded-full bg-yellow-500"></div>
                     <div className="w-2 h-2 rounded-full bg-green-500"></div>
                 </div>
                 <div className="flex-1 bg-slate-700 rounded px-2 py-0.5 text-[10px] text-slate-400 font-mono text-center truncate">
                     {isServerRunning ? serverUrl : 'Server Offline'}
                 </div>
             </div>

             {/* Web Interface Content */}
             <div className="flex-1 bg-white dark:bg-slate-900 overflow-hidden relative">
                 {!isServerRunning && (
                     <div className="absolute inset-0 bg-black/60 backdrop-blur-sm z-10 flex items-center justify-center">
                         <p className="text-white font-medium px-4 py-2 bg-slate-800 rounded-lg">Preview Offline</p>
                     </div>
                 )}
                 {/* Hero */}
                 <div className="h-32 bg-gradient-to-r from-blue-600 to-purple-600 relative p-4 flex items-end">
                     <h1 className="text-white text-lg font-bold">My Gallery</h1>
                 </div>
                 {/* Grid */}
                 <div className="p-2 grid grid-cols-3 gap-1">
                     {[1,2,3,4,5,6,7,8,9].map(i => (
                         <div key={i} className="aspect-square bg-slate-200 dark:bg-slate-800 rounded-md overflow-hidden">
                             <img src={`https://picsum.photos/seed/${i*22}/200/200`} className="w-full h-full object-cover" />
                         </div>
                     ))}
                 </div>
             </div>
        </div>
      </div>
    </div>
  );
};
