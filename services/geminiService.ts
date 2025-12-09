import { LogEntry, LogType, EventGenerationConfig, Character } from "../types";

// --- SISTEMA DE NARRATIVA PROCEDURAL (OFFLINE) ---

const TEMPLATES = {
  CRITICAL_HIT: [
    "¡BRUTAL! **{attacker}** encuentra un punto débil en la defensa de **{defender}** y asesta un golpe devastador.",
    "¡CRÍTICO! El ataque de **{attacker}** impacta con una fuerza inmensa, haciendo tambalear a **{defender}**.",
    "¡Una ejecución perfecta! **{attacker}** canaliza toda su fuerza en un ataque que **{defender}** recordará (si sobrevive).",
    "¡Sangre y gloria! El arma de **{attacker}** brilla al conectar un golpe maestro contra **{defender}**."
  ],
  HIT: [
    "**{attacker}** lanza un ataque rápido que conecta contra **{defender}**.",
    "El golpe de **{attacker}** supera la guardia de **{defender}**.",
    "**{defender}** intenta esquivar, pero **{attacker}** es más rápido y logra herirlo.",
    "Un impacto sólido. **{attacker}** reduce la vitalidad de **{defender}**.",
    "Con destreza, **{attacker}** alcanza a **{defender}** en el costado."
  ],
  BLOCKED: [
    "**{attacker}** conecta, pero la armadura de **{defender}** absorbe la mayor parte del impacto.",
    "**{defender}** interpone su defensa en el último segundo, mitigando el daño de **{attacker}**.",
    "El golpe es certero, pero la resistencia de **{defender}** es superior.",
    "¡Clang! El ataque rebota inofensivamente en la protección de **{defender}**."
  ],
  MISS: [
    "**{attacker}** ataca al aire mientras **{defender}** se agacha ágilmente.",
    "El ataque de **{attacker}** es torpe y **{defender}** lo desvía sin esfuerzo.",
    "**{defender}** predice el movimiento y da un paso atrás, haciendo fallar a **{attacker}**.",
    "**{attacker}** tropieza y su golpe pasa lejos de **{defender}**.",
    "¡Fallo! La defensa de **{defender}** es impenetrable por ahora."
  ],
  KILL: [
    "¡El golpe final! **{defender}** cae derrotado ante la fuerza de **{attacker}**.",
    "Con un último suspiro, **{defender}** se desploma. **{attacker}** es el vencedor.",
    "**{attacker}** remata a **{defender}** sin piedad. El combate ha terminado.",
    "La luz se apaga en los ojos de **{defender}** tras el impacto de **{attacker}**."
  ],
  FLEE_SUCCESS: [
    "¡Escapada maestra! Aprovechas una distracción para desaparecer en las sombras.",
    "Corres como si no hubiera un mañana y logras dejar atrás al enemigo.",
    "Una bomba de humo (o pura velocidad) te permite huir del combate."
  ],
  FLEE_FAIL: [
    "Intentas huir, pero el enemigo te corta el paso.",
    "¡No hay salida! El enemigo es demasiado rápido y te obliga a seguir luchando.",
    "Tropiezas al intentar escapar y quedas a merced del combate."
  ],
  POTION: [
    "**{attacker}** bebe apresuradamente el brebaje y siente cómo sus heridas se cierran.",
    "Un brillo mágico envuelve a **{attacker}** tras usar el objeto.",
    "**{attacker}** utiliza el objeto con precisión quirúrgica."
  ]
};

const DUNGEON_EVENTS = [
  { title: "Altar Profanado", description: "Encuentras un antiguo altar cubierto de runas oscuras. Emana una energía inquietante.", mechanics: "Si tocas el altar: Tira 1d6. (1-3: Sufres Daño, 4-6: Te curas por completo)." },
  { title: "Mercader Errante", description: "Un goblin con una mochila enorme te saluda. Parece inofensivo y quiere comerciar.", mechanics: "Puedes comprar una poción por 10 de oro (si tienes el oro)." },
  { title: "Trampa de Dardos", description: "¡Click! Pisas una losa suelta y escuchas un mecanismo activarse.", mechanics: "Prueba de Agilidad (d20). Si fallas, recibes 1d4 de daño de veneno." },
  { title: "Fuente de la Vida", description: "Una fuente de agua cristalina brota de la pared de roca.", mechanics: "Beber el agua restaura 5 HP y elimina efectos de veneno." },
  { title: "Cadáver de Aventurero", description: "Los restos de un guerrero que no tuvo tanta suerte como tú.", mechanics: "Saquear: Encuentras 1d6 monedas de oro y una daga oxidada." },
  { title: "Derrumbe", description: "El techo comienza a temblar violentamente.", mechanics: "Todos reciben 1d4 de daño por rocas que caen." },
  { title: "Susurros en la Oscuridad", description: "Escuchas voces que dicen tu nombre, pero no hay nadie.", mechanics: "Efecto de Miedo: Tu próximo ataque tiene -10% de probabilidad de acierto." },
  { title: "Hongo Luminiscente", description: "Un hongo gigante ilumina la sala con luz azul.", mechanics: "Comerlo cura 2 HP pero provoca alucinaciones." },
  { title: "Rata Gigante", description: "Una rata del tamaño de un perro te observa desde una esquina.", mechanics: "No ataca a menos que te acerques. Es inofensiva... creo." },
  { title: "El Cofre Falso", description: "Ves un cofre... espera, ¿acaba de respirar?", mechanics: "Es un Mímico pequeño. Si intentas abrirlo, inicias combate inmediatamente." }
];

const getRandom = (arr: string[]) => arr[Math.floor(Math.random() * arr.length)];

export const generateCombatNarrative = async (
  actionType: string,
  contextDetails: string,
  rollData: { total: number; breakdown: string; hitSuccess?: boolean; damageTotal?: number, defenseTotal?: number },
  hero: Character,
  enemy: Character
): Promise<string> => {
  // Simular un pequeño tiempo de "pensamiento" para dar peso a la acción
  await new Promise(resolve => setTimeout(resolve, 600));

  const isEnemyAttack = actionType === 'ATAQUE_ENEMIGO';
  const attackerName = isEnemyAttack ? enemy.name : hero.name;
  const defenderName = isEnemyAttack ? hero.name : enemy.name;
  
  // Detectar condiciones
  const isCrit = rollData.breakdown.toLowerCase().includes('crít') || rollData.breakdown.toLowerCase().includes('crit');
  const isKill = (rollData.damageTotal || 0) >= (isEnemyAttack ? hero.hp : enemy.hp);
  const dmg = rollData.damageTotal || 0;
  const def = rollData.defenseTotal || 0;

  let templateArray = TEMPLATES.HIT;

  // Lógica de Selección de Plantilla
  if (actionType === 'HUIR') {
      templateArray = rollData.hitSuccess ? TEMPLATES.FLEE_SUCCESS : TEMPLATES.FLEE_FAIL;
  } else if (actionType === 'OBJETO') {
      templateArray = TEMPLATES.POTION;
  } else {
      // Lógica de Combate
      if (!rollData.hitSuccess) {
          templateArray = TEMPLATES.MISS;
      } else if (isKill) {
          templateArray = TEMPLATES.KILL;
      } else if (isCrit) {
          templateArray = TEMPLATES.CRITICAL_HIT;
      } else if (def > dmg * 1.5) { // Si defendió mucho más de lo que recibió
          templateArray = TEMPLATES.BLOCKED;
      } else {
          templateArray = TEMPLATES.HIT;
      }
  }

  // Interpolación de variables
  let narrative = getRandom(templateArray)
      .replace(/{attacker}/g, `**${attackerName}**`)
      .replace(/{defender}/g, `**${defenderName}**`);

  // Añadir detalles mecánicos al texto si es necesario para dar sabor
  if (isCrit && actionType.includes('ATAQUE')) {
      narrative += " ¡El impacto resuena en toda la mazmorra!";
  }

  return narrative;
};

export const generateDungeonEvent = async (config: EventGenerationConfig): Promise<LogEntry> => {
  // Simular tiempo de carga
  await new Promise(resolve => setTimeout(resolve, 800));

  // Selección aleatoria simple (se podría mejorar filtrando por dangerLevel)
  const event = DUNGEON_EVENTS[Math.floor(Math.random() * DUNGEON_EVENTS.length)];

  return {
      id: crypto.randomUUID(),
      timestamp: Date.now(),
      type: LogType.EVENT,
      title: event.title,
      content: `${event.description}\n\n**Efecto:** ${event.mechanics}`,
      tags: [config.dangerLevel, "Evento Aleatorio"]
  };
};

// Función dummy para mantener compatibilidad si algo llama a validación
export const validateDeepSeekKey = async (key: string): Promise<boolean> => {
    return true; 
};