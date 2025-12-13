import {
  calculateOffensiveCoverage,
  calculateDefensiveCoverage,
  calculateEffectiveness,
} from '../coverage/typeChart';
import {
  getMoveByMoveId,
  getMovesetTypes,
  evaluateMoveSynergy,
  calculatePressureScore,
} from '../data/moves';
import { getPokemonBySpeciesId } from '../data/pokemon';
import {
  getAllRankingsForPokemon,
  speciesIdToRankingName,
  getMetaThreats,
} from '../data/rankings';
import type { Chromosome, TournamentMode } from '../types';

/**
 * Calculate type coverage score (30% weight)
 * Evaluates offensive and defensive type coverage
 */
function calculateTypeCoverageScore(team: string[]): number {
  const teamPokemon = team
    .map((id) => getPokemonBySpeciesId(id))
    .filter(Boolean);

  if (teamPokemon.length === 0) return 0;

  // Get all charged move types for offensive coverage
  const allMoveTypes = new Set<string>();
  for (const pokemon of teamPokemon) {
    for (const moveId of pokemon!.chargedMoves) {
      const move = getMoveByMoveId(moveId);
      if (move) {
        allMoveTypes.add(move.type);
      }
    }
  }

  // Calculate offensive coverage
  const offensiveCoverage = calculateOffensiveCoverage(
    Array.from(allMoveTypes),
  );
  const offensiveScore = offensiveCoverage.coverageScore / 18; // Normalize to 0-1

  // Calculate defensive coverage
  const teamTypes = teamPokemon.map((p) => p!.types);
  const defensiveCoverage = calculateDefensiveCoverage(teamTypes);
  const defensiveScore = Math.max(0, defensiveCoverage.coverageScore / 10); // Normalize

  // Combined: 60% offensive, 40% defensive
  return offensiveScore * 0.6 + defensiveScore * 0.4;
}

/**
 * Calculate average ranking score (25% weight)
 * Uses all four ranking CSVs
 */
function calculateRankingScore(team: string[]): number {
  let totalScore = 0;
  let validCount = 0;

  for (const speciesId of team) {
    const rankingName = speciesIdToRankingName(speciesId);
    const rankings = getAllRankingsForPokemon(rankingName);

    if (rankings.average > 0) {
      totalScore += rankings.average;
      validCount++;
    }
  }

  if (validCount === 0) return 0;

  // Normalize to 0-1 (assuming max score is 100)
  return totalScore / validCount / 100;
}

/**
 * Calculate strategy viability score (20% weight)
 * Checks if team can form valid ABA/ABB/ABC lineups
 */
function calculateStrategyScore(team: string[], mode: TournamentMode): number {
  // GBL uses all 3, no lineup flexibility
  if (mode === 'GBL') {
    return evaluateThreeLineup(team);
  }

  // Play! Pokémon: evaluate best 3-from-6 lineup
  return evaluateBestLineup(team);
}

/**
 * Evaluate a 3-Pokémon lineup for strategic patterns
 */
function evaluateThreeLineup(lineup: string[]): number {
  if (lineup.length !== 3) return 0;

  const [lead, switch_, closer] = lineup.map((id) => getPokemonBySpeciesId(id));

  if (!lead || !switch_ || !closer) return 0;

  let score = 0;

  // Check for ABA pattern (lead and closer similar)
  const leadTypes = new Set(lead.types);
  const closerTypes = new Set(closer.types);
  const sharedTypes = [...leadTypes].filter((t) => closerTypes.has(t));

  if (sharedTypes.length > 0) {
    score += 0.3; // ABA bonus
  }

  // Check for ABB pattern (switch and closer cover lead's weaknesses)
  const switchTypes = new Set(switch_.types);
  const closerHasResist = [...closerTypes].some((t) => switchTypes.has(t));

  if (closerHasResist) {
    score += 0.3; // ABB bonus
  }

  // ABC bonus for diverse typing
  const allTypes = new Set([...lead.types, ...switch_.types, ...closer.types]);
  if (allTypes.size >= 5) {
    score += 0.4; // ABC bonus
  }

  return Math.min(score, 1.0);
}

/**
 * Evaluate best 3-from-6 lineup for Play! Pokémon
 */
function evaluateBestLineup(team: string[]): number {
  if (team.length !== 6) return 0;

  let bestScore = 0;

  // Try different 3-Pokémon combinations
  for (let i = 0; i < 6; i++) {
    for (let j = 0; j < 6; j++) {
      for (let k = 0; k < 6; k++) {
        if (i !== j && j !== k && i !== k) {
          const lineup = [team[i], team[j], team[k]];
          const score = evaluateThreeLineup(lineup);
          bestScore = Math.max(bestScore, score);
        }
      }
    }
  }

  return bestScore;
}

/**
 * Calculate meta threat coverage (15% weight)
 * How well team handles top 50 meta Pokémon
 */
function calculateMetaThreatScore(team: string[]): number {
  const metaThreats = getMetaThreats();
  const teamPokemon = team
    .map((id) => getPokemonBySpeciesId(id))
    .filter(Boolean);

  if (teamPokemon.length === 0) return 0;

  let coveredThreats = 0;

  for (const threat of metaThreats.slice(0, 50)) {
    const threatTypes = [threat['Type 1'], threat['Type 2']].filter(
      (t) => t !== 'none',
    );

    // Check if any team member has super effective move against threat
    for (const pokemon of teamPokemon) {
      for (const moveId of pokemon!.chargedMoves) {
        const move = getMoveByMoveId(moveId);
        if (move) {
          const effectiveness = calculateEffectiveness(move.type, threatTypes);
          if (effectiveness >= 1.6) {
            coveredThreats++;
            break;
          }
        }
      }
    }
  }

  return coveredThreats / 50;
}

/**
 * Calculate energy breakpoint score (10% weight)
 * Evaluates move synergy and fast charging
 */
function calculateEnergyScore(team: string[]): number {
  const teamPokemon = team
    .map((id) => getPokemonBySpeciesId(id))
    .filter(Boolean);

  if (teamPokemon.length === 0) return 0;

  let totalSynergy = 0;
  let totalPressure = 0;

  for (const pokemon of teamPokemon) {
    if (!pokemon) continue;

    // Get moveset synergy
    const chargedMoves = pokemon.chargedMoves.slice(0, 2);
    if (chargedMoves.length === 2) {
      const synergy = evaluateMoveSynergy(chargedMoves[0], chargedMoves[1]);
      totalSynergy += synergy.synergyScore / 3.5; // Max synergy is ~3.5
    }

    // Get pressure score (fast charging)
    if (pokemon.fastMoves.length > 0 && chargedMoves.length > 0) {
      const pressure = calculatePressureScore(
        pokemon.fastMoves[0],
        chargedMoves[0],
      );
      totalPressure += Math.min(pressure * 2, 1); // Cap at 1
    }
  }

  const avgSynergy = totalSynergy / teamPokemon.length;
  const avgPressure = totalPressure / teamPokemon.length;

  return avgSynergy * 0.5 + avgPressure * 0.5;
}

/**
 * Calculate surprise factor (GBL bonus, +15%)
 * Rewards off-meta picks and unexpected movesets
 */
function calculateSurpriseFactor(team: string[]): number {
  let surpriseScore = 0;

  for (const speciesId of team) {
    const rankingName = speciesIdToRankingName(speciesId);
    const rankings = getAllRankingsForPokemon(rankingName);

    // Off-meta bonus (score 60-79)
    if (rankings.overall >= 60 && rankings.overall < 80) {
      surpriseScore += 0.3;
    }

    // Spice pick bonus (score < 60)
    if (rankings.overall > 0 && rankings.overall < 60) {
      surpriseScore += 0.5;
    }
  }

  return Math.min(surpriseScore / team.length, 1.0);
}

/**
 * Calculate consistency (Play! Pokémon bonus, +10%)
 * Rewards generalist Pokémon that handle many matchups
 */
function calculateConsistency(team: string[]): number {
  let consistencyScore = 0;

  for (const speciesId of team) {
    const rankingName = speciesIdToRankingName(speciesId);
    const rankings = getAllRankingsForPokemon(rankingName);

    // High average across all roles = consistent
    if (rankings.average >= 85) {
      consistencyScore += 1.0;
    } else if (rankings.average >= 75) {
      consistencyScore += 0.5;
    }
  }

  return consistencyScore / team.length;
}

/**
 * Calculate anchor synergy bonus
 * Rewards teams that support anchor Pokémon by covering weaknesses AND threatening their counters
 */
function calculateAnchorSynergy(
  team: string[],
  anchorIndices: number[],
): number {
  if (anchorIndices.length === 0) return 0;

  const anchors = anchorIndices
    .map((i) => getPokemonBySpeciesId(team[i]))
    .filter(Boolean);
  const nonAnchors = team
    .map((id, i) =>
      anchorIndices.includes(i) ? null : getPokemonBySpeciesId(id),
    )
    .filter(Boolean);

  if (anchors.length === 0 || nonAnchors.length === 0) return 0;

  let synergyScore = 0;

  // For each anchor, evaluate defensive and offensive support
  for (const anchor of anchors) {
    const weaknesses = new Set<string>();

    // Find anchor's weaknesses (types that hit it super-effectively)
    for (const type of Object.keys(require('@/data/type-effectiveness.json'))) {
      const effectiveness = calculateEffectiveness(type, anchor!.types);
      if (effectiveness >= 1.6) {
        weaknesses.add(type);
      }
    }

    // Defensive synergy: Check if non-anchors resist anchor's weaknesses
    let defensiveCoverage = 0;
    for (const weakness of weaknesses) {
      for (const nonAnchor of nonAnchors) {
        const resists =
          calculateEffectiveness(weakness, nonAnchor!.types) <= 0.625;
        if (resists) {
          defensiveCoverage++;
          break;
        }
      }
    }

    const defensiveScore =
      weaknesses.size > 0 ? defensiveCoverage / weaknesses.size : 0;

    // Offensive synergy: Check if non-anchors can hit anchor's threats super-effectively
    let offensiveCoverage = 0;
    let totalChecks = 0;
    for (const weakness of weaknesses) {
      totalChecks++;
      for (const nonAnchor of nonAnchors) {
        // Check if non-anchor has moves that hit this weakness type super-effectively
        for (const moveId of nonAnchor!.chargedMoves) {
          const move = getMoveByMoveId(moveId);
          if (move) {
            // Get effectiveness of move against Pokemon of the weakness type
            // (e.g., if anchor weak to fire, does non-anchor have water moves?)
            const moveEffectiveness = calculateEffectiveness(move.type, [
              weakness,
            ]);
            if (moveEffectiveness >= 1.6) {
              offensiveCoverage++;
              break;
            }
          }
        }
      }
    }

    const offensiveScore =
      totalChecks > 0 ? offensiveCoverage / totalChecks : 0;

    // Combined: 60% defensive, 40% offensive
    synergyScore += defensiveScore * 0.6 + offensiveScore * 0.4;
  }

  return synergyScore / anchors.length;
}

/**
 * Calculate type diversity bonus
 * Penalizes teams with too many of the same type
 */
function calculateTypeDiversity(team: string[]): number {
  const teamPokemon = team
    .map((id) => getPokemonBySpeciesId(id))
    .filter(Boolean);

  if (teamPokemon.length === 0) return 0;

  const typeCount = new Map<string, number>();

  // Count each type occurrence
  for (const pokemon of teamPokemon) {
    for (const type of pokemon!.types) {
      typeCount.set(type, (typeCount.get(type) || 0) + 1);
    }
  }

  // Calculate diversity score - penalize duplicate types
  let diversityScore = 1.0;

  for (const count of typeCount.values()) {
    if (count >= 3) {
      diversityScore -= 0.3; // Heavy penalty for 3+ of same type
    } else if (count === 2) {
      diversityScore -= 0.1; // Light penalty for 2 of same type
    }
  }

  return Math.max(0, diversityScore);
}

/**
 * Calculate stat balance score
 * Rewards teams with a good mix of bulky and offensive Pokémon
 */
function calculateStatBalance(team: string[]): number {
  const teamPokemon = team
    .map((id) => getPokemonBySpeciesId(id))
    .filter(Boolean);

  if (teamPokemon.length === 0) return 0;

  let bulkyCount = 0;
  let balancedCount = 0;
  let attackCount = 0;

  for (const pokemon of teamPokemon) {
    const { atk, def, hp } = pokemon!.baseStats;

    // Calculate bulk ratio: (def + hp) / atk
    const bulkRatio = (def + hp) / atk;

    // Classify Pokemon by stat distribution
    if (bulkRatio >= 2.5) {
      bulkyCount++; // High bulk (e.g., Clodsire, Bastiodon)
    } else if (bulkRatio >= 1.8) {
      balancedCount++; // Balanced (e.g., Azumarill, Medicham)
    } else {
      attackCount++; // Attack-weighted (e.g., Scizor, Primeape)
    }
  }

  const totalCount = teamPokemon.length;

  // Ideal distribution: 1-2 bulky, 2-3 balanced, 1-2 attack
  // Calculate score based on how close we are to ideal
  let score = 1.0;

  // Penalize teams with too many attack-weighted Pokemon
  if (attackCount > totalCount * 0.5) {
    score -= 0.3; // Heavy penalty for >50% glass cannons
  } else if (attackCount > totalCount * 0.4) {
    score -= 0.15; // Light penalty for >40% glass cannons
  }

  // Penalize teams with no bulk at all
  if (bulkyCount === 0 && balancedCount <= 1) {
    score -= 0.3; // Team too frail
  }

  // Bonus for having at least one true tank
  if (bulkyCount >= 1) {
    score += 0.1;
  }

  // Bonus for good balance
  if (balancedCount >= 2) {
    score += 0.1;
  }

  return Math.max(0, score);
}

/**
 * Calculate shadow preference bonus
 * Rewards shadow forms for attack-weighted Pokémon
 */
function calculateShadowPreference(team: string[]): number {
  const teamPokemon = team
    .map((id) => getPokemonBySpeciesId(id))
    .filter(Boolean);

  if (teamPokemon.length === 0) return 0;

  let score = 0;

  for (const pokemon of teamPokemon) {
    const { atk, def, hp } = pokemon!.baseStats;
    const bulkRatio = (def + hp) / atk;
    const isShadow = pokemon!.speciesId.includes('_shadow');

    // For attack-weighted Pokemon (bulkRatio < 1.8), prefer shadow
    if (bulkRatio < 1.8) {
      if (isShadow) {
        score += 0.15; // Bonus for shadow on glass cannon
      } else {
        // Check if shadow variant exists in pool
        const shadowId = pokemon!.speciesId.includes('_shadow')
          ? pokemon!.speciesId
          : pokemon!.speciesId + '_shadow';
        const shadowVariant = getPokemonBySpeciesId(shadowId);

        // Small penalty if shadow exists but wasn't chosen
        if (shadowVariant && shadowVariant.tags?.includes('shadow')) {
          score -= 0.05;
        }
      }
    }

    // For bulky Pokemon (bulkRatio >= 2.5), prefer non-shadow
    if (bulkRatio >= 2.5 && isShadow) {
      score -= 0.05; // Slight penalty for shadow on tank
    }
  }

  return score / teamPokemon.length;
}

/**
 * Calculate type synergy score
 * Penalizes teams with stacked weaknesses (multiple Pokemon weak to same type)
 * Rewards complementary typing where teammates cover each other's weaknesses
 */
function calculateTypeSynergy(team: string[]): number {
  const teamPokemon = team
    .map((id) => getPokemonBySpeciesId(id))
    .filter(Boolean);

  if (teamPokemon.length === 0) return 0;

  // Map each type to count of Pokemon weak to it
  const weaknessCounts = new Map<string, number>();

  // Also track which Pokemon have which weaknesses
  const pokemonWeaknesses: string[][] = [];

  // Identify all weaknesses for each Pokemon
  for (const pokemon of teamPokemon) {
    const weaknesses = new Set<string>();

    // Check effectiveness of all types against this Pokemon
    for (const type of [
      'normal',
      'fire',
      'water',
      'electric',
      'grass',
      'ice',
      'fighting',
      'poison',
      'ground',
      'flying',
      'psychic',
      'bug',
      'rock',
      'ghost',
      'dragon',
      'dark',
      'steel',
      'fairy',
    ]) {
      const effectiveness = calculateEffectiveness(type, pokemon!.types);
      if (effectiveness >= 1.6) {
        weaknesses.add(type);
        weaknessCounts.set(type, (weaknessCounts.get(type) || 0) + 1);
      }
    }

    pokemonWeaknesses.push(Array.from(weaknesses));
  }

  let synergyScore = 1.0;

  // Penalize stacked weaknesses
  for (const [_type, count] of weaknessCounts.entries()) {
    if (count >= 4) {
      synergyScore -= 0.4; // Devastating - 4+ Pokemon weak to same type
    } else if (count === 3) {
      synergyScore -= 0.25; // Very bad - 3 Pokemon weak to same type (e.g., Dark + Steel + Psychic all weak to Fighting)
    } else if (count === 2) {
      synergyScore -= 0.1; // Moderate penalty - 2 Pokemon share weakness
    }
  }

  // Reward coverage - check if teammates resist each other's weaknesses
  let coverageBonus = 0;
  const totalWeaknessChecks = pokemonWeaknesses.length;

  for (let i = 0; i < pokemonWeaknesses.length; i++) {
    const weaknesses = pokemonWeaknesses[i];
    let coveredCount = 0;

    // Check if other teammates resist these weaknesses
    for (const weakness of weaknesses) {
      for (let j = 0; j < teamPokemon.length; j++) {
        if (i !== j) {
          const teammate = teamPokemon[j];
          const resistanceEffectiveness = calculateEffectiveness(
            weakness,
            teammate!.types,
          );

          // If teammate resists this weakness (0.625 or less)
          if (resistanceEffectiveness <= 0.625) {
            coveredCount++;
            break; // Only count once per weakness
          }
        }
      }
    }

    // Calculate coverage ratio for this Pokemon
    if (weaknesses.length > 0) {
      coverageBonus += coveredCount / weaknesses.length;
    }
  }

  // Normalize coverage bonus
  if (totalWeaknessChecks > 0) {
    synergyScore += (coverageBonus / totalWeaknessChecks) * 0.3;
  }

  return Math.max(0, synergyScore);
}

/**
 * Main fitness function
 * Combines all scoring components with mode-specific adjustments
 */
export function calculateFitness(
  chromosome: Chromosome,
  mode: TournamentMode,
): number {
  const { team, anchors } = chromosome;

  // Base fitness components
  const typeCoverage = calculateTypeCoverageScore(team) * 0.25; // Reduced from 0.3
  const avgRanking = calculateRankingScore(team) * 0.15; // Reduced from 0.2
  const strategyViability = calculateStrategyScore(team, mode) * 0.1; // Reduced from 0.15
  const metaThreatCoverage = calculateMetaThreatScore(team) * 0.05; // Reduced from 0.1
  const energyBreakpoints = calculateEnergyScore(team) * 0.05; // Keep at 0.05

  // Type diversity bonus (penalize teams with too many of same type)
  const typeDiversity = calculateTypeDiversity(team) * 0.08; // Reduced from 0.1
  
  // Type synergy (penalize stacked weaknesses, reward coverage)
  const typeSynergy = calculateTypeSynergy(team) * 0.2; // NEW - high weight for synergy

  // Stat balance (bulk vs attack distribution)
  const statBalance = calculateStatBalance(team) * 0.12; // Reduced from 0.15

  // Shadow preference (shadow for glass cannons)
  const shadowPreference = calculateShadowPreference(team) * 0.08; // Reduced from 0.1

  let fitness =
    typeCoverage +
    avgRanking +
    strategyViability +
    metaThreatCoverage +
    energyBreakpoints +
    typeDiversity +
    typeSynergy +
    statBalance +
    shadowPreference;

  // Mode-specific adjustments
  if (mode === 'GBL') {
    const surpriseFactor = calculateSurpriseFactor(team) * 0.15;
    fitness += surpriseFactor;
  }

  if (mode === 'PlayPokemon') {
    const consistency = calculateConsistency(team) * 0.1;
    fitness += consistency;
  }

  // Anchor synergy bonus (SIGNIFICANTLY increased when anchors present)
  if (anchors && anchors.length > 0) {
    // When anchors are present, make synergy the dominant factor
    const anchorSynergy = calculateAnchorSynergy(team, anchors) * 0.5;
    fitness += anchorSynergy;
  }

  return fitness;
}

/**
 * Calculate fitness for entire population
 */
export function evaluatePopulation(
  population: Chromosome[],
  mode: TournamentMode,
): void {
  for (const chromosome of population) {
    chromosome.fitness = calculateFitness(chromosome, mode);
  }
}
