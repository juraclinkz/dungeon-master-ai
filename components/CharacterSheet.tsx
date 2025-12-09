import React, { useState, useEffect } from 'react';
import { Character, CustomStat } from '../types';
import { Plus, Minus, Sword, Shield, Heart, Crosshair, Zap, User, Hash, Type, Check, X, Skull, Clock, Infinity as InfinityIcon, GripVertical, Flame, Snowflake, Droplets, Zap as ZapIcon, Activity } from 'lucide-react';
import { Reorder, useDragControls } from 'framer-motion';

interface CharacterSheetProps {
  character: Character;
  onChange: (char: Character) => void;
  isEnemy?: boolean;
  availableClasses: string[];
  onAddClass: (newClass: string) => void;
  onRemoveClass: (classToRemove: string) => void;
  readOnly?: boolean;
}

interface SortableItemProps {
  itemId: string;
  colSpan?: string;
  children: React.ReactNode;
  onRemove?: () => void;
  readOnly?: boolean;
}

const SortableItem: React.FC<SortableItemProps> = ({ itemId, colSpan = "", children, onRemove, readOnly }) => {
  const dragControls = useDragControls();
  
  const content = (
    <div className={`bg-slate-900/40 p-2 rounded border border-slate-700/50 flex flex-col gap-1 ${!readOnly ? 'hover:border-slate-600' : ''} transition-colors relative group justify-between h-full w-full`}>
      {!readOnly && <div onPointerDown={(e) => dragControls.start(e)} className="absolute top-1 right-1 p-1.5 cursor-grab touch-none text-slate-700 hover:text-slate-400 z-20 active:cursor-grabbing hover:bg-slate-800 rounded" title="Arrastrar para mover"><GripVertical size={14} /></div>}
      {!readOnly && onRemove && (<button onClick={(e) => { e.stopPropagation(); onRemove(); }} className="absolute -top-1.5 -left-1.5 bg-slate-800 text-slate-500 hover:text-red-400 rounded-full p-0.5 border border-slate-700 opacity-0 group-hover:opacity-100 transition-opacity z-20 shadow-md" title="Eliminar atributo"><X size={10} strokeWidth={3} /></button>)}
      <div className="pt-1">{children}</div>
    </div>
  );

  if (readOnly) {
      return <div className={`${colSpan} relative h-full`}>{content}</div>;
  }

  return (
    <Reorder.Item value={itemId} dragListener={false} dragControls={dragControls} className={`${colSpan} relative`}>
      {content}
    </Reorder.Item>
  );
};

interface StatStepperProps {
  label: string;
  isEditableLabel?: boolean;
  onLabelChange?: (newLabel: string) => void;
  value: number;
  onChange: (val: number) => void;
  icon?: React.ElementType;
  color?: string;
  step?: number;
  suffix?: string;
  unit?: string;
  onToggleUnit?: () => void;
  effectDmg?: string;
  effectDuration?: string;
  onEffectChange?: (field: 'effectDmg' | 'effectDuration', val: string) => void;
  readOnly?: boolean;
}

const StatStepper: React.FC<StatStepperProps> = ({ label, isEditableLabel, onLabelChange, value, onChange, icon: Icon, color = "text-slate-400", step = 1, suffix = "", unit, onToggleUnit, effectDmg, effectDuration, onEffectChange, readOnly }) => {
  const isPercentage = unit === '%';
  return (
      <>
        <div className="flex items-center gap-1.5 mb-2 pr-6 min-w-0">
            {Icon && <Icon size={14} className={color} />}
            {isEditableLabel && !readOnly ? (<input type="text" value={label} onChange={(e) => onLabelChange?.(e.target.value)} className="bg-transparent text-[10px] text-slate-400 uppercase font-bold tracking-wide focus:outline-none focus:text-slate-200 w-full border-b border-transparent focus:border-slate-600" />) : (<span className="text-[10px] text-slate-400 uppercase font-bold tracking-wide truncate">{label}</span>)}
        </div>
        <div className={`flex items-center justify-between bg-slate-950/30 rounded p-0.5 border border-slate-800 ${readOnly ? 'py-1.5' : ''}`}>
            {!readOnly && <button onClick={() => onChange(Number((value - step).toFixed(1)))} className="p-2 rounded hover:bg-red-500/20 text-slate-500 hover:text-red-400 transition-all active:scale-90 flex-shrink-0"><Minus size={14} strokeWidth={3} /></button>}
            <div className="flex items-baseline gap-0.5 justify-center flex-1 min-w-0 relative">
                {readOnly ? (
                    <span className="font-bold text-center text-slate-200 text-lg">{value}</span>
                ) : (
                    <input type="number" value={value} onChange={(e) => onChange(parseFloat(e.target.value) || 0)} className="w-full bg-transparent font-bold text-center text-slate-200 focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none text-lg min-w-0" />
                )}
                
                {onToggleUnit && !readOnly ? (<button onClick={onToggleUnit} className="text-[10px] font-mono text-slate-500 hover:text-amber-400 cursor-pointer select-none px-1 py-0.5 rounded hover:bg-slate-800 transition-colors">{unit || "#"}</button>) : (
                    <span className="text-[10px] text-slate-500 font-mono">{unit || suffix}</span>
                )}
            </div>
            {!readOnly && <button onClick={() => onChange(Number((value + step).toFixed(1)))} className="p-2 rounded hover:bg-emerald-500/20 text-slate-500 hover:text-emerald-400 transition-all active:scale-90 flex-shrink-0"><Plus size={14} strokeWidth={3} /></button>}
        </div>
        {isPercentage && onEffectChange && (
            <div className={`mt-2 pt-2 border-t border-slate-800/50 flex flex-col gap-2 ${readOnly ? 'opacity-80' : ''}`}>
                <div className="flex items-center gap-2">
                    <Skull size={10} className="text-slate-500 shrink-0" />
                    {readOnly ? (
                        <span className="text-[10px] text-slate-300">{effectDmg || 0} Dmg/T</span>
                    ) : (
                        <input type="number" placeholder="Dmg/T" value={effectDmg || ''} onChange={(e) => onEffectChange('effectDmg', e.target.value)} className="w-full bg-slate-950/50 text-[10px] text-slate-300 rounded px-1.5 py-0.5 border border-slate-800 focus:outline-none focus:border-slate-600" />
                    )}
                </div>
                <div className="flex items-center gap-2">
                    <Clock size={10} className="text-slate-500 shrink-0" />
                    <div className="flex items-center gap-1 w-full">
                        {readOnly ? (
                             <span className="text-[10px] text-slate-300">{effectDuration === '∞' ? 'Infinito' : `${effectDuration || 0} Turnos`}</span>
                        ) : (
                            <>
                            <input type="text" placeholder="Turnos" value={effectDuration || ''} onChange={(e) => onEffectChange('effectDuration', e.target.value)} className="w-full bg-slate-950/50 text-[10px] text-slate-300 rounded px-1.5 py-0.5 border border-slate-800 focus:outline-none focus:border-slate-600" />
                            <button onClick={() => onEffectChange('effectDuration', effectDuration === '∞' ? '' : '∞')} className={`p-1 rounded border border-slate-800 ${effectDuration === '∞' ? 'bg-indigo-600 text-white' : 'bg-slate-900 text-slate-500 hover:text-indigo-400'}`}><InfinityIcon size={10} /></button>
                            </>
                        )}
                    </div>
                </div>
            </div>
        )}
      </>
  );
};

interface RangeStatCardProps {
    min: number;
    max: number;
    onMinChange: (v: number) => void;
    onMaxChange: (v: number) => void;
    label: string;
    icon: React.ElementType;
    readOnly?: boolean;
}

const RangeStatCard: React.FC<RangeStatCardProps> = ({ min, max, onMinChange, onMaxChange, label, icon: Icon, readOnly }) => {
    return (
        <div className="flex flex-col h-full justify-between">
            <div className="flex items-center gap-1.5 mb-2 pointer-events-none"><Icon size={14} className="text-slate-400" /><span className="text-[10px] text-slate-400 uppercase font-bold tracking-wide">{label}</span></div>
            <div className="flex items-center gap-2">
                <div className={`flex flex-col items-center flex-1 bg-slate-950/30 rounded border border-slate-800 p-1 ${readOnly ? 'py-2' : ''}`}>
                    <span className="text-[8px] text-slate-500 uppercase font-bold mb-1">MÍN</span>
                    <div className="flex items-center justify-between w-full justify-center">
                        {!readOnly && <button onClick={() => onMinChange(min - 1)} className="p-1 hover:text-red-400 text-slate-500"><Minus size={12}/></button>}
                        {readOnly ? <span className="font-bold text-slate-200 text-lg">{min}</span> : <input type="number" value={min} onChange={(e) => onMinChange(parseInt(e.target.value))} className="w-8 bg-transparent text-center font-bold text-slate-200 text-lg focus:outline-none"/>}
                        {!readOnly && <button onClick={() => onMinChange(min + 1)} className="p-1 hover:text-emerald-400 text-slate-500"><Plus size={12}/></button>}
                    </div>
                </div>
                <div className="text-slate-600 font-light">-</div>
                <div className={`flex flex-col items-center flex-1 bg-slate-950/30 rounded border border-slate-800 p-1 ${readOnly ? 'py-2' : ''}`}>
                    <span className="text-[8px] text-slate-500 uppercase font-bold mb-1">MÁX</span>
                    <div className="flex items-center justify-between w-full justify-center">
                        {!readOnly && <button onClick={() => onMaxChange(max - 1)} className="p-1 hover:text-red-400 text-slate-500"><Minus size={12}/></button>}
                        {readOnly ? <span className="font-bold text-slate-200 text-lg">{max}</span> : <input type="number" value={max} onChange={(e) => onMaxChange(parseInt(e.target.value))} className="w-8 bg-transparent text-center font-bold text-slate-200 text-lg focus:outline-none"/>}
                        {!readOnly && <button onClick={() => onMaxChange(max + 1)} className="p-1 hover:text-emerald-400 text-slate-500"><Plus size={12}/></button>}
                    </div>
                </div>
            </div>
        </div>
    );
};

const CharacterSheet: React.FC<CharacterSheetProps> = ({ character, onChange, isEnemy = false, availableClasses, onAddClass, onRemoveClass, readOnly = false }) => {
  const [isAddingClass, setIsAddingClass] = useState(false);
  const [newClassInput, setNewClassInput] = useState("");
  
  useEffect(() => {
    if (!character.statOrder || character.statOrder.length === 0) {
        const baseKeys = ['damage', 'defense', 'hit', 'critC', 'critM'];
        const customKeys = character.customStats.map(s => s.id);
        onChange({ ...character, statOrder: [...baseKeys, ...customKeys] });
    }
  }, []);

  const updateField = (field: keyof Character, value: any) => { if(!readOnly) onChange({ ...character, [field]: value }); };
  const addCustomStat = (isNumber: boolean) => {
    const newStat: CustomStat = { id: crypto.randomUUID(), label: isNumber ? "Nuevo Atributo" : "Nota", value: isNumber ? "0" : "", isNumber, unit: '', effectDmg: '', effectDuration: '' };
    onChange({ ...character, customStats: [...character.customStats, newStat], statOrder: [...(character.statOrder || []), newStat.id] });
  };
  const updateCustomStat = (id: string, field: keyof CustomStat, value: any) => { const newStats = character.customStats.map(s => s.id === id ? { ...s, [field]: value } : s); onChange({ ...character, customStats: newStats }); };
  const removeCustomStat = (id: string) => { onChange({ ...character, customStats: character.customStats.filter(s => s.id !== id), statOrder: character.statOrder.filter(oid => oid !== id) }); };
  const handleSaveNewClass = () => { if (newClassInput.trim()) { onAddClass(newClassInput.trim()); updateField('classType', newClassInput.trim()); setNewClassInput(""); setIsAddingClass(false); } };

  const themeColor = isEnemy ? "red" : "amber";
  const bgColor = isEnemy ? "bg-red-950/10" : "bg-amber-950/10";
  const borderColor = isEnemy ? "border-red-900/30" : "border-amber-900/30";
  const glowClass = isEnemy ? "shadow-red-900/10" : "shadow-amber-900/10";
  const textCustomStats = character.customStats.filter(s => !s.isNumber);
  const toggleUnit = (statId: string, currentUnit?: string) => { const units = ['', '%', 'x']; const currentIdx = units.indexOf(currentUnit || ''); const nextUnit = units[(currentIdx + 1) % units.length]; updateCustomStat(statId, 'unit', nextUnit); };
  const hpPercent = Math.max(0, Math.min(100, (character.hp / character.maxHp) * 100));
  const isLowHp = hpPercent < 30;
  const handleReorder = (newOrder: string[]) => { if (!readOnly) onChange({ ...character, statOrder: newOrder }); };
  const renderStatusIcon = (type: string) => {
    switch(type) { case 'poison': return <Skull size={10} />; case 'fire': return <Flame size={10} />; case 'ice': return <Snowflake size={10} />; case 'bleed': return <Droplets size={10} />; case 'stun': return <ZapIcon size={10} />; default: return <Activity size={10} />; }
  };
  
  const seedToUse = character.avatarSeed || character.name;
  const avatarUrl = character.avatarUrl || `https://api.dicebear.com/9.x/pixel-art/svg?seed=${seedToUse}&backgroundColor=${isEnemy ? 'b91c1c' : 'b45309'}`;

  // If readOnly, we render a static div list instead of Reorder.Group to disable interactions completely
  const StatContainer = readOnly ? ({ children, className }: any) => <div className={className}>{children}</div> : Reorder.Group;

  return (
    <div className={`p-4 rounded-xl border ${borderColor} ${bgColor} shadow-2xl ${glowClass} backdrop-blur-sm h-full flex flex-col relative overflow-hidden`}>
      <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">{isEnemy ? <Skull size={100} /> : <Shield size={100} />}</div>
      <div className={`flex items-start gap-4 mb-5 pb-3 border-b ${borderColor} relative z-10`}>
        <div className="relative group shrink-0">
             <div className={`w-16 h-16 rounded-lg overflow-hidden border-2 ${isEnemy ? 'border-red-500 shadow-[0_0_15px_rgba(239,68,68,0.3)]' : 'border-amber-500 shadow-[0_0_15px_rgba(245,158,11,0.3)]'} bg-black`}>
                <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
             </div>
        </div>
        <div className="flex-1 min-w-0 flex flex-col justify-center h-full pt-1">
          {readOnly ? (
            <span className="w-full bg-transparent font-bold fantasy-font text-xl sm:text-2xl text-slate-100 truncate">{character.name}</span>
          ) : (
            <input 
                type="text" 
                value={character.name} 
                onChange={(e) => {
                    const val = e.target.value;
                    const capitalized = val.length > 0 ? val.charAt(0).toUpperCase() + val.slice(1) : val;
                    updateField('name', capitalized);
                }} 
                className="w-full bg-transparent font-bold fantasy-font text-xl sm:text-2xl text-slate-100 focus:outline-none placeholder-white/20 truncate" 
                placeholder="Nombre" 
            />
          )}
          <div className="mt-1 h-6">
            {isAddingClass && !readOnly ? (
                 <div className="flex items-center gap-1 w-full animate-in fade-in duration-200">
                    <input autoFocus type="text" value={newClassInput} onChange={(e) => setNewClassInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleSaveNewClass()} placeholder="Nueva Clase..." className="flex-1 bg-slate-900/80 text-xs text-white px-2 py-1 rounded border border-slate-600 focus:border-amber-500 focus:outline-none uppercase tracking-wider" />
                    <button onClick={handleSaveNewClass} className="p-1 bg-emerald-600 text-white rounded hover:bg-emerald-500"><Check size={12}/></button>
                    <button onClick={() => setIsAddingClass(false)} className="p-1 bg-slate-700 text-slate-300 rounded hover:bg-slate-600"><X size={12}/></button>
                 </div>
            ) : (
                <div className="flex items-center gap-2 group">
                    {readOnly ? (
                        <span className="flex-1 bg-transparent text-xs uppercase tracking-wider font-bold text-slate-400">{character.classType}</span>
                    ) : (
                        <select value={character.classType} onChange={(e) => updateField('classType', e.target.value)} className="flex-1 bg-transparent text-xs uppercase tracking-wider font-bold text-slate-400 focus:outline-none cursor-pointer hover:text-slate-200 transition-colors appearance-none">
                            {availableClasses.map(c => <option key={c} value={c} className="bg-slate-900 text-slate-200">{c}</option>)}
                            {!availableClasses.includes(character.classType) && <option value={character.classType} className="bg-slate-900 text-slate-400">{character.classType}</option>}
                        </select>
                    )}
                    {!readOnly && (
                        <div className="flex items-center opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity gap-1">
                             <button onClick={() => setIsAddingClass(true)} className="p-0.5 rounded bg-slate-800 text-emerald-400 hover:text-emerald-300 border border-slate-700" title="Crear nueva clase"><Plus size={10} strokeWidth={3}/></button>
                             <button onClick={() => { if(window.confirm(`¿Eliminar la clase "${character.classType}" de la lista?`)) { onRemoveClass(character.classType); } }} className="p-0.5 rounded bg-slate-800 text-red-400 hover:text-red-300 border border-slate-700" title="Eliminar clase seleccionada"><Minus size={10} strokeWidth={3}/></button>
                        </div>
                    )}
                </div>
            )}
          </div>
        </div>
      </div>

      <div className="mb-4 bg-slate-950/40 p-3 rounded-lg border border-slate-800 flex flex-col gap-2 relative z-10">
          <div className="flex items-center gap-4">
              <div className="bg-slate-900 p-2 rounded-full border border-slate-700"><Heart size={20} className={`${isLowHp ? 'text-red-500 animate-pulse' : 'text-pink-600'} fill-current/20`} /></div>
              <div className="flex-1 flex flex-col">
                  <div className="flex items-center justify-between mb-1"><span className="text-[10px] uppercase font-bold text-slate-500">Puntos de Vida</span><span className="text-[10px] font-mono text-slate-600">{Math.round(hpPercent)}%</span></div>
                  <div className="flex items-center gap-2">
                     <div className={`flex items-center bg-slate-900 rounded border border-slate-700 z-10 relative ${readOnly ? 'px-2 py-1 justify-center min-w-[60px]' : ''}`}>
                         {!readOnly && <button onClick={() => updateField('hp', character.hp - 1)} className="p-2 hover:bg-pink-900/20 hover:text-pink-400 text-slate-500"><Minus size={14}/></button>}
                         {readOnly ? (
                             <span className={`text-center font-bold text-xl ${character.hp < character.maxHp / 2 ? 'text-red-400' : 'text-white'}`}>{character.hp}</span>
                         ) : (
                             <input type="number" value={character.hp} onChange={(e) => updateField('hp', parseInt(e.target.value))} className={`w-14 bg-transparent text-center font-bold text-xl focus:outline-none ${character.hp < character.maxHp / 2 ? 'text-red-400' : 'text-white'}`} />
                         )}
                         {!readOnly && <button onClick={() => updateField('hp', character.hp + 1)} className="p-2 hover:bg-emerald-900/20 hover:text-emerald-400 text-slate-500"><Plus size={14}/></button>}
                     </div>
                     <span className="text-slate-600 font-light text-2xl z-10">/</span>
                     <div className="relative group z-10">
                        {readOnly ? (
                            <span className="text-center font-bold text-lg text-slate-500">{character.maxHp}</span>
                        ) : (
                            <input type="number" value={character.maxHp} onChange={(e) => updateField('maxHp', parseInt(e.target.value))} className="w-12 bg-transparent text-center font-bold text-lg text-slate-500 focus:text-slate-300 focus:outline-none border-b border-transparent focus:border-slate-600" />
                        )}
                     </div>
                  </div>
              </div>
          </div>
          <div className="w-full h-3 bg-slate-900 rounded-full border border-slate-800 overflow-hidden relative"><div className={`h-full transition-all duration-500 ease-out ${isLowHp ? 'bg-red-600 shadow-[0_0_10px_rgba(220,38,38,0.7)]' : 'bg-gradient-to-r from-red-700 to-pink-600'}`} style={{ width: `${hpPercent}%` }} /><div className="absolute inset-0 bg-[linear-gradient(90deg,transparent_0%,rgba(0,0,0,0.3)_50%,transparent_100%)] opacity-30" /></div>
          <div className="flex flex-wrap gap-2 min-h-[24px]">
            {character.activeStatuses && character.activeStatuses.length > 0 ? (
                character.activeStatuses.map(status => (
                    <div key={status.id} className="flex items-center gap-1.5 bg-black/40 border border-slate-700 rounded px-2 py-0.5 text-[10px] animate-in slide-in-from-left duration-300">
                        <div className="text-amber-500">{renderStatusIcon(status.iconType || 'generic')}</div>
                        <span className="font-bold text-slate-300">{status.name}</span>
                        {status.damagePerTurn > 0 && (<span className="text-red-400">-{status.damagePerTurn} HP</span>)}
                        <span className="bg-slate-800 text-slate-500 px-1 rounded ml-1 font-mono">{status.duration === -1 ? '∞' : `${status.duration}t`}</span>
                    </div>
                ))
            ) : (<span className="text-[10px] text-slate-600 italic">Sin estados alterados</span>)}
          </div>
      </div>

      <StatContainer axis="y" values={character.statOrder || []} onReorder={handleReorder} className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-4 relative z-10" as="div">
         {(character.statOrder || []).map(itemId => {
             if (itemId === 'damage') return (<SortableItem key={itemId} itemId={itemId} colSpan="col-span-1 sm:col-span-2" readOnly={readOnly}><RangeStatCard label="Rango de Daño" icon={Sword} min={character.minDmg} max={character.maxDmg} onMinChange={(v) => updateField('minDmg', v)} onMaxChange={(v) => updateField('maxDmg', v)} readOnly={readOnly} /></SortableItem>);
             if (itemId === 'defense') return (<SortableItem key={itemId} itemId={itemId} colSpan="col-span-1 sm:col-span-2" readOnly={readOnly}><RangeStatCard label="Rango de Defensa" icon={Shield} min={character.minDefense} max={character.maxDefense} onMinChange={(v) => updateField('minDefense', v)} onMaxChange={(v) => updateField('maxDefense', v)} readOnly={readOnly} /></SortableItem>);
             if (itemId === 'hit') return (<SortableItem key={itemId} itemId={itemId} readOnly={readOnly}><StatStepper label="Prob. Golpe" value={character.hitChance} onChange={(v) => updateField('hitChance', v)} icon={Crosshair} suffix="%" step={5} readOnly={readOnly} /></SortableItem>);
             if (itemId === 'critC') return (<SortableItem key={itemId} itemId={itemId} readOnly={readOnly}><StatStepper label="Prob. Crítico" value={character.critChance} onChange={(v) => updateField('critChance', v)} icon={Zap} color="text-yellow-400" suffix="%" step={1} readOnly={readOnly} /></SortableItem>);
             if (itemId === 'critM') return (<SortableItem key={itemId} itemId={itemId} readOnly={readOnly}><StatStepper label="Mult. Crítico" value={character.critMult} onChange={(v) => updateField('critMult', v)} icon={Zap} color="text-orange-400" suffix="x" step={0.5} readOnly={readOnly} /></SortableItem>);
             const stat = character.customStats.find(s => s.id === itemId);
             if (stat && stat.isNumber) {
                 return (<SortableItem key={itemId} itemId={itemId} onRemove={() => removeCustomStat(stat.id)} readOnly={readOnly}><StatStepper label={stat.label} isEditableLabel onLabelChange={(val) => updateCustomStat(stat.id, 'label', val)} value={parseFloat(stat.value) || 0} onChange={(val) => updateCustomStat(stat.id, 'value', val.toString())} icon={Hash} color="text-blue-400" step={1} unit={stat.unit} onToggleUnit={() => toggleUnit(stat.id, stat.unit)} effectDmg={stat.effectDmg} effectDuration={stat.effectDuration} onEffectChange={(field, val) => updateCustomStat(stat.id, field, val)} readOnly={readOnly} /></SortableItem>);
             }
             return null;
         })}
      </StatContainer>

      {!readOnly && (
        <button onClick={() => addCustomStat(true)} className="flex items-center justify-center gap-2 bg-slate-900/20 border border-dashed border-slate-700 hover:border-slate-500 rounded p-2 text-slate-500 hover:text-slate-300 hover:bg-slate-800/40 transition-all group min-h-[50px] mb-4 relative z-10">
            <Plus size={16} className="group-hover:scale-110 transition-transform"/>
            <span className="text-xs font-bold uppercase tracking-wide">Añadir Atributo</span>
        </button>
      )}

      <div className="flex-1 flex flex-col relative z-10">
        <div className="flex items-center justify-between mb-2 mt-2 pt-2 border-t border-slate-800/50">
          <h4 className="text-xs font-bold uppercase text-slate-500 tracking-wider flex items-center gap-2"><Type size={12} /> Notas y Texto</h4>
          {!readOnly && <button onClick={() => addCustomStat(false)} className="flex items-center gap-1 px-2 py-1 rounded bg-slate-900 border border-slate-700 hover:border-slate-500 text-[10px] text-slate-400 hover:text-white transition-colors"><Plus size={10} /> Nueva Nota</button>}
        </div>
        <div className="space-y-2 overflow-y-auto max-h-[200px] pr-1 custom-scrollbar">
            {textCustomStats.length === 0 && (<div className="text-center py-2 text-[10px] text-slate-700 italic">Sin notas de texto</div>)}
            {textCustomStats.map((stat) => (
            <div key={stat.id} className="relative group bg-slate-900/30 p-2 rounded border border-white/5 hover:border-white/10 transition-colors">
                <div className="flex items-center justify-between gap-2 mb-1">
                    {readOnly ? (
                         <span className="text-xs font-bold text-slate-400">{stat.label}</span>
                    ) : (
                        <input type="text" value={stat.label} onChange={(e) => updateCustomStat(stat.id, 'label', e.target.value)} className="w-full bg-transparent text-xs font-bold text-slate-400 focus:text-slate-200 focus:outline-none" placeholder="Título de la nota" />
                    )}
                    {!readOnly && <button onClick={() => removeCustomStat(stat.id)} className="text-slate-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"><Minus size={12} /></button>}
                </div>
                {readOnly ? (
                    <p className="w-full bg-slate-950/20 rounded border border-transparent px-2 py-1 text-sm text-white">{stat.value}</p>
                ) : (
                    <input type="text" value={stat.value} onChange={(e) => updateCustomStat(stat.id, 'value', e.target.value)} className="w-full bg-slate-950/50 rounded border border-slate-800/50 px-2 py-1 text-sm text-white focus:outline-none placeholder-slate-600" placeholder="Escribe aquí..." />
                )}
            </div>
            ))}
        </div>
      </div>
    </div>
  );
};

export default CharacterSheet;