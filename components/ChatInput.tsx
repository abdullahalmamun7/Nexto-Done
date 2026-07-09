
import React, { useState, useRef, useEffect } from 'react';
import { ImagePlus, X } from 'lucide-react';

// Define SpeechRecognition for browsers that use the webkit prefix
// Fix: Cast window to `any` to access browser-specific SpeechRecognition APIs without TypeScript errors.
const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
const hasSpeechRecognition = !!SpeechRecognition;

interface ChatInputProps {
  onSendMessage: (message: string, imageBase64?: string) => void;
  isLoading: boolean;
}

const ChatInput: React.FC<ChatInputProps> = ({ onSendMessage, isLoading }) => {
  const [input, setInput] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const recognitionRef = useRef<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!hasSpeechRecognition) return;

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    recognition.onresult = (event) => {
      let interimTranscript = '';
      let finalTranscript = '';
      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) {
          finalTranscript += event.results[i][0].transcript;
        } else {
          interimTranscript += event.results[i][0].transcript;
        }
      }
      setInput(finalTranscript + interimTranscript);
    };

    recognition.onend = () => {
      setIsListening(false);
    };
    
    recognition.onerror = (event) => {
      console.error('Speech recognition error:', event.error);
      setIsListening(false);
    };

    recognitionRef.current = recognition;

    return () => {
      recognition.stop();
    };
  }, []);

  const handleListen = () => {
    if (!recognitionRef.current) return;

    if (isListening) {
      recognitionRef.current.stop();
    } else {
      setInput(''); // Clear input before starting new recognition
      recognitionRef.current.start();
    }
    setIsListening(!isListening);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setSelectedImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if ((input.trim() || selectedImage) && !isLoading) {
      if(isListening) {
        recognitionRef.current?.stop();
        setIsListening(false);
      }
      onSendMessage(input, selectedImage || undefined);
      setInput('');
      setSelectedImage(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };
  
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
        handleSubmit(e as any);
    }
  }

  return (
    <div className="flex flex-col items-center w-full">
      <form onSubmit={handleSubmit} className="w-full flex flex-col gap-2 relative">
        {selectedImage && (
          <div className="relative self-start mb-2 inline-block">
            <img src={selectedImage} alt="Preview" className="h-20 w-20 object-cover rounded-lg shadow-sm border border-gray-200" />
            <button
              type="button"
              onClick={() => setSelectedImage(null)}
              className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 shadow-md hover:bg-red-600 transition"
            >
              <X size={14} />
            </button>
          </div>
        )}
        <div className="w-full flex items-center relative">
          <input
            type="file"
            accept="image/*"
            ref={fileInputRef}
            onChange={handleImageUpload}
            className="hidden"
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="absolute left-2 top-1/2 -translate-y-1/2 p-2 text-gray-400 hover:text-blue-500 transition-colors z-10 bg-transparent"
            title="Upload Image"
          >
            <ImagePlus size={20} />
          </button>
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={isListening ? "Listening..." : "Message Nexto..."}
            disabled={isLoading}
            className="w-full bg-gray-100 border border-gray-200 rounded-lg py-3 pr-28 pl-12 text-gray-800 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-400 transition duration-300 disabled:opacity-50"
            autoComplete="off"
          />
          <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-2">
            {hasSpeechRecognition && (
                 <button
                    type="button"
                    onClick={handleListen}
                    className={`p-2 rounded-full transition-all duration-300 ${
                        isListening 
                        ? 'bg-red-500 text-white animate-pulse' 
                        : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
                    }`}
                    aria-label={isListening ? "Stop listening" : "Start listening"}
                 >
                    {isListening ? (
                         <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8 7a1 1 0 011-1h2a1 1 0 110 2H9a1 1 0 01-1-1zm1 5a1 1 0 100 2h2a1 1 0 100-2H9z" clipRule="evenodd" />
                         </svg>
                    ) : (
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                            <path d="M7 4a3 3 0 016 0v6a3 3 0 11-6 0V4z" />
                            <path d="M5.5 13a.5.5 0 01.5-.5h8a.5.5 0 010 1h-8a.5.5 0 01-.5-.5z" />
                            <path d="M3 10a1 1 0 00-1 1v1a7 7 0 0014 0v-1a1 1 0 10-2 0v1a5 5 0 01-10 0v-1a1 1 0 00-1-1z" />
                        </svg>
                    )}
                 </button>
            )}
            <button
              type="submit"
              disabled={isLoading || (!input.trim() && !selectedImage)}
              className={`p-2 rounded-md transition-all duration-300 ${
                  !(isLoading || (!input.trim() && !selectedImage))
                  ? 'bg-blue-500 text-white hover:bg-blue-600'
                  : 'bg-gray-200 text-gray-400 cursor-not-allowed'
              }`}
              aria-label="Send Message"
            >
              {isLoading ? (
                <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" />
                </svg>
              )}
            </button>
          </div>
        </div>
      </form>
      <p className="text-xs text-gray-400 mt-2">Nexto can make mistakes. Verify important information.</p>
    </div>
  );
};

export default ChatInput;
