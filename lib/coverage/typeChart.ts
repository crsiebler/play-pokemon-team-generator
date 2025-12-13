import type { TypeChart } from '../types';
import typeEffectivenessData from '@/data/type-effectiveness.json';

const typeChart = typeEffectivenessData as TypeChart;

/**
 * Calculate type effectiveness multiplier
 * @param attackType The attacking move's type
 * @param defenseTypes Array of defending Pokémon's types (1 or 2)
 * @returns Effectiveness multiplier (0.39, 0.625, 1.0, 1.6, or 2.56 for dual types)
 */
export function calculateEffectiveness(
  attackType: string,
  defenseTypes: string[],
): number {
  const normalizedAttack = attackType.toLowerCase();

  let multiplier = 1.0;

  for (const defType of defenseTypes) {
    const normalizedDef = defType.toLowerCase();

    if (typeChart[normalizedAttack]?.[normalizedDef] !== undefined) {
      multiplier *= typeChart[normalizedAttack][normalizedDef];
    }
  }

  return multiplier;
}

/**
 * Check if move receives STAB (Same Type Attack Bonus)
 * @param moveType The move's type
 * @param pokemonTypes Array of the Pokémon's types
 * @returns true if STAB applies (1.2× damage)
 */
export function hasSTAB(moveType: string, pokemonTypes: string[]): boolean {
  const normalizedMove = moveType.toLowerCase();
  return pokemonTypes.some((type) => type.toLowerCase() === normalizedMove);
}

/**
 * Calculate total damage multiplier including STAB and type effectiveness
 * @param moveType The attacking move's type
 * @param attackerTypes Array of attacker's types (for STAB calculation)
 * @param defenderTypes Array of defender's types (for effectiveness calculation)
 * @returns Total multiplier (effectiveness × STAB)
 */
export function calculateTotalMultiplier(
  moveType: string,
  attackerTypes: string[],
  defenderTypes: string[],
): number {
  const effectiveness = calculateEffectiveness(moveType, defenderTypes);
  const stab = hasSTAB(moveType, attackerTypes) ? 1.2 : 1.0;
  return effectiveness * stab;
}

/**
 * Get all types that are super effective against the given types
 * @param defenseTypes Array of types to check weaknesses for
 * @returns Array of type names that deal 1.6× or more damage
 */
export function getSuperEffectiveTypes(defenseTypes: string[]): string[] {
  const superEffective: string[] = [];

  // Check all 18 types
  const allTypes = Object.keys(typeChart);

  for (const attackType of allTypes) {
    const effectiveness = calculateEffectiveness(attackType, defenseTypes);
    if (effectiveness >= 1.6) {
      superEffective.push(attackType);
    }
  }

  return superEffective;
}

/**
 * Get all types that this Pokémon resists
 * @param defenseTypes Array of types to check resistances for
 * @returns Array of type names that deal 0.625× or less damage
 */
export function getResistantTypes(defenseTypes: string[]): string[] {
  const resistant: string[] = [];

  const allTypes = Object.keys(typeChart);

  for (const attackType of allTypes) {
    const effectiveness = calculateEffectiveness(attackType, defenseTypes);
    if (effectiveness <= 0.625) {
      resistant.push(attackType);
    }
  }

  return resistant;
}

/**
 * Calculate offensive coverage score for a set of move types
 * @param moveTypes Array of move types (charged moves from team)
 * @returns Object with coverage stats
 */
export function calculateOffensiveCoverage(moveTypes: string[]): {
  superEffective: Set<string>;
  neutral: Set<string>;
  notVeryEffective: Set<string>;
  coverageScore: number;
} {
  const allTypes = Object.keys(typeChart);
  const superEffective = new Set<string>();
  const neutral = new Set<string>();
  const notVeryEffective = new Set<string>();

  for (const defType of allTypes) {
    let bestMultiplier = 0;

    for (const atkType of moveTypes) {
      const effectiveness = calculateEffectiveness(atkType, [defType]);
      bestMultiplier = Math.max(bestMultiplier, effectiveness);
    }

    if (bestMultiplier >= 1.6) {
      superEffective.add(defType);
    } else if (bestMultiplier === 1.0) {
      neutral.add(defType);
    } else {
      notVeryEffective.add(defType);
    }
  }

  // Coverage score: 1 point per SE, 0.5 per neutral, 0 per NVE
  const coverageScore = superEffective.size + neutral.size * 0.5;

  return { superEffective, neutral, notVeryEffective, coverageScore };
}

/**
 * Calculate defensive coverage score for a team's types
 * @param teamTypes Array of [type1, type2] arrays for each team member
 * @returns Object with defensive stats
 */
export function calculateDefensiveCoverage(teamTypes: string[][]): {
  resistedTypes: Set<string>;
  weakTypes: Set<string>;
  coverageScore: number;
} {
  const allTypes = Object.keys(typeChart);
  const resistCount: Record<string, number> = {};
  const weakCount: Record<string, number> = {};

  for (const atkType of allTypes) {
    resistCount[atkType] = 0;
    weakCount[atkType] = 0;

    for (const defTypes of teamTypes) {
      const effectiveness = calculateEffectiveness(
        atkType,
        defTypes.filter((t) => t !== 'none'),
      );

      if (effectiveness <= 0.625) {
        resistCount[atkType]++;
      } else if (effectiveness >= 1.6) {
        weakCount[atkType]++;
      }
    }
  }

  const resistedTypes = new Set(
    Object.entries(resistCount)
      .filter(([_, count]) => count >= 2)
      .map(([type]) => type),
  );

  const weakTypes = new Set(
    Object.entries(weakCount)
      .filter(([_, count]) => count >= 3)
      .map(([type]) => type),
  );

  // Coverage score: 1 point per resisted type, -0.5 per weak type
  const coverageScore = resistedTypes.size - weakTypes.size * 0.5;

  return { resistedTypes, weakTypes, coverageScore };
}
