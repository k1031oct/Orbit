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
      const scrollElement = scrollRef.current;
      // レンダリング完了後に実行されるようマイクロタスクまたはタイマーを使用
      setTimeout(() => {
        scrollElement.scrollTop = scrollElement.scrollHeight;
      }, 0);
    }
  }, [logs, isVisible]);

  if (!isVisible) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-[100] animate-fade">
      {/* Console Header */}
      <div className="bg-hsl(var(--card)) border-t border-white/[0.08] px-4 py-2 flex items-center justify-between shadow-2xl backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="p-1 bg-white/5 border border-white/10 rounded">
            <Terminal size={12} className="text-indigo-400" />
          </div>
          <span className="text-[11px] font-semibold text-white/80">
            System Node Console
          </span>
          <span className="text-[9px] text-white/20 font-mono ml-2">
            {logs.length} lines active
          </span>
        </div>

        <div className="flex items-center gap-1">
          <button 
            onClick={onClear}
            className="p-1 text-white/30 hover:text-white transition-colors"
            title="Clear Console"
          >
            <Trash2 size={14} />
          </button>
          <button 
            onClick={onClose}
            className="p-1 text-white/30 hover:text-white transition-colors"
            title="Close Console"
          >
            <X size={16} />
          </button>
        </div>
      </div>

      {/* Log Screen */}
      <div 
        ref={scrollRef}
        className="h-64 bg-hsl(var(--background))/90 backdrop-blur-xl border-t border-white/[0.05] overflow-y-auto font-mono p-4 selection:bg-indigo-500/30 custom-scrollbar"
      >
        {logs.length === 0 ? (
          <div className="flex items-center justify-center h-full opacity-10">
            <span className="text-[10px] font-mono tracking-widest uppercase">Awaiting System Output...</span>
          </div>
        ) : (
          logs.map((log, i) => (
            <div key={i} className="text-[11px] leading-relaxed mb-1 animate-fade flex flex-row gap-3">
              <span className="text-white/10 shrink-0 select-none">[{i + 1}]</span>
              <span className={log.includes('[ERROR]') || log.includes('[CRITICAL]') ? 'text-rose-400 font-bold' : 'text-white/60'}>
                {log}
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
