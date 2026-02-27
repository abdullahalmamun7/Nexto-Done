
import React from 'react';
import { motion } from 'motion/react';
import type { Message } from '../types';
import NextoLogo from './NextoLogo';
import UserAvatar from './UserAvatar';
import TypingIndicator from './TypingIndicator';

interface ChatMessageProps {
  message: Message;
  isLoading?: boolean;
}

const ChatMessage: React.FC<ChatMessageProps> = ({ message, isLoading }) => {
  const isUser = message.role === 'user';

  const escapeHtml = (unsafe: string) => {
    return unsafe
     .replace(/&/g, "&amp;")
     .replace(/</g, "&lt;")
     .replace(/>/g, "&gt;")
     .replace(/"/g, "&quot;")
     .replace(/'/g, "&#039;");
  }

  const formatContent = (content: string) => {
    const segments = content.split('```');
    
    const formattedSegments = segments.map((segment, index) => {
        if (index % 2 === 1) { // This is a code block
            const code = escapeHtml(segment.trim());
            return `<pre class="bg-gray-800 text-white rounded-md p-3 my-2 text-sm font-mono overflow-x-auto"><code>${code}</code></pre>`;
        } else { // This is regular text
            return segment
                .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                .replace(/`([^`]+)`/g, '<code class="bg-gray-200 text-gray-800 rounded px-1.5 py-1 text-sm font-mono">$1</code>')
                .replace(/\n/g, '<br />');
        }
    });

    return { __html: formattedSegments.join('') };
  };

  if (isUser) {
    return (
      <motion.div 
        initial={{ opacity: 0, y: 10, x: 10 }}
        animate={{ opacity: 1, y: 0, x: 0 }}
        className="flex justify-end items-start gap-3"
      >
        <div className="bg-blue-500 text-white rounded-xl rounded-br-none p-3 max-w-lg shadow-md">
          <p className="whitespace-pre-wrap">{message.content}</p>
        </div>
        <UserAvatar className="w-8 h-8" />
      </motion.div>
    );
  }

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10, x: -10 }}
      animate={{ opacity: 1, y: 0, x: 0 }}
      className="flex items-start gap-3"
    >
       <NextoLogo className="w-8 h-8"/>
       <div>
         <p className="font-bold text-gray-700 mb-1">Nexto</p>
         <div className="bg-white rounded-xl rounded-bl-none p-3 max-w-lg border border-gray-200 shadow-sm min-h-[44px]">
            {isLoading && !message.content ? (
              <TypingIndicator />
            ) : (
              <div className="text-gray-800 prose prose-sm max-w-none relative">
                <div dangerouslySetInnerHTML={formatContent(message.content)}></div>
                {isLoading && (
                  <motion.span 
                    animate={{ opacity: [0, 1, 0] }}
                    transition={{ repeat: Infinity, duration: 0.8 }}
                    className="inline-block w-2 h-4 bg-blue-500 ml-1 align-middle"
                  />
                )}
              </div>
            )}
         </div>
       </div>
    </motion.div>
  );
};

export default ChatMessage;
