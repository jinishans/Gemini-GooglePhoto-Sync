import React, { useState, useEffect } from 'react';
import { Mic, MicOff, Loader2 } from 'lucide-react';

interface VoiceInputProps {
  onTranscript: (text: string) => void;
  isCompact?: boolean;
}

export const VoiceInput: React.FC<VoiceInputProps> = ({ onTranscript, isCompact = false }) => {
  const [isListening, setIsListening] = useState(false);
  const [isSupported, setIsSupported] = useState(true);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    // Check browser support
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      setIsSupported(false);
      return;
    }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    recognitionRef.current = new SpeechRecognition();
    recognitionRef.current.continuous = false;
    recognitionRef.current.interimResults = false;
    recognitionRef.current.lang = 'en-US';

    recognitionRef.current.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      onTranscript(transcript);
      setIsListening(false);
    };

    recognitionRef.current.onerror = (event: any) => {
      console.error('Speech recognition error', event.error);
      setIsListening(false);
    };

    recognitionRef.current.onend = () => {
      setIsListening(false);
    };
  }, [onTranscript]);

  const toggleListening = () => {
    if (isListening) {
      recognitionRef.current?.stop();
    } else {
      recognitionRef.current?.start();
      setIsListening(true);
    }
  };

  if (!isSupported) return null;

  return (
    <button
      onClick={toggleListening}
      className={`transition-colors ${
        isListening 
          ? 'text-red-500 hover:text-red-600 bg-red-50 dark:bg-red-900/20' 
          : 'text-slate-400 hover:text-blue-500 hover:bg-slate-100 dark:hover:bg-slate-700'
      } ${isCompact ? 'p-1.5 rounded-md' : 'p-2 rounded-full'}`}
      title="Voice Search"
    >
      {isListening ? (
        <MicOff size={isCompact ? 16 : 20} className="animate-pulse" />
      ) : (
        <Mic size={isCompact ? 16 : 20} />
      )}
    </button>
  );
};

// Simple import fix since we used useRef but didn't import it in this file block
import { useRef } from 'react';
