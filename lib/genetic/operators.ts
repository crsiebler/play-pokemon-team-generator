import { getBaseSpecies, validateTeamUniqueness } from '../data/pokemon';
import type { Chromosome, TournamentMode } from '../types';
import { cloneChromosome, getMutableSlots, isAnchorSlot } from './chromosome';

/**
 * Tournament selection - pick best of N random chromosomes
 */
export function tournamentSelection(
  population: Chromosome[],
  tournamentSize: number = 3,
): Chromosome {
  const tournament: Chromosome[] = [];

  for (let i = 0; i < tournamentSize; i++) {
    const randomIndex = Math.floor(Math.random() * population.length);
    tournament.push(population[randomIndex]);
  }

  return tournament.reduce((best, current) =>
    current.fitness > best.fitness ? current : best,
  );
}

/**
 * Single-point crossover - combine two parents
 * Preserves anchors and ensures unique base species
 */
export function crossover(
  parent1: Chromosome,
  parent2: Chromosome,
  mode: TournamentMode,
): Chromosome {
  const teamSize = mode === 'GBL' ? 3 : 6;
  const child = cloneChromosome(parent1);

  // Find mutable slots (non-anchors)
  const mutableSlots = getMutableSlots(child, teamSize);

  if (mutableSlots.length === 0) {
    return child; // All anchors, can't crossover
  }

  // Pick crossover point from mutable slots
  const crossoverPoint =
    mutableSlots[Math.floor(Math.random() * mutableSlots.length)];

  const usedBaseSpecies = new Set<string>();

  // Add all anchor species to used set
  for (let i = 0; i < teamSize; i++) {
    if (isAnchorSlot(i, child)) {
      usedBaseSpecies.add(getBaseSpecies(child.team[i]));
    }
  }

  // Add parent1 species before crossover point
  for (const slot of mutableSlots) {
    if (slot < crossoverPoint) {
      usedBaseSpecies.add(getBaseSpecies(child.team[slot]));
    }
  }

  // Copy from parent2 after crossover point, avoiding duplicates
  for (const slot of mutableSlots) {
    if (slot >= crossoverPoint) {
      const parent2Species = parent2.team[slot];
      const parent2Base = getBaseSpecies(parent2Species);

      if (!usedBaseSpecies.has(parent2Base)) {
        child.team[slot] = parent2Species;
        usedBaseSpecies.add(parent2Base);
      }
      // If duplicate, keep parent1's species (already set)
    }
  }

  // Final validation - ensure no duplicates
  if (!validateTeamUniqueness(child.team)) {
    // If crossover created duplicates, return parent1 unchanged
    return cloneChromosome(parent1);
  }

  return child;
}

/**
 * Mutation - randomly swap a non-anchor Pokémon
 * @param pokemonPool Available species pool
 * @param mutationRate Probability of mutation (0.0 to 1.0)
 */
export function mutate(
  chromosome: Chromosome,
  pokemonPool: string[],
  mutationRate: number,
  mode: TournamentMode,
): Chromosome {
  if (Math.random() > mutationRate) {
    return chromosome; // No mutation
  }

  const teamSize = mode === 'GBL' ? 3 : 6;
  const mutated = cloneChromosome(chromosome);

  // Find mutable slots
  const mutableSlots = getMutableSlots(mutated, teamSize);

  if (mutableSlots.length === 0) {
    return mutated; // All anchors, can't mutate
  }

  // Pick random mutable slot
  const slotToMutate =
    mutableSlots[Math.floor(Math.random() * mutableSlots.length)];

  // Find species not in team
  const usedBaseSpecies = new Set(mutated.team.map((s) => getBaseSpecies(s)));

  const availablePool = pokemonPool.filter(
    (s) => !usedBaseSpecies.has(getBaseSpecies(s)),
  );

  if (availablePool.length === 0) {
    return mutated; // No alternatives available
  }

  // Replace with random species from pool
  const newSpecies =
    availablePool[Math.floor(Math.random() * availablePool.length)];

  mutated.team[slotToMutate] = newSpecies;

  // Final validation - ensure no duplicates
  if (!validateTeamUniqueness(mutated.team)) {
    // If mutation created duplicates, return original
    return chromosome;
  }

  return mutated;
}

/**
 * Elitism - carry forward top N chromosomes unchanged
 */
export function selectElites(
  population: Chromosome[],
  eliteCount: number,
): Chromosome[] {
  const sorted = [...population].sort((a, b) => b.fitness - a.fitness);
  return sorted.slice(0, eliteCount).map(cloneChromosome);
}

/**
 * Create new generation
 */
export function createNextGeneration(
  population: Chromosome[],
  pokemonPool: string[],
  mode: TournamentMode,
  options: {
    eliteCount?: number;
    crossoverRate?: number;
    mutationRate?: number;
  } = {},
): Chromosome[] {
  const {
    eliteCount = Math.ceil(population.length * 0.1),
    crossoverRate = 0.8,
    mutationRate = 0.2,
  } = options;

  const nextGeneration: Chromosome[] = [];

  // 1. Keep elites
  const elites = selectElites(population, eliteCount);
  nextGeneration.push(...elites);

  // 2. Fill rest with crossover + mutation
  while (nextGeneration.length < population.length) {
    const parent1 = tournamentSelection(population);
    const parent2 = tournamentSelection(population);

    let child: Chromosome;

    if (Math.random() < crossoverRate) {
      child = crossover(parent1, parent2, mode);
    } else {
      child = cloneChromosome(parent1);
    }

    child = mutate(child, pokemonPool, mutationRate, mode);

    nextGeneration.push(child);
  }

  return nextGeneration;
}

/**
 * Adaptive mutation rate - increase if diversity is low
 */
export function getAdaptiveMutationRate(
  diversity: number,
  baseMutationRate: number = 0.2,
): number {
  // If diversity < 0.3, increase mutation
  if (diversity < 0.3) {
    return Math.min(baseMutationRate * 2, 0.5);
  }

  // If diversity > 0.7, decrease mutation
  if (diversity > 0.7) {
    return Math.max(baseMutationRate * 0.5, 0.05);
  }

  return baseMutationRate;
}
