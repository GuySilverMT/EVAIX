/**
 * Voice Keyboard - Invisible Auto-Recording Component
 * 
 * No UI - just starts recording and inserts text directly into the editor
 */

import { useState, useEffect, useRef } from 'react';

interface VoiceKeyboardProps {
  isOpen: boolean;
  onClose: () => void;
  onTextSubmit: (text: string) => void;
  position?: { x: number; y: number };
}

export const VoiceKeyboard: React.FC<VoiceKeyboardProps> = ({
  isOpen,
  onClose,
  onTextSubmit,
}) => {
  const [isListening, setIsListening] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recognitionRef = useRef<any>(null);

  // Initialize Web Speech API
  useEffect(() => {
    if (typeof window !== 'undefined') {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      
      if (SpeechRecognition) {
        const recognition = new SpeechRecognition();
        recognition.continuous = false;
        recognition.interimResults = false; // Only final results
        recognition.lang = 'en-US';

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        recognition.onresult = (event: any) => {
          const transcript = Array.from(event.results)
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            .map((result: any) => result[0])
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            .map((result: any) => result.transcript)
            .join('');
          
          // Immediately submit when we get final result
          if (transcript) {
            onTextSubmit(transcript);
            onClose();
          }
        };

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        recognition.onerror = (event: any) => {
          console.error('Speech recognition error:', event.error);
          setIsListening(false);
          onClose();
        };

        recognition.onend = () => {
          setIsListening(false);
          onClose();
        };

        recognitionRef.current = recognition;
      } else {
        console.warn('Web Speech API not supported');
        onClose();
      }
    }
  }, [onTextSubmit, onClose]);

  // Auto-start recording when opened
  useEffect(() => {
    if (isOpen && recognitionRef.current && !isListening) {
      setIsListening(true);
      try {
        recognitionRef.current.start();
        console.log('[Voice] Started recording...');
      } catch (_err) {
        console.error('[Voice] Failed to start');
        onClose();
      }
    }
  }, [isOpen, isListening, onClose]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (recognitionRef.current && isListening) {
        try {
          recognitionRef.current.stop();
        } catch {
          // Ignore cleanup errors
        }
      }
    };
  }, [isListening]);

  // No UI - completely invisible
  return null;
};

export default VoiceKeyboard;
