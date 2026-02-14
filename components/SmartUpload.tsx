import React, { useState, useRef } from 'react';
import { Upload, Sparkles, X, Loader2, Image as ImageIcon, Tag } from 'lucide-react';
import { analyzeImage } from '../services/geminiService';
import { Photo } from '../types';

interface SmartUploadProps {
  onPhotoAnalyzed: (photo: Photo) => void;
}

export const SmartUpload: React.FC<SmartUploadProps> = ({ onPhotoAnalyzed }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const processFile = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      setError('Please upload an image file.');
      return;
    }
    
    setError(null);
    setIsAnalyzing(true);

    try {
      const reader = new FileReader();
      reader.onload = async () => {
        const base64String = reader.result as string;
        setPreview(base64String);

        // Remove data URL prefix for API
        const base64Data = base64String.split(',')[1];
        
        try {
            const result = await analyzeImage(base64Data, file.type);
            
            const newPhoto: Photo = {
                id: Math.random().toString(36).substr(2, 9),
                userId: 'current-user', // Placeholder, will be overwritten by parent
                url: base64String,
                name: file.name,
                album: result.suggestedAlbum || 'Unsorted',
                tags: result.tags || [],
                description: result.description,
                date: new Date().toLocaleDateString(),
                source: 'local',
                size: (file.size / 1024 / 1024).toFixed(2) + ' MB'
            };
            
            onPhotoAnalyzed(newPhoto);
        } catch (err) {
            console.error(err);
            setError("Failed to analyze image with Gemini. Check your API key.");
        } finally {
            setIsAnalyzing(false);
        }
      };
      reader.readAsDataURL(file);
    } catch (err) {
      setError("Error reading file.");
      setIsAnalyzing(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto">
      <div 
        className={`relative border-2 border-dashed rounded-xl p-10 transition-all text-center
          ${isDragging 
            ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 scale-[1.02]' 
            : 'border-slate-300 dark:border-slate-600 hover:border-blue-400 dark:hover:border-blue-500'
          }
        `}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <input 
          type="file" 
          ref={fileInputRef}
          onChange={handleFileSelect}
          className="hidden"
          accept="image/*"
        />

        {isAnalyzing ? (
          <div className="py-10 flex flex-col items-center animate-pulse">
            <div className="relative">
                <div className="absolute inset-0 bg-blue-500 blur-xl opacity-20 rounded-full"></div>
                <Loader2 size={48} className="text-blue-600 animate-spin relative z-10" />
            </div>
            <h3 className="mt-4 text-lg font-semibold text-slate-800 dark:text-slate-200">Gemini is analyzing...</h3>
            <p className="text-slate-500 dark:text-slate-400">Detecting objects, suggesting tags, and organizing.</p>
          </div>
        ) : (
          <div className="py-6 flex flex-col items-center cursor-pointer" onClick={() => fileInputRef.current?.click()}>
            <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center mb-4 text-blue-600 dark:text-blue-400">
               <Sparkles size={32} />
            </div>
            <h3 className="text-xl font-bold text-slate-800 dark:text-slate-200">Smart Upload</h3>
            <p className="text-slate-500 dark:text-slate-400 mt-2 max-w-sm">
              Drag & drop a photo here, or click to browse. 
              <br/>
              Gemini will automatically categorize and tag it.
            </p>
            {error && <p className="mt-4 text-red-500 text-sm bg-red-50 dark:bg-red-900/20 px-3 py-1 rounded">{error}</p>}
          </div>
        )}
      </div>

      {preview && !isAnalyzing && (
         <div className="mt-8 bg-white dark:bg-slate-800 rounded-xl shadow-lg overflow-hidden border border-slate-200 dark:border-slate-700 p-6 flex items-start gap-6 animate-in fade-in slide-in-from-bottom-4">
             <div className="w-32 h-32 shrink-0 rounded-lg overflow-hidden bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-700">
                 <img src={preview} alt="Uploaded" className="w-full h-full object-cover" />
             </div>
             <div className="flex-1">
                 <div className="flex items-center gap-2 mb-2">
                     <div className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 px-2 py-0.5 rounded text-xs font-bold uppercase tracking-wide flex items-center gap-1">
                        <CheckCircle2 size={12} className="inline"/> Synced
                     </div>
                     <span className="text-xs text-slate-400">Just now</span>
                 </div>
                 <h4 className="text-lg font-bold text-slate-800 dark:text-slate-100">Analysis Complete</h4>
                 <p className="text-slate-600 dark:text-slate-400 text-sm mt-1">
                    Photo added to library. Check the "Albums" or "Photos" tab to see the results.
                 </p>
                 <button 
                   onClick={() => setPreview(null)}
                   className="mt-4 text-sm text-blue-600 hover:text-blue-700 font-medium"
                 >
                    Upload Another
                 </button>
             </div>
         </div>
      )}
    </div>
  );
};

// Helper component for icon
function CheckCircle2(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="10" />
      <path d="m9 12 2 2 4-4" />
    </svg>
  );
}