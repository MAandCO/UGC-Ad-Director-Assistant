import React, { useState, useEffect, useRef } from 'react';
import { Icon } from './Icon';

interface SpeechInputProps {
  id: string;
  name: string;
  label: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
  placeholder: string;
  isTextarea?: boolean;
  rows?: number;
  required?: boolean;
}

export const SpeechInput: React.FC<SpeechInputProps> = ({ id, name, label, value, onChange, placeholder, isTextarea = false, rows = 3, required = false }) => {
  const [isListening, setIsListening] = useState(false);
  const [hasSupport, setHasSupport] = useState(false);
  const recognitionRef = useRef<any | null>(null);

  useEffect(() => {
    const SpeechRecognitionAPI = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    let recognition: any;

    if (SpeechRecognitionAPI) {
      try {
        recognition = new SpeechRecognitionAPI();
        recognition.continuous = false;
        recognition.interimResults = false;
        recognition.lang = 'en-US';

        recognition.onstart = () => setIsListening(true);
        recognition.onend = () => setIsListening(false);
        recognition.onerror = (event: any) => {
            console.error('Speech recognition error', event.error);
            setIsListening(false);
        };

        recognition.onresult = (event: any) => {
          const transcript = Array.from(event.results)
            .map((result: any) => result[0])
            .map((result: any) => result.transcript)
            .join('')
            .trim();

          if (transcript) {
            const newValue = value ? `${value} ${transcript}` : transcript;

            const syntheticEvent = {
              target: {
                name,
                value: newValue,
              },
            } as React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>;
  
            onChange(syntheticEvent);
          }
        };

        recognitionRef.current = recognition;
        setHasSupport(true);
      } catch (error) {
        console.error("Speech Recognition API initialization failed:", error);
        setHasSupport(false);
      }
    } else {
        setHasSupport(false);
    }
    
    return () => {
      if (recognition) {
        recognition.stop();
      }
    };
    // We only want this to run once on mount to set up the API, 
    // but also need to pass correct values to onChange. 
    // Let's refine dependencies to avoid re-creating the recognition object unnecessarily.
    // By passing a callback to onChange, we can get the latest value without adding it as a dependency.
  }, [name, onChange]);

  const handleMicClick = () => {
    if (!recognitionRef.current) return;
    
    if (isListening) {
      recognitionRef.current.stop();
    } else {
      try {
        recognitionRef.current.start();
      } catch(e) {
        console.error("Could not start speech recognition:", e);
      }
    }
  };

  const InputComponent = isTextarea ? 'textarea' : 'input';

  return (
    <div>
      <label htmlFor={id} className="block text-sm font-medium text-gray-300">{label}</label>
      <div className="mt-1 relative">
        <InputComponent
          id={id}
          name={name}
          rows={isTextarea ? rows : undefined}
          value={value}
          onChange={onChange}
          className="block w-full bg-gray-800 border-gray-600 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm text-white pr-10"
          placeholder={placeholder}
          required={required}
        />
        {hasSupport && (
          <button
            type="button"
            onClick={handleMicClick}
            className={`absolute inset-y-0 right-0 flex items-center pr-3 group focus:outline-none ${isListening ? 'text-indigo-400' : 'text-gray-400 hover:text-indigo-300'}`}
            aria-label={isListening ? 'Stop listening' : 'Start listening'}
          >
            <Icon icon="microphone" className={`w-5 h-5 transition-colors ${isListening ? 'animate-pulse' : ''}`} />
          </button>
        )}
      </div>
    </div>
  );
};
