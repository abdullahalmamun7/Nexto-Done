
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { GoogleGenAI, Chat, GenerateContentResponse } from "@google/genai";
import { Mic, History, Settings, Trash2, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import type { Message } from './types';
import ChatMessage from './components/ChatMessage';
import ChatInput from './components/ChatInput';
import NextoLogo from './components/NextoLogo';
import VoiceAssistant from './components/VoiceAssistant';
import { SYSTEM_INSTRUCTION } from './constants';

const App: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [isVoiceOpen, setIsVoiceOpen] = useState(false);
  const [voiceVolume, setVoiceVolume] = useState(0);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [appVolume, setAppVolume] = useState(100);
  const [selectedVoice, setSelectedVoice] = useState('Zephyr');

  const chatRef = useRef<Chat | null>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);

  const initializeChat = useCallback(() => {
    try {
      if (!process.env.API_KEY) {
        throw new Error("API_KEY environment variable is not set.");
      }
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      chatRef.current = ai.chats.create({
        model: 'gemini-3-flash-preview',
        config: {
          systemInstruction: SYSTEM_INSTRUCTION,
        },
      });

      const savedMessages = localStorage.getItem('nexto_chat_history');
      if (savedMessages) {
        setMessages(JSON.parse(savedMessages));
      } else {
        setMessages([
          { role: 'model', content: "Assalamualaikum, I'm Nexto, an assistant created by Abdullah Al Mamun. How can I help you today?" },
        ]);
      }
      setError(null);
    } catch (e) {
      console.error(e);
      setError(e instanceof Error ? e.message : 'Failed to initialize the chat model.');
    }
  }, []);

  const handleResetChat = () => {
    localStorage.removeItem('nexto_chat_history');
    setMessages([]);
    initializeChat();
  };
  
  useEffect(() => {
    initializeChat();
  }, [initializeChat]);

  useEffect(() => {
    if (messages.length > 0) {
      localStorage.setItem('nexto_chat_history', JSON.stringify(messages));
    }
  }, [messages]);

  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [messages, isLoading]);

  const handleSendMessage = async (userInput: string) => {
    if (isLoading || !userInput.trim()) return;

    setIsLoading(true);
    setError(null);

    const userMessage: Message = { role: 'user', content: userInput };
    setMessages(prevMessages => [...prevMessages, userMessage]);

    try {
      if (!chatRef.current) {
        throw new Error('Chat is not initialized.');
      }
      
      const stream = await chatRef.current.sendMessageStream({ message: userInput });
      
      let modelResponse = '';
      setMessages(prev => [...prev, { role: 'model', content: '' }]);

      for await (const chunk of stream) {
        const c = chunk as GenerateContentResponse;
        const chunkText = c.text;
        if(chunkText){
          modelResponse += chunkText;
          setMessages(prev => {
              const newMessages = [...prev];
              newMessages[newMessages.length - 1].content = modelResponse;
              return newMessages;
          });
        }
      }

    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : 'An unknown error occurred.';
      console.error(e);
      setError(`Error: ${errorMessage}`);
      setMessages(prev => [...prev, { role: 'model', content: `Sorry, I ran into an error: ${errorMessage}` }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-screen bg-[#F9FAFB] text-gray-800 font-sans">
      <header className="bg-white p-4 border-b border-gray-200 shadow-sm flex justify-between items-center z-[60] sticky top-0">
        <div className="flex items-center gap-3">
          <NextoLogo />
          <div>
            <h1 className="text-xl font-bold text-gray-800">Nexto</h1>
            <p className="text-sm text-gray-500 flex items-center">
                <span className="h-2 w-2 bg-green-500 rounded-full mr-1.5 animate-pulse"></span>
                Your Nexto
            </p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <button 
            onClick={() => setIsHistoryOpen(true)}
            className="p-2 text-gray-500 hover:text-blue-600 transition-colors rounded-full hover:bg-blue-50"
            aria-label="View History"
          >
            <History size={24} />
          </button>
          <button 
            onClick={() => setIsSettingsOpen(true)}
            className="p-2 text-gray-500 hover:text-blue-600 transition-colors rounded-full hover:bg-blue-50"
            aria-label="Settings"
          >
            <Settings size={24} />
          </button>
          <button 
            onClick={() => setIsVoiceOpen(true)}
            className="p-2 text-gray-500 hover:text-blue-600 transition-all rounded-full hover:bg-blue-50 relative group"
            aria-label="Start Voice Chat"
          >
            {/* Volume Visualizer Rings */}
            {isVoiceOpen && (
              <>
                <div 
                  className="absolute inset-0 bg-blue-400 rounded-full opacity-20 transition-transform duration-75"
                  style={{ transform: `scale(${1 + voiceVolume / 100})` }}
                />
                <div 
                  className="absolute inset-0 bg-blue-400 rounded-full opacity-10 transition-transform duration-150"
                  style={{ transform: `scale(${1 + voiceVolume / 80})` }}
                />
              </>
            )}
            <Mic size={32} className={`relative z-10 transition-colors ${isVoiceOpen ? 'text-blue-600' : ''}`} />
          </button>
          <button onClick={handleResetChat} className="text-gray-500 hover:text-gray-800 transition-colors" aria-label="Reset Chat">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h5m-5-5l1.5 1.5A9 9 0 0121.5 12" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M20 20v-5h-5m5 5l-1.5-1.5A9 9 0 012.5 12" />
            </svg>
          </button>
        </div>
      </header>
      
      <main ref={chatContainerRef} className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6">
        {messages.map((msg, index) => (
          <ChatMessage
            key={index}
            message={msg}
            isLoading={isLoading && index === messages.length - 1}
          />
        ))}
      </main>
      
      {error && (
        <div className="p-4 text-center text-red-600 bg-red-100 border-t border-red-200">
          {error}
        </div>
      )}

      <footer className="p-4 bg-white/80 backdrop-blur-sm border-t border-gray-200 z-20">
        <div className="max-w-3xl mx-auto">
          <ChatInput onSendMessage={handleSendMessage} isLoading={isLoading} />
        </div>
      </footer>
      
      <VoiceAssistant 
        isOpen={isVoiceOpen} 
        onClose={() => {
          setIsVoiceOpen(false);
          setVoiceVolume(0);
        }} 
        onVolumeChange={setVoiceVolume}
        volume={appVolume}
        voiceName={selectedVoice}
      />

      {/* History Sidebar */}
      <AnimatePresence>
        {isHistoryOpen && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsHistoryOpen(false)}
              className="fixed inset-0 bg-black/20 backdrop-blur-sm z-[70]"
            />
            <motion.div 
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed right-0 top-0 h-full w-full max-w-xs bg-white shadow-2xl z-[80] flex flex-col"
            >
              <div className="p-4 border-b flex justify-between items-center bg-gray-50">
                <h2 className="font-bold text-lg flex items-center gap-2">
                  <History size={20} /> Chat History
                </h2>
                <button onClick={() => setIsHistoryOpen(false)} className="p-1 hover:bg-gray-200 rounded-full">
                  <X size={20} />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {messages.length === 0 ? (
                  <p className="text-center text-gray-500 mt-10">No history yet.</p>
                ) : (
                  messages.map((msg, i) => (
                    <div key={i} className={`p-3 rounded-lg text-sm ${msg.role === 'user' ? 'bg-blue-50 border-l-4 border-blue-500' : 'bg-gray-50 border-l-4 border-gray-300'}`}>
                      <p className="font-semibold mb-1 uppercase text-[10px] opacity-50">{msg.role}</p>
                      <p className="line-clamp-3">{msg.content}</p>
                    </div>
                  ))
                )}
              </div>
              <div className="p-4 border-t bg-gray-50">
                <button 
                  onClick={handleResetChat}
                  className="w-full py-2 bg-red-50 text-red-600 hover:bg-red-100 rounded-lg flex items-center justify-center gap-2 transition-colors font-medium"
                >
                  <Trash2 size={18} /> Clear All History
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Settings Modal */}
      <AnimatePresence>
        {isSettingsOpen && (
          <div className="fixed inset-0 flex items-center justify-center z-[100] p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsSettingsOpen(false)}
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 overflow-hidden"
            >
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold flex items-center gap-2">
                  <Settings size={24} /> Controls
                </h2>
                <button onClick={() => setIsSettingsOpen(false)} className="p-1 hover:bg-gray-100 rounded-full">
                  <X size={20} />
                </button>
              </div>

              <div className="space-y-6">
                <div className="space-y-3">
                  <label className="text-sm font-medium text-gray-700 flex justify-between">
                    Voice Volume <span>{appVolume}%</span>
                  </label>
                  <input 
                    type="range" 
                    min="0" 
                    max="100" 
                    value={appVolume} 
                    onChange={(e) => setAppVolume(parseInt(e.target.value))}
                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                  />
                </div>

                <div className="space-y-3">
                  <label className="text-sm font-medium text-gray-700">Voice Selection</label>
                  <select 
                    value={selectedVoice}
                    onChange={(e) => setSelectedVoice(e.target.value)}
                    className="w-full p-2 border rounded-lg bg-white focus:ring-2 focus:ring-blue-500 outline-none"
                  >
                    <option value="Zephyr">Zephyr (Default)</option>
                    <option value="Puck">Puck (Soft)</option>
                    <option value="Charon">Charon (Deep)</option>
                    <option value="Kore">Kore (Clear)</option>
                    <option value="Fenrir">Fenrir (Strong)</option>
                  </select>
                </div>

                <div className="pt-4 border-t">
                  <button 
                    onClick={() => {
                      const data = JSON.stringify(messages, null, 2);
                      const blob = new Blob([data], { type: 'application/json' });
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement('a');
                      a.href = url;
                      a.download = `nexto-history-${new Date().toISOString().split('T')[0]}.json`;
                      a.click();
                      URL.revokeObjectURL(url);
                    }}
                    className="w-full py-2 bg-blue-600 text-white hover:bg-blue-700 rounded-lg flex items-center justify-center gap-2 transition-colors font-medium"
                  >
                    Save History to File
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default App;
