import React from 'react';
import { LogEntry, LogType } from '../types';
import ReactMarkdown from 'react-markdown';
import { Sword, Scroll, Skull, Clock } from 'lucide-react';

interface GameLogProps {
  logs: LogEntry[];
}

const GameLog: React.FC<GameLogProps> = ({ logs }) => {
  if (logs.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-slate-500 p-8 border-2 border-dashed border-slate-700 rounded-xl">
        <Scroll className="w-12 h-12 mb-4 opacity-50" />
        <p className="text-center font-serif">Las crónicas aún no han sido escritas...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {logs.map((log) => (
        <div 
          key={log.id} 
          className={`relative p-5 rounded-lg border shadow-lg overflow-hidden
            ${log.type === LogType.COMBAT ? 'bg-slate-800/80 border-red-900/30' : 
              log.type === LogType.EVENT ? 'bg-slate-800/80 border-indigo-900/30' : 
              'bg-slate-800/80 border-amber-900/30'}`}
        >
          <div className="flex items-start justify-between mb-3 border-b border-white/5 pb-2">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-full 
                ${log.type === LogType.COMBAT ? 'bg-red-500/20 text-red-400' : 
                  log.type === LogType.EVENT ? 'bg-indigo-500/20 text-indigo-400' : 
                  'bg-amber-500/20 text-amber-400'}`}>
                {log.type === LogType.COMBAT && <Sword size={18} />}
                {log.type === LogType.EVENT && <Skull size={18} />}
                {log.type === LogType.NARRATIVE && <Scroll size={18} />}
              </div>
              <div>
                <h4 className="font-bold text-slate-200 fantasy-font leading-tight">{log.title}</h4>
                <div className="flex items-center gap-2 text-xs text-slate-500 mt-1">
                  <Clock size={10} />
                  <span>{new Date(log.timestamp).toLocaleTimeString('es-ES')}</span>
                  {log.tags?.map(tag => (
                    <span key={tag} className="px-1.5 py-0.5 rounded bg-slate-700 text-slate-300">{tag}</span>
                  ))}
                </div>
              </div>
            </div>
            
            {log.rollTotal !== undefined && (
              <div className="text-right">
                <div className="text-2xl font-bold text-white fantasy-font">{log.rollTotal}</div>
                <div className="text-[10px] text-slate-400 font-mono">{log.diceDetails}</div>
              </div>
            )}
          </div>

          {log.inputContext && (
            <div className="mb-3 pl-3 border-l-2 border-slate-600 italic text-slate-400 text-sm">
              "{log.inputContext}"
            </div>
          )}

          <div className="prose prose-invert prose-sm max-w-none text-slate-300 font-serif leading-relaxed">
            <ReactMarkdown>{log.content}</ReactMarkdown>
          </div>
        </div>
      ))}
    </div>
  );
};

export default GameLog;