
import React from 'react';

const TypingIndicator: React.FC = () => (
    <div className="flex items-center space-x-1.5 p-2">
        <style>
        {`
            @keyframes bounce {
                0%, 100% { transform: translateY(0); }
                50% { transform: translateY(-6px); }
            }
            .dot-1 { animation: bounce 1.2s infinite 0s; }
            .dot-2 { animation: bounce 1.2s infinite 0.2s; }
            .dot-3 { animation: bounce 1.2s infinite 0.4s; }
        `}
        </style>
        <div className="h-2 w-2 bg-gray-400 rounded-full dot-1"></div>
        <div className="h-2 w-2 bg-gray-400 rounded-full dot-2"></div>
        <div className="h-2 w-2 bg-gray-400 rounded-full dot-3"></div>
    </div>
);

export default TypingIndicator;
