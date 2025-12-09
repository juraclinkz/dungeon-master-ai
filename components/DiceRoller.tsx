import React, { useState } from 'react';
import { DieType, SelectedDie } from '../types';
import { Dices, Trash2, Plus } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface DiceRollerProps {
  onRollComplete: (total: number, breakdown: string) => void;
  isRolling: boolean;
}

const DIE_TYPES: { type: DieType; label: string; max: number; color: string }[] = [
  { type: 'd4', label: 'D4', max: 4, color: 'bg-emerald-700' },
  { type: 'd6', label: 'D6', max: 6, color: 'bg-blue-700' },
  { type: 'd8', label: 'D8', max: 8, color: 'bg-indigo-700' },
  { type: 'd10', label: 'D10', max: 10, color: 'bg-violet-700' },
  { type: 'd12', label: 'D12', max: 12, color: 'bg-fuchsia-700' },
  { type: 'd20', label: 'D20', max: 20, color: 'bg-rose-700' },
  { type: 'd100', label: 'D100', max: 100, color: 'bg-amber-700' },
];

const DiceRoller: React.FC<DiceRollerProps> = ({ onRollComplete, isRolling }) => {
  const [selectedDice, setSelectedDice] = useState<SelectedDie[]>([]);
  const [modifier, setModifier] = useState<number>(0);

  const addDie = (type: DieType) => {
    setSelectedDice(prev => [
      ...prev,
      { id: crypto.randomUUID(), type, value: 0 }
    ]);
  };

  const removeDie = (id: string) => {
    setSelectedDice(prev => prev.filter(d => d.id !== id));
  };

  const clearDice = () => {
    setSelectedDice([]);
    setModifier(0);
  };

  const handleRoll = () => {
    if (selectedDice.length === 0) return;

    // Simulate rolling animation delay
    const rolledDice = selectedDice.map(die => {
      const max = parseInt(die.type.substring(1));
      return { ...die, value: Math.floor(Math.random() * max) + 1 };
    });

    const total = rolledDice.reduce((sum, die) => sum + die.value, 0) + modifier;
    const breakdown = `${rolledDice.map(d => `${d.type}(${d.value})`).join(' + ')}${modifier !== 0 ? ` ${modifier >= 0 ? '+' : '-'} ${Math.abs(modifier)}` : ''}`;

    onRollComplete(total, breakdown);
    setSelectedDice([]); // Optional: clear after roll, or keep them to re-roll. Let's clear for cleaner flow.
    setModifier(0);
  };

  return (
    <div className="bg-slate-800 p-6 rounded-xl border border-slate-700 shadow-xl">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xl font-bold fantasy-font text-amber-500 flex items-center gap-2">
          <Dices className="w-6 h-6" /> Bandeja de Dados
        </h3>
        <button 
          onClick={clearDice}
          className="text-xs text-slate-400 hover:text-red-400 flex items-center gap-1 transition-colors"
        >
          <Trash2 size={14} /> Limpiar
        </button>
      </div>

      {/* Die Selection Buttons */}
      <div className="grid grid-cols-4 sm:grid-cols-7 gap-2 mb-6">
        {DIE_TYPES.map((die) => (
          <button
            key={die.type}
            onClick={() => addDie(die.type)}
            disabled={isRolling}
            className={`${die.color} hover:brightness-110 text-white font-bold py-2 rounded-lg text-sm shadow-lg transform transition active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            {die.label}
          </button>
        ))}
      </div>

      {/* Selected Dice Area */}
      <div className="min-h-[120px] bg-slate-900/50 rounded-lg p-4 mb-4 border border-slate-700/50 flex flex-wrap gap-3 items-center content-start relative">
        <AnimatePresence>
          {selectedDice.length === 0 && (
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 flex items-center justify-center text-slate-500 italic text-sm pointer-events-none"
            >
              Selecciona dados para añadir...
            </motion.div>
          )}
          {selectedDice.map((die) => (
            <motion.div
              key={die.id}
              initial={{ scale: 0, rotate: -45 }}
              animate={{ scale: 1, rotate: 0 }}
              exit={{ scale: 0, opacity: 0 }}
              layout
              className="relative group"
            >
              <div className={`w-12 h-12 flex items-center justify-center rounded-lg shadow-md font-bold text-slate-100 border border-white/10 ${DIE_TYPES.find(d => d.type === die.type)?.color}`}>
                {die.type}
              </div>
              <button
                onClick={() => removeDie(die.id)}
                className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <Trash2 size={12} />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Modifier & Roll Button */}
      <div className="flex flex-col sm:flex-row gap-4 items-stretch sm:items-center">
        <div className="flex items-center bg-slate-900 rounded-lg border border-slate-700 overflow-hidden shrink-0">
          <span className="px-3 text-slate-400 text-sm font-medium">Mod:</span>
          <input
            type="number"
            value={modifier}
            onChange={(e) => setModifier(parseInt(e.target.value) || 0)}
            className="w-16 bg-transparent text-center py-2 text-white focus:outline-none"
          />
        </div>

        <button
          onClick={handleRoll}
          disabled={selectedDice.length === 0 || isRolling}
          className="flex-1 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white font-bold py-3 px-6 rounded-lg shadow-lg shadow-orange-900/20 transform transition active:scale-95 disabled:opacity-50 disabled:grayscale disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {isRolling ? (
            <>
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
              >
                <Dices className="w-5 h-5" />
              </motion.div>
              Lanzando...
            </>
          ) : (
            <>
              <Dices className="w-5 h-5" /> Lanzar y Resolver
            </>
          )}
        </button>
      </div>
    </div>
  );
};

export default DiceRoller;