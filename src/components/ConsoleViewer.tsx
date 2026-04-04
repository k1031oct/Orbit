'use client';

import React, { useEffect, useRef } from 'react';
import { Terminal, Trash2, X, ChevronDown, ChevronUp } from 'lucide-react';

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
  const scrollRef = useRef<HTMLDivElement>(null);

  // オートスクロール
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs, isVisible]);

  if (!isVisible) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-[100] animate-fade">
      {/* Console Header */}
      <div className="bg-[#0b0b0f] border-t border-white/10 px-6 py-3 flex items-center justify-between shadow-2xl">
        <div className="flex items-center gap-3">
          <div className="p-1.5 bg-indigo-500/20 rounded">
            <Terminal size={14} className="text-indigo-400" />
          </div>
          <span className="text-[10px] font-black uppercase tracking-[0.2em] text-white italic">
            System Node Console
          </span>
          <span className="text-[9px] text-gray-600 font-mono">
            {logs.length} lines active
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button 
            onClick={onClear}
            className="p-2 text-gray-500 hover:text-white transition-colors"
            title="Clear Console"
          >
            <Trash2 size={16} />
          </button>
          <button 
            onClick={onClose}
            className="p-2 text-gray-500 hover:text-white transition-colors"
            title="Close Console"
          >
            <X size={18} />
          </button>
        </div>
      </div>

      {/* Log Screen */}
      <div 
        ref={scrollRef}
        className="h-64 bg-[#08080a]/95 backdrop-blur-xl border-t border-white/5 overflow-y-auto font-mono p-6 selection:bg-indigo-500/30 custom-scrollbar"
      >
        {logs.length === 0 ? (
          <div className="flex items-center justify-center h-full opacity-20">
            <span className="text-[10px] font-bold uppercase tracking-widest italic">Awaiting System Output...</span>
          </div>
        ) : (
          logs.map((log, i) => (
            <div key={i} className="text-[11px] leading-relaxed mb-1 animate-fade">
              <span className="text-gray-700 mr-2 opacity-50">[{i + 1}]</span>
              <span className={log.includes('[ERROR]') || log.includes('[CRITICAL]') ? 'text-rose-400 font-bold' : 'text-gray-300'}>
                {log}
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
