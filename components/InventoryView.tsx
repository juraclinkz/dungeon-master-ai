import React, { useState } from 'react';
import { Character, Equipment, Item } from '../types';
import { Shield, Sword, Shirt, User, Gem, Footprints, Info, Zap, X, Coins } from 'lucide-react';

interface InventoryViewProps {
  hero: Character;
  setHero: React.Dispatch<React.SetStateAction<Character>>;
  playerNames?: string[];
  onUseItem?: (item: Item, targetName: string) => void;
}

const InventoryView: React.FC<InventoryViewProps> = ({ hero, setHero, playerNames = [], onUseItem }) => {
  const [selectedItem, setSelectedItem] = useState<Item | null>(null);
  const [showUseModal, setShowUseModal] = useState(false);

  // Estilos compartidos DQ
  const dqBoxStyle = "bg-blue-950/95 border-[3px] border-double border-white rounded-md shadow-2xl relative overflow-hidden";
  const dqTextStyle = "font-mono text-white text-shadow-sm";

  const renderSlot = (label: string, item: Item | undefined, icon: React.ReactNode, slotKey: keyof Equipment) => {
    const getBorderColor = (rarity?: string) => {
        switch(rarity) {
            case 'magic': return 'border-blue-400 text-blue-300';
            case 'rare': return 'border-yellow-400 text-yellow-300';
            case 'legendary': return 'border-orange-500 text-orange-400';
            default: return 'border-slate-500 text-slate-300';
        }
    };

    return (
      <div className="flex flex-col items-center gap-1">
        <div className={`relative w-16 h-16 sm:w-20 sm:h-20 bg-black/40 rounded border-2 flex items-center justify-center group cursor-pointer transition-all hover:bg-white/10 ${item ? getBorderColor(item.rarity) : 'border-slate-700 border-dashed opacity-50'}`}>
            {item ? (
                <div className="flex flex-col items-center justify-center p-1 text-center w-full h-full">
                    <span className={`text-[9px] sm:text-[10px] font-bold leading-tight font-mono`}>{item.name}</span>
                    {item.stats && <span className="text-[8px] text-slate-400 mt-1 font-mono">{item.stats}</span>}
                </div>
            ) : (<div className="text-slate-600">{icon}</div>)}
            <div className="absolute inset-0 bg-black/80 opacity-0 group-hover:opacity-100 flex items-center justify-center text-[10px] text-white transition-opacity font-mono border border-white/20">{item ? 'CAMBIAR' : label}</div>
        </div>
        <span className="text-[10px] uppercase text-slate-500 font-bold tracking-wider font-mono">{label}</span>
      </div>
    );
  };

  const handleSlotClick = (item: Item) => { setSelectedItem(item); if (item.type === 'consumable' && onUseItem) { setShowUseModal(true); } };

  const renderInventoryGrid = () => {
    const slots = Array.from({ length: 30 });
    return (
        <div className="grid grid-cols-5 sm:grid-cols-6 gap-1 p-2 bg-black/20 rounded border border-slate-700/50 shadow-inner">
            {slots.map((_, index) => {
                const item = hero.inventory[index];
                return (
                    <div key={index} onClick={() => item && handleSlotClick(item)} className={`aspect-square bg-slate-900/80 border border-slate-800 rounded flex items-center justify-center relative hover:border-white transition-colors group ${item ? 'cursor-pointer' : ''}`}>
                        {item ? (
                             <div className={`w-full h-full p-1 flex items-center justify-center text-center text-[9px] font-bold font-mono ${item.rarity === 'legendary' ? 'text-orange-400' : item.rarity === 'rare' ? 'text-yellow-300' : item.rarity === 'magic' ? 'text-blue-300' : 'text-slate-300'}`}>
                                {item.name.substring(0, 10)}{item.name.length > 10 ? '..' : ''}
                                {item.type === 'consumable' && <span className="absolute bottom-0.5 right-1 text-[8px] text-slate-500">x1</span>}
                             </div>
                        ) : (<div className="w-1 h-1 rounded-full bg-slate-800" />)}
                    </div>
                );
            })}
        </div>
    );
  };

  return (
    <div className={`${dqBoxStyle} min-h-full p-4 sm:p-6 flex flex-col items-center gap-6 relative`}>
        
        {/* Modal de Uso (Estilo Retro) */}
        {showUseModal && selectedItem && (
            <div className="absolute inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
                <div className={`${dqBoxStyle} w-full max-w-sm p-6 relative bg-blue-950`}>
                    <button onClick={() => setShowUseModal(false)} className="absolute top-2 right-2 text-slate-400 hover:text-white"><X size={20} /></button>
                    <div className="text-center mb-6 border-b border-white/20 pb-4">
                        <h3 className="text-xl font-bold text-yellow-300 fantasy-font mb-2 uppercase">{selectedItem.name}</h3>
                        <p className="text-xs text-slate-300 font-mono italic mb-2">"{selectedItem.description || "Un objeto misterioso..."}"</p>
                        {selectedItem.stats && <div className="text-xs font-mono bg-black/40 inline-block px-2 py-1 rounded text-emerald-300 border border-emerald-900">{selectedItem.stats}</div>}
                    </div>
                    <div className="space-y-2">
                        <p className="text-xs uppercase font-bold text-slate-400 text-center mb-2 font-mono">¿Quién lo usará?</p>
                        <button onClick={() => { onUseItem?.(selectedItem, hero.name); setShowUseModal(false); }} className="w-full p-3 bg-blue-900/50 hover:bg-emerald-900/50 border border-slate-600 hover:border-emerald-400 rounded flex items-center justify-between group transition-all">
                            <span className="font-bold text-white font-mono">Tú mismo</span>
                            <span className="text-xs text-emerald-300 font-mono">HP: {hero.hp}/{hero.maxHp}</span>
                        </button>
                        {playerNames.filter(n => n !== hero.name).map((name) => (
                             <button key={name} onClick={() => { onUseItem?.(selectedItem, name); setShowUseModal(false); }} className="w-full p-3 bg-blue-900/50 hover:bg-blue-800/50 border border-slate-600 hover:border-blue-400 rounded flex items-center justify-between group transition-all">
                                <span className="font-bold text-white font-mono">{name}</span>
                                <span className="text-xs text-slate-400 font-mono">Aliado</span>
                            </button>
                        ))}
                    </div>
                </div>
            </div>
        )}

        {/* Contenido Principal */}
        <div className="relative z-10 w-full max-w-2xl flex flex-col h-full">
             <div className="flex items-center justify-between mb-4 border-b-2 border-white/20 pb-2">
                 <h2 className={`${dqTextStyle} text-xl font-bold flex items-center gap-2 uppercase`}><User size={20} className="text-yellow-300"/> Equipo</h2>
                 <div className="flex items-center gap-2 bg-black/40 px-3 py-1 rounded border border-white/10">
                     <Coins size={14} className="text-yellow-500" />
                     <span className="text-yellow-300 font-mono font-bold">{hero.gold} G</span>
                 </div>
             </div>
             
             <div className="flex flex-col items-center gap-4 mb-6 bg-black/20 p-4 rounded border border-white/5">
                  <div className="flex justify-center">{renderSlot("Cabeza", hero.equipment.head, <User size={32} />, 'head')}</div>
                  <div className="flex items-center justify-center gap-4 sm:gap-8 w-full">
                       <div className="mt-8">{renderSlot("Mano Der.", hero.equipment.mainHand, <Sword size={32} />, 'mainHand')}</div>
                       <div className="flex flex-col items-center gap-4">{renderSlot("Pecho", hero.equipment.chest, <Shirt size={32} />, 'chest')}</div>
                       <div className="mt-8">{renderSlot("Mano Izq.", hero.equipment.offHand, <Shield size={32} />, 'offHand')}</div>
                  </div>
                  <div className="flex items-center justify-center gap-8">{renderSlot("Accesorio", hero.equipment.accessory, <Gem size={24} />, 'accessory')}{renderSlot("Piernas", hero.equipment.legs, <Footprints size={32} />, 'legs')}<div className="w-16 sm:w-20 opacity-0"></div></div>
             </div>

             <div className="flex-1">
                 <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-2 font-mono border-b border-slate-700 pb-1">
                    <Info size={14} /> Bolsa de Objetos
                 </h3>
                 {renderInventoryGrid()}
                 <p className="text-[10px] text-slate-500 mt-2 italic font-mono text-center">Toca un consumible para usarlo.</p>
             </div>
        </div>
    </div>
  );
};

export default InventoryView;