import React, { useState } from 'react';
import { EventGenerationConfig, LogEntry } from '../types';
import { Sparkles, Skull, AlertTriangle, Ghost } from 'lucide-react';
import { generateDungeonEvent } from '../services/geminiService';

interface EventGeneratorProps {
  onEventGenerated: (log: LogEntry) => void;
  isGenerating: boolean;
  setGenerating: (val: boolean) => void;
}

const EventGenerator: React.FC<EventGeneratorProps> = ({ onEventGenerated, isGenerating, setGenerating }) => {
  const [theme, setTheme] = useState<string>("Ruinas Antiguas");
  const [danger, setDanger] = useState<EventGenerationConfig['dangerLevel']>("Medio");

  const handleGenerate = async () => {
    setGenerating(true);
    const log = await generateDungeonEvent({ theme, dangerLevel: danger });
    onEventGenerated(log);
    setGenerating(false);
  };

  return (
    <div className="bg-slate-800 p-6 rounded-xl border border-slate-700 shadow-xl h-full flex flex-col">
      <h3 className="text-xl font-bold fantasy-font text-indigo-400 flex items-center gap-2 mb-6">
        <Ghost className="w-6 h-6" /> Oráculo de Eventos
      </h3>

      <div className="space-y-4 flex-grow">
        <div>
          <label className="block text-sm font-medium text-slate-400 mb-1">Temática de la Mazmorra</label>
          <input
            type="text"
            value={theme}
            onChange={(e) => setTheme(e.target.value)}
            placeholder="ej. Bosque Encantado, Cavernas Profundas..."
            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-indigo-500 transition-colors"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-400 mb-3">Nivel de Peligro</label>
          <div className="grid grid-cols-2 gap-2">
            {(['Bajo', 'Medio', 'Alto', 'Mortal'] as const).map((level) => (
              <button
                key={level}
                onClick={() => setDanger(level)}
                className={`py-2 px-3 rounded-md text-sm font-bold border transition-all
                  ${danger === level 
                    ? 'bg-indigo-600 border-indigo-500 text-white shadow-lg scale-105' 
                    : 'bg-slate-900 border-slate-700 text-slate-400 hover:bg-slate-800'}`}
              >
                <div className="flex items-center justify-center gap-2">
                   {level === 'Mortal' ? <Skull size={14} /> : level === 'Alto' ? <AlertTriangle size={14} /> : null}
                   {level}
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>

      <button
        onClick={handleGenerate}
        disabled={isGenerating}
        className="w-full mt-6 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold py-3 px-6 rounded-lg shadow-lg shadow-indigo-900/20 transform transition active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
      >
        {isGenerating ? (
          <>
            <Sparkles className="animate-spin w-5 h-5" /> Adivinando el Destino...
          </>
        ) : (
          <>
            <Sparkles className="w-5 h-5" /> Robar Carta de Evento
          </>
        )}
      </button>
    </div>
  );
};

export default EventGenerator;