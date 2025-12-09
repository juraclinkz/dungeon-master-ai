import React from 'react';
import { Users, Wifi, User } from 'lucide-react';

interface PartySidebarProps {
  playerNames: string[];
  currentPlayerName: string;
  isConnected: boolean;
}

const PartySidebar: React.FC<PartySidebarProps> = ({ playerNames, currentPlayerName, isConnected }) => {
  return (
    <div className="bg-slate-900/80 p-4 rounded-xl border border-slate-700 shadow-xl flex flex-col gap-4 h-full">
      <div className="flex items-center justify-between border-b border-slate-800 pb-2">
        <h3 className="text-sm font-bold fantasy-font text-slate-300 flex items-center gap-2"><Users size={16} /> Grupo</h3>
        {isConnected && <Wifi size={14} className="text-emerald-500 animate-pulse" />}
      </div>
      <div className="flex flex-col gap-3 overflow-y-auto pr-1 custom-scrollbar flex-1">
        {playerNames.map((name, idx) => {
          const isMe = name === currentPlayerName;
          const avatarUrl = `https://api.dicebear.com/9.x/pixel-art/svg?seed=${name}&backgroundColor=b45309`;
          return (
            <div key={idx} className={`flex items-center gap-3 p-2 rounded-lg border transition-all ${isMe ? 'bg-amber-900/20 border-amber-800/50' : 'bg-slate-950/50 border-slate-800'}`}>
              <div className="relative">
                  <div className="w-10 h-10 rounded border border-slate-700 overflow-hidden bg-slate-900"><img src={avatarUrl} alt={name} className="w-full h-full object-cover" /></div>
                  {isMe && <div className="absolute -top-1 -right-1 w-3 h-3 bg-amber-500 rounded-full border-2 border-slate-900" title="Tú" />}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-center mb-1"><span className="text-xs font-bold text-slate-300 truncate">{name}</span></div>
                <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden"><div className="h-full bg-emerald-600 w-full" /> </div>
              </div>
            </div>
          );
        })}
        {playerNames.length === 0 && (<div className="text-center text-xs text-slate-600 py-4 italic">Esperando compañeros...</div>)}
      </div>
    </div>
  );
};

export default PartySidebar;