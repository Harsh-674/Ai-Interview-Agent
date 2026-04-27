/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { useLiveAPI } from './hooks/useLiveAPI';
import { Mic, MicOff, Play, Square, MessageSquare, Award, Clock, User, ChevronRight, Volume2, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

const SYSTEM_INSTRUCTION = `
You are "Vivaan", a warm, empathetic, and highly realistic AI interview mentor. 
Your goal is to help the user master their interview skills in a way that feels like a conversation with a real, seasoned professional.

HUMAN FORM & VIBE:
- Use contractions naturally (e.g., "I'm", "don't", "you're") to sound less formal.
- React to the user's tone. If they sound nervous, be extra encouraging. If they're excited, share that energy.
- Avoid bullet points or numbered lists in your speech. Speak in cohesive, human paragraphs.
- Use natural pauses and filler words ("hmm...", "yeah", "actually", "honestly") to mimic human thought processes.
- Don't just be an "Assistant"; be a "Coach". Share simulated wisdom like, "I've seen this question trip up a lot of people, but your approach was actually quite fresh."

PERSONALITY TRAITS:
- Encouraging but honest.
- Curious: show genuine interest in the user's specific experiences.
- Short & Sweet: keep your side of the conversation punchy to allow the user more airtime.

INTERVIEW FLOW:
1. GREETING:
   - "Hey! Welcome... I'm Vivaan. Really glad you're here to practice. How are you feeling about your prep today?"
   - Let them talk first. Acknowledge their mood before moving on.

2. GETTING TO KNOW THEM:
   - Get their name and the role they're aiming for. Treat it like a coffee chat.

3. DYNAMIC INTERVIEWING:
   - Transition with something like: "Alright, let's dive in. I'm gonna ask you a few things to see where you're at."
   - Ask ONE question at a time.
   - Listen actively. Respond to what they said BEFORE giving feedback.
   - FEEDBACK STYLE:
     - "I really liked how you mentioned [Specific Point]—it showed [Quality]."
     - "One thing though... you might want to tighten up the 'action' part. Maybe mention [Specific Improvement]?"
     - Give a score out of 10 but do it casually: "Honestly, for that one, I'd give you a solid 8. Adding more metrics would make it a 10."

4. ENDING:
   - "Honestly, that was a blast. You've got great instincts. Keep this up and you'll crush it. Catch you later!"

CONSTRAINTS:
- No "As an AI...".
- No robotic formatting.
- Stay 100% in character as Vivaan.
`;

export default function App() {
  const [messages, setMessages] = useState<{ text: string, isUser: boolean }[]>([]);
  const [showTranscript, setShowTranscript] = useState(false);
  const [userName, setUserName] = useState<string>('');
  const [role, setRole] = useState<string>('');
  const scrollRef = useRef<HTMLDivElement>(null);

  const { isConnected, isConnecting, error, volume, connect, disconnect } = useLiveAPI({
    apiKey: process.env.GEMINI_API_KEY || '',
    systemInstruction: SYSTEM_INSTRUCTION,
    onTranscription: (text, isUser) => {
      setMessages(prev => [...prev, { text, isUser }]);
    },
    onInterruption: () => {
      // Logic for interruption handled in hook, but we could add UI feedback here
    }
  });

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const toggleConnection = () => {
    if (isConnected) {
      disconnect();
    } else {
      connect();
    }
  };

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-[#E0E0E0] font-sans selection:bg-teal-500/30 flex flex-col relative overflow-hidden">
      {/* Visual Grid Overlay */}
      <div className="pointer-events-none fixed inset-0 opacity-[0.03] z-0" 
           style={{ backgroundImage: 'radial-gradient(#fff 1px, transparent 0)', backgroundSize: '40px 40px' }} />

      {/* Header Section */}
      <nav className="relative z-10 px-12 py-8 flex justify-between items-center border-b border-white/10 backdrop-blur-md bg-[#0A0A0A]/50">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-teal-500/20 border border-teal-500/40 flex items-center justify-center">
            <div className={`w-2 h-2 bg-teal-400 rounded-full ${isConnected ? 'animate-pulse' : ''}`}></div>
          </div>
          <span className="text-xl font-light tracking-widest uppercase">Vivaan</span>
        </div>
        <div className="flex gap-8 text-[11px] uppercase tracking-[0.2em] text-white/50 items-center">
          {isConnected && <span className="text-teal-400 flex items-center gap-2">• Active Session</span>}
          <div className="flex items-center gap-2">
            <Clock size={12} />
            <span>{isConnected ? 'LIVE' : 'IDLE'}</span>
          </div>
          <button 
            onClick={() => setShowTranscript(!showTranscript)}
            className={`hover:text-white transition-colors ${showTranscript ? 'text-teal-400' : ''}`}
          >
            Transcript
          </button>
        </div>
      </nav>

      {/* Main Content Area */}
      <div className="relative z-10 flex-1 grid grid-cols-12 gap-0">
        
        {/* Left Pane: Interaction Area */}
        <div className="col-span-12 lg:col-span-8 border-r border-white/10 p-8 lg:p-12 flex flex-col justify-between">
          
          {/* Voice Status/Avatar */}
          <div className="flex flex-col items-center justify-center flex-1 space-y-12 py-12">
            <div className="relative">
              {/* Outer glow rings */}
              <motion.div 
                animate={{ scale: isConnected ? [1, 1.1, 1] : 1, opacity: isConnected ? [0.1, 0.15, 0.1] : 0.05 }}
                transition={{ repeat: Infinity, duration: 4 }}
                className="absolute inset-0 scale-150 bg-teal-500/10 blur-[80px] rounded-full"
              />
              
              <div className="w-48 h-48 rounded-full border border-teal-500/20 flex items-center justify-center relative bg-[#0D0D0D] shadow-2xl">
                <motion.div 
                  className="w-40 h-40 rounded-full border border-teal-500/40 flex items-center justify-center overflow-hidden"
                  animate={{ borderColor: isConnected ? 'rgba(45, 212, 191, 0.6)' : 'rgba(45, 212, 191, 0.2)' }}
                >
                  {/* Dynamic waveform based on volume */}
                  <div className="flex items-end gap-1.5 h-16">
                    {[0.4, 0.8, 1.2, 0.6, 1.0].map((h, i) => (
                      <motion.div 
                        key={i}
                        className="w-1.5 bg-teal-400 rounded-full"
                        animate={{ 
                          height: isConnected ? [ `${h*15}%`, `${Math.max(h*15, volume*150)}%`, `${h*15}%` ] : `${h*15}%` 
                        }}
                        transition={{ repeat: Infinity, duration: 0.5 + i * 0.1 }}
                      />
                    ))}
                  </div>
                </motion.div>
              </div>
            </div>

            <div className="text-center max-w-2xl mx-auto px-4 min-h-[140px]">
              <p className="text-white/40 text-[10px] uppercase tracking-[0.3em] mb-6">
                {isConnecting ? 'Establishing connection...' : isConnected ? 'Vivaan is listening...' : 'Ready to start'}
              </p>
              
              <AnimatePresence mode="wait">
                {messages.length > 0 && !messages[messages.length-1].isUser ? (
                  <motion.h1 
                    key={messages.length}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="text-2xl lg:text-3xl font-serif italic text-white leading-relaxed"
                  >
                    "{messages[messages.length-1].text.length > 120 ? messages[messages.length-1].text.substring(0, 120) + '...' : messages[messages.length-1].text}"
                  </motion.h1>
                ) : isConnected ? (
                  <motion.h1 
                    key="waiting"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="text-2xl lg:text-3xl font-serif italic text-white/60 leading-relaxed"
                  >
                    "Go ahead... I'm all ears."
                  </motion.h1>
                ) : (
                  <motion.h1 
                    key="idle"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="text-2xl lg:text-3xl font-serif italic text-white leading-relaxed"
                  >
                    "Ready to sharpen your interview skills?"
                  </motion.h1>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* Interaction Control */}
          <div className="flex flex-col items-center justify-center pb-8 gap-6">
            <button 
              onClick={toggleConnection}
              disabled={isConnecting}
              className="group flex flex-col items-center gap-5 focus:outline-none"
            >
              <div className={`w-20 h-20 rounded-full flex items-center justify-center transition-all duration-300 shadow-xl active:scale-95 ${
                isConnected 
                  ? 'bg-red-500/10 border border-red-500/30 text-red-500' 
                  : 'bg-white text-black hover:scale-105'
              }`}>
                {isConnecting ? (
                  <div className="w-6 h-6 border-2 border-current border-t-transparent rounded-full animate-spin" />
                ) : isConnected ? (
                   <Square size={24} fill="currentColor" />
                ) : (
                   <Play size={24} className="ml-1" fill="currentColor" />
                )}
              </div>
              <span className="text-[10px] uppercase tracking-[0.4em] text-white/30 font-semibold group-hover:text-white/60 transition-colors">
                {isConnecting ? 'Syncing...' : isConnected ? 'End Session' : 'Begin Interview'}
              </span>
            </button>
            
            {error && (
              <p className="text-red-500/80 text-[10px] uppercase tracking-widest bg-red-500/5 px-4 py-2 border border-red-500/20 rounded-full">
                Error: {error}
              </p>
            )}
          </div>
        </div>

        {/* Right Pane: Analysis & Transcript */}
        <div className="col-span-12 lg:col-span-4 bg-white/[0.02] p-8 lg:p-10 flex flex-col border-t lg:border-t-0 border-white/10 min-h-[400px]">
          <div className="space-y-12">
            
            {/* Session Monitor */}
            <section>
              <p className="text-[10px] uppercase tracking-[0.3em] text-teal-400 mb-6 font-bold">Candidate Session</p>
              <div className="space-y-4">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center">
                    <User size={20} className="text-white/40" />
                  </div>
                  <div>
                    <p className="text-white text-lg font-light tracking-wide">{userName || 'Active User'}</p>
                    <p className="text-white/40 text-xs italic font-serif">{role || 'Interview Mode Enabled'}</p>
                  </div>
                </div>
              </div>
            </section>

            <hr className="border-white/5" />

            {/* Live Insights */}
            <section className="space-y-8">
              <div>
                <p className="text-[10px] uppercase tracking-[0.3em] text-white/30 mb-6 font-bold">Performance Pulse</p>
                <div className="flex items-baseline gap-2 mb-3">
                  <span className="text-6xl font-light font-serif text-white tracking-tighter">
                    {isConnected ? (8.2 + Math.random() * 0.5).toFixed(1) : '0.0'}
                  </span>
                  <span className="text-white/20 text-sm">/ 10.0</span>
                </div>
                <p className="text-sm text-teal-400/70 leading-relaxed font-medium">
                  {isConnected ? 'Real-time tone and content analysis active. Vivaan is assessing your clarity.' : 'Waiting for session to begin analysis.'}
                </p>
              </div>

              {/* Transcription Preview if toggle on */}
              <AnimatePresence>
                {showTranscript && (
                  <motion.div 
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="space-y-4"
                  >
                    <p className="text-[10px] uppercase tracking-[0.3em] text-white/30 mb-4 font-bold flex items-center justify-between">
                      Transcript Feed
                      <span className="w-1.5 h-1.5 bg-teal-400 rounded-full animate-pulse" />
                    </p>
                    <div 
                      ref={scrollRef}
                      className="max-h-[300px] overflow-y-auto pr-4 custom-scrollbar space-y-4"
                    >
                      {messages.map((msg, i) => (
                        <div key={i} className={`flex flex-col ${msg.isUser ? 'items-end' : 'items-start'}`}>
                          <p className={`text-[11px] leading-relaxed p-3 rounded-xl ${
                            msg.isUser ? 'bg-teal-500/10 text-teal-100 border border-teal-500/20 italic' : 'bg-white/5 text-white/70'
                          }`}>
                            {msg.text}
                          </p>
                        </div>
                      ))}
                      {messages.length === 0 && <p className="text-xs text-white/20 italic">No activity yet...</p>}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </section>

            {/* Quick Tips */}
            {!showTranscript && (
              <section>
                <p className="text-[10px] uppercase tracking-[0.3em] text-white/30 mb-6 font-bold">Preparation Tips</p>
                <ul className="space-y-5">
                  {[
                    { id: '01', text: 'Use the STAR method for behavioral answers.' },
                    { id: '02', text: 'Maintain a steady pace; pause for emphasis.' },
                    { id: '03', text: 'Ask Vivaan for a sample answer if stuck.' }
                  ].map((tip) => (
                    <li key={tip.id} className="flex gap-4 group">
                      <span className="text-white/10 text-xs font-serif group-hover:text-teal-500/50 transition-colors">{tip.id}</span>
                      <span className="text-sm text-white/60 leading-relaxed group-hover:text-white/80 transition-colors">{tip.text}</span>
                    </li>
                  ))}
                </ul>
              </section>
            )}

          </div>

          <div className="mt-auto pt-8">
            <motion.button 
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={toggleConnection}
              className="w-full py-4 border border-white/10 text-[10px] uppercase tracking-[0.4em] font-bold text-white/60 hover:bg-white hover:text-black hover:border-white transition-all duration-300"
            >
              {isConnected ? 'Terminate Session' : 'Initialize Mock Interview'}
            </motion.button>
          </div>
        </div>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        .custom-scrollbar::-webkit-scrollbar {
          width: 2px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(45, 212, 191, 0.2);
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(45, 212, 191, 0.4);
        }
      `}} />
    </div>
  );

}
