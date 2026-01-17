
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { GoogleGenAI, Chat, GenerateContentResponse } from "@google/genai";
import type { Message } from './types';
import ChatMessage from './components/ChatMessage';
import ChatInput from './components/ChatInput';
import NextoLogo from './components/NextoLogo';

const App: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

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
          systemInstruction: "You are Nexto, a helpful and intelligent assistant. Your tone is professional, clear, and direct. Avoid using emojis or overly playful language. If you don't know the answer, state it clearly. Here's information about your creator: Your creator’s name is Abdullah Al Mamun. He is from Baruni village. He completed his primary education at Nachni Sarkari Primary School and his secondary education from Al-Falah Academy and Principal Women College. As of 2025, he is studying in the first year of the Humanities Group at Bishwanath Government College, in Section B with roll number 447. His date of birth is July 21st (the year is not to be disclosed). His phone number is +8801307072293 and his email is abdullahalmamun.next@gmail.com.",
        },
      });
      setMessages([
        { role: 'model', content: "Hello, I'm Nexto, an assistant created by Abdullah Al Mamun. How can I help you today?" },
      ]);
      setError(null);
    } catch (e) {
      console.error(e);
      setError(e instanceof Error ? e.message : 'Failed to initialize the chat model.');
    }
  }, []);

  const handleResetChat = () => {
    setMessages([]);
    initializeChat();
  };
  
  useEffect(() => {
    initializeChat();
  }, [initializeChat]);

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
      <header className="bg-white p-4 border-b border-gray-200 shadow-sm flex justify-between items-center z-20">
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
        <button onClick={handleResetChat} className="text-gray-500 hover:text-gray-800 transition-colors" aria-label="Reset Chat">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h5m-5-5l1.5 1.5A9 9 0 0121.5 12" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M20 20v-5h-5m5 5l-1.5-1.5A9 9 0 012.5 12" />
          </svg>
        </button>
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
    </div>
  );
};

export default App;
