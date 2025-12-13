import type { Pokemon } from '../types';
import pokemonData from '@/data/pokemon.json';

// Type-safe cast
const allPokemon = pokemonData as Pokemon[];

// Build O(1) lookup maps
const pokemonBySpeciesId = new Map<string, Pokemon>();
const pokemonByDex = new Map<number, Pokemon>();

for (const pokemon of allPokemon) {
  pokemonBySpeciesId.set(pokemon.speciesId, pokemon);
  pokemonByDex.set(pokemon.dex, pokemon);
}

/**
 * Get Pokémon by speciesId
 */
export function getPokemonBySpeciesId(speciesId: string): Pokemon | undefined {
  return pokemonBySpeciesId.get(speciesId);
}

/**
 * Get Pokémon by Pokédex number
 */
export function getPokemonByDex(dex: number): Pokemon | undefined {
  return pokemonByDex.get(dex);
}

/**
 * Get all Pokémon that match a filter
 */
export function filterPokemon(
  predicate: (pokemon: Pokemon) => boolean,
): Pokemon[] {
  return allPokemon.filter(predicate);
}

/**
 * Get all available Pokémon (released only)
 */
export function getAvailablePokemon(): Pokemon[] {
  return filterPokemon((p) => p.released);
}

/**
 * Extract base species from a speciesId (removes shadow/form suffixes)
 * @example "marowak_alolan_shadow" → "marowak"
 */
export function getBaseSpecies(speciesId: string): string {
  return speciesId.split('_')[0];
}

/**
 * Check if two speciesIds are the same base species
 * Used for team validation (can't have marowak and marowak_alolan)
 */
export function isSameBaseSpecies(
  speciesId1: string,
  speciesId2: string,
): boolean {
  return getBaseSpecies(speciesId1) === getBaseSpecies(speciesId2);
}

/**
 * Validate team has unique base species
 * @returns true if valid, false if duplicate base species found
 */
export function validateTeamUniqueness(team: string[]): boolean {
  const baseSpecies = team.map(getBaseSpecies);
  const uniqueBase = new Set(baseSpecies);
  return uniqueBase.size === baseSpecies.length;
}

/**
 * Get all Pokémon with Great League (CP 1500) IVs
 */
export function getGreatLeaguePokemon(): Pokemon[] {
  return filterPokemon((p) => p.defaultIVs.cp1500 !== undefined && p.released);
}

/**
 * Get only Pokémon that appear in rankings (viable for Great League)
 * This filters out Pokemon like Smeargle that can't reach competitive CP
 */
export function getRankedGreatLeaguePokemon(
  rankedNames: Set<string>,
): Pokemon[] {
  return filterPokemon(
    (p) =>
      p.released &&
      p.defaultIVs.cp1500 !== undefined &&
      rankedNames.has(p.speciesName),
  );
}

/**
 * Calculate stat product for a Pokémon at CP 1500
 */
export function calculateStatProduct(pokemon: Pokemon): number {
  const ivs = pokemon.defaultIVs.cp1500;
  if (!ivs) return 0;

  const [level, atkIV, defIV, hpIV] = ivs;
  const cpMultiplier = getCPMultiplier(level);

  const attack = (pokemon.baseStats.atk + atkIV) * cpMultiplier;
  const defense = (pokemon.baseStats.def + defIV) * cpMultiplier;
  const stamina = Math.floor((pokemon.baseStats.hp + hpIV) * cpMultiplier);

  return attack * defense * stamina;
}

/**
 * Get CP multiplier for a given level
 * Simplified version - in production, use full lookup table
 */
function getCPMultiplier(level: number): number {
  // Approximate formula for demonstration
  // Real implementation should use Niantic's official table
  return Math.sqrt(level / 100 + 0.5);
}

/**
 * Check if Pokémon is shadow form
 */
export function isShadow(speciesId: string): boolean {
  return speciesId.includes('_shadow');
}

/**
 * Check if Pokémon is XL (requires XL candy)
 * Pokémon that need level > 40 for CP 1500 require XL candy
 */
export function requiresXLCandy(pokemon: Pokemon): boolean {
  const ivs = pokemon.defaultIVs.cp1500;
  if (!ivs) return false;
  const [level] = ivs;
  return level > 40;
}

/**
 * Get resource cost summary for a Pokémon
 */
export function getResourceCost(pokemon: Pokemon): {
  buddyDistance: number;
  thirdMoveCost: number;
  requiresXL: boolean;
  isShadow: boolean;
} {
  return {
    buddyDistance: pokemon.buddyDistance,
    thirdMoveCost: pokemon.thirdMoveCost,
    requiresXL: requiresXLCandy(pokemon),
    isShadow: isShadow(pokemon.speciesId),
  };
}

export { allPokemon };
