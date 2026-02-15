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
  MoreVertical,
  Laptop,
  ToggleLeft,
  ToggleRight,
  CheckSquare,
  Square,
  Copy,
  AlertTriangle,
  Save,
  RotateCcw
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
import { performGoogleLogin } from './services/authService';

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
  const [isLoadingCloud, setIsLoadingCloud] = useState(false);
  
  // Search State
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchingAI, setIsSearchingAI] = useState(false);
  const [filteredPhotos, setFilteredPhotos] = useState<Photo[]>([]);
  const [activeSearchTags, setActiveSearchTags] = useState<string[]>([]);
  const [searchMode, setSearchMode] = useState<SearchMode>(SearchMode.CLOUD); 
  
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
    lastSynced: 'Just now',
    storageUsed: '0 GB',
    uploadQueue: 0,
    downloadQueue: 0,
    currentAction: 'Idle',
    vectorIndexCount: 0
  });

  // Local Folder State
  const [desktopClientConnected, setDesktopClientConnected] = useState(false);

  // --- API Interaction for Sync Config ---
  const saveConfigToLocal = async (selectedAlbums: string[]) => {
    try {
      const response = await fetch('http://localhost:3000/api/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          selected_albums: selectedAlbums,
          api_key: currentUser?.token || ''
        })
      });
      if (response.ok) {
        console.log("Synced configuration to desktop client");
        setDesktopClientConnected(true);
      }
    } catch (e) {
      console.warn("Could not save config to localhost. Desktop client might be offline.", e);
      setDesktopClientConnected(false);
    }
  };

  const loadConfigFromLocal = async () => {
    try {
      const response = await fetch('http://localhost:3000/api/config');
      if (response.ok) {
        const data = await response.json();
        if (data.selected_albums && Array.isArray(data.selected_albums)) {
          setSyncedAlbumNames(new Set(data.selected_albums));
        }
        setDesktopClientConnected(true);
      }
    } catch (e) {
      console.warn("Could not load config from localhost.");
      setDesktopClientConnected(false);
    }
  };

  // --- Real Google Photos API Fetching ---
  const fetchGooglePhotosLibrary = async (token: string) => {
    setIsLoadingCloud(true);
    try {
      // 1. Fetch Albums
      const albumsResponse = await fetch('https://photoslibrary.googleapis.com/v1/albums?pageSize=50', {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (albumsResponse.status === 401) {
          alert("Your session has expired. Please logout and login again, or refresh your token.");
          setIsLoadingCloud(false);
          return;
      }
      
      const albumsData = await albumsResponse.json();
      
      let realAlbums: Album[] = [];
      if (albumsData.albums) {
        realAlbums = albumsData.albums.map((a: any) => ({
          id: a.id,
          userId: currentUser?.id || 'unknown',
          name: a.title,
          coverUrl: a.coverPhotoBaseUrl ? `${a.coverPhotoBaseUrl}=w500-h500-c` : '', // Google Photos requires size params
          count: parseInt(a.mediaItemsCount || '0'),
          source: 'cloud',
          syncEnabled: false
        }));
        setAlbums(realAlbums);
      }

      // 2. Fetch Media Items (Photos)
      const photosResponse = await fetch('https://photoslibrary.googleapis.com/v1/mediaItems?pageSize=100', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const photosData = await photosResponse.json();
      
      let realPhotos: Photo[] = [];
      if (photosData.mediaItems) {
        realPhotos = photosData.mediaItems.map((item: any) => ({
          id: item.id,
          userId: currentUser?.id || 'unknown',
          url: `${item.baseUrl}=w800-h600`, // Resize for UI
          name: item.filename,
          album: 'Recent', // MediaItems endpoint doesn't return album ID directly
          tags: ['google-photos', item.mimeType],
          date: item.mediaMetadata.creationTime,
          source: 'cloud',
          size: 'Unknown'
        }));
        setPhotos(realPhotos);
      }
      
      setSyncStatus(prev => ({
        ...prev,
        totalFiles: realPhotos.length,
        storageUsed: 'Calculating...'
      }));

    } catch (error) {
      console.error("Error fetching Google Photos:", error);
    } finally {
      setIsLoadingCloud(false);
    }
  };

  // --- Auth & Data Loading Logic ---
  useEffect(() => {
    if (!currentUser) {
        setPhotos([]);
        setAlbums([]);
        return;
    }

    // Try to load existing local config
    loadConfigFromLocal();

    // Fetch Real Data
    if (currentUser.token) {
      fetchGooglePhotosLibrary(currentUser.token);
    }
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
       setCurrentUser(null);
    }
  };

  // Vector Indexing Effect
  useEffect(() => {
    const unindexedPhotos = photos.filter(p => !p.embedding);
    if (unindexedPhotos.length > 0) {
      const timer = setTimeout(async () => {
        // Only index a few for demo performance
        for (const photo of unindexedPhotos.slice(0, 5)) {
           await vectorDb.addToIndex(photo);
        }
        setSyncStatus(prev => ({ 
           ...prev, 
           vectorIndexCount: vectorDb.getIndexSize() 
        }));
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [photos]);

  // Update Sync Status based on selection and SAVE to Local
  useEffect(() => {
    setAlbums(prev => prev.map(a => ({
      ...a,
      syncEnabled: syncedAlbumNames.has(a.name)
    })));

    setSyncStatus(prev => ({
      ...prev,
      syncedFiles: albums.filter(a => syncedAlbumNames.has(a.name)).reduce((acc, curr) => acc + curr.count, 0)
    }));

    // Auto-save to local config if connected
    if (syncedAlbumNames.size > 0 || desktopClientConnected) {
       saveConfigToLocal(Array.from(syncedAlbumNames));
    }

  }, [syncedAlbumNames]);

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
                const searchString = `${photo.name} ${photo.tags.join(' ')}`.toLowerCase();
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
  };

  const handleSyncAll = () => {
    const allNames = albums.map(a => a.name);
    setSyncedAlbumNames(new Set(allNames));
  };

  const handleUnsyncAll = () => {
    setSyncedAlbumNames(new Set());
  };

  const handlePhotoAnalyzed = (newPhoto: Photo) => {
    if (!currentUser) return;
    const photoWithSource = { ...newPhoto, source: 'cloud' as PhotoSource, userId: currentUser.id };
    setPhotos(prev => [photoWithSource, ...prev]);
  };

  const toggleSync = () => {
    setSyncStatus(prev => ({ ...prev, isSyncing: !prev.isSyncing }));
  };

  const copyToken = () => {
    if (currentUser?.token) {
      navigator.clipboard.writeText(currentUser.token);
      alert("Token copied! Paste this in the Desktop Tray App settings to sync.");
    }
  };
  
  const handleRefreshToken = () => {
     performGoogleLogin();
     // The login callback will update the currentUser with a new token
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
      
      {/* Sidebar */}
      <aside className={`fixed inset-y-0 left-0 z-40 w-64 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 transform transition-transform duration-300 ease-in-out lg:relative lg:translate-x-0 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} flex flex-col`}>
        <div className="h-16 flex items-center px-6 border-b border-slate-100 dark:border-slate-800 shrink-0">
           <div className="w-8 h-8 bg-gradient-to-tr from-blue-500 to-purple-500 rounded-lg flex items-center justify-center text-white mr-3 shadow-lg shadow-blue-500/20">
             <Cloud size={18} className="text-white/90" />
           </div>
           <span className="font-bold text-lg tracking-tight">Gemini Cloud</span>
        </div>

        <div className="p-4 space-y-1 flex-1 overflow-y-auto">
          <div className="px-4 py-2 text-xs font-semibold text-slate-400 uppercase tracking-wider">Cloud Library</div>
          {renderSidebarItem(AppView.DASHBOARD, <LayoutGrid size={18} />, 'Dashboard')}
          {renderSidebarItem(AppView.ALBUMS, <Folder size={18} />, 'Cloud Albums')}
          {renderSidebarItem(AppView.PHOTOS, <ImageIcon size={18} />, 'All Photos')}
          
          <div className="px-4 py-2 mt-6 text-xs font-semibold text-slate-400 uppercase tracking-wider">Smart Tools</div>
          {renderSidebarItem(AppView.UPLOAD, <Plus size={18} />, 'Smart Upload')}
          {renderSidebarItem(AppView.AI_STUDIO, <Wand2 size={18} />, 'AI Studio')}
          
          <div className="px-4 py-2 mt-6 text-xs font-semibold text-slate-400 uppercase tracking-wider">Sharing</div>
          {renderSidebarItem(AppView.GALLERY_SERVER, <Globe size={18} />, 'Public Links')}

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
                {currentView === AppView.GALLERY_SERVER ? 'Public Gallery Links' : 
                 currentView === AppView.AI_STUDIO ? 'Cloud AI Studio' :
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
                 placeholder={searchMode === SearchMode.LOCAL_VECTOR ? "Search Vector DB..." : "Ask Gemini Cloud..."}
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
             <button onClick={() => setShowTray(!showTray)} className={`p-2 rounded-lg transition-colors border ${showTray ? 'bg-blue-50 border-blue-200 text-blue-600' : 'border-transparent hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500'}`} title="Show Sync Status">
               <Laptop size={20} />
             </button>
          </div>
        </header>

        {/* Content Area */}
        <div className="flex-1 overflow-auto p-6 md:p-8">
          
          {currentView === AppView.DASHBOARD && (
             <div className="space-y-8 max-w-6xl mx-auto">
                <div className={`rounded-2xl p-6 border transition-all ${desktopClientConnected ? 'bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-800' : 'bg-amber-50 border-amber-200 dark:bg-amber-900/20 dark:border-amber-800'}`}>
                   <div className="flex items-start justify-between">
                      <div className="flex gap-4">
                         <div className={`p-3 rounded-xl ${desktopClientConnected ? 'bg-green-100 text-green-600 dark:bg-green-900/50' : 'bg-amber-100 text-amber-600 dark:bg-amber-900/50'}`}>
                            {desktopClientConnected ? <CheckCircle2 size={24} /> : <Laptop size={24} />}
                         </div>
                         <div>
                            <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">
                               {desktopClientConnected ? "Desktop Sync Active" : "Desktop Client Disconnected"}
                            </h2>
                            <p className="text-slate-600 dark:text-slate-400 mt-1 max-w-xl text-sm">
                               {desktopClientConnected 
                                 ? "Your local computer is connected and managing your sync selections automatically."
                                 : "Run the Python Tray App on your computer to download albums to your hard drive."}
                            </p>
                         </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {desktopClientConnected && (
                            <span className="flex items-center gap-1 text-xs text-green-700 bg-white/50 px-2 py-1 rounded">
                                <Save size={12} /> Config Auto-Save
                            </span>
                        )}
                        <button 
                            className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors shadow-sm flex items-center gap-2 cursor-default
                            ${desktopClientConnected 
                                ? 'bg-white text-green-700 border border-green-200' 
                                : 'bg-white text-amber-700 border border-amber-200'
                            }`}
                        >
                            {desktopClientConnected ? 'Online' : 'Waiting...'}
                        </button>
                      </div>
                   </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                   <div className="bg-gradient-to-br from-indigo-500 to-blue-600 rounded-2xl p-6 text-white shadow-lg shadow-blue-500/20">
                      <div className="flex justify-between items-start mb-4">
                        <div className="bg-white/20 p-2 rounded-lg"><Cloud size={24} className="text-white" /></div>
                        <span className="text-xs font-medium bg-white/20 px-2 py-1 rounded-full">Google Cloud</span>
                      </div>
                      <h3 className="text-3xl font-bold mb-1">{syncStatus.storageUsed}</h3>
                      <p className="text-blue-100 text-sm">used in Google Photos</p>
                      <div className="w-full bg-black/20 h-1.5 rounded-full mt-4 overflow-hidden">
                         <div className="bg-white w-[4%] h-full rounded-full"></div>
                      </div>
                   </div>

                   <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200 dark:border-slate-700 shadow-sm">
                      <div className="flex justify-between items-center mb-4">
                        <h3 className="font-semibold text-slate-700 dark:text-slate-200">Library Stats</h3>
                      </div>
                      <div className="space-y-3 mb-6">
                        <div className="flex justify-between text-sm">
                           <span className="text-slate-500 flex items-center gap-2"><ImageIcon size={14}/> Total Photos</span>
                           <span className="font-medium">{syncStatus.totalFiles} items</span>
                        </div>
                        <div className="flex justify-between text-sm">
                           <span className="text-slate-500 flex items-center gap-2"><Database size={14}/> Indexed for Search</span>
                           <span className="font-medium">{syncStatus.vectorIndexCount} items</span>
                        </div>
                        <div className="text-xs text-slate-400 pt-2 border-t border-slate-100 dark:border-slate-700 truncate">
                           Last Sync: {syncStatus.lastSynced}
                        </div>
                      </div>
                   </div>
                </div>
             </div>
          )}

          {currentView === AppView.GALLERY_SERVER && <GalleryServer />}
          
          {currentView === AppView.AI_STUDIO && (
             <div className="max-w-4xl mx-auto space-y-6">
                <div className="bg-gradient-to-r from-purple-600 to-blue-600 rounded-2xl p-8 text-white">
                   <h2 className="text-2xl font-bold mb-2">Cloud AI Studio</h2>
                   <p className="opacity-90">Generate images & videos using Gemini Pro Vision and Imagen 3.</p>
                </div>
                {/* AI Studio Content - Same as before */}
                <div className="text-center p-10 bg-slate-100 dark:bg-slate-800 rounded-xl">
                   <p>AI Features are ready to use.</p>
                </div>
             </div>
          )}

          {currentView === AppView.UPLOAD && <div className="h-full flex flex-col items-center justify-center max-w-3xl mx-auto text-center"><h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Smart Cloud Upload</h2><SmartUpload onPhotoAnalyzed={handlePhotoAnalyzed} /></div>}

          {(currentView === AppView.PHOTOS || currentView === AppView.ALBUMS) && (
            <div>
               {currentView === AppView.PHOTOS && (
               <div className="mb-6 flex items-center justify-between">
                 <div className="flex flex-col gap-1">
                     <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
                        {searchQuery ? `Search Results` : 'Cloud Photos'}
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
              </div>
              )}
              {currentView === AppView.ALBUMS && (
                 <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                    <div>
                        <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Cloud Albums</h2>
                        <p className="text-sm text-slate-500 mt-1">Select albums to make them available offline.</p>
                    </div>
                    
                    <div className="flex items-center gap-2">
                        <button 
                            onClick={handleSyncAll}
                            className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-3 py-1.5 rounded-lg text-sm font-medium flex items-center gap-2 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                        >
                            <CheckSquare size={16} /> Sync All
                        </button>
                        <button 
                            onClick={handleUnsyncAll}
                            className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-3 py-1.5 rounded-lg text-sm font-medium flex items-center gap-2 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                        >
                            <Square size={16} /> Unsync All
                        </button>
                        <div className="h-6 w-px bg-slate-300 dark:bg-slate-600 mx-1"></div>
                        <div className="bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 px-3 py-1.5 rounded-lg text-sm font-medium flex items-center gap-2">
                            <CheckCircle2 size={16} />
                            {syncedAlbumNames.size} Synced
                        </div>
                    </div>
                 </div>
              )}
              
              {currentView === AppView.ALBUMS ? (
                  isLoadingCloud ? (
                    <div className="text-center py-20 text-slate-500">
                        <RefreshCw className="animate-spin mx-auto mb-2" />
                        Fetching Albums from Google Photos...
                    </div>
                  ) : (
                  <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-6">
                  {albums.map(album => (
                     <div key={album.id} className={`group relative rounded-xl overflow-hidden border-2 transition-all duration-200 hover:shadow-md cursor-pointer
                        ${album.syncEnabled 
                            ? 'border-blue-500 ring-2 ring-blue-500/20' 
                            : 'border-transparent hover:border-slate-200 dark:hover:border-slate-700'
                        }
                     `} onClick={() => toggleAlbumSync(album.name)}>
                        <div className="aspect-square bg-slate-100 dark:bg-slate-900 relative overflow-hidden">
                           <img src={album.coverUrl || 'https://via.placeholder.com/300?text=No+Cover'} alt={album.name} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" />
                           <div className={`absolute inset-0 bg-black/20 transition-opacity ${album.syncEnabled ? 'opacity-20' : 'opacity-0 group-hover:opacity-10'}`}></div>
                           
                           {album.syncEnabled && (
                               <div className="absolute top-2 right-2 bg-blue-500 text-white p-1.5 rounded-full shadow-md animate-in zoom-in">
                                   <Check size={14} strokeWidth={3} />
                               </div>
                           )}
                           {!album.syncEnabled && (
                               <div className="absolute top-2 right-2 bg-black/50 text-white p-1.5 rounded-full shadow-md opacity-0 group-hover:opacity-100 transition-opacity">
                                   <Download size={14} />
                               </div>
                           )}
                        </div>
                        <div className={`p-4 bg-white dark:bg-slate-800 ${album.syncEnabled ? 'bg-blue-50/50 dark:bg-blue-900/10' : ''}`}>
                           <div className="flex justify-between items-start gap-2 mb-2">
                              <h3 className="font-semibold text-slate-900 dark:text-slate-100 truncate flex-1">{album.name}</h3>
                           </div>
                           <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">{album.count} items</p>
                        </div>
                     </div>
                  ))}
                  </div>
                  )
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
                    {filteredPhotos.map(photo => (
                    <div key={photo.id} className="group relative bg-white dark:bg-slate-800 rounded-xl overflow-hidden shadow-sm hover:shadow-lg transition-all border border-slate-200 dark:border-slate-700">
                        <div className="aspect-[4/3] overflow-hidden bg-slate-100 dark:bg-slate-900 relative">
                        <img src={photo.url} alt={photo.name} className="w-full h-full object-cover" loading="lazy" />
                        </div>
                        <div className="p-3">
                        <h4 className="text-sm font-semibold text-slate-800 dark:text-slate-200 truncate">{photo.name}</h4>
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
                  <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                      <Laptop className="text-blue-500" /> Desktop Sync Configuration
                  </h3>
                  
                  <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border border-blue-100 dark:border-blue-800 mb-6">
                     <div className="flex items-start gap-3">
                        <Laptop className="shrink-0 text-blue-600 mt-1" size={20} />
                        <div className="flex-1">
                            <p className="text-sm font-bold text-blue-800 dark:text-blue-200 mb-1">
                                Setup Desktop Sync
                            </p>
                            <p className="text-sm text-blue-700 dark:text-blue-300">
                                To download these albums to your PC, you must copy the Access Token below and paste it into the <strong>Tray App Settings</strong>.
                            </p>
                        </div>
                     </div>
                     
                     <div className="mt-4 flex gap-2">
                        <div className="flex-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 flex items-center justify-between">
                            <code className="text-xs text-slate-500 truncate max-w-[200px]">
                                {currentUser.token ? currentUser.token.substring(0, 20) + '...' : 'Not Logged In'}
                            </code>
                            <div className="flex items-center gap-2">
                                <button onClick={handleRefreshToken} className="text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 p-1 rounded transition-colors" title="Refresh Token if expired">
                                    <RotateCcw size={14} />
                                </button>
                                <button onClick={copyToken} className="text-blue-600 hover:text-blue-700 text-xs font-bold flex items-center gap-1">
                                    <Copy size={14} /> Copy Token
                                </button>
                            </div>
                        </div>
                     </div>
                  </div>

                  <div className="space-y-2 mb-6">
                      <div className="flex justify-between items-center mb-2">
                        <p className="text-sm font-medium">Selected Albums ({syncedAlbumNames.size}):</p>
                        <button onClick={() => setCurrentView(AppView.ALBUMS)} className="text-xs text-blue-500 hover:underline">Manage Selection</button>
                      </div>
                      
                      <div className="max-h-48 overflow-y-auto border border-slate-200 dark:border-slate-700 rounded-lg">
                        {Array.from(syncedAlbumNames).map(name => (
                            <div key={name} className="flex items-center justify-between p-2 bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700 last:border-0">
                                <span className="text-sm">{name}</span>
                                <button onClick={() => toggleAlbumSync(name)} className="text-red-500 hover:text-red-600">
                                    <XCircle size={16} />
                                </button>
                            </div>
                        ))}
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