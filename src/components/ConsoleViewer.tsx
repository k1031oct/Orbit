'use client';

import React, { useEffect, useRef } from 'react';
import { Terminal, Trash2, X, Bot, Activity } from 'lucide-react';

interface ConsoleViewerProps {
  logs: string[];
  isVisible: boolean;
  onClose: () => void;
  onClear: () => void;
}

export const ConsoleViewer: React.FC<ConsoleViewerProps> = ({ 
  logs, 
  isVisible, 
  onClose, 
  onClear 
}) => {
  const bottomRef = useRef<HTMLDivElement>(null);

  // 厳格な自動スクロール
  useEffect(() => {
    if (isVisible && bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: 'smooth', block: 'end' });
    }
  }, [logs, isVisible]);

  if (!isVisible) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-[100] animate-in slide-in-from-bottom duration-300">
      {/* Console Header: Cyber Glass Aesthetic */}
      <div className="bg-black/80 border-t border-white/[0.08] px-6 py-3 flex items-center justify-between shadow-2xl backdrop-blur-3xl">
        <div className="flex items-center gap-4">
          <div className="flex flex-row items-center gap-2 px-3 py-1 bg-indigo-500/10 border border-indigo-500/20 rounded-full">
            <Bot size={14} className="text-indigo-400 animate-pulse" />
            <span className="text-[10px] font-black uppercase tracking-widest text-indigo-400">
              Tactical Core
            </span>
          </div>
          <div className="flex flex-row items-center gap-2 px-3 py-1 bg-emerald-500/10 border border-emerald-500/20 rounded-full">
            <Activity size={12} className="text-emerald-500" />
            <span className="text-[10px] font-black uppercase tracking-widest text-emerald-500/80">
              {logs.length} Signals
            </span>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <button 
            onClick={onClear}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-white/20 hover:text-rose-500 hover:bg-rose-500/10 transition-all group"
            title="Purge Logs"
          >
            <Trash2 size={14} className="group-hover:scale-110 transition-transform" />
            <span className="text-[9px] font-black uppercase tracking-widest">Purge</span>
          </button>
          <div className="w-[1px] h-4 bg-white/10" />
          <button 
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-white/20 hover:text-white hover:bg-white/5 transition-all"
          >
            <X size={18} />
          </button>
        </div>
      </div>

      {/* Log Screen: Terminal Aesthetic */}
      <div className="h-80 bg-black/90 backdrop-blur-2xl border-t border-white/[0.05] overflow-y-auto font-mono p-6 selection:bg-indigo-500/30 custom-scrollbar relative">
        <div className="flex flex-col gap-1.5">
          {logs.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-60 opacity-10 gap-4">
              <Terminal size={40} strokeWidth={1} />
              <span className="text-[10px] font-black tracking-[0.5em] uppercase">Awaiting Autonomous Sequence...</span>
            </div>
          ) : (
            logs.map((log, i) => {
              const isError = log.includes('[ERROR]') || log.includes('failed') || log.includes('Failed');
              const isSuccess = log.includes('[SUCCESS]') || log.includes('complete') || log.includes('Success');
              const isInternalAi = log.includes('[INTERNAL_AI]');
              
              return (
                <div key={i} className="text-[11px] leading-relaxed group flex flex-row gap-4 items-start border-l-2 border-transparent hover:border-indigo-500/30 hover:bg-white/[0.02] pl-2 transition-all">
                  <span className="text-white/5 shrink-0 select-none w-8 text-right font-black italic">{(i + 1).toString().padStart(3, '0')}</span>
                  <span className={`${
                    isError ? 'text-rose-400 font-bold' : 
                    isSuccess ? 'text-emerald-400' : 
                    isInternalAi ? 'text-indigo-400 italic' :
                    'text-white/50'
                  } break-all`}>
                    {log}
                  </span>
                </div>
              );
            })
          )}
          {/* Scroll Anchor */}
          <div ref={bottomRef} className="h-4 w-full" />
        </div>
      </div>
    </div>
  );
};
