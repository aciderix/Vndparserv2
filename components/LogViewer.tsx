import React, { useRef, useEffect } from 'react';

interface LogViewerProps {
  logs: string[];
}

export const LogViewer: React.FC<LogViewerProps> = ({ logs }) => {
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  return (
    <div className="bg-slate-950 rounded-lg border border-slate-800 shadow-xl overflow-hidden flex flex-col h-[600px]">
      <div className="bg-slate-900 px-4 py-2 border-b border-slate-800 flex items-center justify-between">
        <h3 className="text-sm font-mono text-slate-400">TERMINAL OUTPUT</h3>
        <span className="text-xs px-2 py-1 bg-slate-800 text-slate-500 rounded">{logs.length} LIGNES</span>
      </div>
      <div className="flex-1 overflow-auto p-4 font-mono text-xs md:text-sm text-emerald-400 whitespace-pre-wrap">
        {logs.length === 0 ? (
          <span className="text-slate-600 opacity-50 select-none">En attente d'analyse...</span>
        ) : (
          logs.map((line, idx) => (
            <div key={idx} className={`${line.includes('❌') || line.includes('⚠️') ? 'text-yellow-400' : ''} ${line.includes('SCÈNE') ? 'font-bold text-blue-400 mt-4' : ''}`}>
              {line}
            </div>
          ))
        )}
        <div ref={endRef} />
      </div>
    </div>
  );
};