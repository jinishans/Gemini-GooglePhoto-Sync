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
  Laptop
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
  const [searchMode, setSearchMode] = useState<SearchMode>(SearchMode.CLOUD); // Default to Cloud for hosted app
  
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
    storageUsed: '4.2 GB',
    uploadQueue: 0,
    downloadQueue: 0,
    currentAction: 'Monitoring Cloud...',
    vectorIndexCount: 0
  });

  // Local Folder State (Simulated connection to Desktop Client)
  const [desktopClientConnected, setDesktopClientConnected] = useState(false);

  // --- Auth & Data Loading Logic ---

  // When currentUser changes, load their "Cloud" data and their specific local data
  useEffect(() => {
    if (!currentUser) {
        setPhotos([]);
        setAlbums([]);
        return;
    }

    // Simulate fetching Google Photos for THIS user from Firebase/GCP
    const cloudPhotos = generateMockCloudPhotos(25, currentUser.id);
    
    // In hosted mode, all photos are technically "cloud" photos until downloaded
    setPhotos(cloudPhotos);
    setSyncedAlbumNames(new Set()); 
    
    // Simulate checking if desktop client is online
    setTimeout(() => setDesktopClientConnected(true), 2000);
    
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
      // In cloud mode, this would ideally happen server-side, but we simulate it here
      const timer = setTimeout(async () => {
        for (const photo of unindexedPhotos) {
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
      source: 'cloud' as const, // Default source is cloud in hosted app
      syncEnabled: syncedAlbumNames.has(name)
    }));
    setAlbums(newAlbums);

    setSyncStatus(prev => ({
      ...prev,
      totalFiles: photos.length,
      vectorIndexCount: vectorDb.getIndexSize()
    }));

  }, [photos, syncedAlbumNames, currentUser]);

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
  };

  const handlePhotoAnalyzed = (newPhoto: Photo) => {
    if (!currentUser) return;
    const photoWithSource = { ...newPhoto, source: 'cloud' as PhotoSource, userId: currentUser.id };
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
                {/* Desktop Client Status Banner */}
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
                                 ? "Your local computer is connected. New photos from your configured local folder will automatically appear here."
                                 : "Run the Python Tray App on your computer to sync local photos to this web gallery."}
                            </p>
                         </div>
                      </div>
                      <button 
                         className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors shadow-sm flex items-center gap-2 cursor-default
                           ${desktopClientConnected 
                              ? 'bg-white text-green-700 border border-green-200' 
                              : 'bg-white text-amber-700 border border-amber-200'
                           }`}
                      >
                         {desktopClientConnected ? 'Online' : 'Waiting for Desktop App...'}
                      </button>
                   </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                   <div className="bg-gradient-to-br from-indigo-500 to-blue-600 rounded-2xl p-6 text-white shadow-lg shadow-blue-500/20">
                      <div className="flex justify-between items-start mb-4">
                        <div className="bg-white/20 p-2 rounded-lg"><Cloud size={24} className="text-white" /></div>
                        <span className="text-xs font-medium bg-white/20 px-2 py-1 rounded-full">Google Cloud</span>
                      </div>
                      <h3 className="text-3xl font-bold mb-1">{syncStatus.storageUsed}</h3>
                      <p className="text-blue-100 text-sm">of 100 GB Plan</p>
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

                   <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col items-center justify-center text-center">
                      <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 rounded-full flex items-center justify-center mb-3">
                        <Globe size={24} />
                      </div>
                      <h3 className="font-semibold text-slate-900 dark:text-white">Public Sharing</h3>
                      <p className="text-sm text-slate-500 mt-1 mb-4">Share specific albums via public links without exposing your Google Photos.</p>
                      <button onClick={() => setCurrentView(AppView.GALLERY_SERVER)} className="text-purple-600 hover:text-purple-700 text-sm font-semibold flex items-center gap-1">
                        Manage Links <ChevronRight size={16} />
                      </button>
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
                              <p className="text-xs text-slate-500 mt-1">Using Google Imagen</p>
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
                    <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Cloud Albums</h2>
                 </div>
              )}
              
              {currentView === AppView.ALBUMS ? (
                  <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-6">
                  {albums.map(album => (
                     <div key={album.id} className={`group relative rounded-xl overflow-hidden border transition-all duration-200 border-slate-200 dark:border-slate-700 hover:shadow-md`}>
                        <div className="aspect-square bg-slate-100 dark:bg-slate-900 relative overflow-hidden">
                           <img src={album.coverUrl} alt={album.name} className="w-full h-full object-cover" />
                        </div>
                        <div className="p-4 bg-white dark:bg-slate-800">
                           <div className="flex justify-between items-start gap-2">
                              <h3 className="font-semibold text-slate-900 dark:text-slate-100 truncate flex-1">{album.name}</h3>
                           </div>
                           <button className={`w-full mt-2 py-1.5 px-3 rounded-lg text-xs font-medium flex items-center justify-center gap-2 bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300`}>
                              <Globe size={12} /> Share Link
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
                  <h3 className="text-lg font-bold mb-4">Cloud Configuration</h3>
                  <div className="text-sm text-slate-500 mb-4">
                     This application is running in Hosted Mode. Most settings are managed via the Desktop Tray Application.
                  </div>
                  
                  {/* Search Engine Config */}
                  <div className="space-y-4 mb-6">
                      <div>
                         <label className="block text-sm font-medium mb-2">Search Backend</label>
                         <div className="grid grid-cols-2 gap-4">
                             <select 
                               value={searchMode}
                               onChange={(e) => setSearchMode(e.target.value as SearchMode)}
                               className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm"
                             >
                                <option value={SearchMode.CLOUD}>Gemini Cloud (Recommended)</option>
                                <option value={SearchMode.LOCAL_VECTOR}>Client-Side Vector DB</option>
                             </select>
                         </div>
                      </div>
                  </div>

                  <h3 className="text-lg font-bold mb-4 pt-4 border-t border-slate-100 dark:border-slate-700">Privacy & Sharing</h3>
                  <div className="space-y-4">
                     <div className="flex items-center justify-between">
                        <div>
                           <p className="font-medium">Public Link Access</p>
                           <p className="text-sm text-slate-500">Allow anyone with the link to view shared albums</p>
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