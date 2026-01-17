
import React from 'react';

const NextoMascot: React.FC = () => (
    <>
        {/*
          By defining keyframes in a style tag at the component root,
          we make them globally available for the div below to use.
          This resolves the scoping issue where the animation wouldn't run.
        */}
        <style>
            {`
            .eye { animation: blink 3s infinite; transform-origin: center; }
            @keyframes blink {
                0%, 90%, 100% { opacity: 1; }
                95% { opacity: 0; }
            }
            @keyframes gentle-drift {
                0% { transform: translate(0, 0); }
                25% { transform: translate(-8px, 5px); }
                50% { transform: translate(5px, -8px); }
                75% { transform: translate(3px, 3px); }
                100% { transform: translate(0, 0); }
            }
            `}
        </style>
        <div className="fixed bottom-24 right-4 md:right-8 w-20 h-20 md:w-28 md:h-28 z-10 pointer-events-none" style={{ animation: 'gentle-drift 15s ease-in-out infinite' }}>
            <svg
                viewBox="0 0 1024 1024"
                width="100%"
                height="100%"
                xmlns="http://www.w3.org/2000/svg"
                aria-label="Nexto Robot Mascot"
            >
                <defs>
                    <linearGradient id="bodyG" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#5ee0fd"/>
                        <stop offset="100%" stopColor="#258be7"/>
                    </linearGradient>
                </defs>
                <ellipse cx="512" cy="320" rx="220" ry="200" fill="url(#bodyG)"/>
                <ellipse className="eye" cx="440" cy="260" rx="35" ry="35" fill="#000"/>
                <ellipse className="eye" cx="585" cy="260" rx="35" ry="35" fill="#000"/>
                <path d="M450,330 Q512,380 575,330" fill="#d21c2c"/>
                <circle cx="375" cy="310" r="30" fill="#ff7ea8" opacity=".8"/>
                <circle cx="650" cy="310" r="30" fill="#ff7ea8" opacity=".8"/>
                <line x1="400" y1="170" x2="360" y2="100" stroke="#4ba3f5" strokeWidth="20"/>
                <circle cx="360" cy="100" r="20" fill="#4ba3f5"/>
                <line x1="620" y1="170" x2="660" y2="100" stroke="#4ba3f5" strokeWidth="20"/>
                <circle cx="660" cy="100" r="20" fill="#4ba3f5"/>
                <ellipse cx="512" cy="600" rx="230" ry="280" fill="url(#bodyG)"/>
                <ellipse cx="300" cy="610" rx="50" ry="100" fill="url(#bodyG)"/>
                <ellipse cx="720" cy="610" rx="50" ry="100" fill="url(#bodyG)"/>
                <rect x="400" y="540" width="220" height="120" rx="20" fill="#0c1b2c"/>
                <text x="425" y="615" fontSize="48" fill="#ffffff" fontFamily="Arial, sans-serif">▶ Next</text>
                <ellipse cx="512" cy="900" rx="140" ry="30" fill="#000" opacity=".1"/>
            </svg>
        </div>
    </>
);

export default NextoMascot;
