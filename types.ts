
export type DieType = 'd4' | 'd6' | 'd8' | 'd10' | 'd12' | 'd20' | 'd100';

export interface SelectedDie {
  id: string;
  type: DieType;
  value: number; // 0 if not rolled yet
}

export enum LogType {
  COMBAT = 'COMBAT',
  EVENT = 'EVENT',
  NARRATIVE = 'NARRATIVE'
}

export interface LogEntry {
  id: string;
  timestamp: number;
  type: LogType;
  title: string;
  content: string; // The AI Narrative
  inputContext?: string; // What the user typed
  rollTotal?: number; // Sum of dice
  diceDetails?: string; // e.g., "d20(15) + 5"
  tags?: string[];
}

export interface EventGenerationConfig {
  theme: string;
  dangerLevel: 'Bajo' | 'Medio' | 'Alto' | 'Mortal';
}

export interface CustomStat {
  id: string;
  label: string;
  value: string;
  isNumber?: boolean;
  unit?: string; // '%', 'x', or '' (base number)
  // New fields for effects
  effectDmg?: string;
  effectDuration?: string; // number string or '∞'
}

export interface StatModifier {
    stat: 'hitChance' | 'minDmg' | 'maxDmg' | 'minDefense' | 'maxDefense';
    value: number;
}

export interface StatusEffect {
  id: string;
  name: string;
  damagePerTurn: number;
  duration: number; // turns remaining. -1 for infinite
  iconType?: 'poison' | 'fire' | 'ice' | 'stun' | 'bleed' | 'buff' | 'generic' | 'broken' | 'weak' | 'slow'; 
  modifiers?: StatModifier[];
}

// --- Inventory System ---
export type ItemRarity = 'common' | 'magic' | 'rare' | 'legendary';
export type ItemType = 'weapon' | 'armor' | 'accessory' | 'consumable' | 'material';

export interface Item {
  id: string;
  name: string;
  description?: string;
  type: ItemType;
  rarity: ItemRarity;
  icon?: string; // For now we'll use generic icons based on type
  stats?: string; // Display string e.g. "+5 STR"
}

export interface Equipment {
  head?: Item;
  chest?: Item;
  mainHand?: Item;
  offHand?: Item;
  legs?: Item;
  accessory?: Item;
}

export interface Character {
  id?: string;
  name: string;
  classType: string;
  hp: number;
  maxHp: number;
  minDmg: number; 
  maxDmg: number; 
  minDefense: number; // Changed from defense
  maxDefense: number; // New field
  hitChance: number;
  critChance: number;
  critMult: number;
  customStats: CustomStat[];
  activeStatuses: StatusEffect[]; 
  statOrder: string[]; 
  // New Inventory Fields
  inventory: Item[];
  equipment: Equipment;
  gold: number;
  avatarUrl?: string; // New Pixel Art URL
  avatarSeed?: string;
}

export interface EnemyPreset {
  id: string;
  name: string;
  classType: string;
  hp: number;
  minDmg: number;
  maxDmg: number;
  minDefense: number; // Changed from defense
  maxDefense: number; // New field
  hitChance: number;
  avatarSeed: string; // Seed for pixel art generator
  goldReward: number; // Gold dropped on defeat
  avatarUrl?: string; // Optional custom image URL
}

export type ActionType = 'ATACAR' | 'OBJETO' | 'HUIR' | 'MANUAL' | 'ATAQUE_ENEMIGO';

export interface AnimatedDie {
  id: string;
  type: DieType;
  finalValue: number;
  label: string;
  target?: number;      // The number to beat/roll under
  condition?: 'under' | 'over'; // Success condition
  isCrit?: boolean;
  isIgnored?: boolean; // E.g. damage die if attack missed
  critThreshold?: number; // The number needed to crit (e.g., <= 10)
}

// --- Dungeon System ---
export type TileType = 'start' | 'empty' | 'enemy' | 'chest' | 'event' | 'boss';

export interface DungeonTile {
  x: number;
  y: number;
  type: TileType;
  revealed: boolean;
  interacted: boolean; // If chest is opened or enemy defeated
}

export interface DungeonState {
  tiles: DungeonTile[];
  playerPos: { x: number; y: number };
  message: string;
  isGenerated: boolean;
}

export type BodyPart = 'head' | 'torso' | 'arm_l' | 'arm_r' | 'legs';

export type EncounterMode = 'exploration' | 'combat' | 'chest' | 'victory' | 'death';