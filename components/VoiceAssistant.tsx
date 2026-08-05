import React, { useState, useRef, useEffect, useCallback } from 'react';
import { GoogleGenAI, LiveServerMessage, Modality } from "@google/genai";
import { Mic, X, Loader2 } from 'lucide-react';
import { SYSTEM_INSTRUCTION } from '../constants';

interface VoiceAssistantProps {
  isOpen: boolean;
  onClose: () => void;
  onVolumeChange?: (volume: number) => void;
  volume?: number;
  voiceName?: string;
}

const VoiceAssistant: React.FC<VoiceAssistantProps> = ({ isOpen, onClose, onVolumeChange, volume: appVolume = 100, voiceName = 'Zephyr' }) => {
  const [isListening, setIsListening] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [volume, setVolume] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const audioContextRef = useRef<AudioContext | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const sessionRef = useRef<any>(null);
  const nextStartTimeRef = useRef<number>(0);
  const sourceNodeRef = useRef<AudioBufferSourceNode | null>(null);
  const gainNodeRef = useRef<GainNode | null>(null);

  // Helper to convert Float32 to Int16 PCM
  const float32ToInt16 = (float32: Float32Array) => {
    const int16 = new Int16Array(float32.length);
    for (let i = 0; i < float32.length; i++) {
      const s = Math.max(-1, Math.min(1, float32[i]));
      int16[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
    }
    return int16;
  };

  // Helper to convert Int16 PCM to Float32
  const int16ToFloat32 = (int16: Int16Array) => {
    const float32 = new Float32Array(int16.length);
    for (let i = 0; i < int16.length; i++) {
      const s = int16[i];
      float32[i] = s < 0 ? s / 0x8000 : s / 0x7FFF;
    }
    return float32;
  };

  // Helper to convert ArrayBuffer to Base64
  const arrayBufferToBase64 = (buffer: ArrayBuffer) => {
    let binary = '';
    const bytes = new Uint8Array(buffer);
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return window.btoa(binary);
  };

  // Helper to convert Base64 to ArrayBuffer
  const base64ToArrayBuffer = (base64: string) => {
    const binaryString = window.atob(base64);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes.buffer;
  };

  const playAudioChunk = useCallback((audioData: Float32Array) => {
    if (!audioContextRef.current) return;
    
    const audioContext = audioContextRef.current;
    const buffer = audioContext.createBuffer(1, audioData.length, 24000); // Model output is 24kHz
    buffer.getChannelData(0).set(audioData);
    
    const source = audioContext.createBufferSource();
    source.buffer = buffer;
    
    // Use gain node for volume control
    if (!gainNodeRef.current) {
      gainNodeRef.current = audioContext.createGain();
      gainNodeRef.current.connect(audioContext.destination);
    }
    
    gainNodeRef.current.gain.value = appVolume / 100;
    source.connect(gainNodeRef.current);
    
    // Schedule playback
    const currentTime = audioContext.currentTime;
    if (nextStartTimeRef.current < currentTime) {
        nextStartTimeRef.current = currentTime;
    }
    
    source.start(nextStartTimeRef.current);
    nextStartTimeRef.current += buffer.duration;
    sourceNodeRef.current = source;
  }, []);

  const startSession = useCallback(async () => {
    try {
      setIsConnecting(true);
      setError(null);

      if (!process.env.API_KEY) {
        throw new Error("API_KEY environment variable is not set.");
      }

      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

      // Initialize Audio Context
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      const audioContext = new AudioContextClass({ sampleRate: 24000 });
      audioContextRef.current = audioContext;
      nextStartTimeRef.current = audioContext.currentTime;

      // Setup audio input stream first
      const stream = await navigator.mediaDevices.getUserMedia({ audio: {
        sampleRate: 16000,
        channelCount: 1,
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true
      }});
      mediaStreamRef.current = stream;

      const source = audioContext.createMediaStreamSource(stream);
      const processor = audioContext.createScriptProcessor(4096, 1, 1);
      processorRef.current = processor;

      // Connect to Gemini Live
      const sessionPromise = ai.live.connect({
        model: "gemini-2.5-flash-native-audio-preview-09-2025",
        callbacks: {
          onopen: () => {
            console.log("Session opened");
            setIsConnecting(false);
            setIsListening(true);
            
            // Start sending audio data
            processor.onaudioprocess = (e) => {
                const inputData = e.inputBuffer.getChannelData(0);
                
                // Volume visualization
                let sum = 0;
                for (let i = 0; i < inputData.length; i++) {
                  sum += inputData[i] * inputData[i];
                }
                const rms = Math.sqrt(sum / inputData.length);
                const calculatedVolume = Math.min(100, rms * 500);
                setVolume(calculatedVolume);
                onVolumeChange?.(calculatedVolume);

                // Resample to 16kHz if needed
                const targetSampleRate = 16000;
                const sourceSampleRate = audioContext.sampleRate;
                
                let finalData = inputData;
                
                if (sourceSampleRate !== targetSampleRate) {
                    const ratio = sourceSampleRate / targetSampleRate;
                    const newLength = Math.round(inputData.length / ratio);
                    const result = new Float32Array(newLength);
                    
                    for (let i = 0; i < newLength; i++) {
                        const originalIndex = i * ratio;
                        const index1 = Math.floor(originalIndex);
                        const index2 = Math.ceil(originalIndex);
                        const fraction = originalIndex - index1;
                        
                        const val1 = inputData[index1] || 0;
                        const val2 = inputData[index2] || 0;
                        result[i] = val1 + (val2 - val1) * fraction;
                    }
                    finalData = result;
                }
                
                const int16Data = float32ToInt16(finalData);
                const base64Audio = arrayBufferToBase64(int16Data.buffer);
                
                sessionPromise.then(session => {
                    session.sendRealtimeInput({
                        audio: {
                            mimeType: "audio/pcm;rate=16000",
                            data: base64Audio
                        }
                    });
                });
            };
            
            source.connect(processor);
            processor.connect(audioContext.destination);
          },
          onmessage: async (message: LiveServerMessage) => {
            const serverContent = message.serverContent;
            if (serverContent) {
                if (serverContent.modelTurn && serverContent.modelTurn.parts && serverContent.modelTurn.parts.length > 0) {
                    const part = serverContent.modelTurn.parts[0];
                    if (part.inlineData && part.inlineData.data) {
                        const audioData = base64ToArrayBuffer(part.inlineData.data);
                        const int16Data = new Int16Array(audioData);
                        const float32Data = int16ToFloat32(int16Data);
                        playAudioChunk(float32Data);
                    }
                }
                
                if (serverContent.interrupted) {
                    if (sourceNodeRef.current) {
                        sourceNodeRef.current.stop();
                    }
                    nextStartTimeRef.current = audioContextRef.current?.currentTime || 0;
                }
            }
          },
          onclose: () => {
            console.log("Session closed");
            setIsListening(false);
          },
          onerror: (err) => {
            console.error("Session error:", err);
            setError("Connection error occurred.");
          }
        },
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: voiceName as any } },
          },
          systemInstruction: { parts: [{ text: SYSTEM_INSTRUCTION }] },
        },
      });

      sessionRef.current = await sessionPromise;

    } catch (e) {
      console.error(e);
      setError(e instanceof Error ? e.message : 'Failed to start voice session.');
      setIsConnecting(false);
      stopSession();
    }
  }, [playAudioChunk]);

  const stopSession = useCallback(() => {
    if (processorRef.current) {
      processorRef.current.disconnect();
      processorRef.current = null;
    }
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(track => track.stop());
      mediaStreamRef.current = null;
    }
    if (sessionRef.current) {
      // sessionRef.current.close() might not exist on the promise result directly depending on SDK
      // but usually it does.
      try {
          sessionRef.current.close();
      } catch (e) {
          console.log("Error closing session", e);
      }
      sessionRef.current = null;
    }
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
    gainNodeRef.current = null;
    setIsListening(false);
    setIsConnecting(false);
    setVolume(0);
    onVolumeChange?.(0);
  }, [onVolumeChange]);

  useEffect(() => {
    if (isOpen) {
      startSession();
    } else {
      stopSession();
    }
    return () => {
      stopSession();
    };
  }, [isOpen, startSession, stopSession]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 relative overflow-hidden">
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
        >
          <X size={24} />
        </button>
        
        <div className="flex flex-col items-center justify-center py-8 space-y-6">
          <div className="relative">
            {/* Pulse rings */}
            {isListening && (
              <>
                <div className="absolute inset-0 bg-blue-500 rounded-full opacity-20 animate-ping" style={{ animationDuration: '2s' }}></div>
                <div className="absolute inset-0 bg-blue-500 rounded-full opacity-10 animate-ping" style={{ animationDuration: '3s', animationDelay: '0.5s' }}></div>
              </>
            )}
            
            <div 
              className={`relative z-10 w-24 h-24 rounded-full flex items-center justify-center transition-all duration-300 ${
                isListening ? 'bg-blue-600 shadow-lg shadow-blue-500/30' : 'bg-gray-200'
              }`}
              style={{
                transform: `scale(${1 + volume / 100})`
              }}
            >
              {isConnecting ? (
                <Loader2 className="w-10 h-10 text-white animate-spin" />
              ) : (
                <Mic className={`w-10 h-10 ${isListening ? 'text-white' : 'text-gray-400'}`} />
              )}
            </div>
          </div>

          <div className="text-center space-y-2">
            <h3 className="text-xl font-semibold text-gray-900">
              {isConnecting ? 'Connecting...' : isListening ? 'Listening...' : 'Ready'}
            </h3>
            <p className="text-sm text-gray-500 max-w-xs mx-auto">
              {isConnecting 
                ? 'Establishing secure connection to Nexto...' 
                : 'Speak naturally. Nexto is listening.'}
            </p>
          </div>

          {error && (
            <div className="text-red-500 text-sm bg-red-50 px-4 py-2 rounded-lg">
              {error}
            </div>
          )}
        </div>
        
        <div className="flex justify-center pt-4 border-t border-gray-100">
           <button 
             onClick={onClose}
             className="px-6 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-full text-sm font-medium transition-colors"
           >
             End Call
           </button>
        </div>
      </div>
    </div>
  );
};

export default VoiceAssistant;
