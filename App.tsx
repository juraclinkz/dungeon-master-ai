import React, { useState, useRef, useEffect } from 'react';
import { LogEntry, LogType, Character, ActionType, AnimatedDie, StatusEffect, EnemyPreset, Item, DungeonState, BodyPart, StatModifier, EncounterMode } from './types';
import GameLog from './components/GameLog';
import EventGenerator from './components/EventGenerator';
import CharacterSheet from './components/CharacterSheet';
import DiceAnimationOverlay from './components/DiceAnimationOverlay';
import InventoryView from './components/InventoryView';
import DungeonGeneratorView from './components/DungeonGeneratorView';
import GameSync from './components/GameSync';
import PartySidebar from './components/PartySidebar';
import { generateCombatNarrative } from './services/geminiService';
import { p2pService, P2PData } from './services/p2pService';
import { ScrollText, Swords, Sparkles, History, Backpack, Footprints, MessageSquare, Calculator, Shield, Map, Skull, Users, Play, UserPlus, QrCode, Wifi, ChevronDown, ChevronRight, Settings, X, Crosshair, Zap, Activity, Info, Lock, ArrowLeft, Coins, Trophy, Download, KeyRound, LogIn, LogOut, ExternalLink, Clipboard, Eye, EyeOff, HelpCircle, Loader2, RotateCcw, Target, ShieldAlert, Footprints as FootIcon, BicepsFlexed, CheckCircle2, TrendingDown, User, Smartphone, BrainCircuit, Gem, ChevronLeft } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

const DEFAULT_STAT_ORDER = ['damage', 'defense', 'hit', 'critC', 'critM'];

const ENEMY_PRESETS: EnemyPreset[] = [
    { id: 'slime', name: "Limo Azul", classType: "Monstruo", hp: 10, minDmg: 1, maxDmg: 2, minDefense: 0, maxDefense: 0, hitChance: 80, avatarSeed: "Slime", goldReward: 1 },
    { id: 'goblin', name: "Goblin Explorador", classType: "Monstruo", hp: 18, minDmg: 2, maxDmg: 4, minDefense: 0, maxDefense: 1, hitChance: 65, avatarSeed: "Goblin", goldReward: 2 },
    { id: 'skeleton', name: "Esqueleto Guerrero", classType: "No-Muerto", hp: 28, minDmg: 3, maxDmg: 5, minDefense: 1, maxDefense: 3, hitChance: 55, avatarSeed: "Skeleton", goldReward: 3, avatarUrl: "https://i.imgur.com/Jenv5EU.png" },
    { id: 'mage', name: "Hechicero Oscuro", classType: "Mago", hp: 35, minDmg: 5, maxDmg: 9, minDefense: 0, maxDefense: 2, hitChance: 70, avatarSeed: "Mage", goldReward: 5 },
    { id: 'dragon', name: "Dragón Joven", classType: "Elite", hp: 55, minDmg: 6, maxDmg: 11, minDefense: 2, maxDefense: 5, hitChance: 75, avatarSeed: "Dragon", goldReward: 7 },
    { id: 'orc', name: "Gran Jefe Orco", classType: "Jefe Final", hp: 100, minDmg: 8, maxDmg: 14, minDefense: 3, maxDefense: 6, hitChance: 80, avatarSeed: "OgreWarlord", goldReward: 10 },
];

const AVATAR_PRESETS = [
    // 5 Males
    "Arthur", "Gimli", "Legolas", "Conan", "Merlin",
    // 5 Females
    "Xena", "Galadriel", "Eowyn", "Yennefer", "Triss"
];

// Probabilidades de aparición (deben sumar 1.0)
const SPAWN_WEIGHTS: Record<string, number> = {
    'slime': 0.35,    // 35%
    'goblin': 0.25,   // 25%
    'skeleton': 0.20, // 20%
    'mage': 0.15,     // 15%
    'dragon': 0.05    // 5%
};

const INITIAL_HERO: Character = {
  name: "Héroe",
  classType: "Guerrero",
  hp: 40, 
  maxHp: 40,
  minDmg: 3,
  maxDmg: 7,
  minDefense: 1,
  maxDefense: 3,
  hitChance: 65,
  critChance: 10,
  critMult: 2.0,
  customStats: [],
  activeStatuses: [],
  statOrder: [...DEFAULT_STAT_ORDER],
  inventory: [
      {
          id: 'potion-1',
          name: 'Poción Curativa',
          type: 'consumable',
          rarity: 'common',
          stats: 'Curar 5-15 HP',
          description: 'Un brebaje rojo burbujeante que cierra heridas menores.'
      }
  ],
  equipment: {},
  gold: 0
};

const INITIAL_ENEMY: Character = {
  id: ENEMY_PRESETS[0].id,
  name: ENEMY_PRESETS[0].name,
  classType: ENEMY_PRESETS[0].classType,
  hp: ENEMY_PRESETS[0].hp,
  maxHp: ENEMY_PRESETS[0].hp,
  minDmg: ENEMY_PRESETS[0].minDmg,
  maxDmg: ENEMY_PRESETS[0].maxDmg,
  minDefense: ENEMY_PRESETS[0].minDefense,
  maxDefense: ENEMY_PRESETS[0].maxDefense,
  hitChance: ENEMY_PRESETS[0].hitChance,
  critChance: 5,
  critMult: 1.5,
  customStats: [],
  activeStatuses: [],
  statOrder: [...DEFAULT_STAT_ORDER],
  inventory: [],
  equipment: {},
  gold: ENEMY_PRESETS[0].goldReward,
  avatarSeed: ENEMY_PRESETS[0].avatarSeed,
  avatarUrl: ENEMY_PRESETS[0].avatarUrl
};

interface PendingCombatChange {
  target: 'hero' | 'enemy';
  hpChange: number; 
}

type MainTab = 'combat' | 'inventory' | 'dungeon' | 'status';

const SETUP_CLASSES = ["Guerrero", "Mago", "Clérigo", "Ladrón"];

const App: React.FC = () => {
  const [hasGameStarted, setHasGameStarted] = useState<boolean>(false);
  const [playerNames, setPlayerNames] = useState<string[]>(["Jugador 1"]);
  const [setupName, setSetupName] = useState<string>("");
  const [setupClass, setSetupClass] = useState<string>("Guerrero");
  const [setupAvatarIndex, setSetupAvatarIndex] = useState<number>(0);
  
  const [showStatsEditor, setShowStatsEditor] = useState<boolean>(false);
  const [showPlayerStatsModal, setShowPlayerStatsModal] = useState<boolean>(false);
  const [showEnemyStatsModal, setShowEnemyStatsModal] = useState<boolean>(false);
  const [showMathModal, setShowMathModal] = useState<boolean>(false); 
  const [showTargetSelector, setShowTargetSelector] = useState<boolean>(false); // NEW: Target Selector State
  const [selectedBodyPart, setSelectedBodyPart] = useState<BodyPart | null>(null);

  const [isSyncOpen, setIsSyncOpen] = useState(false);
  const [p2pId, setP2pId] = useState<string | null>(null);
  const [isP2PConnected, setIsP2PConnected] = useState(false);
  const isRemoteUpdate = useRef(false);
  const [activeTab, setActiveTab] = useState<MainTab>('combat');
  const [encounterMode, setEncounterMode] = useState<EncounterMode>('exploration');
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [hero, setHero] = useState<Character>(INITIAL_HERO);
  const [enemy, setEnemy] = useState<Character>(INITIAL_ENEMY);
  const [victoryGold, setVictoryGold] = useState<number>(0);
  const [dungeonState, setDungeonState] = useState<DungeonState>({
      tiles: [],
      playerPos: { x: 0, y: 0 },
      message: "Generando mazmorra...",
      isGenerated: false
  });
  const [turnActions, setTurnActions] = useState<number>(0);
  const [actionDetails, setActionDetails] = useState<string>("");
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [lastNarrative, setLastNarrative] = useState<string | null>(null);
  const [lastMath, setLastMath] = useState<string | null>(null);
  const [showDiceOverlay, setShowDiceOverlay] = useState(false);
  const [animatedDice, setAnimatedDice] = useState<AnimatedDie[]>([]);
  const [pendingLog, setPendingLog] = useState<LogEntry | null>(null);
  const [pendingNarrative, setPendingNarrative] = useState<string | null>(null);
  const [pendingMath, setPendingMath] = useState<string | null>(null);
  const [isNarrativeReady, setIsNarrativeReady] = useState<boolean>(false); 
  const [pendingCombatChange, setPendingCombatChange] = useState<PendingCombatChange | null>(null);
  const [pendingStatusDamage, setPendingStatusDamage] = useState<{hero: number, enemy: number}>({hero: 0, enemy: 0});
  const [pendingEncounterAction, setPendingEncounterAction] = useState<'win' | 'open' | 'ignore' | null>(null);
  const [combatViewMode, setCombatViewMode] = useState<'battle' | 'logs'>('battle');
  const narrativeRef = useRef<HTMLDivElement>(null);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);

  // Force reset turnActions when entering combat to ensure Player goes first
  useEffect(() => {
    if (encounterMode === 'combat') {
        setTurnActions(0);
        setActionDetails("");
        setPendingCombatChange(null);
    }
  }, [encounterMode]);

  useEffect(() => {
    const handler = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setDeferredPrompt(null);
    }
  };

  const [availableClasses, setAvailableClasses] = useState<string[]>([
    "Guerrero", "Mago", "Pícaro", "Clérigo", "Ladrón", "Monstruo", "Jefe"
  ]);

  const addClass = (newClass: string) => {
    if (newClass && !availableClasses.includes(newClass)) {
      setAvailableClasses([...availableClasses, newClass]);
    }
  };

  const removeClass = (classToRemove: string) => {
    setAvailableClasses(availableClasses.filter(c => c !== classToRemove));
  };

  // Helper to get stats modified by statuses
  const getEffectiveStats = (char: Character) => {
      let hit = char.hitChance;
      let minD = char.minDmg;
      let maxD = char.maxDmg;
      let minDef = char.minDefense;
      let maxDef = char.maxDefense;

      char.activeStatuses.forEach(s => {
          if (s.modifiers) {
              s.modifiers.forEach(mod => {
                  if (mod.stat === 'hitChance') hit = Math.max(0, hit + mod.value);
                  if (mod.stat === 'minDmg') minD = Math.max(0, minD + mod.value);
                  if (mod.stat === 'maxDmg') maxD = Math.max(0, maxD + mod.value);
                  if (mod.stat === 'minDefense') minDef = Math.max(0, minDef + mod.value);
                  if (mod.stat === 'maxDefense') maxDef = Math.max(0, maxDef + mod.value);
              });
          }
      });
      return { hit, minD, maxD, minDef, maxDef };
  };

  const StatDisplayRow = ({ label, baseVal, effectiveVal, icon: Icon, color }: any) => {
      const isModified = baseVal !== effectiveVal;
      
      const textColor = isModified ? (effectiveVal < baseVal ? 'text-red-400' : 'text-emerald-400') : 'text-white';

      return (
        <div className="flex justify-between items-center border-b border-slate-700 pb-2">
            <span className={`flex items-center gap-2 ${color} font-mono`}>
                <Icon size={16}/> {label}
            </span>
            <div className="flex items-center gap-2">
                <span className={`${textColor} font-bold font-mono text-lg`}>{effectiveVal}</span>
                {isModified && (
                    <span className="text-slate-500 line-through text-xs font-mono">{baseVal}</span>
                )}
            </div>
        </div>
      );
  };

  const RangeStatDisplayRow = ({ label, baseMin, baseMax, effMin, effMax, icon: Icon, color }: any) => {
      const isModified = baseMin !== effMin || baseMax !== effMax;
      // Heuristic: If sum of effective is lower, it's a debuff (Red)
      const isDebuff = (effMin + effMax) < (baseMin + baseMax);
      const textColor = isModified ? (isDebuff ? 'text-red-400' : 'text-emerald-400') : 'text-white';

      return (
        <div className="flex justify-between items-center border-b border-slate-700 pb-2">
            <span className={`flex items-center gap-2 ${color} font-mono`}>
                <Icon size={16}/> {label}
            </span>
            <div className="flex items-center gap-2">
                <span className={`${textColor} font-bold font-mono text-lg`}>{effMin} - {effMax}</span>
                {isModified && (
                    <span className="text-slate-500 line-through text-xs font-mono">{baseMin} - {baseMax}</span>
                )}
            </div>
        </div>
      );
  };

  useEffect(() => {
    const initP2P = async () => {
        try {
            const id = await p2pService.initialize();
            setP2pId(id);
            p2pService.onData((data: P2PData) => {
                if (data.type === 'SYNC_STATE') {
                    isRemoteUpdate.current = true;
                    // @ts-ignore
                    const { hero: h, enemy: e, playerNames: p } = data.payload;
                    setHero(prev => ({ ...prev, ...h }));
                    setEnemy(prev => ({ ...prev, ...e }));
                    setPlayerNames(prev => p || prev);
                    setIsP2PConnected(true);
                    if (!hasGameStarted) {
                        setHasGameStarted(true);
                        setActiveTab('dungeon');
                    }
                    setTimeout(() => { isRemoteUpdate.current = false; }, 100);
                } else if (data.type === 'PLAYER_JOIN') {
                    // @ts-ignore
                    const newPlayerName = data.payload.name;
                    if (newPlayerName) {
                        setPlayerNames(prev => {
                            if (!prev.includes(newPlayerName)) {
                                return [...prev, newPlayerName];
                            }
                            return prev;
                        });
                        setLastNarrative(`¡${newPlayerName} se ha unido a la partida!`);
                    }
                }
            });
        } catch (e) {
            console.error("Failed to init P2P", e);
        }
    };
    initP2P();

    const interval = setInterval(() => {
        setIsP2PConnected(p2pService.isConnected());
    }, 2000);

    return () => clearInterval(interval);
  }, [hasGameStarted]);

  useEffect(() => {
      if (p2pId && !isRemoteUpdate.current && isP2PConnected) {
          p2pService.broadcast({
              type: 'SYNC_STATE',
              payload: { hero, enemy, playerNames }
          });
      }
  }, [hero, enemy, playerNames, p2pId, isP2PConnected]);

  useEffect(() => {
    if (lastNarrative && narrativeRef.current && activeTab === 'combat') {
      narrativeRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [lastNarrative, activeTab]);

  const changeSetupAvatar = (direction: 'prev' | 'next') => {
    setSetupAvatarIndex(prev => {
        let newIndex = direction === 'next' ? prev + 1 : prev - 1;
        if (newIndex >= AVATAR_PRESETS.length) newIndex = 0;
        if (newIndex < 0) newIndex = AVATAR_PRESETS.length - 1;
        return newIndex;
    });
  };

  const handleStartGame = async () => {
        if (!setupName.trim()) {
            alert("¡Debes elegir un nombre para tu héroe!");
            return;
        }
        
        // Capitalize first letter
        const formattedName = setupName.trim().charAt(0).toUpperCase() + setupName.trim().slice(1);
        const avatarSeed = AVATAR_PRESETS[setupAvatarIndex];
        
        setPlayerNames([formattedName]);
        setHero(prev => ({ ...prev, name: formattedName, classType: setupClass, avatarSeed }));
        setHasGameStarted(true);
        setActiveTab('dungeon');
  };

  const handleRestartGame = () => {
    if (window.confirm("¿Estás seguro de que deseas reiniciar? Perderás todo el progreso actual.")) {
        setHero({ ...INITIAL_HERO, name: hero.name, classType: hero.classType });
        setEnemy(INITIAL_ENEMY);
        setDungeonState({ tiles: [], playerPos: { x: 0, y: 0 }, message: "Generando mazmorra...", isGenerated: false });
        setLogs([]);
        setEncounterMode('exploration');
        setActiveTab('dungeon');
    }
  };

  const handleLogout = () => {
      setHasGameStarted(false);
  };

  const handleSyncData = (data: { hero: Character, enemy: Character, playerNames: string[] }) => {
    setHero(data.hero);
    setEnemy(data.enemy);
    setPlayerNames(data.playerNames);
    if (!hasGameStarted) {
        setHasGameStarted(true);
        setActiveTab('dungeon');
    }
  };

  const handleConnectP2P = (hostId: string) => {
      p2pService.connect(hostId, () => {
          p2pService.broadcast({ type: 'PLAYER_JOIN', payload: { name: hero.name } });
      });
      setIsP2PConnected(true);
  };
  
  const handleEnemyPresetChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
      const presetId = e.target.value;
      const preset = ENEMY_PRESETS.find(p => p.id === presetId);
      if (preset) {
          setEnemy(prev => ({ ...prev, ...preset, gold: preset.goldReward, avatarUrl: preset.avatarUrl }));
      }
  };

  const handleDungeonEncounter = (type: 'enemy' | 'chest' | 'boss') => {
      if (type === 'chest') {
          setEncounterMode('chest');
          setActiveTab('combat');
          setLastNarrative("Has encontrado un cofre adornado con joyas antiguas. ¿Qué deseas hacer?");
      } else {
          // Explicit reset logic to ensure Player goes first
          setTurnActions(0);
          setActionDetails("");
          setPendingLog(null);
          
          const isBoss = type === 'boss';
          // Filter out the Boss from random encounters pool
          const randomPool = ENEMY_PRESETS.filter(p => p.id !== 'orc');
          
          let preset = randomPool[0];

          if (isBoss) {
              preset = ENEMY_PRESETS.find(p => p.id === 'orc') || ENEMY_PRESETS[5];
          } else {
              // Weighted Random Selection for Normal Enemies
              const rand = Math.random();
              let cumulative = 0;
              for (const enemy of randomPool) {
                  const weight = SPAWN_WEIGHTS[enemy.id] || (1 / randomPool.length); // Fallback to even distribution if missing
                  cumulative += weight;
                  if (rand < cumulative) {
                      preset = enemy;
                      break;
                  }
              }
          }

          if (preset) {
             setEnemy(prev => ({ 
                 ...prev, 
                 ...preset, 
                 maxHp: preset.hp, 
                 hp: preset.hp, // Ensure full HP
                 gold: preset.goldReward, 
                 activeStatuses: [], 
                 avatarUrl: preset.avatarUrl 
             }));
             setEncounterMode('combat');
             setActiveTab('combat');
             setLastNarrative(isBoss ? "¡EL GRAN JEFE ORCO RUGE!" : `¡Un ${preset.name} te bloquea el paso!`);
          }
      }
  };

  const resolveEncounter = (action: 'win' | 'open' | 'ignore') => {
      setDungeonState(prev => {
          const { tiles, playerPos } = prev;
          const updatedTiles = tiles.map(t => t.x === playerPos.x && t.y === playerPos.y ? { ...t, interacted: true } : t);
          return { ...prev, tiles: updatedTiles };
      });
      if (action === 'open') {
          const goldFound = Math.floor(Math.random() * 50) + 10;
          setHero(prev => ({ ...prev, gold: prev.gold + goldFound }));
          setLastNarrative(`¡Cofre abierto! Encontraste ${goldFound} monedas de oro.`);
      }
      setEncounterMode('exploration');
      setActiveTab('dungeon');
  };

  const handleCollectLoot = () => {
      setHero(prev => ({ ...prev, gold: prev.gold + victoryGold }));
      resolveEncounter('win');
  };

  const handleItemUse = async (item: Item, targetName: string) => {
      setIsProcessing(true);
      let healAmount = 0;
      let logContent = "";
      let diceDetails = "";

      if (item.name.includes("Poción")) {
          healAmount = Math.floor(Math.random() * (10 - 3 + 1)) + 3;
          diceDetails = `Curación: ${healAmount} (3-10)`;
          logContent = `**${hero.name}** usa **${item.name}** en **${targetName}**. Recupera **${healAmount}** PV.`;
      } else {
          healAmount = 5;
          diceDetails = "Efecto fijo: 5";
          logContent = `**${hero.name}** usa **${item.name}** en **${targetName}**.`;
      }

      if (targetName === hero.name) {
          setHero(prev => ({
              ...prev,
              hp: Math.min(prev.maxHp, prev.hp + healAmount),
              inventory: prev.inventory.filter(i => i.id !== item.id)
          }));
      } else {
          setHero(prev => ({
              ...prev,
              inventory: prev.inventory.filter(i => i.id !== item.id)
          }));
      }

      const newLog: LogEntry = {
          id: crypto.randomUUID(),
          timestamp: Date.now(),
          type: LogType.COMBAT,
          title: "Objeto Utilizado",
          content: logContent,
          diceDetails: diceDetails,
          tags: ["Objeto", "Curación"]
      };
      setLogs(prev => [newLog, ...prev]);
      setLastNarrative(logContent);
      setTurnActions(prev => prev + 1);
      setActiveTab('combat');
      setIsProcessing(false);
  };

  const handleAnimationComplete = () => {
    setShowDiceOverlay(false);
    if (pendingNarrative) setLastNarrative(pendingNarrative);
    if (pendingMath) setLastMath(pendingMath);
    if (pendingLog) setLogs(prev => [pendingLog, ...prev]);
    
    let heroHpDelta = pendingStatusDamage.hero;
    let enemyHpDelta = pendingStatusDamage.enemy;

    if (pendingCombatChange) {
      if (pendingCombatChange.target === 'enemy') {
        enemyHpDelta += pendingCombatChange.hpChange;
      } else {
        if (playerNames.length === 1 || pendingLog?.inputContext?.includes(hero.name)) {
            heroHpDelta += pendingCombatChange.hpChange;
        }
      }
    }

    if (heroHpDelta !== 0) {
       const newHeroHp = Math.min(hero.maxHp, Math.max(0, hero.hp + heroHpDelta));
       setHero(prev => ({ ...prev, hp: newHeroHp }));
       if (newHeroHp <= 0) {
           setEncounterMode('death');
           setLastNarrative(`**${hero.name}** ha caído en combate. La oscuridad te envuelve...`);
           setActiveTab('combat');
       }
    }
    if (enemyHpDelta !== 0) {
       const newEnemyHp = Math.min(enemy.maxHp, Math.max(0, enemy.hp + enemyHpDelta));
       setEnemy(prev => ({ ...prev, hp: newEnemyHp }));
       if (newEnemyHp <= 0 && encounterMode === 'combat') {
           setTimeout(() => {
               setVictoryGold(enemy.gold || 1);
               setEncounterMode('victory');
           }, 1000);
       }
    }

    setPendingLog(null);
    setPendingNarrative(null);
    setPendingMath(null);
    setPendingCombatChange(null);
    setPendingStatusDamage({hero: 0, enemy: 0});
    setIsProcessing(false);

    if (pendingEncounterAction) {
        resolveEncounter(pendingEncounterAction);
        setPendingEncounterAction(null);
    }
  };

  const processStatusEffects = (char: Character): { updatedChar: Character, log: string, totalDamage: number } => {
    if (char.activeStatuses.length === 0) return { updatedChar: char, log: '', totalDamage: 0 };
    let dmg = 0;
    let logParts: string[] = [];
    const newStatuses: StatusEffect[] = [];
    char.activeStatuses.forEach(status => {
        if (status.damagePerTurn > 0) {
            dmg += status.damagePerTurn;
            logParts.push(`${status.name} inflige ${status.damagePerTurn} daño`);
        }
        if (status.duration === -1) {
            newStatuses.push(status);
        } else if (status.duration > 1) {
            newStatuses.push({ ...status, duration: status.duration - 1 });
        } else {
            logParts.push(`El efecto de ${status.name} se ha desvanecido.`);
        }
    });
    return {
        updatedChar: { ...char, activeStatuses: newStatuses },
        log: logParts.join('. '),
        totalDamage: dmg
    };
  };

  const getStatusIconType = (name: string): any => {
      const lower = name.toLowerCase();
      if (lower.includes('veneno') || lower.includes('tóxico')) return 'poison';
      if (lower.includes('fuego') || lower.includes('quemad')) return 'fire';
      if (lower.includes('hielo') || lower.includes('congel')) return 'ice';
      if (lower.includes('sangr')) return 'bleed';
      if (lower.includes('aturd')) return 'stun';
      if (lower.includes('roto') || lower.includes('quebr')) return 'broken';
      if (lower.includes('debil') || lower.includes('mutil')) return 'weak';
      if (lower.includes('lisiad') || lower.includes('cojo') || lower.includes('lento')) return 'slow';
      return 'generic';
  };

  const getAttackPrediction = (bodyPart: BodyPart | null) => {
      if (!bodyPart) return null;
      
      const heroEff = getEffectiveStats(hero);
      
      let hitMod = 0;
      let dmgMult = 1;
      let flatDmgMod = 0;
      let effectName = "";

      switch(bodyPart) {
          case 'head': hitMod = -20; dmgMult = 1.5; effectName = "Daño Masivo"; break;
          case 'legs': effectName = "Lisiar (-1 a -10% Hit)"; flatDmgMod = -1; break;
          case 'arm_r': effectName = "Debilitar (-1 Dmg 50%)"; flatDmgMod = -1; break;
          case 'arm_l': effectName = "Rompeguardia (-1 Def 50%)"; flatDmgMod = -1; break;
          case 'torso': effectName = "Estándar"; break;
      }
      
      const finalHit = Math.max(5, heroEff.hit + hitMod);
      const minDmg = Math.max(0, Math.floor(heroEff.minD * dmgMult) + flatDmgMod);
      const maxDmg = Math.max(0, Math.floor(heroEff.maxD * dmgMult) + flatDmgMod);

      return { finalHit, minDmg, maxDmg, effectName, dmgMult, flatDmgMod };
  };

  const getTacticalInsight = (bodyPart: BodyPart | null) => {
      if (!bodyPart) return null;
      const enemyEff = getEffectiveStats(enemy);

      switch(bodyPart) {
          case 'legs': 
              return { label: 'Precisión Enemiga', value: `${enemyEff.hit}%`, change: '-1d10%', icon: Crosshair };
          case 'arm_l': 
              return { label: 'Defensa Enemiga', value: `${enemyEff.minDef}-${enemyEff.maxDef}`, change: '-1 (Min/Max)', icon: Shield };
          case 'arm_r': 
              return { label: 'Daño Enemigo', value: `${enemyEff.minD}-${enemyEff.maxD}`, change: '-1 (Min/Max)', icon: Swords };
          default:
              return null;
      }
  };

  const executeAttack = async (bodyPart: BodyPart = 'torso') => {
    setShowTargetSelector(false);
    setSelectedBodyPart(null); // Reset selection
    
    // Process pre-turn status effects
    const heroStatusResult = processStatusEffects(hero);
    const enemyStatusResult = processStatusEffects(enemy);
    let currentHero = heroStatusResult.updatedChar;
    let currentEnemy = enemyStatusResult.updatedChar;

    setPendingStatusDamage({
        hero: -heroStatusResult.totalDamage,
        enemy: -enemyStatusResult.totalDamage
    });
    setHero(prev => ({ ...prev, activeStatuses: heroStatusResult.updatedChar.activeStatuses }));
    setEnemy(prev => ({ ...prev, activeStatuses: enemyStatusResult.updatedChar.activeStatuses }));

    let statusLogContext = "";
    if (heroStatusResult.log) statusLogContext += `[HERO STATUS]: ${heroStatusResult.log}. `;
    if (enemyStatusResult.log) statusLogContext += `[ENEMY STATUS]: ${enemyStatusResult.log}. `;

    // Prepare attack variables
    let hitMod = 0;
    let dmgMult = 1;
    let statusToApply: StatusEffect | null = null;
    let partName = "Torso";
    let debuffRoll = 0; // For arm_r, arm_l, and legs
    let flatDmgMod = 0;

    const nextActions = turnActions + 1;
    setTurnActions(nextActions);
    
    // Calculate effective stats (MOVED UP to use in logic)
    const heroEff = getEffectiveStats(currentHero);
    const enemyEff = getEffectiveStats(currentEnemy);

    // Targeted Attack Logic
    switch(bodyPart) {
        case 'head':
            partName = "Cabeza";
            hitMod = -20;
            dmgMult = 1.5;
            break;
        case 'legs':
            partName = "Piernas";
            flatDmgMod = -1;
            debuffRoll = Math.floor(Math.random() * 10) + 1; // 1-10
            statusToApply = {
                id: crypto.randomUUID(),
                name: "Pierna Herida",
                damagePerTurn: 0,
                duration: -1,
                iconType: 'slow',
                modifiers: [{ stat: 'hitChance', value: -debuffRoll }]
            };
            break;
        case 'arm_r':
            partName = "Brazo Armado";
            flatDmgMod = -1;
            debuffRoll = Math.floor(Math.random() * 6) + 1; // 1-6
            {
                const wantsMin = debuffRoll <= 3; // 1-3 = Min, 4-6 = Max
                const cMin = enemyEff.minD; 
                const cMax = enemyEff.maxD;
                let finalStat: 'minDmg' | 'maxDmg' | null = null;
                let preferred = wantsMin ? 'minDmg' : 'maxDmg';

                // Fallback logic if value is 0
                if (preferred === 'minDmg' && cMin <= 0) preferred = 'maxDmg';
                else if (preferred === 'maxDmg' && cMax <= 0) preferred = 'minDmg';

                // Consistency Logic: Max >= Min
                if (preferred === 'maxDmg') {
                    if (cMax - 1 < cMin) {
                        preferred = 'minDmg';
                    }
                }
                
                // Final check to prevent negatives
                if (preferred === 'minDmg' && cMin > 0) finalStat = 'minDmg';
                else if (preferred === 'maxDmg' && cMax > 0) finalStat = 'maxDmg';

                if (finalStat) {
                    statusToApply = {
                        id: crypto.randomUUID(),
                        name: "Brazo Debilitado",
                        damagePerTurn: 0,
                        duration: -1,
                        iconType: 'weak',
                        modifiers: [{ stat: finalStat, value: -1 }]
                    };
                }
            }
            break;
        case 'arm_l':
            partName = "Brazo Escudo";
            flatDmgMod = -1;
            debuffRoll = Math.floor(Math.random() * 6) + 1; // 1-6
            {
                const wantsMin = debuffRoll <= 3; 
                const cMin = enemyEff.minDef; 
                const cMax = enemyEff.maxDef;
                let finalStat: 'minDefense' | 'maxDefense' | null = null;
                let preferred = wantsMin ? 'minDefense' : 'maxDefense';

                // Fallback logic if value is 0
                if (preferred === 'minDefense' && cMin <= 0) preferred = 'maxDefense';
                else if (preferred === 'maxDefense' && cMax <= 0) preferred = 'minDefense';

                // Consistency Logic: Max >= Min
                if (preferred === 'maxDefense') {
                    if (cMax - 1 < cMin) {
                        preferred = 'minDefense';
                    }
                }
                
                // Final check to prevent negatives
                if (preferred === 'minDefense' && cMin > 0) finalStat = 'minDefense';
                else if (preferred === 'maxDefense' && cMax > 0) finalStat = 'maxDefense';

                if (finalStat) {
                    statusToApply = {
                        id: crypto.randomUUID(),
                        name: "Guardia Rota",
                        damagePerTurn: 0,
                        duration: -1,
                        iconType: 'broken',
                        modifiers: [{ stat: finalStat, value: -1 }]
                    };
                }
            }
            break;
    }

    const d100 = Math.floor(Math.random() * 100) + 1;
    const finalHitChance = Math.max(5, heroEff.hit + hitMod);
    const hitSuccess = d100 <= finalHitChance;
    const isCrit = d100 <= currentHero.critChance;
    
    let rawDmg = 0;
    let finalDmg = 0;
    let calculatedDmg = 0;
    let defenseVal = 0;
    let mathExplanation = "";
    let breakdown = "";
    const diceForAnimation: AnimatedDie[] = [];

    if (hitSuccess) {
        calculatedDmg = Math.floor(Math.random() * (heroEff.maxD - heroEff.minD + 1)) + heroEff.minD;
        
        // Calculate intermediate damage (Multipliers)
        let intermediateDmg = Math.floor(calculatedDmg * dmgMult);
        
        mathExplanation = `[${partName}] Base: ${calculatedDmg}`;
        
        if (dmgMult !== 1) mathExplanation += ` x ${dmgMult}(Zona) = ${intermediateDmg}`;
        
        if (isCrit) {
            const preCrit = intermediateDmg;
            intermediateDmg = Math.floor(intermediateDmg * currentHero.critMult);
            mathExplanation += `\nCrítico: ${preCrit} x ${currentHero.critMult} = ${intermediateDmg}`;
        }

        // Apply Flat Mod (Penalty)
        rawDmg = intermediateDmg + flatDmgMod;
        if (flatDmgMod !== 0) mathExplanation += ` ${flatDmgMod}(Flat) = ${rawDmg}`;
        
        defenseVal = Math.floor(Math.random() * (enemyEff.maxDef - enemyEff.minDef + 1)) + enemyEff.minDef;
        finalDmg = Math.max(0, rawDmg - defenseVal);
        
        mathExplanation += `\nDefensa: -${defenseVal}\nTOTAL: ${finalDmg}`;
        
        setPendingCombatChange({ target: 'enemy', hpChange: -finalDmg });

        // Apply specific Status Effect if hit
        if (statusToApply) {
            // NOTE: We update both state and local variable 'currentEnemy'
            const newStatuses = [...currentEnemy.activeStatuses, statusToApply];
            setEnemy(prev => ({ ...prev, activeStatuses: newStatuses }));
            currentEnemy = { ...currentEnemy, activeStatuses: newStatuses };
            mathExplanation += `\n+ EFX: ${statusToApply.name}`;
        }
    } else {
        mathExplanation = `Fallo: ${d100} > ${finalHitChance}% (Req)`;
    }

    // Prepare Animation & Logs
    breakdown = hitSuccess 
        ? `Impacto ${partName} (${d100}) | Daño: ${rawDmg} - Def: ${defenseVal} = ${finalDmg}`
        : `Fallo ${partName}: ${d100} (Req: ${finalHitChance})`;

    diceForAnimation.push({ 
        id: 'hit-roll', 
        type: 'd100', 
        finalValue: d100, 
        label: `Acierto (1-100)`, 
        target: finalHitChance, 
        condition: 'under', 
        isCrit, 
        critThreshold: currentHero.critChance 
    });
    // Flag the damage die as critical if isCrit is true, so the animation knows to emphasize it
    diceForAnimation.push({ id: 'dmg-roll', type: 'd20', finalValue: rawDmg || 0, label: `Daño`, isIgnored: !hitSuccess, isCrit });
    diceForAnimation.push({ id: 'def-roll', type: 'd6', finalValue: defenseVal || 0, label: `Defensa`, isIgnored: !hitSuccess });
    
    // Animation for random debuff on arm_r/arm_l
    if (hitSuccess && (bodyPart === 'arm_r' || bodyPart === 'arm_l')) {
        const isMin = debuffRoll <= 3;
        diceForAnimation.push({ id: 'debuff-roll', type: 'd6', finalValue: debuffRoll, label: isMin ? 'Debilita Mín (1-3)' : 'Debilita Máx (4-6)', condition: 'over', target: 0 }); 
    }
    
    // Animation for leg debuff
    if (hitSuccess && bodyPart === 'legs') {
         diceForAnimation.push({ id: 'debuff-roll', type: 'd10', finalValue: debuffRoll, label: 'Precisión (-% Hit)', condition: 'over', target: 0 });
    }

    setPendingMath(mathExplanation);
    setAnimatedDice(diceForAnimation);
    setShowDiceOverlay(true);

    try {
        const context = `${statusLogContext} Ataque dirigido a ${partName}. ${statusToApply && hitSuccess ? `Se aplicó ${statusToApply.name}.` : ''} ${actionDetails}`;
        const narrative = await generateCombatNarrative('ATACAR', context, { total: d100, breakdown, hitSuccess, damageTotal: finalDmg, defenseTotal: defenseVal }, currentHero, currentEnemy);
        setPendingNarrative(narrative);
        setPendingLog({
          id: crypto.randomUUID(), timestamp: Date.now(), type: LogType.COMBAT, title: `Ataque a ${partName}`, content: narrative, inputContext: context, rollTotal: d100, diceDetails: breakdown, tags: ["Ataque", partName]
        });
        setIsNarrativeReady(true);
    } catch (e) {
        setPendingNarrative("Error narrativo.");
        setIsNarrativeReady(true);
    }
    setActionDetails("");
  };

  const handleAction = async (type: ActionType) => {
    if (isProcessing) return;
    setIsProcessing(true);
    setIsNarrativeReady(false);
    setPendingCombatChange(null);
    setPendingMath(null);
    setPendingStatusDamage({hero: 0, enemy: 0});
    setLastNarrative("Concentrando energía..."); 
    setLastMath(null);

    if (type === 'ATACAR') {
        setShowTargetSelector(true);
        setSelectedBodyPart(null); // Reset on open
        return; // Wait for selection
    }

    if (type === 'OBJETO') {
        setActiveTab('inventory');
        setIsProcessing(false);
        setLastNarrative("Abriendo mochila...");
        return; 
    }

    // Standard processing for non-targeted actions (Huir, Enemy Attack, etc)
    const heroStatusResult = processStatusEffects(hero);
    const enemyStatusResult = processStatusEffects(enemy);
    let currentHero = heroStatusResult.updatedChar;
    let currentEnemy = enemyStatusResult.updatedChar;

    setPendingStatusDamage({ hero: -heroStatusResult.totalDamage, enemy: -enemyStatusResult.totalDamage });
    setHero(prev => ({ ...prev, activeStatuses: heroStatusResult.updatedChar.activeStatuses }));
    setEnemy(prev => ({ ...prev, activeStatuses: enemyStatusResult.updatedChar.activeStatuses }));
    
    let statusLogContext = "";
    if (heroStatusResult.log) statusLogContext += `[HERO STATUS]: ${heroStatusResult.log}. `;
    if (enemyStatusResult.log) statusLogContext += `[ENEMY STATUS]: ${enemyStatusResult.log}. `;

    const nextActions = turnActions + 1;
    if (type !== 'ATAQUE_ENEMIGO') setTurnActions(nextActions);

    let rollTotal = 0;
    let breakdown = "";
    let mathExplanation = "";
    const diceForAnimation: AnimatedDie[] = [];
    let hitSuccess: boolean | undefined = undefined;
    let damageTotal: number | undefined = undefined;
    let defenseTotal: number | undefined = undefined;

    // Use Effective Stats for calculations
    const heroEff = getEffectiveStats(currentHero);
    const enemyEff = getEffectiveStats(currentEnemy);

    if (type === 'HUIR') {
        const d20 = Math.floor(Math.random() * 20) + 1;
        // 75% Chance Logic (15 winning numbers out of 20)
        // Rolling 6,7...20 is success. 1,2,3,4,5 is failure.
        const success = d20 >= 6;
        rollTotal = d20;
        breakdown = `Agilidad: D20(${d20})`;
        mathExplanation = `Agilidad: D20 (${d20}) vs Dificultad 6 (75% Éxito)`;
        diceForAnimation.push({ id: 'flee-roll', type: 'd20', finalValue: d20, label: 'Agilidad (1-20)', target: 6, condition: 'over' });
        
        if (success) {
            setPendingEncounterAction('ignore');
        }

        setPendingMath(mathExplanation);
        setAnimatedDice(diceForAnimation);
        setShowDiceOverlay(true);
        
        try {
            const context = `${statusLogContext} Intento de huida. Resultado: ${success ? "EXITO" : "FALLO"}.`;
            const narrative = await generateCombatNarrative('HUIR', context, { total: d20, breakdown, hitSuccess: success }, currentHero, currentEnemy);
            setPendingNarrative(narrative);
            setPendingLog({
                id: crypto.randomUUID(), timestamp: Date.now(), type: LogType.COMBAT, title: 'Intento de Huida', content: narrative, inputContext: context, rollTotal: d20, diceDetails: breakdown, tags: ["Huida"]
            });
            setIsNarrativeReady(true);
        } catch(e) { 
             setPendingNarrative(success ? "Logras escapar por los pelos." : "No logras escapar, el enemigo te bloquea.");
             setIsNarrativeReady(true); 
        }
    } 
    else if (type === 'ATAQUE_ENEMIGO') {
        setTurnActions(0);
        const numPlayers = Math.max(playerNames.length, 1);
        const targetDieSize = Math.max(numPlayers, 6);
        const targetRoll = Math.floor(Math.random() * targetDieSize) + 1;
        const targetIndex = (targetRoll - 1) % numPlayers;
        const targetName = playerNames[targetIndex] || hero.name;
        const finalActionDetails = `[IA] Dado de Objetivo d${targetDieSize}(${targetRoll}) -> ¡${targetName} seleccionado! ` + (actionDetails || "");

        const d100 = Math.floor(Math.random() * 100) + 1;
        hitSuccess = d100 <= enemyEff.hit;
        const isCrit = d100 <= currentEnemy.critChance;
        let rawDmg = 0;
        let finalDmg = 0;
        let calculatedDmg = 0;
        let defenseVal = 0;

        if (hitSuccess) {
            calculatedDmg = Math.floor(Math.random() * (enemyEff.maxD - enemyEff.minD + 1)) + enemyEff.minD;
            rawDmg = calculatedDmg;
            
            mathExplanation = `Daño Base: ${calculatedDmg}`;
            
            if (isCrit) {
                const preCrit = rawDmg;
                rawDmg = Math.floor(rawDmg * currentEnemy.critMult);
                mathExplanation += `\nCrítico: ${preCrit} x ${currentEnemy.critMult} = ${rawDmg}`;
            } else {
                mathExplanation += ` (Normal)`;
            }

            defenseVal = Math.floor(Math.random() * (heroEff.maxDef - heroEff.minDef + 1)) + heroEff.minDef;
            finalDmg = Math.max(0, rawDmg - defenseVal);
            
            mathExplanation += `\nDefensa: -${defenseVal}\nTOTAL: ${finalDmg}`;
            
            damageTotal = finalDmg;
            defenseTotal = defenseVal;
            if (numPlayers === 1 || targetName === hero.name) {
                setPendingCombatChange({ target: 'hero', hpChange: -finalDmg });
            }
        } else {
            mathExplanation = `Fallo del Enemigo: ${d100} > ${enemyEff.hit}%`;
        }
        rollTotal = d100;
        breakdown = hitSuccess ? `Impacto (${d100}) | Daño: ${rawDmg} - Def: ${defenseVal} = ${finalDmg}` : `Fallo (${d100})`;
        
         diceForAnimation.push({ id: 'target-roll', type: 'd6', finalValue: targetRoll, label: `Obj: ${targetName}` });
         diceForAnimation.push({ 
             id: 'enemy-hit-roll', 
             type: 'd100', 
             finalValue: d100, 
             label: `Ataque`, 
             target: enemyEff.hit, 
             condition: 'under', 
             isCrit,
             critThreshold: currentEnemy.critChance 
         });
         // Important: Pass isCrit flag to the damage die so the animation knows to emphasize it
         diceForAnimation.push({ id: 'enemy-dmg-roll', type: 'd20', finalValue: rawDmg || 0, label: `Daño`, isIgnored: !hitSuccess, isCrit });
         diceForAnimation.push({ id: 'hero-def-roll', type: 'd6', finalValue: defenseVal || 0, label: `Defensa`, isIgnored: !hitSuccess });

         setPendingMath(mathExplanation);
         setAnimatedDice(diceForAnimation);
         setShowDiceOverlay(true);
         try {
            const combinedContext = `${statusLogContext} ${finalActionDetails}`;
            const narrative = await generateCombatNarrative(type, combinedContext, { total: rollTotal, breakdown, hitSuccess, damageTotal, defenseTotal }, currentHero, currentEnemy);
            setPendingNarrative(narrative);
            setPendingLog({ id: crypto.randomUUID(), timestamp: Date.now(), type: LogType.COMBAT, title: 'Ataque Enemigo', content: narrative, inputContext: finalActionDetails, rollTotal, diceDetails: breakdown, tags: ["Turno", 'Enemigo'] });
            setIsNarrativeReady(true);
         } catch(e) { setPendingNarrative("Error narrativo."); setIsNarrativeReady(true); }
    }
    setActionDetails("");
  };

  const handleEventGenerated = (log: LogEntry) => {
    setLogs(prev => [log, ...prev]);
    setLastNarrative(log.content);
    setLastMath(null);
  };

  const isEnemyTurn = turnActions >= playerNames.length;
  const dqBoxStyle = "bg-blue-950/95 border-[3px] border-double border-white rounded-md shadow-2xl relative overflow-hidden";
  const dqTextStyle = "font-mono text-white text-shadow-sm";
  const dqSelectedStyle = "before:content-['▶'] before:absolute before:left-2 before:animate-pulse text-yellow-300";

  // Calculate effective stats for render
  const heroEffective = getEffectiveStats(hero);
  const enemyEffective = getEffectiveStats(enemy);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 flex flex-col relative">
      <DiceAnimationOverlay 
        isVisible={showDiceOverlay} 
        dice={animatedDice} 
        onComplete={handleAnimationComplete} 
        isResultReady={isNarrativeReady} 
      />

      <GameSync 
        isOpen={isSyncOpen} 
        onClose={() => setIsSyncOpen(false)} 
        currentState={{ hero, enemy, playerNames }}
        onSync={handleSyncData}
        onConnectP2P={handleConnectP2P}
        p2pId={p2pId}
        isConnected={isP2PConnected}
      />

      {/* Target Selector Modal */}
      {showTargetSelector && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="bg-slate-900 border-2 border-slate-700 rounded-xl p-4 sm:p-6 w-full max-w-2xl shadow-2xl relative overflow-hidden flex flex-col items-center max-h-[95vh] overflow-y-auto">
                 <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-indigo-900/10 via-slate-900 to-slate-900 pointer-events-none" />
                 <button onClick={() => { setShowTargetSelector(false); setIsProcessing(false); setSelectedBodyPart(null); }} className="absolute top-2 right-2 text-slate-500 hover:text-white z-20"><X size={24} /></button>
                 
                 <h3 className="text-2xl font-bold fantasy-font text-indigo-400 mb-1 flex items-center gap-2 relative z-10"><Target /> ZONA DE IMPACTO</h3>
                 <p className="text-slate-400 text-xs text-center mb-6 relative z-10">Selecciona una parte y confirma para atacar.</p>

                 <div className="grid grid-cols-3 gap-3 w-full max-w-sm mb-6 z-10 relative">
                     {/* Head (Top Center) */}
                     <button onClick={() => setSelectedBodyPart('head')} className={`col-start-2 h-24 rounded-xl border-2 flex flex-col items-center justify-center transition-all ${selectedBodyPart === 'head' ? 'bg-red-900/40 border-red-500 scale-105 shadow-[0_0_15px_rgba(239,68,68,0.4)]' : 'bg-slate-800 border-slate-600 hover:border-slate-400 hover:bg-slate-700'}`}>
                         <Skull size={32} className={`${selectedBodyPart === 'head' ? 'text-red-400' : 'text-slate-400'}`} />
                         <span className={`text-xs font-bold uppercase mt-2 ${selectedBodyPart === 'head' ? 'text-white' : 'text-slate-400'}`}>Cabeza</span>
                     </button>

                     {/* Left Arm (Shield) */}
                     <button onClick={() => setSelectedBodyPart('arm_l')} className={`col-start-1 h-24 rounded-xl border-2 flex flex-col items-center justify-center transition-all ${selectedBodyPart === 'arm_l' ? 'bg-blue-900/40 border-blue-500 scale-105 shadow-[0_0_15px_rgba(59,130,246,0.4)]' : 'bg-slate-800 border-slate-600 hover:border-slate-400 hover:bg-slate-700'}`}>
                         <ShieldAlert size={32} className={`${selectedBodyPart === 'arm_l' ? 'text-blue-400' : 'text-slate-400'}`} />
                         <span className={`text-xs font-bold uppercase mt-2 ${selectedBodyPart === 'arm_l' ? 'text-white' : 'text-slate-400'}`}>Escudo</span>
                     </button>

                     {/* Torso */}
                     <button onClick={() => setSelectedBodyPart('torso')} className={`col-start-2 h-24 rounded-xl border-2 flex flex-col items-center justify-center transition-all ${selectedBodyPart === 'torso' ? 'bg-amber-900/40 border-amber-500 scale-105 shadow-[0_0_15px_rgba(245,158,11,0.4)]' : 'bg-slate-800 border-slate-600 hover:border-slate-400 hover:bg-slate-700'}`}>
                         <Target size={40} className={`${selectedBodyPart === 'torso' ? 'text-amber-400' : 'text-slate-400'}`} />
                         <span className={`text-xs font-bold uppercase mt-2 ${selectedBodyPart === 'torso' ? 'text-white' : 'text-slate-400'}`}>Torso</span>
                     </button>

                     {/* Right Arm (Weapon) */}
                     <button onClick={() => setSelectedBodyPart('arm_r')} className={`col-start-3 h-24 rounded-xl border-2 flex flex-col items-center justify-center transition-all ${selectedBodyPart === 'arm_r' ? 'bg-orange-900/40 border-orange-500 scale-105 shadow-[0_0_15px_rgba(249,115,22,0.4)]' : 'bg-slate-800 border-slate-600 hover:border-slate-400 hover:bg-slate-700'}`}>
                         <BicepsFlexed size={32} className={`${selectedBodyPart === 'arm_r' ? 'text-orange-400' : 'text-slate-400'}`} />
                         <span className={`text-xs font-bold uppercase mt-2 ${selectedBodyPart === 'arm_r' ? 'text-white' : 'text-slate-400'}`}>Arma</span>
                     </button>

                     {/* Legs */}
                     <button onClick={() => setSelectedBodyPart('legs')} className={`col-span-3 h-20 rounded-xl border-2 flex flex-row items-center justify-center gap-4 transition-all ${selectedBodyPart === 'legs' ? 'bg-emerald-900/40 border-emerald-500 scale-105 shadow-[0_0_15px_rgba(16,185,129,0.4)]' : 'bg-slate-800 border-slate-600 hover:border-slate-400 hover:bg-slate-700'}`}>
                         <FootIcon size={32} className={`${selectedBodyPart === 'legs' ? 'text-emerald-400' : 'text-slate-400'}`} />
                         <span className={`text-sm font-bold uppercase ${selectedBodyPart === 'legs' ? 'text-white' : 'text-slate-400'}`}>Piernas</span>
                     </button>
                 </div>

                 {/* Math Preview Panel */}
                 <div className="w-full bg-black/40 border border-slate-700 rounded-lg p-5 mb-4 relative z-10 min-h-[100px] flex flex-col justify-center">
                     {selectedBodyPart ? (
                         <>
                            <div className="flex justify-between items-start mb-4 border-b border-slate-700 pb-2 gap-2">
                                <span className="text-sm font-bold text-white uppercase tracking-wider shrink-0">Predicción</span>
                                <span className="text-xs text-indigo-400 font-mono text-right max-w-[60%] leading-tight break-words">{getAttackPrediction(selectedBodyPart)?.effectName}</span>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <div className="text-[10px] text-slate-500 uppercase font-bold">Prob. Acierto</div>
                                    <div className={`text-xl font-mono font-bold ${getAttackPrediction(selectedBodyPart)!.finalHit < 50 ? 'text-red-400' : 'text-emerald-400'}`}>
                                        {getAttackPrediction(selectedBodyPart)?.finalHit}%
                                    </div>
                                </div>
                                <div>
                                    <div className="text-[10px] text-slate-500 uppercase font-bold">Daño Estimado</div>
                                    <div className="text-xl font-mono font-bold text-amber-400">
                                        {getAttackPrediction(selectedBodyPart)?.minDmg}-{getAttackPrediction(selectedBodyPart)?.maxDmg}
                                        {getAttackPrediction(selectedBodyPart)!.dmgMult > 1 && <span className="text-xs ml-1 text-slate-400">(x{getAttackPrediction(selectedBodyPart)?.dmgMult})</span>}
                                        {getAttackPrediction(selectedBodyPart)!.flatDmgMod < 0 && <span className="text-xs ml-1 text-red-400">({getAttackPrediction(selectedBodyPart)?.flatDmgMod})</span>}
                                    </div>
                                </div>
                            </div>
                            {getTacticalInsight(selectedBodyPart) && (
                                <div className="mt-4 pt-3 border-t border-slate-700/50 flex flex-col">
                                    <div className="text-[9px] text-slate-500 uppercase font-bold mb-1 flex items-center gap-1"><TrendingDown size={10} /> Impacto Táctico</div>
                                    <div className="flex flex-row items-center justify-between text-xs bg-red-900/10 p-3 rounded border border-red-900/30 gap-2">
                                        <span className="text-slate-300 flex flex-wrap items-center gap-2 flex-1">
                                            {React.createElement(getTacticalInsight(selectedBodyPart)!.icon, { size: 14, className: 'text-red-400 shrink-0' })}
                                            <span className="font-medium">{getTacticalInsight(selectedBodyPart)?.label}:</span> 
                                            <span className="text-white font-mono bg-black/30 px-1 rounded">{getTacticalInsight(selectedBodyPart)?.value}</span>
                                        </span>
                                        <span className="text-red-400 font-bold font-mono text-right shrink-0 whitespace-nowrap">{getTacticalInsight(selectedBodyPart)?.change}</span>
                                    </div>
                                </div>
                            )}
                         </>
                     ) : (
                         <div className="text-center text-slate-500 italic text-sm">Selecciona una zona para ver las probabilidades...</div>
                     )}
                 </div>

                 <button 
                    disabled={!selectedBodyPart}
                    onClick={() => selectedBodyPart && executeAttack(selectedBodyPart)}
                    className="w-full py-4 bg-red-600 hover:bg-red-500 disabled:bg-slate-800 disabled:text-slate-500 text-white font-bold text-lg rounded-xl shadow-lg shadow-red-900/30 transition-all active:scale-95 flex items-center justify-center gap-2 relative z-10"
                 >
                    {selectedBodyPart ? <><Swords size={24} /> CONFIRMAR ATAQUE</> : "SELECCIONA OBJETIVO"}
                 </button>
            </div>
        </div>
      )}

        {!hasGameStarted ? (
            <div className="min-h-screen bg-slate-950 text-slate-200 flex flex-col items-center justify-center p-6 relative overflow-hidden">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-indigo-900/20 via-slate-950 to-slate-950 pointer-events-none" />
                <div className="max-w-md w-full bg-slate-900/80 p-8 rounded-2xl border border-slate-700 shadow-2xl relative z-10 backdrop-blur-sm animate-in fade-in zoom-in duration-500">
                    <div className="text-center mb-8">
                        <Swords className="w-12 h-12 text-amber-500 mx-auto mb-4" />
                        <h1 className="text-3xl font-bold fantasy-font text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-red-400">
                            Dungeon Master
                        </h1>
                        <p className="text-slate-400 mt-2 text-sm">Crea tu héroe y entra en la mazmorra.</p>
                    </div>
                    <div className="space-y-6">
                        {deferredPrompt && (
                            <button onClick={handleInstallClick} className="w-full py-3 mb-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold flex items-center justify-center gap-2 shadow-lg shadow-blue-900/20">
                                <Download size={18} /> Instalar App
                            </button>
                        )}
                        <div className="border-t border-slate-800 my-4" />
                        
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Nombre del Héroe</label>
                            <input type="text" value={setupName} onChange={(e) => setSetupName(e.target.value)} placeholder="Ej: Aragorn" className="w-full bg-slate-950 border border-slate-700 rounded-lg px-4 py-3 text-white focus:border-amber-500 focus:outline-none transition-colors" />
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Apariencia</label>
                            <div className="flex items-center justify-center gap-4 bg-slate-950 p-4 rounded-xl border border-slate-800">
                                <button onClick={() => changeSetupAvatar('prev')} className="p-2 bg-slate-800 hover:bg-slate-700 rounded-full text-slate-300 transition-colors">
                                    <ChevronLeft size={20} />
                                </button>
                                <div className="w-20 h-20 rounded-lg overflow-hidden border-2 border-amber-500/50 shadow-lg bg-black">
                                    <img 
                                        src={`https://api.dicebear.com/9.x/pixel-art/svg?seed=${AVATAR_PRESETS[setupAvatarIndex]}&backgroundColor=b45309`}
                                        alt="Avatar" 
                                        className="w-full h-full object-cover rendering-pixelated"
                                        style={{ imageRendering: 'pixelated' }}
                                    />
                                </div>
                                <button onClick={() => changeSetupAvatar('next')} className="p-2 bg-slate-800 hover:bg-slate-700 rounded-full text-slate-300 transition-colors">
                                    <ChevronRight size={20} />
                                </button>
                            </div>
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Clase</label>
                            <div className="grid grid-cols-2 gap-2">
                                {SETUP_CLASSES.map((cls) => (
                                    <button key={cls} onClick={() => setSetupClass(cls)} className={`py-2 px-3 rounded-lg text-sm font-bold border transition-all ${setupClass === cls ? 'bg-amber-900/50 border-amber-500 text-amber-200' : 'bg-slate-950 border-slate-700 text-slate-400 hover:bg-slate-800'}`}>
                                        {cls}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="flex gap-3 mt-4">
                            <button 
                                onClick={handleStartGame} 
                                className="flex-1 bg-gradient-to-r from-amber-600 to-red-600 hover:from-amber-500 hover:to-red-500 text-white font-bold py-4 rounded-xl shadow-lg flex flex-col items-center justify-center gap-1 transition-transform active:scale-95 shadow-red-900/30"
                            >
                                <div className="flex items-center gap-2"><User size={20} fill="currentColor" /> JUGAR</div>
                                <span className="text-[10px] opacity-70 font-normal">Modo Offline</span>
                            </button>
                            
                            <button 
                                onClick={() => setIsSyncOpen(true)}
                                className="flex-none px-4 rounded-xl bg-slate-800 border border-slate-700 hover:bg-slate-700 text-emerald-400 flex flex-col items-center justify-center gap-1 shadow-lg"
                                title="Multijugador / Sincronizar"
                            >
                                <Wifi size={20} />
                                <span className="text-[10px] font-bold">MULTI</span>
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        ) : (
            <>
              <header className="bg-slate-900 border-b border-slate-800 sticky top-0 z-40 shadow-2xl shrink-0">
                <div className="max-w-7xl mx-auto px-2 sm:px-4 py-3 flex flex-col sm:flex-row items-center justify-between gap-3">
                  <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-start">
                    <div className="flex items-center gap-3">
                        <div className="bg-gradient-to-br from-amber-500 to-red-600 p-2 rounded-lg shadow-lg"><Swords className="w-5 h-5 text-white" /></div>
                        <h1 className="text-xl sm:text-2xl font-bold fantasy-font text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-red-400">Dungeon Master (Offline)</h1>
                    </div>
                    <div className="flex items-center gap-2">
                        <button onClick={() => setIsSyncOpen(true)} className={`flex items-center gap-2 px-3 py-1.5 rounded border text-xs transition-colors ${isP2PConnected ? 'bg-emerald-900/40 border-emerald-500/50 text-emerald-400 animate-pulse' : 'bg-slate-800 hover:bg-slate-700 border-slate-600 text-amber-400'}`}>
                            {isP2PConnected ? <Wifi size={14} /> : <QrCode size={14} />} <span className="hidden sm:inline">{isP2PConnected ? 'Enlazado' : 'Sincronizar'}</span>
                        </button>
                        <button onClick={handleLogout} className="p-1.5 rounded bg-slate-800 border border-slate-700 text-slate-400 hover:text-red-400 transition-colors" title="Salir">
                            <LogOut size={14} />
                        </button>
                    </div>
                  </div>
                  <nav className="flex bg-slate-800 p-1 rounded-lg w-full sm:w-auto justify-center overflow-x-auto no-scrollbar">
                     <button onClick={() => setActiveTab('dungeon')} className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 rounded-md text-sm font-bold transition-colors whitespace-nowrap ${activeTab === 'dungeon' ? 'bg-slate-700 text-purple-400 shadow-sm' : 'text-slate-500 hover:text-slate-300'}`}>
                        <Map size={16} /> <span className="hidden sm:inline">Mazmorra</span>
                     </button>
                     <button onClick={() => setActiveTab('combat')} className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 rounded-md text-sm font-bold transition-colors whitespace-nowrap ${activeTab === 'combat' ? 'bg-slate-700 text-amber-400 shadow-sm' : 'text-slate-500 hover:text-slate-300'}`}>
                        <Swords size={16} /> <span className="hidden sm:inline">Vista General</span>
                     </button>
                     <button onClick={() => setActiveTab('inventory')} className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 rounded-md text-sm font-bold transition-colors whitespace-nowrap ${activeTab === 'inventory' ? 'bg-slate-700 text-emerald-400 shadow-sm' : 'text-slate-500 hover:text-slate-300'}`}>
                        <Backpack size={16} /> <span className="hidden sm:inline">Inventario</span>
                     </button>
                     <button onClick={() => setActiveTab('status')} className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 rounded-md text-sm font-bold transition-colors whitespace-nowrap ${activeTab === 'status' ? 'bg-slate-700 text-blue-400 shadow-sm' : 'text-slate-500 hover:text-slate-300'}`}>
                        <Activity size={16} /> <span className="hidden sm:inline">Estado</span>
                     </button>
                  </nav>
                </div>
              </header>

              <main className="flex-grow max-w-7xl mx-auto w-full px-2 sm:px-4 py-4">
                {activeTab === 'combat' && (
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-full">
                        <div className="lg:hidden col-span-1 mb-2">
                            <div className="flex bg-slate-800 rounded p-1 justify-center gap-2">
                                <button onClick={() => setCombatViewMode('battle')} className={`flex-1 flex justify-center p-2 rounded ${combatViewMode === 'battle' ? 'bg-slate-700 text-amber-400' : 'text-slate-500'}`}><Swords size={18}/> <span className="ml-2 text-xs font-bold">Vista General</span></button>
                                <button onClick={() => setCombatViewMode('logs')} className={`flex-1 flex justify-center p-2 rounded ${combatViewMode === 'logs' ? 'bg-slate-700 text-slate-200' : 'text-slate-500'}`}><History size={18}/> <span className="ml-2 text-xs font-bold">Historial</span></button>
                            </div>
                        </div>

                        <div className={`lg:col-span-8 flex flex-col gap-4 ${combatViewMode !== 'battle' ? 'hidden lg:flex' : ''}`}>
                            {encounterMode === 'exploration' && !showStatsEditor && (
                                <div className="flex flex-col items-center justify-center h-full min-h-[400px] bg-slate-900/50 rounded-xl border border-slate-800 p-8 text-center animate-in fade-in duration-500">
                                    <div className="w-24 h-24 rounded-full bg-slate-800 flex items-center justify-center mb-6 border-4 border-slate-700 shadow-xl">
                                        <Footprints className="w-12 h-12 text-emerald-500/50" />
                                    </div>
                                    <h2 className="text-2xl font-bold text-slate-300 mb-2 fantasy-font">Zona Segura</h2>
                                    <p className="text-slate-500 max-w-md mb-8">No hay enemigos a la vista. Regresa al mapa para explorar la mazmorra y encontrar tesoros o peligros.</p>
                                    <button onClick={() => setActiveTab('dungeon')} className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white px-6 py-3 rounded-lg font-bold shadow-lg transition-transform active:scale-95">
                                        <Map size={20} /> Ir al Mapa
                                    </button>
                                </div>
                            )}

                            {encounterMode === 'chest' && !showStatsEditor && (
                                <div className="flex flex-col items-center justify-center h-full min-h-[400px] bg-slate-900/50 rounded-xl border border-amber-900/30 p-8 text-center animate-in zoom-in duration-300">
                                    <div className="w-32 h-32 relative mb-6">
                                        <div className="absolute inset-0 bg-amber-500/20 blur-xl rounded-full animate-pulse"></div>
                                        <div className="relative z-10 w-full h-full flex items-center justify-center">
                                            <Lock size={64} className="text-amber-400" />
                                        </div>
                                    </div>
                                    <h2 className="text-3xl font-bold text-amber-400 mb-4 fantasy-font">¡Cofre Encontrado!</h2>
                                    <p className="text-slate-300 max-w-md mb-8 italic">Un pesado cofre reforzado con hierro descansa ante ti. ¿Te arriesgas a abrirlo?</p>
                                    <div className="flex gap-4">
                                        <button onClick={() => resolveEncounter('open')} className="bg-amber-600 hover:bg-amber-500 text-white px-8 py-4 rounded-lg font-bold shadow-lg transition-transform active:scale-95 flex items-center gap-2">
                                            <Settings size={20} /> ABRIR COFRE
                                        </button>
                                        <button onClick={() => resolveEncounter('ignore')} className="bg-slate-700 hover:bg-slate-600 text-slate-300 px-6 py-4 rounded-lg font-bold shadow transition-transform active:scale-95">
                                            Ignorar
                                        </button>
                                    </div>
                                </div>
                            )}

                            {encounterMode === 'victory' && !showStatsEditor && (
                                <div className="flex flex-col items-center justify-center h-full min-h-[400px] bg-slate-900/90 rounded-xl border-4 border-yellow-600/50 p-8 text-center animate-in zoom-in duration-500 relative overflow-hidden">
                                     <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-yellow-500/20 via-slate-900 to-slate-950 pointer-events-none" />
                                     <div className="relative z-10">
                                        <Trophy className="w-24 h-24 text-yellow-400 mx-auto mb-4 drop-shadow-[0_0_15px_rgba(250,204,21,0.5)] animate-bounce" />
                                        <h2 className="text-4xl font-bold text-yellow-300 mb-2 fantasy-font uppercase tracking-widest drop-shadow-md">¡Victoria!</h2>
                                        <p className="text-slate-300 mb-8 font-serif italic text-lg">El enemigo ha caído y sus tesoros son tuyos.</p>
                                        <div className="bg-black/40 p-6 rounded-xl border border-yellow-500/30 mb-8 inline-block min-w-[200px]">
                                            <p className="text-xs text-slate-400 uppercase font-bold tracking-widest mb-2">Botín obtenido</p>
                                            <div className="flex items-center justify-center gap-3 text-3xl font-bold text-white">
                                                <Coins className="text-yellow-500" size={32} /> <span>+{victoryGold} Oro</span>
                                            </div>
                                        </div>
                                        <div>
                                            <button onClick={handleCollectLoot} className="bg-gradient-to-r from-yellow-600 to-amber-700 hover:from-yellow-500 hover:to-amber-600 text-white px-8 py-4 rounded-lg font-bold shadow-lg shadow-amber-900/40 transition-transform active:scale-95 text-lg">
                                                RECOGER Y CONTINUAR
                                            </button>
                                        </div>
                                     </div>
                                </div>
                            )}

                            {encounterMode === 'death' && !showStatsEditor && (
                                <div className="flex flex-col items-center justify-center h-full min-h-[400px] bg-black rounded-xl border-4 border-red-900/80 p-8 text-center animate-in zoom-in duration-1000 relative overflow-hidden">
                                     <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-red-900/20 via-black to-black pointer-events-none" />
                                     <div className="relative z-10">
                                        <Skull className="w-24 h-24 text-red-700 mx-auto mb-4 drop-shadow-[0_0_25px_rgba(185,28,28,0.5)] animate-pulse" />
                                        <h2 className="text-5xl font-bold text-red-600 mb-4 fantasy-font uppercase tracking-widest drop-shadow-md">HAS MUERTO</h2>
                                        <p className="text-slate-400 mb-8 font-serif italic text-lg max-w-md">Tu aventura ha llegado a un final trágico. Tu alma se une a los ecos de la mazmorra.</p>
                                        
                                        <button onClick={handleRestartGame} className="bg-red-900 hover:bg-red-800 text-red-100 px-8 py-4 rounded-lg font-bold shadow-lg shadow-red-950/50 transition-transform active:scale-95 text-lg flex items-center gap-2 mx-auto border border-red-700">
                                            <RotateCcw size={20} /> REINICIAR AVENTURA
                                        </button>
                                     </div>
                                </div>
                            )}

                            {encounterMode === 'combat' && (
                                <>
                                    <div className="flex justify-end">
                                        <button onClick={() => setShowStatsEditor(!showStatsEditor)} className="flex items-center gap-2 text-xs text-slate-500 hover:text-slate-300 bg-slate-900 px-3 py-1 rounded-full border border-slate-700">
                                            <Settings size={12} /> {showStatsEditor ? 'Volver al Combate' : 'Editar Estadísticas'}
                                        </button>
                                    </div>

                                    {showStatsEditor ? (
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-in fade-in duration-300">
                                            <CharacterSheet character={hero} onChange={setHero} availableClasses={availableClasses} onAddClass={addClass} onRemoveClass={removeClass} />
                                            <div className="flex flex-col gap-2 h-full">
                                                <div className="relative">
                                                    <select onChange={handleEnemyPresetChange} className="w-full bg-slate-800 border border-slate-700 text-slate-300 text-sm rounded-lg px-3 py-2 appearance-none focus:outline-none focus:border-red-500 font-bold">
                                                        <option value="" disabled>-- Cargar Preajuste --</option>
                                                        {ENEMY_PRESETS.map(preset => (
                                                            <option key={preset.id} value={preset.id}>{preset.name} (HP: {preset.hp})</option>
                                                        ))}
                                                    </select>
                                                    <ChevronDown className="absolute right-3 top-2.5 text-slate-500 pointer-events-none" size={16} />
                                                </div>
                                                <div className="flex-1">
                                                    <CharacterSheet character={enemy} onChange={setEnemy} isEnemy availableClasses={availableClasses} onAddClass={addClass} onRemoveClass={removeClass} />
                                                </div>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="flex flex-col gap-4 animate-in zoom-in-95 duration-500 relative">
                                            {showPlayerStatsModal && (
                                                <div className="absolute inset-0 z-50 flex items-center justify-center p-4">
                                                    <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setShowPlayerStatsModal(false)} />
                                                    <div className={`${dqBoxStyle} w-full max-w-sm p-6 animate-in zoom-in duration-200 relative`}>
                                                        <button onClick={() => setShowPlayerStatsModal(false)} className="absolute top-2 right-2 text-slate-400 hover:text-white"><X size={20} /></button>
                                                        <div className="text-center mb-6 border-b border-white/20 pb-4">
                                                            <h2 className={`${dqTextStyle} text-2xl font-bold uppercase text-yellow-300 mb-1`}>{hero.name}</h2>
                                                            <span className="text-slate-400 font-mono text-sm">{hero.classType}</span>
                                                        </div>
                                                        <div className="space-y-4">
                                                            <RangeStatDisplayRow label="Ataque" baseMin={hero.minDmg} baseMax={hero.maxDmg} effMin={heroEffective.minD} effMax={heroEffective.maxD} icon={Swords} color="text-slate-300" />
                                                            <RangeStatDisplayRow label="Defensa" baseMin={hero.minDefense} baseMax={hero.maxDefense} effMin={heroEffective.minDef} effMax={heroEffective.maxDef} icon={Shield} color="text-slate-300" />
                                                            <StatDisplayRow label="Precisión" baseVal={hero.hitChance + "%"} effectiveVal={heroEffective.hit + "%"} icon={Crosshair} color="text-slate-300" />
                                                            <StatDisplayRow label="Crítico" baseVal={hero.critChance + "%"} effectiveVal={hero.critChance + "%"} icon={Zap} color="text-yellow-500" />
                                                        </div>
                                                    </div>
                                                </div>
                                            )}

                                            {showEnemyStatsModal && (
                                                <div className="absolute inset-0 z-50 flex items-center justify-center p-4">
                                                    <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setShowEnemyStatsModal(false)} />
                                                    <div className={`${dqBoxStyle} w-full max-w-sm p-6 animate-in zoom-in duration-200 relative border-red-900/50`}>
                                                        <button onClick={() => setShowEnemyStatsModal(false)} className="absolute top-2 right-2 text-slate-400 hover:text-white"><X size={20} /></button>
                                                        <div className="text-center mb-6 border-b border-white/20 pb-4">
                                                            <h2 className={`${dqTextStyle} text-2xl font-bold uppercase text-red-400 mb-1`}>{enemy.name}</h2>
                                                            <span className="text-slate-400 font-mono text-sm">{enemy.classType}</span>
                                                        </div>
                                                        <div className="space-y-4">
                                                            <RangeStatDisplayRow label="Ataque" baseMin={enemy.minDmg} baseMax={enemy.maxDmg} effMin={enemyEffective.minD} effMax={enemyEffective.maxD} icon={Swords} color="text-slate-300" />
                                                            <RangeStatDisplayRow label="Defensa" baseMin={enemy.minDefense} baseMax={enemy.maxDefense} effMin={enemyEffective.minDef} effMax={enemyEffective.maxDef} icon={Shield} color="text-slate-300" />
                                                            <StatDisplayRow label="Precisión" baseVal={enemy.hitChance + "%"} effectiveVal={enemyEffective.hit + "%"} icon={Crosshair} color="text-slate-300" />
                                                            <div className="flex justify-between items-center border-b border-slate-700 pb-2"><span className="flex items-center gap-2 text-red-500 font-mono"><Zap size={16}/> Crítico</span><span className="text-white font-bold font-mono text-lg">{enemy.critChance}% (x{enemy.critMult})</span></div>
                                                        </div>
                                                        <div className="mt-4 pt-4 border-t border-red-900/30">
                                                            <h3 className="text-xs uppercase font-bold text-red-400 mb-2 flex items-center gap-1"><Activity size={12}/> Estados Activos</h3>
                                                            <div className="flex flex-wrap gap-2">
                                                                {enemy.activeStatuses && enemy.activeStatuses.length > 0 ? (
                                                                    enemy.activeStatuses.map(status => (
                                                                        <div key={status.id} className="bg-red-900/20 border border-red-800 rounded px-2 py-1 text-xs text-red-200 flex items-center gap-1">
                                                                            <span>{status.name}</span>
                                                                            <span className="text-[10px] opacity-70">({status.duration === -1 ? '∞' : status.duration + 't'})</span>
                                                                        </div>
                                                                    ))
                                                                ) : (
                                                                    <span className="text-xs text-slate-500 italic">Ninguno</span>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            )}
                                            
                                            {showMathModal && (
                                                <div className="absolute inset-0 z-50 flex items-center justify-center p-4">
                                                    <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setShowMathModal(false)} />
                                                    <div className={`${dqBoxStyle} w-full max-w-sm p-6 animate-in zoom-in duration-200 relative`}>
                                                        <button onClick={() => setShowMathModal(false)} className="absolute top-2 right-2 text-slate-400 hover:text-white"><X size={20} /></button>
                                                        <div className="text-center mb-6 border-b border-white/20 pb-4">
                                                            <h2 className={`${dqTextStyle} text-xl font-bold uppercase text-blue-300 mb-1 flex items-center justify-center gap-2`}><Calculator size={20}/> Desglose del Destino</h2>
                                                            <span className="text-slate-400 font-mono text-xs">Mecánicas de la última acción</span>
                                                        </div>
                                                        <div className="space-y-4 text-center">
                                                           {lastMath ? (
                                                               <div className="bg-slate-900 p-4 rounded border border-slate-700 shadow-inner">
                                                                   <p className="text-white font-mono text-lg font-bold mb-2 break-words whitespace-pre-line">{lastMath}</p>
                                                                   <p className="text-slate-500 text-xs italic">Cálculo exacto usado para la narrativa.</p>
                                                               </div>
                                                           ) : (
                                                               <p className="text-slate-500 italic">No hay registros de combate recientes.</p>
                                                           )}
                                                        </div>
                                                    </div>
                                                </div>
                                            )}

                                            <div className={`w-full aspect-video sm:aspect-[2/1] bg-black rounded-lg border-4 border-slate-600 relative overflow-hidden shadow-2xl group`}>
                                                <div className="absolute inset-0 bg-gradient-to-b from-slate-900 to-slate-800" />
                                                <div className="absolute inset-0 flex items-end justify-center pb-12 sm:pb-16 px-6">
                                                    <div className="relative h-full w-full flex items-center justify-center transition-transform duration-500">
                                                        <img 
                                                            src={enemy.avatarUrl || `https://api.dicebear.com/9.x/pixel-art/svg?seed=${enemy.avatarSeed || enemy.name}&backgroundColor=transparent`} 
                                                            alt={enemy.name} 
                                                            className={`max-h-[85%] max-w-[90%] w-auto h-auto object-contain drop-shadow-[0_10px_20px_rgba(0,0,0,0.6)] rendering-pixelated ${enemy.id === 'orc' ? 'hue-rotate-[240deg] saturate-[2]' : ''}`}
                                                            style={{ imageRendering: 'pixelated' }}
                                                        />
                                                        {pendingCombatChange?.target === 'enemy' && (
                                                            <div className="absolute inset-0 bg-red-500/50 mix-blend-overlay animate-ping rounded-full" />
                                                        )}
                                                    </div>
                                                </div>
                                                <div className="absolute top-2 right-2 z-20 max-w-[60%] flex justify-end">
                                                    <div className="bg-black/30 backdrop-blur-md border border-white/10 rounded-lg px-3 py-1 shadow-lg hover:bg-black/50 transition-colors">
                                                        <span className="font-mono text-white text-shadow-sm text-[10px] sm:text-xs font-bold tracking-widest uppercase flex items-center gap-2 truncate">
                                                            <Skull size={12} className="text-red-400 shrink-0" /> 
                                                            <span className="truncate">{enemy.name}</span>
                                                        </span>
                                                    </div>
                                                </div>
                                                <div className="absolute top-4 left-4 z-20">
                                                    <button onClick={() => setShowEnemyStatsModal(true)} className={`${dqBoxStyle} px-3 py-1.5 hover:bg-white/10 transition-colors`}>
                                                        <span className={`${dqTextStyle} text-xs sm:text-sm font-bold flex items-center gap-2`}><Info size={14} className="text-blue-300"/> Stats</span>
                                                    </button>
                                                </div>
                                                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 w-[80%] max-w-md z-20">
                                                    <div className="bg-black/60 backdrop-blur-sm border border-white/20 rounded-full h-4 overflow-hidden relative shadow-lg">
                                                        <div className="h-full bg-gradient-to-r from-red-600 via-red-500 to-red-600 transition-all duration-500 shadow-[0_0_10px_rgba(239,68,68,0.5)]" style={{ width: `${(enemy.hp / enemy.maxHp) * 100}%` }} />
                                                        <div className="absolute top-0 left-0 right-0 h-[50%] bg-white/10" />
                                                    </div>
                                                    <div className="text-center mt-1"><span className="text-[10px] font-mono font-bold text-white/70 bg-black/50 px-2 rounded">{enemy.hp} / {enemy.maxHp} HP</span></div>
                                                </div>
                                            </div>

                                            <div ref={narrativeRef} className={`${dqBoxStyle} min-h-[120px] p-4 flex flex-col justify-center relative group`}>
                                                <button 
                                                    onClick={() => setShowMathModal(true)} 
                                                    className="absolute top-2 right-2 text-slate-500 hover:text-amber-400 opacity-50 hover:opacity-100 transition-all p-1"
                                                    title="Ver detalles mecánicos"
                                                >
                                                    <HelpCircle size={16} />
                                                </button>
                                                <div className={`${dqTextStyle} text-base sm:text-lg leading-relaxed`}>
                                                    {lastNarrative ? (
                                                        <ReactMarkdown components={{ p: ({node, ...props}) => <p className="mb-2" {...props} />, strong: ({node, ...props}) => <span className="text-yellow-300 font-bold" {...props} /> }}>{lastNarrative}</ReactMarkdown>
                                                    ) : (
                                                        <p className="animate-pulse">¡{enemy.name} ha aparecido!</p>
                                                    )}
                                                </div>
                                            </div>

                                            <div className="grid grid-cols-12 gap-4">
                                                <div className="col-span-12 sm:col-span-7">
                                                    <div className={`${dqBoxStyle} h-full p-4`}>
                                                        <div className="flex justify-between items-center mb-2 border-b-2 border-white/20 pb-1">
                                                            <span className={`${dqTextStyle} text-xl font-bold`}>{hero.name}</span>
                                                        </div>
                                                        <div className="space-y-2">
                                                            <div className="flex justify-between items-center">
                                                                <span className={`${dqTextStyle} text-sm text-slate-300`}>PV (HP)</span>
                                                                <span className={`${dqTextStyle} text-xl font-bold`}>{hero.hp} <span className="text-sm font-normal text-slate-400">/ {hero.maxHp}</span></span>
                                                            </div>
                                                            <div className="w-full h-2 bg-slate-900 border border-slate-600 rounded-full overflow-hidden">
                                                                <div className={`h-full ${hero.hp < hero.maxHp * 0.3 ? 'bg-red-500' : 'bg-green-500'} transition-all`} style={{ width: `${(hero.hp / hero.maxHp) * 100}%` }} />
                                                            </div>
                                                            <div className="flex justify-between items-center mt-2">
                                                                <span className={`${dqTextStyle} text-sm text-slate-300`}>PM (MP)</span>
                                                                <span className={`${dqTextStyle} text-lg`}>--</span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="col-span-12 sm:col-span-5">
                                                    <div className={`${dqBoxStyle} h-full p-2`}>
                                                        {isEnemyTurn ? (
                                                            <div className="h-full flex flex-col items-center justify-center gap-2 animate-in zoom-in duration-300">
                                                                <p className="text-xs text-red-300 font-bold uppercase tracking-widest mb-1">Fase de Enemigo</p>
                                                                <button onClick={() => handleAction('ATAQUE_ENEMIGO')} disabled={isProcessing} className="w-full bg-red-900/80 hover:bg-red-800 border-2 border-red-500 text-white font-bold py-4 rounded-lg shadow-[0_0_15px_rgba(239,68,68,0.4)] flex flex-col items-center justify-center gap-1 group transition-all">
                                                                    <div className="flex items-center gap-2 text-lg"><Skull className="animate-pulse" /> <span>EJECUTAR ATAQUE</span></div>
                                                                    <span className="text-[10px] text-red-300 uppercase font-mono group-hover:text-white">{playerNames.length === 1 ? `Objetivo: ${hero.name}` : "Tirar dados de objetivo..."}</span>
                                                                </button>
                                                            </div>
                                                        ) : (
                                                            <div className="grid grid-cols-2 gap-2 h-full">
                                                                <button onClick={() => handleAction('ATACAR')} disabled={isProcessing} className={`relative text-left px-4 sm:px-6 py-2 hover:bg-white/10 rounded transition-colors group disabled:opacity-50`}><span className={`${dqTextStyle} group-hover:${dqSelectedStyle}`}>Atacar</span></button>
                                                                <button onClick={() => setShowPlayerStatsModal(true)} disabled={isProcessing} className={`relative text-left px-4 sm:px-6 py-2 hover:bg-white/10 rounded transition-colors group disabled:opacity-50`}><span className={`${dqTextStyle} group-hover:${dqSelectedStyle}`}>Estadísticas</span></button>
                                                                <button onClick={() => handleAction('OBJETO')} disabled={isProcessing} className={`relative text-left px-4 sm:px-6 py-2 hover:bg-white/10 rounded transition-colors group disabled:opacity-50`}><span className={`${dqTextStyle} group-hover:${dqSelectedStyle}`}>Objeto</span></button>
                                                                <button onClick={() => handleAction('HUIR')} disabled={isProcessing} className={`relative text-left px-4 sm:px-6 py-2 hover:bg-white/10 rounded transition-colors group disabled:opacity-50`}><span className={`${dqTextStyle} group-hover:${dqSelectedStyle}`}>Huir</span></button>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </>
                            )}
                        </div>

                        <div className={`lg:col-span-4 flex flex-col gap-4 h-full overflow-hidden ${combatViewMode === 'battle' ? 'hidden lg:flex' : ''}`}>
                            <div className="flex-none lg:h-1/3 min-h-[150px]">
                                <PartySidebar playerNames={playerNames} currentPlayerName={hero.name} isConnected={isP2PConnected}/>
                            </div>
                            <div className={`${combatViewMode === 'logs' ? 'hidden' : 'block'} lg:hidden`}>
                                <EventGenerator onEventGenerated={handleEventGenerated} isGenerating={isProcessing} setGenerating={setIsProcessing} />
                            </div>
                            <div className={`flex-1 flex flex-col min-h-0 ${combatViewMode === 'battle' ? 'hidden lg:flex' : 'flex'}`}>
                                <div className="flex items-center justify-between mb-2">
                                    <h2 className="text-lg font-bold fantasy-font text-slate-300 flex items-center gap-2"><History size={18} /> Historial</h2>
                                    <span className="text-[10px] bg-slate-800 px-2 py-1 rounded text-slate-500">{logs.length}</span>
                                </div>
                                <div className="flex-1 overflow-y-auto pr-2 pb-4 border-t border-slate-800 pt-4">
                                    <GameLog logs={logs} />
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'inventory' && (
                    <InventoryView hero={hero} setHero={setHero} playerNames={playerNames} onUseItem={handleItemUse} />
                )}

                {activeTab === 'dungeon' && (
                    <DungeonGeneratorView 
                        dungeonState={dungeonState} 
                        setDungeonState={setDungeonState} 
                        onEncounter={handleDungeonEncounter} 
                        encounterMode={encounterMode}
                    />
                )}

                {activeTab === 'status' && (
                    <div className="h-full flex flex-col items-center justify-start p-2 sm:p-6 animate-in fade-in duration-300 overflow-y-auto">
                         <div className={`${dqBoxStyle} w-full max-w-md p-6 relative`}>
                             <div className="absolute top-0 right-0 p-4 opacity-10 pointer-events-none"><Shield size={120} /></div>

                             {/* Avatar & Name Header */}
                             <div className="flex flex-col items-center mb-6 border-b-2 border-white/20 pb-6 relative z-10">
                                <div className="w-24 h-24 mb-3 rounded border-2 border-white shadow-lg overflow-hidden bg-black relative">
                                    <img 
                                        src={hero.avatarUrl || `https://api.dicebear.com/9.x/pixel-art/svg?seed=${hero.name}&backgroundColor=transparent`} 
                                        alt={hero.name}
                                        className="w-full h-full object-cover rendering-pixelated"
                                        style={{ imageRendering: 'pixelated' }}
                                    />
                                </div>
                                 <h2 className={`${dqTextStyle} text-3xl font-bold uppercase text-yellow-300 mb-1`}>{hero.name}</h2>
                                 <span className="text-slate-400 font-mono text-sm tracking-widest uppercase">{hero.classType}</span>
                             </div>

                             {/* Vitals */}
                             <div className="mb-6 space-y-2 bg-black/20 p-3 rounded border border-white/10">
                                <div className="flex justify-between items-center">
                                    <span className={`${dqTextStyle} text-sm text-slate-300`}>PV (HP)</span>
                                    <span className={`${dqTextStyle} text-xl font-bold`}>{hero.hp} <span className="text-sm font-normal text-slate-400">/ {hero.maxHp}</span></span>
                                </div>
                                <div className="w-full h-3 bg-slate-900 border border-slate-600 rounded-full overflow-hidden">
                                    <div className={`h-full ${hero.hp < hero.maxHp * 0.3 ? 'bg-red-500' : 'bg-green-500'} transition-all`} style={{ width: `${(hero.hp / hero.maxHp) * 100}%` }} />
                                </div>
                             </div>

                             {/* Main Stats */}
                             <div className="space-y-4 mb-6">
                                 <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest border-b border-slate-700 pb-1 mb-2">Atributos de Combate</h3>
                                 <RangeStatDisplayRow label="Ataque" baseMin={hero.minDmg} baseMax={hero.maxDmg} effMin={heroEffective.minD} effMax={heroEffective.maxD} icon={Swords} color="text-slate-300" />
                                 <RangeStatDisplayRow label="Defensa" baseMin={hero.minDefense} baseMax={hero.maxDefense} effMin={heroEffective.minDef} effMax={heroEffective.maxDef} icon={Shield} color="text-slate-300" />
                                 <StatDisplayRow label="Precisión" baseVal={hero.hitChance + "%"} effectiveVal={heroEffective.hit + "%"} icon={Crosshair} color="text-slate-300" />
                                 <StatDisplayRow label="Crítico" baseVal={hero.critChance + "%"} effectiveVal={hero.critChance + "%"} icon={Zap} color="text-yellow-500" />
                                 <div className="flex justify-between items-center border-b border-slate-700 pb-2">
                                    <span className={`flex items-center gap-2 text-orange-400 font-mono`}>
                                        <Zap size={16}/> Mult. Crítico
                                    </span>
                                    <span className="text-white font-bold font-mono text-lg">x{hero.critMult}</span>
                                </div>
                             </div>
                             
                             {/* Custom Stats / Notes if any */}
                             {hero.customStats.length > 0 && (
                                 <div className="space-y-3 pt-2 border-t border-white/10">
                                    <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Otros Atributos</h3>
                                    {hero.customStats.map(stat => (
                                         <div key={stat.id} className="flex justify-between items-center border-b border-slate-800 pb-1">
                                            <span className="text-slate-400 font-mono text-sm">{stat.label}</span>
                                            <span className="text-white font-mono font-bold">{stat.value} <span className="text-[10px] text-slate-500">{stat.unit}</span></span>
                                         </div>
                                    ))}
                                 </div>
                             )}

                             {/* Status Effects */}
                             <div className="mt-6 pt-4 border-t border-white/20">
                                <h3 className="text-xs uppercase font-bold text-blue-300 mb-2 flex items-center gap-1"><Activity size={12}/> Estados Activos</h3>
                                <div className="flex flex-wrap gap-2">
                                    {hero.activeStatuses && hero.activeStatuses.length > 0 ? (
                                        hero.activeStatuses.map(status => (
                                            <div key={status.id} className="bg-blue-900/30 border border-blue-500/50 rounded px-2 py-1 text-xs text-blue-100 flex items-center gap-1">
                                                <span>{status.name}</span>
                                                <span className="text-[10px] opacity-70">({status.duration === -1 ? '∞' : status.duration + 't'})</span>
                                            </div>
                                        ))
                                    ) : (
                                        <span className="text-xs text-slate-500 italic">Sin estados alterados</span>
                                    )}
                                </div>
                             </div>
                         </div>
                    </div>
                )}
              </main>
            </>
        )}
    </div>
  );
};

export default App;