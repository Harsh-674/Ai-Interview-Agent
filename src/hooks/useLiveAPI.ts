import { useState, useEffect, useRef, useCallback } from 'react';
import { GoogleGenAI, LiveServerMessage, Modality } from "@google/genai";
import { floatTo16BitPCM, arrayBufferToBase64, base64ToArrayBuffer } from '../lib/audio-utils';

interface UseLiveAPIProps {
  apiKey: string;
  systemInstruction: string;
  onTranscription?: (text: string, isUser: boolean) => void;
  onInterruption?: () => void;
}

export function useLiveAPI({
  apiKey,
  systemInstruction,
  onTranscription,
  onInterruption
}: UseLiveAPIProps) {
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [volume, setVolume] = useState(0);

  const aiRef = useRef<GoogleGenAI | null>(null);
  const sessionRef = useRef<any>(null); // Using any because the specific type might be tricky from the SDK here
  const audioContextRef = useRef<AudioContext | null>(null);
  const microphoneRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const workletRef = useRef<AudioWorkletNode | null>(null);
  const audioQueueRef = useRef<Float32Array[]>([]);
  const isPlayingRef = useRef(false);

  const stopSession = useCallback(() => {
    if (sessionRef.current) {
      sessionRef.current.close();
      sessionRef.current = null;
    }
    if (processorRef.current) {
      processorRef.current.disconnect();
      processorRef.current = null;
    }
    if (microphoneRef.current) {
      microphoneRef.current.disconnect();
      microphoneRef.current = null;
    }
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
    setIsConnected(false);
    setIsConnecting(false);
  }, []);

  const playNextChunk = useCallback(() => {
    if (audioQueueRef.current.length === 0 || !audioContextRef.current) {
      isPlayingRef.current = false;
      return;
    }

    isPlayingRef.current = true;
    const chunk = audioQueueRef.current.shift()!;
    const audioBuffer = audioContextRef.current.createBuffer(1, chunk.length, 24000);
    audioBuffer.getChannelData(0).set(chunk);

    const source = audioContextRef.current.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(audioContextRef.current.destination);
    source.onended = () => playNextChunk();
    source.start();
  }, []);

  const connect = useCallback(async () => {
    if (isConnecting || isConnected) return;

    setIsConnecting(true);
    setError(null);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      const audioContext = new AudioContext({ sampleRate: 16000 });
      audioContextRef.current = audioContext;

      const ai = new GoogleGenAI({ apiKey });
      aiRef.current = ai;

      const session = await ai.live.connect({
        model: "gemini-3.1-flash-live-preview",
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: "Zephyr" } },
          },
          systemInstruction,
          inputAudioTranscription: {},
          outputAudioTranscription: {},
        },
        callbacks: {
          onopen: () => {
            console.log("Connected to Gemini Live");
            setIsConnected(true);
            setIsConnecting(false);

            // Start microphone streaming
            const source = audioContext.createMediaStreamSource(stream);
            microphoneRef.current = source;

            // ScriptProcessor for simplicity in this enviroment (16kHz linear PCM)
            const processor = audioContext.createScriptProcessor(2048, 1, 1);
            processorRef.current = processor;

            processor.onaudioprocess = (e) => {
              const inputData = e.inputBuffer.getChannelData(0);
              
              // Calculate volume for UI
              let sum = 0;
              for(let i=0; i<inputData.length; i++) sum += inputData[i] * inputData[i];
              setVolume(Math.sqrt(sum / inputData.length));

              const pcmData = floatTo16BitPCM(inputData);
              const base64Data = arrayBufferToBase64(pcmData);
              
              if (sessionRef.current) {
                sessionRef.current.sendRealtimeInput({
                  audio: { data: base64Data, mimeType: 'audio/pcm;rate=16000' }
                });
              }
            };

            source.connect(processor);
            processor.connect(audioContext.destination);
          },
          onmessage: (message: LiveServerMessage) => {
            // Handle Audio
            const base64Audio = message.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
            if (base64Audio) {
              const arrayBuffer = base64ToArrayBuffer(base64Audio);
              const float32Array = new Float32Array(arrayBuffer.byteLength / 2);
              const dataView = new DataView(arrayBuffer);
              
              for (let i = 0; i < float32Array.length; i++) {
                float32Array[i] = dataView.getInt16(i * 2, true) / 32768;
              }
              
              audioQueueRef.current.push(float32Array);
              if (!isPlayingRef.current) {
                playNextChunk();
              }
            }

            // Handle Interruptions
            if (message.serverContent?.interrupted) {
              audioQueueRef.current = [];
              isPlayingRef.current = false;
              onInterruption?.();
            }

            // Handle Model Transcriptions
            if (message.serverContent?.modelTurn?.parts) {
              const text = message.serverContent.modelTurn.parts
                .map(p => p.text)
                .filter(Boolean)
                .join(' ');
              if (text && onTranscription) {
                onTranscription(text, false);
              }
            }

            // Handle User Transcriptions (if provided by the API)
            // Some versions of the API send user transcriptions in specific fields
            // For now, we mainly rely on model responses, but this is where we'd catch them
          },
          onclose: () => {
            console.log("Session closed");
            stopSession();
          },
          onerror: (err) => {
            console.error("Session error:", err);
            setError(err.message || "An error occurred");
            stopSession();
          }
        },
      });

      sessionRef.current = session;
    } catch (err: any) {
      console.error("Failed to connect:", err);
      setError(err.message || "Failed to start camera/microphone");
      setIsConnecting(false);
    }
  }, [apiKey, systemInstruction, onTranscription, onInterruption, stopSession, playNextChunk, isConnecting, isConnected]);

  useEffect(() => {
    return () => {
      stopSession();
    };
  }, [stopSession]);

  return {
    isConnected,
    isConnecting,
    error,
    volume,
    connect,
    disconnect: stopSession
  };
}
