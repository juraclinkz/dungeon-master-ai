import React, { useEffect, useState, useRef } from 'react';
import { AnimatedDie } from '../types';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, XCircle, MousePointerClick, Swords, Shield, Zap, Skull } from 'lucide-react';

interface DiceAnimationOverlayProps {
  isVisible: boolean;
  dice: AnimatedDie[];
  onComplete: () => void;
  isResultReady: boolean;
}

type AnimationPhase = 'rolling' | 'reveal' | 'crit_buildup' | 'clash_anticipation' | 'impact' | 'final';

const DiceAnimationOverlay: React.FC<DiceAnimationOverlayProps> = ({ isVisible, dice, onComplete, isResultReady }) => {
  const [displayValues, setDisplayValues] = useState<Record<string, number>>({});
  const [phase, setPhase] = useState<AnimationPhase>('rolling');
  const [revealedDiceIds, setRevealedDiceIds] = useState<Set<string>>(new Set());
  
  // Identificar dados clave
  const dmgDie = dice.find(d => d.id === 'dmg-roll' || d.id === 'enemy-dmg-roll');
  const defDie = dice.find(d => d.id === 'def-roll' || d.id === 'hero-def-roll');
  
  // Detectar si hay choque de combate
  const isCombatClash = !!(dmgDie && defDie && !dmgDie.isIgnored && !defDie.isIgnored);
  const isCrit = !!dmgDie?.isCrit;

  // 1. Reset state on open
  useEffect(() => {
    if (isVisible) {
      setPhase('rolling');
      setRevealedDiceIds(new Set());
      setDisplayValues({});
    }
  }, [isVisible]);

  // 2. Rolling Effect (Visual Noise)
  useEffect(() => {
    if (!isVisible) return;

    // Intervalo para generar números aleatorios mientras "ruedan"
    const interval = setInterval(() => {
        const newValues: Record<string, number> = {};
        dice.forEach(d => {
            if (revealedDiceIds.has(d.id)) {
                // Si ya se reveló, mantener el valor final
                newValues[d.id] = d.finalValue;
            } else {
                // Si sigue rodando, mostrar random
                const max = parseInt(d.type.substring(1)) || 20;
                newValues[d.id] = Math.floor(Math.random() * max) + 1;
            }
        });
        setDisplayValues(newValues);
    }, 60);

    return () => clearInterval(interval);
  }, [isVisible, dice, revealedDiceIds]);

  // 3. Staggered Reveal Logic (The "Emotion" Sequencer)
  useEffect(() => {
    if (isVisible && isResultReady && phase === 'rolling') {
        const sequence = async () => {
            // Tiempo mínimo inicial de rodado frenético
            await new Promise(r => setTimeout(r, 800));

            // Revelar uno por uno
            for (const die of dice) {
                setRevealedDiceIds(prev => {
                    const newSet = new Set(prev);
                    newSet.add(die.id);
                    return newSet;
                });
                
                // Pequeño golpe de efecto (vibración) podría ir aquí
                // Demora entre dados para tensión (600ms)
                await new Promise(r => setTimeout(r, 600));
            }

            // Una vez todos revelados, esperar un momento para leer la mesa completa
            await new Promise(r => setTimeout(r, 500));
            setPhase('reveal');
        };
        
        // Evitar múltiples ejecuciones si las dependencias cambian rápido
        if (revealedDiceIds.size === 0) {
            sequence();
        }
    }
  }, [isVisible, isResultReady, phase, dice]); // Removed revealedDiceIds from deps to avoid loop

  // 4. Combat Phase Logic (Crit -> Clash -> Impact)
  useEffect(() => {
    if (phase === 'reveal') {
        const timeout = setTimeout(() => {
            if (isCrit && isCombatClash) {
                setPhase('crit_buildup');
            } else if (isCombatClash) {
                setPhase('clash_anticipation');
            } else {
                setPhase('final');
            }
        }, 500); // Breve pausa tras revelar todo
        return () => clearTimeout(timeout);
    }

    if (phase === 'crit_buildup') {
        const timeout = setTimeout(() => {
            setPhase('clash_anticipation');
        }, 2000);
        return () => clearTimeout(timeout);
    }

    if (phase === 'clash_anticipation') {
        const timeout = setTimeout(() => {
            setPhase('impact');
        }, 1000);
        return () => clearTimeout(timeout);
    }

    if (phase === 'impact') {
        const timeout = setTimeout(() => {
            setPhase('final');
        }, 800);
        return () => clearTimeout(timeout);
    }

  }, [phase, isCrit, isCombatClash]);

  const handleDismiss = () => {
    if (phase === 'final') {
      onComplete();
    }
  };

  if (!isVisible) return null;

  // Render helpers
  const getContainerClass = (die: AnimatedDie, currentPhase: AnimationPhase) => {
    if (die.isIgnored) return "bg-slate-900 border-slate-800 opacity-40 grayscale scale-75";
    
    // Si es el dado de daño en fase critica
    if (isCrit && (die.id === 'dmg-roll' || die.id === 'enemy-dmg-roll')) {
        if (currentPhase === 'crit_buildup') return "bg-gradient-to-br from-yellow-600 to-amber-800 border-yellow-300 shadow-[0_0_50px_rgba(252,211,77,0.8)] scale-125 z-50";
        if (currentPhase === 'final') return "bg-gradient-to-b from-red-900 to-red-950 border-red-500 shadow-[0_0_30px_rgba(239,68,68,0.4)]";
        return "bg-slate-800 border-yellow-500/50"; // Reveal phase
    }

    // Hit success/fail coloring
    if (die.id === 'hit-roll' || die.id === 'enemy-hit-roll') {
        const success = die.condition === 'under' ? die.finalValue <= (die.target || 0) : die.finalValue >= (die.target || 0);
        // Color only if revealed
        if (revealedDiceIds.has(die.id)) {
            return success 
                ? "bg-emerald-900/80 border-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.3)]" 
                : "bg-red-900/80 border-red-500 shadow-[0_0_15px_rgba(239,68,68,0.3)]";
        }
    }

    return "bg-slate-800 border-slate-600";
  };

  return (
    <AnimatePresence>
      <motion.div 
        initial={{ opacity: 0 }} 
        animate={{ opacity: 1 }} 
        exit={{ opacity: 0 }} 
        onClick={handleDismiss} 
        className={`fixed inset-0 z-[100] flex items-center justify-center bg-black/95 backdrop-blur-xl p-4 transition-cursor ${phase === 'final' ? 'cursor-pointer' : 'cursor-wait'}`}
      >
        <div className="flex flex-col items-center w-full max-w-5xl h-full justify-center gap-12 relative pointer-events-none">
          
          {/* Header Status */}
          <div className="absolute top-10 sm:top-20 text-center space-y-2">
             <motion.h2 
                key={phase}
                initial={{ y: -20, opacity: 0 }} 
                animate={{ y: 0, opacity: 1 }} 
                className="text-2xl sm:text-4xl font-bold fantasy-font text-slate-300 tracking-widest uppercase"
              >
                {phase === 'rolling' && "El Destino Decide..."}
                {phase === 'reveal' && "Resultados"}
                {phase === 'crit_buildup' && <span className="text-yellow-400 drop-shadow-[0_0_10px_rgba(250,204,21,0.8)] text-5xl">¡¡CRÍTICO!!</span>}
                {phase === 'clash_anticipation' && "Calculando Daño..."}
                {phase === 'impact' && "¡IMPACTO!"}
                {phase === 'final' && "Resultado Final"}
              </motion.h2>
              {phase === 'final' && (
                  <p className="text-emerald-400 text-sm animate-pulse">Toca para continuar</p>
              )}
          </div>

          <div className="flex flex-wrap items-center justify-center gap-8 sm:gap-16 w-full content-center min-h-[300px] perspective-[1000px]">
            {dice.map((die, index) => {
              // Lógica especial para ocultar/transformar dados en el choque
              const isDmg = die.id === 'dmg-roll' || die.id === 'enemy-dmg-roll';
              const isDef = die.id === 'def-roll' || die.id === 'hero-def-roll';
              const isRevealed = revealedDiceIds.has(die.id);

              // El dado de defensa desaparece en el impacto final para "fundirse"
              if (isDef && phase === 'final') return null;

              // Calcular valor a mostrar
              let showValue = displayValues[die.id] || 0;
              
              // Si es daño, en fase 'impact' o 'final', mostramos la resta
              if (isDmg && (phase === 'impact' || phase === 'final') && defDie) {
                  showValue = Math.max(0, dmgDie!.finalValue - defDie!.finalValue);
              }

              // Animación de movimiento (scale, position, opacity)
              const animateProps: any = { scale: 1, x: 0, y: 0, opacity: 1 };
              
              // Animación de rotación (separada para aplicar solo al background)
              let rotateValue: number | number[] = 0;
              let rotateTransition: any = undefined;
              
              if (!isRevealed) {
                  // Si NO está revelado, gira frenéticamente
                  animateProps.scale = 0.9;
                  rotateValue = Math.random() * 360;
                  rotateTransition = { duration: 0.1 };
              } else if (phase === 'reveal' || phase === 'rolling') {
                  // Si ya se reveló (o estamos en fase reveal), se detiene y crece un poco
                  animateProps.scale = 1.1;
                  rotateValue = 0;
                  rotateTransition = { type: 'spring', damping: 15 };
              } else {
                  // Fases posteriores
                  animateProps.scale = 1;
                  rotateValue = 0;
              }

              // Animacion Critica
              if (isCrit && isDmg && phase === 'crit_buildup') {
                  animateProps.scale = 1.5;
                  rotateValue = [0, -5, 5, -5, 0]; // Shake background
                  rotateTransition = { duration: 0.2, repeat: Infinity };
              }

              // Animación Choque (Defensa va hacia Daño)
              if (isDef && phase === 'clash_anticipation') {
                   animateProps.x = 20; 
              }
              if (isDef && phase === 'impact') {
                   animateProps.x = -200; 
                   animateProps.scale = 0.5;
                   animateProps.opacity = 0;
                   animateProps.transition = { duration: 0.4 };
              }

              // Animación Choque (Daño recibe impacto)
              if (isDmg && phase === 'impact') {
                  animateProps.scale = [1.5, 1.2, 1.8]; // Golpe
                  animateProps.x = -10; // Sacudida
                  animateProps.transition = { duration: 0.2 };
              }

              return (
                <motion.div 
                  key={die.id} 
                  initial={{ scale: 0, opacity: 0 }}
                  animate={animateProps}
                  transition={{ type: 'spring', damping: 20 }}
                  className="flex flex-col items-center gap-4 relative"
                >
                  {/* Etiqueta superior (Estática - No Gira) */}
                  <div className="flex flex-col items-center">
                      <span className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">{die.label}</span>
                      {isDmg && isCrit && phase === 'crit_buildup' && (
                          <motion.span 
                            initial={{ opacity: 0, y: 10 }} 
                            animate={{ opacity: 1, y: -20 }} 
                            className="absolute -top-10 text-yellow-300 font-black text-lg whitespace-nowrap"
                          >
                              ¡DAÑO DOBLE!
                          </motion.span>
                      )}
                  </div>

                  {/* Wrapper del Dado */}
                  <div className="relative w-28 h-28 sm:w-36 sm:h-36 flex items-center justify-center">
                    
                    {/* Fondo del Dado (Gira independientemente) */}
                    <motion.div 
                        animate={{ rotate: rotateValue }}
                        transition={rotateTransition}
                        className={`absolute inset-0 rounded-3xl border-4 ${getContainerClass(die, phase)} transition-colors duration-300 shadow-2xl`}
                    >
                        {/* Icono de fondo (Gira con el fondo) */}
                        <div className="absolute inset-0 flex items-center justify-center opacity-20 pointer-events-none">
                            {isDmg && <Swords size="60%" />}
                            {isDef && <Shield size="60%" />}
                            {(die.id.includes('hit')) && <MousePointerClick size="60%" />}
                        </div>
                    </motion.div>

                    {/* Valor Numérico (Estático - No Gira) */}
                    <span className={`text-5xl sm:text-6xl font-black font-mono z-10 relative ${isDmg && phase === 'final' ? 'text-red-100 drop-shadow-[0_0_10px_rgba(255,0,0,0.8)]' : 'text-white'}`}>
                      {showValue}
                    </span>

                    {/* Tipo de Dado esquina (Estático) */}
                    <div className="absolute top-2 left-3 text-[10px] font-bold opacity-60 tracking-wider z-20 pointer-events-none">{die.type.toUpperCase()}</div>
                    
                    {/* Indicadores de Meta y Crítico (Estáticos) */}
                    {die.target !== undefined && (
                        <div className="absolute -bottom-8 flex flex-col gap-1 items-center w-full z-20">
                             <div className="bg-slate-900/90 px-3 py-0.5 rounded-full border border-slate-600 flex items-center gap-2 shadow-lg backdrop-blur-sm">
                                <span className="text-[10px] uppercase font-bold text-slate-400">Meta</span>
                                <span className={`text-xs font-mono font-bold ${isRevealed ? (die.condition === 'under' ? (die.finalValue <= die.target ? 'text-emerald-400' : 'text-red-400') : (die.finalValue >= die.target ? 'text-emerald-400' : 'text-red-400')) : 'text-white'}`}>
                                    {die.condition === 'under' ? '≤' : '≥'} {die.target}
                                </span>
                             </div>
                             {die.critThreshold !== undefined && (
                                 <div className="bg-yellow-900/90 px-3 py-0.5 rounded-full border border-yellow-700/50 flex items-center gap-2 shadow-lg backdrop-blur-sm">
                                    <Zap size={10} className="text-yellow-400" />
                                    <span className="text-[10px] uppercase font-bold text-yellow-500">Crit</span>
                                    <span className={`text-xs font-mono font-bold ${isRevealed && die.isCrit ? 'text-yellow-300 animate-pulse' : 'text-yellow-200/80'}`}>
                                        ≤ {die.critThreshold}
                                    </span>
                                 </div>
                             )}
                        </div>
                    )}
                  </div>
                  
                  {/* Resta visual en fase final */}
                  {isDmg && phase === 'final' && defDie && !defDie.isIgnored && (
                      <motion.div 
                        initial={{ opacity: 0, y: 10 }} 
                        animate={{ opacity: 1, y: 0 }}
                        className="absolute -bottom-10 text-xs text-red-300 font-mono bg-red-900/30 px-2 py-1 rounded border border-red-900/50"
                      >
                          (Daño - Defensa)
                      </motion.div>
                  )}
                </motion.div>
              );
            })}
          </div>

          {/* Flash Effect on Impact */}
          {phase === 'impact' && (
             <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: [0, 0.8, 0] }}
                transition={{ duration: 0.3 }}
                className="absolute inset-0 bg-white z-40 pointer-events-none mix-blend-overlay"
             />
          )}

          {phase === 'final' && (
            <div className="absolute inset-0 z-50 pointer-events-auto" onClick={handleDismiss} />
          )}

        </div>
      </motion.div>
    </AnimatePresence>
  );
};

export default DiceAnimationOverlay;