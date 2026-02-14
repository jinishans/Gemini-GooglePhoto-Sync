import React, { useState, useEffect, useRef } from 'react';
import { 
  Cloud, 
  Settings, 
  Image as ImageIcon, 
  LayoutGrid, 
  HardDrive, 
  Menu, 
  Moon, 
  Sun,
  Search,
  Plus,
  RefreshCw,
  LogOut,
  ChevronRight,
  Folder,
  FolderPlus,
  Download,
  Upload,
  CheckCircle2,
  ArrowRightLeft,
  Check,
  Globe,
  XCircle,
  Sparkles,
  Database,
  BrainCircuit,
  Wand2,
  Cpu,
  Server,
  Video,
  Play,
  User as UserIcon,
  MoreVertical
} from 'lucide-react';
import { TrayPopup } from './components/TrayPopup';
import { SmartUpload } from './components/SmartUpload';
import { GalleryServer } from './components/GalleryServer';
import { VoiceInput } from './components/VoiceInput';
import { LoginScreen } from './components/LoginScreen';
import { AppView, Photo, Album, SyncStatus, PhotoSource, SearchMode, VectorDBType, LocalVisionModel, AIBackend, ImageGenModel, VideoGenModel, User } from './types';
import { expandSearchQuery } from './services/geminiService';
import { vectorDb } from './services/vectorService';
import { localAI, defaultAIConfig } from './services/localAIService';

// Placeholder Data Generators (Simulating Cloud Data for a specific User)
const generateMockCloudPhotos = (count: number, userId: string): Photo[] => {
  const albums = ['Vacation 2023', 'Pets', 'Family Reunion', 'Food Blog', 'Nature Hikes'];
  const userSeed = userId.charCodeAt(userId.length - 1); // Simple seed variation
  return Array.from({ length: count }).map((_, i) => ({
    id: `cloud-photo-${userId}-${i}`,
    userId: userId,
    url: `https://picsum.photos/seed/${userSeed + i + 500}/400/400`,
    name: `IMG_CLOUD_${20230000 + i}.jpg`,
    album: albums[(i + userSeed) % albums.length],
    tags: ['cloud', 'backup'],
    date: new Date(Date.now() - i * 86400000).toLocaleDateString(),
    source: 'cloud', 
    size: `${(Math.random() * 5 + 1).toFixed(1)} MB`
  }));
};

const App: React.FC = () => {
  // Auth State
  const [users, setUsers] = useState<User[]>([]);
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  // App State
  const [currentView, setCurrentView] = useState<AppView>(AppView.DASHBOARD);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [showTray, setShowTray] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  
  // Data State
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [albums, setAlbums] = useState<Album[]>([]);
  const [syncedAlbumNames, setSyncedAlbumNames] = useState<Set<string>>(new Set());
  
  // Search State
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchingAI, setIsSearchingAI] = useState(false);
  const [filteredPhotos, setFilteredPhotos] = useState<Photo[]>([]);
  const [activeSearchTags, setActiveSearchTags] = useState<string[]>([]);
  const [searchMode, setSearchMode] = useState<SearchMode>(SearchMode.LOCAL_VECTOR);
  
  // AI Config State
  const [aiConfig, setAiConfig] = useState(defaultAIConfig);

  // Generation State
  const [genPrompt, setGenPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedMedia, setGeneratedMedia] = useState<{url: string, type: 'image'|'video'} | null>(null);

  const [syncStatus, setSyncStatus] = useState<SyncStatus>({
    totalFiles: 0,
    syncedFiles: 0,
    isSyncing: false,
    lastSynced: 'Never',
    storageUsed: '0 GB',
    uploadQueue: 0,
    downloadQueue: 0,
    currentAction: 'Idle',
    vectorIndexCount: 0
  });

  // Local Folder State
  const [localFolderHandle, setLocalFolderHandle] = useState<any | null>(null);
  const [scanningLocal, setScanningLocal] = useState(false);
  const folderInputRef = useRef<HTMLInputElement>(null);

  // --- Auth & Data Loading Logic ---

  // When currentUser changes, load their "Cloud" data and their specific local data
  useEffect(() => {
    if (!currentUser) {
        setPhotos([]);
        setAlbums([]);
        return;
    }

    // Simulate fetching Google Photos for THIS user
    const cloudPhotos = generateMockCloudPhotos(15, currentUser.id);
    
    // In a real app, we would also load persisted LOCAL photos for this user from IndexedDB
    // For now, we start with just the cloud mock
    setPhotos(cloudPhotos);
    setSyncedAlbumNames(new Set()); // Reset sync selection on user switch
    setLocalFolderHandle(null); // Reset local folder connection on user switch
    
  }, [currentUser]);

  // Handle Login / User Switch
  const handleLoginSuccess = (user: User) => {
    setUsers(prev => [...prev, user]);
    setCurrentUser(user);
    setCurrentView(AppView.DASHBOARD);
  };

  const handleUserSwitch = (user: User) => {
    setCurrentUser(user);
    setCurrentView(AppView.DASHBOARD);
  };

  const handleLogout = () => {
    if (currentUser) {
       // Just switch to null (show login screen), but keep user in the list for quick switch
       setCurrentUser(null);
    }
  };

  // --- Core Sync Logic (Depends on photos state) ---

  // Listen for Tray Events (Electron IPC)
  useEffect(() => {
    if ((window as any).require) {
      try {
        const { ipcRenderer } = (window as any).require('electron');
        const handleSyncTrigger = () => {
          console.log("Tray requested sync");
          if (currentUser) {
             setSyncStatus(prev => ({ ...prev, isSyncing: true }));
          }
        };

        ipcRenderer.on('trigger-sync', handleSyncTrigger);
        return () => {
          ipcRenderer.removeListener('trigger-sync', handleSyncTrigger);
        };
      } catch (e) {
        console.warn("Electron IPC not available");
      }
    }
  }, [currentUser]);

  // Vector Indexing Effect
  useEffect(() => {
    const unindexedPhotos = photos.filter(p => !p.embedding);
    if (unindexedPhotos.length > 0) {
      setSyncStatus(prev => ({ ...prev, currentAction: 'Indexing photos for AI...' }));
      const timer = setTimeout(async () => {
        for (const photo of unindexedPhotos) {
           await vectorDb.addToIndex(photo);
        }
        setSyncStatus(prev => ({ 
           ...prev, 
           currentAction: 'Index Updated', 
           vectorIndexCount: vectorDb.getIndexSize() 
        }));
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [photos]);

  // Update Albums list
  useEffect(() => {
    if (!currentUser) return;

    const albumCounts: Record<string, { count: number, cover: string }> = {};
    photos.forEach(p => {
      if (!albumCounts[p.album]) {
        albumCounts[p.album] = { count: 0, cover: p.url };
      }
      albumCounts[p.album].count++;
    });

    const newAlbums = Object.keys(albumCounts).map((name, i) => ({
      id: `album-${i}`,
      userId: currentUser.id,
      name,
      coverUrl: albumCounts[name].cover,
      count: albumCounts[name].count,
      source: 'mixed' as const,
      syncEnabled: syncedAlbumNames.has(name)
    }));
    setAlbums(newAlbums);

    const downloadablePhotos = photos.filter(p => p.source === 'cloud' && syncedAlbumNames.has(p.album));
    const uploadablePhotos = photos.filter(p => p.source === 'local');
    
    setSyncStatus(prev => ({
      ...prev,
      totalFiles: photos.length,
      downloadQueue: downloadablePhotos.length,
      uploadQueue: uploadablePhotos.length,
      storageUsed: '4.2 GB', 
      vectorIndexCount: vectorDb.getIndexSize()
    }));

  }, [photos, syncedAlbumNames, currentUser]);

  // Sync Engine Effect
  useEffect(() => {
    let interval: any;
    if (syncStatus.isSyncing) {
      interval = setInterval(() => {
        setPhotos(prevPhotos => {
          let updatedPhotos = [...prevPhotos];
          let action = 'Scanning...';
          let { uploadQueue, downloadQueue } = syncStatus;

          const cloudOnly = updatedPhotos.find(p => p.source === 'cloud' && syncedAlbumNames.has(p.album));
          
          if (cloudOnly && Math.random() > 0.4) {
             updatedPhotos = updatedPhotos.map(p => 
               p.id === cloudOnly.id ? { ...p, source: 'synced' } : p
             );
             action = `Downloading ${cloudOnly.name}...`;
             downloadQueue = Math.max(0, updatedPhotos.filter(p => p.source === 'cloud' && syncedAlbumNames.has(p.album)).length);
          }

          const localOnly = updatedPhotos.find(p => p.source === 'local');
          if (localOnly && Math.random() > 0.4) {
             updatedPhotos = updatedPhotos.map(p => 
               p.id === localOnly.id ? { ...p, source: 'synced' } : p
             );
             action = `Uploading ${localOnly.name}...`;
             uploadQueue = Math.max(0, updatedPhotos.filter(p => p.source === 'local').length);
          }
          
          const isQueueEmpty = downloadQueue === 0 && uploadQueue === 0;
          setSyncStatus(prev => ({
            ...prev,
            syncedFiles: updatedPhotos.filter(p => p.source === 'synced').length,
            uploadQueue,
            downloadQueue,
            currentAction: isQueueEmpty ? 'All selected synced' : action,
            isSyncing: !isQueueEmpty,
            lastSynced: isQueueEmpty ? 'Just now' : prev.lastSynced
          }));
          return updatedPhotos;
        });
      }, 800);
    }
    return () => clearInterval(interval);
  }, [syncStatus.isSyncing, syncedAlbumNames]);

  // Handle Search Logic
  useEffect(() => {
    if (!searchQuery) {
        setFilteredPhotos(photos);
        setActiveSearchTags([]);
        return;
    }

    const performSearch = async () => {
        setIsSearchingAI(true);
        setActiveSearchTags([]);

        if (searchMode === SearchMode.LOCAL_VECTOR) {
             const resultIds = await vectorDb.search(searchQuery);
             vectorDb.learnUserPreference(searchQuery);
             const localTags = await localAI.expandQueryWithLocalLLM(searchQuery);
             setActiveSearchTags(localTags);
             const results = photos.filter(p => resultIds.includes(p.id));
             setFilteredPhotos(results);
        } else {
             const tags = await expandSearchQuery(searchQuery);
             setActiveSearchTags(tags);
             const results = photos.filter(photo => {
                const searchString = `${photo.name} ${photo.album} ${photo.tags.join(' ')}`.toLowerCase();
                return tags.some(tag => searchString.includes(tag.toLowerCase()));
             });
             setFilteredPhotos(results);
        }
        
        setIsSearchingAI(false);
    };

    const timeout = setTimeout(performSearch, 600);
    return () => clearTimeout(timeout);
  }, [searchQuery, photos, searchMode]);


  // Theme Toggle
  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);

  const toggleAlbumSync = (albumName: string) => {
    setSyncedAlbumNames(prev => {
      const newSet = new Set(prev);
      if (newSet.has(albumName)) {
        newSet.delete(albumName);
      } else {
        newSet.add(albumName);
      }
      return newSet;
    });
    if (!syncStatus.isSyncing) {
       setSyncStatus(prev => ({ ...prev, isSyncing: true }));
    }
  };

  const toggleAllAlbums = (enable: boolean) => {
    if (enable) {
      const allNames = albums.map(a => a.name);
      setSyncedAlbumNames(new Set(allNames));
    } else {
      setSyncedAlbumNames(new Set());
    }
    setSyncStatus(prev => ({ ...prev, isSyncing: true }));
  };

  const handlePhotoAnalyzed = (newPhoto: Photo) => {
    if (!currentUser) return;
    const photoWithSource = { ...newPhoto, source: 'local' as PhotoSource, userId: currentUser.id };
    setPhotos(prev => [photoWithSource, ...prev]);
  };

  const toggleSync = () => {
    setSyncStatus(prev => ({ ...prev, isSyncing: !prev.isSyncing }));
  };

  const updateAIConfig = (key: keyof typeof aiConfig, value: any) => {
    const newConfig = { ...aiConfig, [key]: value };
    setAiConfig(newConfig);
    localAI.updateConfig(newConfig);
  };

  // --- Local Folder Integration ---
  const handleLegacyFolderSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    setScanningLocal(true);
    processFiles(Array.from(e.target.files));
  };

  const processFiles = async (files: File[]) => {
    if (!currentUser) return;
    const newPhotos: Photo[] = [];
    let count = 0;
    
    for (const file of files) {
       if (file.type.startsWith('image/')) {
          count++;
          const url = URL.createObjectURL(file);
          newPhotos.push({
              id: `local-fb-${currentUser.id}-${count}-${Date.now()}`,
              userId: currentUser.id,
              url: url,
              name: file.name,
              album: 'Local Drive',
              tags: ['local', 'pending'],
              date: new Date(file.lastModified).toLocaleDateString(),
              source: 'local',
              size: (file.size / 1024 / 1024).toFixed(2) + ' MB'
          });
       }
       if (count >= 50) break;
    }

    setPhotos(prev => [...newPhotos, ...prev]);
    setLocalFolderHandle({ name: 'Local Folder' });
    setScanningLocal(false);
    if (folderInputRef.current) folderInputRef.current.value = '';
    setSyncStatus(prev => ({ ...prev, isSyncing: true }));
  };

  const connectLocalFolder = async () => {
    try {
      if ('showDirectoryPicker' in window) {
        try {
          const dirHandle = await (window as any).showDirectoryPicker();
          setLocalFolderHandle(dirHandle);
          setScanningLocal(true);
          const collectedFiles: File[] = [];
          
          // @ts-ignore
          for await (const entry of dirHandle.values()) {
            if (entry.kind === 'file') {
              const file = await entry.getFile();
              collectedFiles.push(file);
            }
            if (collectedFiles.length >= 50) break;
          }
          await processFiles(collectedFiles);
          return;
        } catch (err: any) {
          if (err.name !== 'AbortError') console.warn("Modern access failed", err);
        }
      }
      folderInputRef.current?.click();
    } catch (error) {
      console.error('Error accessing folder:', error);
      setScanningLocal(false);
    }
  };

  const handleVoiceTranscript = (text: string) => {
    setSearchQuery(text);
    setCurrentView(AppView.PHOTOS); 
  };

  const handleGenerate = async (type: 'image' | 'video') => {
    if (!genPrompt) return;
    setIsGenerating(true);
    setGeneratedMedia(null);
    try {
      if (type === 'image') {
        const url = await localAI.generateLocalImage(genPrompt);
        setGeneratedMedia({ url, type: 'image' });
      } else {
        const url = await localAI.generateLocalVideo(genPrompt);
        setGeneratedMedia({ url, type: 'video' });
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsGenerating(false);
    }
  };

  // Render Helpers
  const renderSidebarItem = (view: AppView, icon: React.ReactNode, label: string) => (
    <button
      onClick={() => setCurrentView(view)}
      className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors
        ${currentView === view 
          ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300' 
          : 'text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800'
        }`}
    >
      {icon}
      <span>{label}</span>
    </button>
  );

  const getSourceIcon = (source: PhotoSource) => {
    switch(source) {
      case 'cloud': return <Cloud size={14} className="text-blue-500" />;
      case 'local': return <HardDrive size={14} className="text-amber-500" />;
      case 'synced': return <CheckCircle2 size={14} className="text-green-500" />;
    }
  };

  // --- Main Render Branch ---
  if (!currentUser) {
    return (
      <LoginScreen 
        existingUsers={users} 
        onLoginSuccess={handleLoginSuccess}
        onSelectUser={handleUserSwitch}
      />
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex text-slate-900 dark:text-slate-100 font-sans">
      <input type="file" ref={folderInputRef} onChange={handleLegacyFolderSelect} className="hidden" {...({ webkitdirectory: "", directory: "" } as any)} multiple />

      {/* Sidebar */}
      <aside className={`fixed inset-y-0 left-0 z-40 w-64 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 transform transition-transform duration-300 ease-in-out lg:relative lg:translate-x-0 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} flex flex-col`}>
        <div className="h-16 flex items-center px-6 border-b border-slate-100 dark:border-slate-800 shrink-0">
           <div className="w-8 h-8 bg-gradient-to-tr from-blue-500 to-purple-500 rounded-lg flex items-center justify-center text-white mr-3 shadow-lg shadow-blue-500/20">
             <ArrowRightLeft size={18} className="text-white/90" />
           </div>
           <span className="font-bold text-lg tracking-tight">Gemini Sync</span>
        </div>

        <div className="p-4 space-y-1 flex-1 overflow-y-auto">
          <div className="px-4 py-2 text-xs font-semibold text-slate-400 uppercase tracking-wider">Library</div>
          {renderSidebarItem(AppView.DASHBOARD, <HardDrive size={18} />, 'Dashboard')}
          {renderSidebarItem(AppView.ALBUMS, <LayoutGrid size={18} />, 'Albums')}
          {renderSidebarItem(AppView.PHOTOS, <ImageIcon size={18} />, 'All Photos')}
          
          <div className="px-4 py-2 mt-6 text-xs font-semibold text-slate-400 uppercase tracking-wider">Smart Tools</div>
          {renderSidebarItem(AppView.UPLOAD, <Plus size={18} />, 'Smart Upload')}
          {renderSidebarItem(AppView.AI_STUDIO, <Wand2 size={18} />, 'AI Studio')}
          
          <div className="px-4 py-2 mt-6 text-xs font-semibold text-slate-400 uppercase tracking-wider">Sharing</div>
          {renderSidebarItem(AppView.GALLERY_SERVER, <Globe size={18} />, 'Gallery Server')}

          <div className="px-4 py-2 mt-6 text-xs font-semibold text-slate-400 uppercase tracking-wider">System</div>
          {renderSidebarItem(AppView.SETTINGS, <Settings size={18} />, 'Settings')}
        </div>

        {/* User Profile Section */}
        <div className="p-4 border-t border-slate-100 dark:border-slate-800 shrink-0">
           <div className="bg-slate-50 dark:bg-slate-800 rounded-xl p-3 flex items-center gap-3 relative group">
              <img src={currentUser.avatarUrl} alt={UserIcon.name} className="w-10 h-10 rounded-full bg-slate-200" />
              <div className="flex-1 min-w-0">
                 <p className="text-sm font-semibold truncate">{currentUser.name}</p>
                 <p className="text-xs text-slate-500 truncate">{currentUser.email}</p>
              </div>
              <button 
                 onClick={handleLogout}
                 className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                 title="Switch Account"
              >
                 <LogOut size={16} />
              </button>
           </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden relative">
        {/* Header */}
        <header className="h-16 bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm border-b border-slate-200 dark:border-slate-800 flex items-center justify-between px-6 z-30 sticky top-0">
          <div className="flex items-center gap-4">
             <button onClick={() => setSidebarOpen(!sidebarOpen)} className="lg:hidden p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg">
               <Menu size={20} />
             </button>
             <h1 className="text-xl font-semibold capitalize text-slate-800 dark:text-slate-100">
                {currentView === AppView.GALLERY_SERVER ? 'Web Gallery Server' : 
                 currentView === AppView.AI_STUDIO ? 'Generative AI Studio' :
                 currentView.toLowerCase().replace('_', ' ')}
             </h1>
          </div>

          <div className="flex items-center gap-3">
             <div className="relative hidden md:flex items-center">
               <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 z-10">
                 {isSearchingAI ? <BrainCircuit size={16} className="animate-pulse text-purple-500" /> : <Search size={16} />}
               </div>
               <input 
                 type="text" 
                 placeholder={searchMode === SearchMode.LOCAL_VECTOR ? "Search Local (Vector DB)..." : "Ask Gemini Cloud..."}
                 value={searchQuery}
                 onChange={(e) => {
                    setSearchQuery(e.target.value);
                    if (currentView !== AppView.PHOTOS && e.target.value) setCurrentView(AppView.PHOTOS);
                 }}
                 className={`pl-9 pr-10 py-2 rounded-full text-sm focus:outline-none focus:ring-2 w-72 transition-all border
                   ${searchMode === SearchMode.LOCAL_VECTOR 
                     ? 'bg-slate-100 dark:bg-slate-800 focus:ring-green-500 border-transparent' 
                     : 'bg-blue-50 dark:bg-blue-900/20 focus:ring-blue-500 border-blue-200'}`}
               />
               <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                 {searchQuery && (
                   <button onClick={() => setSearchQuery('')} className="p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full">
                     <XCircle size={14} className="text-slate-400" />
                   </button>
                 )}
                 <VoiceInput onTranscript={handleVoiceTranscript} isCompact />
               </div>
             </div>
             <button onClick={() => setIsDarkMode(!isDarkMode)} className="p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors">
               {isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
             </button>
             <button onClick={() => setShowTray(!showTray)} className={`p-2 rounded-lg transition-colors border ${showTray ? 'bg-blue-50 border-blue-200 text-blue-600' : 'border-transparent hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500'}`} title="Toggle Tray Simulation">
               <Cloud size={20} />
             </button>
          </div>
        </header>

        {/* Content Area */}
        <div className="flex-1 overflow-auto p-6 md:p-8">
          
          {currentView === AppView.DASHBOARD && (
             <div className="space-y-8 max-w-6xl mx-auto">
                {/* Dashboard content */}
                <div className={`rounded-2xl p-6 border transition-all ${localFolderHandle ? 'bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-800' : 'bg-blue-50 border-blue-200 dark:bg-blue-900/20 dark:border-blue-800'}`}>
                   <div className="flex items-start justify-between">
                      <div className="flex gap-4">
                         <div className={`p-3 rounded-xl ${localFolderHandle ? 'bg-green-100 text-green-600 dark:bg-green-900/50' : 'bg-blue-100 text-blue-600 dark:bg-blue-900/50'}`}>
                            {localFolderHandle ? <HardDrive size={24} /> : <FolderPlus size={24} />}
                         </div>
                         <div>
                            <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">
                               {localFolderHandle ? `Syncing to "${localFolderHandle.name}"` : "Connect Local Storage"}
                            </h2>
                            <p className="text-slate-600 dark:text-slate-400 mt-1 max-w-xl text-sm">
                               {localFolderHandle 
                                 ? `Bi-directional sync enabled. ${syncedAlbumNames.size} albums selected for download. New local photos will be auto-uploaded.`
                                 : "Select a folder to enable two-way sync between your computer and Google Photos."}
                            </p>
                         </div>
                      </div>
                      <button 
                         onClick={connectLocalFolder}
                         disabled={scanningLocal}
                         className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors shadow-sm flex items-center gap-2
                           ${localFolderHandle 
                              ? 'bg-white text-green-700 hover:bg-green-50 border border-green-200' 
                              : 'bg-blue-600 text-white hover:bg-blue-700'
                           }`}
                      >
                         {scanningLocal ? <><RefreshCw size={16} className="animate-spin" /> Scanning...</> : (localFolderHandle ? 'Change Folder' : 'Select Folder')}
                      </button>
                   </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                   <div className="bg-gradient-to-br from-indigo-500 to-blue-600 rounded-2xl p-6 text-white shadow-lg shadow-blue-500/20">
                      <div className="flex justify-between items-start mb-4">
                        <div className="bg-white/20 p-2 rounded-lg"><Cloud size={24} className="text-white" /></div>
                        <span className="text-xs font-medium bg-white/20 px-2 py-1 rounded-full">Google One</span>
                      </div>
                      <h3 className="text-3xl font-bold mb-1">{syncStatus.storageUsed}</h3>
                      <p className="text-blue-100 text-sm">of 15 GB Used</p>
                      <div className="w-full bg-black/20 h-1.5 rounded-full mt-4 overflow-hidden">
                         <div className="bg-white w-[28%] h-full rounded-full"></div>
                      </div>
                   </div>

                   <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200 dark:border-slate-700 shadow-sm">
                      <div className="flex justify-between items-center mb-4">
                        <h3 className="font-semibold text-slate-700 dark:text-slate-200">Sync Activity</h3>
                        <span className={`w-2 h-2 rounded-full ${syncStatus.isSyncing ? 'bg-green-500 animate-pulse' : 'bg-slate-300'}`}></span>
                      </div>
                      <div className="space-y-3 mb-6">
                        <div className="flex justify-between text-sm">
                           <span className="text-slate-500 flex items-center gap-2"><Database size={14}/> Indexed for AI</span>
                           <span className="font-medium">{syncStatus.vectorIndexCount} items</span>
                        </div>
                        <div className="flex justify-between text-sm">
                           <span className="text-slate-500 flex items-center gap-2"><Upload size={14}/> Upload Queue</span>
                           <span className="font-medium">{syncStatus.uploadQueue} items</span>
                        </div>
                        <div className="text-xs text-slate-400 pt-2 border-t border-slate-100 dark:border-slate-700 truncate">
                           Action: {syncStatus.currentAction}
                        </div>
                      </div>
                      <button onClick={toggleSync} className={`w-full py-2 rounded-lg text-sm font-medium transition-colors flex justify-center items-center gap-2 ${syncStatus.isSyncing ? 'bg-red-50 text-red-600 hover:bg-red-100 dark:bg-red-900/20 dark:hover:bg-red-900/30' : 'bg-blue-50 text-blue-600 hover:bg-blue-100 dark:bg-blue-900/20 dark:hover:bg-blue-900/30'}`}>
                         {syncStatus.isSyncing ? <><RefreshCw size={14} className="animate-spin"/> Pause Sync</> : 'Start Sync'}
                      </button>
                   </div>

                   <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col items-center justify-center text-center">
                      <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 rounded-full flex items-center justify-center mb-3">
                        <Wand2 size={24} />
                      </div>
                      <h3 className="font-semibold text-slate-900 dark:text-white">AI Studio</h3>
                      <p className="text-sm text-slate-500 mt-1 mb-4">Generate images & videos using local Flux.1 and Mochi models.</p>
                      <button onClick={() => setCurrentView(AppView.AI_STUDIO)} className="text-purple-600 hover:text-purple-700 text-sm font-semibold flex items-center gap-1">
                        Open Studio <ChevronRight size={16} />
                      </button>
                   </div>
                </div>
             </div>
          )}

          {currentView === AppView.GALLERY_SERVER && <GalleryServer />}
          
          {currentView === AppView.AI_STUDIO && (
             <div className="max-w-4xl mx-auto space-y-6">
                <div className="bg-gradient-to-r from-purple-600 to-blue-600 rounded-2xl p-8 text-white">
                   <h2 className="text-2xl font-bold mb-2">Generative AI Studio</h2>
                   <p className="opacity-90">Create new media using your local hardware. No cloud costs, total privacy.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Prompt Input */}
                    <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-sm border border-slate-200 dark:border-slate-700">
                        <h3 className="font-semibold mb-4">Prompt</h3>
                        <textarea 
                           className="w-full h-32 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-3 text-sm focus:ring-2 focus:ring-purple-500 focus:outline-none resize-none"
                           placeholder="Describe the image or video you want to generate... (e.g., A cinematic shot of a futuristic cyberpunk city in the rain)"
                           value={genPrompt}
                           onChange={(e) => setGenPrompt(e.target.value)}
                        />
                        <div className="mt-4 flex gap-2">
                           <button 
                              onClick={() => handleGenerate('image')}
                              disabled={isGenerating || !genPrompt}
                              className="flex-1 py-2 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white rounded-lg font-medium flex items-center justify-center gap-2"
                           >
                              {isGenerating ? <RefreshCw className="animate-spin" size={16} /> : <ImageIcon size={16} />}
                              Generate Image
                           </button>
                           <button 
                              onClick={() => handleGenerate('video')}
                              disabled={isGenerating || !genPrompt}
                              className="flex-1 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg font-medium flex items-center justify-center gap-2"
                           >
                              {isGenerating ? <RefreshCw className="animate-spin" size={16} /> : <Video size={16} />}
                              Generate Video
                           </button>
                        </div>
                        <div className="mt-4 text-xs text-slate-500 flex justify-between">
                           <span>Image Model: {aiConfig.imageModel}</span>
                           <span>Video Model: {aiConfig.videoModel}</span>
                        </div>
                    </div>

                    {/* Result View */}
                    <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-sm border border-slate-200 dark:border-slate-700 flex flex-col items-center justify-center min-h-[300px]">
                        {isGenerating ? (
                           <div className="text-center">
                              <div className="relative w-16 h-16 mx-auto mb-4">
                                 <div className="absolute inset-0 border-4 border-slate-200 rounded-full"></div>
                                 <div className="absolute inset-0 border-4 border-purple-500 rounded-full border-t-transparent animate-spin"></div>
                              </div>
                              <p className="text-sm font-medium">Generating...</p>
                              <p className="text-xs text-slate-500 mt-1">Using local {aiConfig.genBackend}</p>
                           </div>
                        ) : generatedMedia ? (
                           <div className="w-full h-full relative group">
                              {generatedMedia.type === 'image' ? (
                                 <img src={generatedMedia.url} alt="Generated" className="w-full h-full object-contain rounded-lg" />
                              ) : (
                                 <video src={generatedMedia.url} controls className="w-full h-full object-contain rounded-lg" />
                              )}
                              <div className="absolute bottom-2 right-2 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                 <button className="bg-white/90 text-slate-800 p-2 rounded-lg text-xs font-bold shadow-lg flex items-center gap-1 hover:bg-white">
                                    <Download size={14} /> Save
                                 </button>
                              </div>
                           </div>
                        ) : (
                           <div className="text-center text-slate-400">
                              <Wand2 size={48} className="mx-auto mb-2 opacity-20" />
                              <p>Results will appear here</p>
                           </div>
                        )}
                    </div>
                </div>
             </div>
          )}

          {currentView === AppView.UPLOAD && <div className="h-full flex flex-col items-center justify-center max-w-3xl mx-auto text-center"><h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Gemini Smart Organizer</h2><SmartUpload onPhotoAnalyzed={handlePhotoAnalyzed} /></div>}

          {(currentView === AppView.PHOTOS || currentView === AppView.ALBUMS) && (
            <div>
               {currentView === AppView.PHOTOS && (
               <div className="mb-6 flex items-center justify-between">
                 <div className="flex flex-col gap-1">
                     <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
                        {searchQuery ? `Search Results` : 'All Photos'}
                     </h2>
                     <div className="flex items-center gap-2 text-xs text-slate-500">
                        {searchMode === SearchMode.LOCAL_VECTOR ? (
                           <span className="flex items-center gap-1 text-green-600 dark:text-green-400 font-medium">
                              <BrainCircuit size={12} /> Local Vector AI
                           </span>
                        ) : (
                           <span className="flex items-center gap-1 text-blue-600 dark:text-blue-400 font-medium">
                              <Cloud size={12} /> Gemini Cloud AI
                           </span>
                        )}
                        <span>•</span>
                        <span>{filteredPhotos.length} items found</span>
                     </div>
                 </div>
                 {activeSearchTags.length > 0 && (
                    <div className="flex gap-2 text-sm text-slate-500 items-center bg-slate-100 dark:bg-slate-800 px-3 py-1 rounded-full">
                       <Sparkles size={14} className="text-purple-500" />
                       <span>Tags: {activeSearchTags.join(', ')}</span>
                    </div>
                 )}
              </div>
              )}
              {currentView === AppView.ALBUMS && (
                 <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                    <h2 className="text-2xl font-bold text-slate-900 dark:text-white">All Albums</h2>
                 </div>
              )}
              
              {currentView === AppView.ALBUMS ? (
                  <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-6">
                  {albums.map(album => (
                     <div key={album.id} className={`group relative rounded-xl overflow-hidden border transition-all duration-200 ${album.syncEnabled ? 'ring-2 ring-blue-500 border-transparent shadow-lg shadow-blue-500/10' : 'border-slate-200 dark:border-slate-700 hover:shadow-md'}`}>
                        <div className="aspect-square bg-slate-100 dark:bg-slate-900 relative overflow-hidden">
                           <img src={album.coverUrl} alt={album.name} className="w-full h-full object-cover" />
                        </div>
                        <div className="p-4 bg-white dark:bg-slate-800">
                           <div className="flex justify-between items-start gap-2">
                              <h3 className="font-semibold text-slate-900 dark:text-slate-100 truncate flex-1">{album.name}</h3>
                              {album.syncEnabled && <CheckCircle2 size={16} className="text-green-500 shrink-0 mt-1" />}
                           </div>
                           <button onClick={() => toggleAlbumSync(album.name)} className={`w-full mt-2 py-1.5 px-3 rounded-lg text-xs font-medium flex items-center justify-center gap-2 ${album.syncEnabled ? 'bg-blue-50 text-blue-700' : 'bg-slate-100 text-slate-600'}`}>
                              {album.syncEnabled ? <><Check size={12} /> Synced</> : <><Download size={12} /> Sync</>}
                           </button>
                        </div>
                     </div>
                  ))}
                  </div>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
                    {filteredPhotos.map(photo => (
                    <div key={photo.id} className="group relative bg-white dark:bg-slate-800 rounded-xl overflow-hidden shadow-sm hover:shadow-lg transition-all border border-slate-200 dark:border-slate-700">
                        <div className="aspect-[4/3] overflow-hidden bg-slate-100 dark:bg-slate-900 relative">
                        <img src={photo.url} alt={photo.name} className="w-full h-full object-cover" loading="lazy" />
                        </div>
                        <div className="p-3">
                        <h4 className="text-sm font-semibold text-slate-800 dark:text-slate-200 truncate">{photo.name}</h4>
                        <div className="flex justify-between items-center mt-1">
                            <span className="text-[10px] uppercase tracking-wide bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 px-1.5 py-0.5 rounded font-bold">
                                {photo.album}
                            </span>
                        </div>
                        </div>
                    </div>
                    ))}
                </div>
              )}
            </div>
          )}

          {currentView === AppView.SETTINGS && (
            <div className="max-w-2xl mx-auto space-y-6">
               <div className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-sm border border-slate-200 dark:border-slate-700">
                  <h3 className="text-lg font-bold mb-4">Local AI Configuration</h3>
                  
                  {/* Search Engine Config */}
                  <div className="space-y-4 mb-6">
                      <div>
                         <label className="block text-sm font-medium mb-2">Search & Vector Database</label>
                         <div className="grid grid-cols-2 gap-4">
                             <select 
                               value={searchMode}
                               onChange={(e) => setSearchMode(e.target.value as SearchMode)}
                               className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm"
                             >
                                <option value={SearchMode.LOCAL_VECTOR}>Local Vector Search</option>
                                <option value={SearchMode.CLOUD}>Gemini Cloud</option>
                             </select>
                             <select 
                               value={aiConfig.vectorDB}
                               onChange={(e) => updateAIConfig('vectorDB', e.target.value)}
                               className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm"
                               disabled={searchMode === SearchMode.CLOUD}
                             >
                                {Object.values(VectorDBType).map(v => <option key={v} value={v}>{v}</option>)}
                             </select>
                         </div>
                         {aiConfig.vectorDB !== VectorDBType.IN_MEMORY && (
                           <input 
                             type="text" 
                             value={aiConfig.vectorDBUrl}
                             onChange={(e) => updateAIConfig('vectorDBUrl', e.target.value)}
                             className="mt-2 w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm font-mono"
                             placeholder="e.g., http://localhost:6333"
                           />
                         )}
                      </div>

                      {/* Vision Model Config */}
                      <div>
                         <label className="block text-sm font-medium mb-2">Local Vision Model (Ollama/LocalAI)</label>
                         <div className="grid grid-cols-2 gap-4">
                             <select 
                               value={aiConfig.visionModel}
                               onChange={(e) => updateAIConfig('visionModel', e.target.value)}
                               className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm"
                             >
                                {Object.values(LocalVisionModel).map(v => <option key={v} value={v}>{v}</option>)}
                             </select>
                             <select 
                               value={aiConfig.visionBackend}
                               onChange={(e) => updateAIConfig('visionBackend', e.target.value)}
                               className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm"
                             >
                                {Object.values(AIBackend).map(v => <option key={v} value={v}>{v}</option>)}
                             </select>
                         </div>
                         <input 
                             type="text" 
                             value={aiConfig.visionUrl}
                             onChange={(e) => updateAIConfig('visionUrl', e.target.value)}
                             className="mt-2 w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm font-mono"
                             placeholder="e.g., http://localhost:11434"
                           />
                      </div>

                      {/* Generation Config */}
                      <div>
                         <label className="block text-sm font-medium mb-2">Generative AI Backend</label>
                         <div className="grid grid-cols-3 gap-4">
                             <select 
                               value={aiConfig.genBackend}
                               onChange={(e) => updateAIConfig('genBackend', e.target.value)}
                               className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm"
                             >
                                {Object.values(AIBackend).map(v => <option key={v} value={v}>{v}</option>)}
                             </select>
                             <select 
                               value={aiConfig.imageModel}
                               onChange={(e) => updateAIConfig('imageModel', e.target.value)}
                               className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm"
                             >
                                {Object.values(ImageGenModel).map(v => <option key={v} value={v}>{v}</option>)}
                             </select>
                             <select 
                               value={aiConfig.videoModel}
                               onChange={(e) => updateAIConfig('videoModel', e.target.value)}
                               className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm"
                             >
                                {Object.values(VideoGenModel).map(v => <option key={v} value={v}>{v}</option>)}
                             </select>
                         </div>
                         <input 
                             type="text" 
                             value={aiConfig.genUrl}
                             onChange={(e) => updateAIConfig('genUrl', e.target.value)}
                             className="mt-2 w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm font-mono"
                             placeholder="e.g., http://localhost:8188"
                           />
                      </div>
                  </div>

                  <h3 className="text-lg font-bold mb-4 pt-4 border-t border-slate-100 dark:border-slate-700">Cloud Sync</h3>
                  <div className="space-y-4">
                     <div className="flex items-center justify-between">
                        <div>
                           <p className="font-medium">Download from Cloud</p>
                           <p className="text-sm text-slate-500">Automatically save selected cloud albums to local folder</p>
                        </div>
                        <input type="checkbox" className="toggle-checkbox" defaultChecked />
                     </div>
                  </div>
               </div>
            </div>
          )}

        </div>
      </main>

      {showTray && (
        <TrayPopup 
          status={syncStatus} 
          onClose={() => setShowTray(false)} 
          onOpenApp={() => setShowTray(false)}
          onToggleSync={toggleSync}
        />
      )}
    </div>
  );
};

export default App;