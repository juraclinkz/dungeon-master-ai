import React, { useEffect } from 'react';
import { Map, ChevronUp, ChevronDown, ChevronLeft, ChevronRight, Hand, Skull, Gem, Star, PlayCircle, Lock, DoorOpen, Unlock, X } from 'lucide-react';
import { DungeonState, DungeonTile, TileType, EncounterMode } from '../types';

const TILE_COUNT = 20;

interface DungeonGeneratorViewProps {
    dungeonState: DungeonState;
    setDungeonState: React.Dispatch<React.SetStateAction<DungeonState>>;
    onEncounter?: (type: 'enemy' | 'chest' | 'boss') => void;
    encounterMode: EncounterMode;
}

const DungeonGeneratorView: React.FC<DungeonGeneratorViewProps> = ({ dungeonState, setDungeonState, onEncounter, encounterMode }) => {
  const { tiles, playerPos, message, isGenerated } = dungeonState;

  // Estilos compartidos DQ
  const dqBoxStyle = "bg-blue-950/95 border-[3px] border-double border-white rounded-md shadow-2xl relative overflow-hidden";
  const dqTextStyle = "font-mono text-white text-shadow-sm";
  const dqBtnStyle = "bg-blue-900 border-2 border-white shadow-lg active:bg-blue-950 active:translate-y-1 transition-all flex items-center justify-center text-white";

  useEffect(() => {
    if (!isGenerated && tiles.length === 0) {
        generateDungeon();
    }
  }, []);

  const generateDungeon = () => {
    const newTiles: DungeonTile[] = [];
    const visited = new Set<string>();
    let currentX = 0;
    let currentY = 0;
    newTiles.push({ x: 0, y: 0, type: 'start', revealed: true, interacted: true });
    visited.add(`0,0`);
    let safetyCounter = 0;

    while (newTiles.length < TILE_COUNT && safetyCounter < 1000) {
      safetyCounter++;
      const dir = Math.floor(Math.random() * 4);
      let nextX = currentX;
      let nextY = currentY;

      switch(dir) {
        case 0: nextY--; break;
        case 1: nextX++; break;
        case 2: nextY++; break;
        case 3: nextX--; break;
      }

      const key = `${nextX},${nextY}`;
      if (!visited.has(key)) {
        const rand = Math.random();
        let type: TileType = 'empty'; 
        const stepIndex = newTiles.length;
        
        if (stepIndex === TILE_COUNT - 1) { 
            type = 'boss'; 
        } 
        else if (stepIndex < 3) { 
            type = rand > 0.7 ? 'event' : 'empty'; 
        }
        else {
             if (rand > 0.85) type = 'chest';      // 15% Cofre
             else if (rand > 0.60) type = 'enemy'; // 25% Enemigo
             else if (rand > 0.35) type = 'event'; // 25% Evento
             else type = 'empty';                  // 35% Vacío
        }
        newTiles.push({ x: nextX, y: nextY, type, revealed: false, interacted: false });
        visited.add(key);
        currentX = nextX;
        currentY = nextY;
      } else {
        if (Math.random() > 0.5) { currentX = nextX; currentY = nextY; }
      }
    }

    setDungeonState(prev => ({
        ...prev,
        tiles: newTiles,
        playerPos: { x: 0, y: 0 },
        message: "Te adentras en la mazmorra. La puerta se cierra a tu espalda...",
        isGenerated: true
    }));
  };

  const getTileAt = (x: number, y: number) => tiles.find(t => t.x === x && t.y === y);

  const move = (dx: number, dy: number) => {
    if (encounterMode === 'combat' || encounterMode === 'chest' || encounterMode === 'victory') {
        let blockMsg = "¡No puedes moverte!";
        if (encounterMode === 'combat') blockMsg = "¡Estás en combate!";
        if (encounterMode === 'chest') blockMsg = "¡Hay un cofre ante ti!";
        if (encounterMode === 'victory') blockMsg = "¡Recoge tu recompensa!";
        
        setDungeonState(prev => ({ ...prev, message: blockMsg }));
        return;
    }

    const newX = playerPos.x + dx;
    const newY = playerPos.y + dy;
    const targetTile = getTileAt(newX, newY);

    if (targetTile) {
      let newMessage = "Te mueves a una sala conocida.";
      let updatedTiles = [...tiles];
      let tileType = targetTile.type;
      let isInteracted = targetTile.interacted;
      let justSpawned = false;

      if (!targetTile.revealed) {
        if (targetTile.type === 'empty' || targetTile.type === 'event') {
            if (Math.random() < 0.35) {
                tileType = 'enemy';
                isInteracted = false;
            }
        }
        switch(tileType) {
            case 'enemy': newMessage = "¡EMBOSCADA! ¡Un monstruo aparece!"; break;
            case 'chest': newMessage = "¡Un cofre antiguo brilla ante ti!"; break;
            case 'boss': newMessage = "¡EL JEFE FINAL TE ESPERA!"; break;
            case 'event': newMessage = "Sientes una presencia extraña..."; break;
            case 'empty': newMessage = "Sala vacía y silenciosa."; break;
        }
      } 
      else {
          if (tileType !== 'boss' && tileType !== 'start' && tileType !== 'chest') {
             if (tileType === 'empty' || isInteracted) {
                 if (Math.random() < 0.20) {
                     tileType = 'enemy';
                     isInteracted = false;
                     newMessage = "¡Un enemigo errante te ataca!";
                     justSpawned = true;
                 }
             }
          }
          if (!justSpawned) {
            if (isInteracted) { newMessage = "Sala despejada."; } 
            else if (tileType === 'enemy' || tileType === 'boss') { newMessage = "¡El enemigo sigue aquí!"; }
            else if (tileType === 'empty') { newMessage = "Nada nuevo por aquí."; }
          }
      }

      updatedTiles = tiles.map(t => t.x === newX && t.y === newY ? { ...t, type: tileType as TileType, revealed: true, interacted: isInteracted } : t);

      setDungeonState(prev => ({ ...prev, playerPos: { x: newX, y: newY }, tiles: updatedTiles, message: newMessage }));
      
      if (!isInteracted && (tileType === 'enemy' || tileType === 'boss' || tileType === 'chest')) {
          setTimeout(() => { onEncounter?.(tileType as 'enemy' | 'boss' | 'chest'); }, 300);
      }
    } else {
        setDungeonState(prev => ({ ...prev, message: "Un muro bloquea tu camino." }));
    }
  };

  const handleAction = () => {
    if (encounterMode === 'combat') {
        setDungeonState(prev => ({ ...prev, message: "¡Estás combatiendo!" }));
        return;
    }

    const currentTile = getTileAt(playerPos.x, playerPos.y);
    if (!currentTile) return;
    if (currentTile.interacted && currentTile.type !== 'empty' && currentTile.type !== 'start') { setDungeonState(prev => ({ ...prev, message: "Nada más que hacer aquí." })); return; }
    const markInteracted = () => { const updated = tiles.map(t => t.x === playerPos.x && t.y === playerPos.y ? { ...t, interacted: true } : t); return updated; };

    let newMessage = "";
    let newTiles = tiles;

    switch(currentTile.type) {
        case 'chest': onEncounter?.('chest'); return; 
        case 'enemy': onEncounter?.('enemy'); return;
        case 'boss': onEncounter?.('boss'); return;
        case 'event': newMessage = "Investigas la zona... (Ver Historial)"; newTiles = markInteracted(); break;
        case 'start': newMessage = "La salida está bloqueada."; break;
        case 'empty': newMessage = "Solo polvo y piedras."; newTiles = markInteracted(); break;
        default: newMessage = "Nada interesante.";
    }
    setDungeonState(prev => ({ ...prev, tiles: newTiles, message: newMessage }));
  };

  const renderGrid = () => {
    const grid = [];
    const radius = 3; // View distance increased to 7x7 grid
    for (let y = playerPos.y - radius; y <= playerPos.y + radius; y++) {
        for (let x = playerPos.x - radius; x <= playerPos.x + radius; x++) {
            const tile = getTileAt(x, y);
            const isPlayerHere = x === playerPos.x && y === playerPos.y;
            let content = null;
            // Muros (Void) muy oscuros, sin borde
            let bgClass = "bg-black border-transparent shadow-none"; 
            let iconClass = "text-slate-600 opacity-20";

            if (tile) {
                if (tile.revealed) {
                    // Camino revelado
                    bgClass = tile.interacted ? "bg-slate-900 border-slate-700" : "bg-slate-800 border-slate-600";
                    iconClass = "text-slate-600"; // Reset opacity for visible tiles
                    switch(tile.type) {
                        case 'start': content = <DoorOpen size="60%" />; iconClass = "text-emerald-500"; break;
                        case 'chest': 
                            content = tile.interacted ? <Unlock size="60%" /> : <Gem size="60%" />; 
                            iconClass = tile.interacted ? "text-slate-700" : "text-amber-400 animate-pulse"; 
                            break;
                        case 'enemy': 
                            content = tile.interacted ? <X size="60%" /> : <Skull size="60%" />; 
                            iconClass = tile.interacted ? "text-red-900/50" : "text-red-400 animate-bounce"; 
                            break;
                        case 'boss': 
                            content = tile.interacted ? <X size="80%" /> : <Skull size="80%" />; 
                            iconClass = tile.interacted ? "text-purple-900/50" : "text-purple-500 animate-pulse"; 
                            break;
                        case 'event': 
                            content = <Star size="60%" />; 
                            iconClass = tile.interacted ? "text-blue-900/50" : "text-blue-400"; 
                            break;
                        case 'empty': content = null; bgClass = "bg-slate-900 border-slate-700"; break;
                        default: content = null;
                    }
                } else {
                    // Camino oculto (Fog of War) - Un poco más claro que el negro absoluto del muro
                    bgClass = "bg-slate-900/40 border-slate-800/30";
                    content = <span className="text-[10px] text-slate-700 font-mono opacity-50">?</span>;
                    iconClass = "";
                }
            }
            grid.push(
                <div key={`${x},${y}`} className={`aspect-square w-full flex items-center justify-center border rounded-sm transition-all relative ${bgClass}`}>
                    <div className={`w-full h-full flex items-center justify-center ${iconClass}`}>{content}</div>
                    {isPlayerHere && (<div className="absolute inset-0 flex items-center justify-center z-10"><div className="w-[30%] h-[30%] bg-emerald-400 rounded-sm shadow-[0_0_15px_rgba(52,211,153,0.8)] animate-pulse border-2 border-white"></div></div>)}
                </div>
            );
        }
    }
    return grid;
  };

  const isLocked = encounterMode === 'combat';

  return (
    <div className={`${dqBoxStyle} p-2 h-full flex flex-col items-center gap-2`}>
        
        {isLocked && (
            <div className="absolute top-2 right-2 z-20 animate-pulse text-red-500" title="Movimiento bloqueado por combate">
                <Lock size={20} />
            </div>
        )}

        <div className="z-10 text-center border-b-2 border-white/20 pb-1 w-full shrink-0">
            <h2 className={`${dqTextStyle} text-lg font-bold flex items-center gap-2 justify-center uppercase`}><Map size={18} className="text-yellow-300"/> Mazmorra</h2>
            <p className="text-[10px] text-slate-400 mt-0.5 font-mono uppercase tracking-widest">Nivel 1 - Profundidades</p>
        </div>
        
        {/* Contenedor del Mapa - Expandido a 7x7 y Responsive */}
        <div className="relative z-10 bg-black p-1 rounded border-2 border-slate-700 shadow-inner w-full flex-1 flex items-center justify-center overflow-hidden">
            <div className="grid grid-cols-7 gap-0.5 bg-black w-full max-w-[500px] aspect-square">
                {renderGrid()}
            </div>
        </div>

        {/* Caja de Texto Retro - Compacta */}
        <div className={`${dqBoxStyle} w-full p-2 bg-black min-h-[50px] flex items-center justify-center border-2 shrink-0`}>
            <p className="text-xs font-mono text-white text-center leading-relaxed">{message}</p>
        </div>

        {/* Panel de Control Retro */}
        <div className={`z-10 flex flex-col items-center gap-1 mt-auto pb-1 shrink-0 transition-opacity ${isLocked ? 'opacity-50 grayscale' : 'opacity-100'}`}>
             <div className="flex gap-2">
                 <div className="w-12 h-10 sm:w-14 sm:h-12"></div>
                 <button onClick={() => move(0, -1)} className={`${dqBtnStyle} w-12 h-10 sm:w-14 sm:h-12 rounded`}><ChevronUp size={24} /></button>
                 <div className="w-12 h-10 sm:w-14 sm:h-12"></div>
             </div>
             <div className="flex gap-2 items-center">
                 <button onClick={() => move(-1, 0)} className={`${dqBtnStyle} w-12 h-10 sm:w-14 sm:h-12 rounded`}><ChevronLeft size={24} /></button>
                 <button onClick={handleAction} className={`${dqBtnStyle} w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-red-800 border-red-500`}><Hand size={24} strokeWidth={3} /></button>
                 <button onClick={() => move(1, 0)} className={`${dqBtnStyle} w-12 h-10 sm:w-14 sm:h-12 rounded`}><ChevronRight size={24} /></button>
             </div>
             <div className="flex gap-2">
                 <div className="w-12 h-10 sm:w-14 sm:h-12"></div>
                 <button onClick={() => move(0, 1)} className={`${dqBtnStyle} w-12 h-10 sm:w-14 sm:h-12 rounded`}><ChevronDown size={24} /></button>
                 <div className="w-12 h-10 sm:w-14 sm:h-12"></div>
             </div>
        </div>

        {!isGenerated && (<div className="absolute inset-0 bg-black flex flex-col items-center justify-center z-50"><PlayCircle className="w-12 h-12 text-white animate-spin mb-2" /><span className="text-white font-mono font-bold animate-pulse">GENERANDO MUNDO...</span></div>)}
    </div>
  );
};

export default DungeonGeneratorView;