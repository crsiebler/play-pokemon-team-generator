'use client';

import { useEffect, useState } from 'react';
import type { Pokemon, TournamentMode } from '@/lib/types';

interface TeamDisplayProps {
  team: string[];
  mode: TournamentMode;
}

export default function TeamDisplay({ team, mode }: TeamDisplayProps) {
  const [pokemonData, setPokemonData] = useState<Pokemon[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Fetch full Pokémon data for the team
    fetch('/api/team-details', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ team }),
    })
      .then((res) => res.json())
      .then((data) => {
        setPokemonData(data.pokemon);
        setLoading(false);
      })
      .catch((err) => {
        console.error('Failed to fetch team details:', err);
        setLoading(false);
      });
  }, [team]);

  if (loading) {
    return (
      <div className="text-center text-sm text-gray-500 sm:text-base">
        Loading team data...
      </div>
    );
  }

  const typeColors: Record<string, string> = {
    normal: '#A8A878',
    fire: '#F08030',
    water: '#6890F0',
    electric: '#F8D030',
    grass: '#78C850',
    ice: '#98D8D8',
    fighting: '#C03028',
    poison: '#A040A0',
    ground: '#E0C068',
    flying: '#A890F0',
    psychic: '#F85888',
    bug: '#A8B820',
    rock: '#B8A038',
    ghost: '#705898',
    dragon: '#7038F8',
    dark: '#705848',
    steel: '#B8B8D0',
    fairy: '#EE99AC',
  };

  return (
    <div className="space-y-3 sm:space-y-4">
      {pokemonData.map((pokemon, index) => (
        <div
          key={index}
          className="rounded-xl border border-gray-200 bg-gradient-to-br from-white to-gray-50 p-4 transition-shadow hover:shadow-lg sm:p-5"
        >
          <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex-1">
              <h3 className="text-lg font-bold text-gray-900 sm:text-xl">
                {pokemon.speciesName}
              </h3>
              <p className="text-xs text-gray-500 sm:text-sm">
                Dex #{pokemon.dex}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {pokemon.types.map((type, typeIndex) => (
                <span
                  key={typeIndex}
                  className="rounded-full px-2 py-1 text-xs font-semibold text-white uppercase sm:px-3 sm:text-sm"
                  style={{
                    backgroundColor: typeColors[type.toLowerCase()] || '#999',
                  }}
                >
                  {type}
                </span>
              ))}
            </div>
          </div>

          <div className="mb-3 grid grid-cols-3 gap-2 text-xs sm:gap-3 sm:text-sm">
            <div className="rounded-lg bg-red-50 p-2 text-center">
              <div className="text-xs text-gray-600">Attack</div>
              <div className="text-base font-bold text-red-700 sm:text-lg">
                {pokemon.baseStats.atk}
              </div>
            </div>
            <div className="rounded-lg bg-blue-50 p-2 text-center">
              <div className="text-xs text-gray-600">Defense</div>
              <div className="text-base font-bold text-blue-700 sm:text-lg">
                {pokemon.baseStats.def}
              </div>
            </div>
            <div className="rounded-lg bg-green-50 p-2 text-center">
              <div className="text-xs text-gray-600">HP</div>
              <div className="text-base font-bold text-green-700 sm:text-lg">
                {pokemon.baseStats.hp}
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <div>
              <h4 className="mb-1 text-xs font-semibold text-gray-600 sm:text-sm">
                Recommended Fast Move
              </h4>
              <div className="flex flex-wrap gap-1">
                {pokemon.recommendedMoveset?.fastMove ? (
                  <span className="rounded bg-green-100 px-2 py-1 text-xs font-medium text-green-700 sm:px-3 sm:text-sm">
                    ⭐ {pokemon.recommendedMoveset.fastMove.replace(/_/g, ' ')}
                  </span>
                ) : (
                  <span className="text-xs text-gray-400">
                    No recommendation
                  </span>
                )}
              </div>
            </div>

            <div>
              <h4 className="mb-1 text-xs font-semibold text-gray-600 sm:text-sm">
                Recommended Charged Moves
              </h4>
              <div className="flex flex-wrap gap-1">
                {pokemon.recommendedMoveset?.chargedMove1 && (
                  <span className="rounded bg-purple-100 px-2 py-1 text-xs font-medium text-purple-700 sm:px-3 sm:text-sm">
                    ⭐{' '}
                    {pokemon.recommendedMoveset.chargedMove1.replace(/_/g, ' ')}
                  </span>
                )}
                {pokemon.recommendedMoveset?.chargedMove2 && (
                  <span className="rounded bg-purple-100 px-2 py-1 text-xs font-medium text-purple-700 sm:px-3 sm:text-sm">
                    ⭐{' '}
                    {pokemon.recommendedMoveset.chargedMove2.replace(/_/g, ' ')}
                  </span>
                )}
                {!pokemon.recommendedMoveset?.chargedMove1 &&
                  !pokemon.recommendedMoveset?.chargedMove2 && (
                    <span className="text-xs text-gray-400">
                      No recommendations
                    </span>
                  )}
              </div>
            </div>
          </div>

          {pokemon.tags?.includes('shadow') && (
            <div className="mt-3 inline-block rounded bg-purple-900 px-3 py-1 text-xs font-bold text-purple-100">
              SHADOW
            </div>
          )}
        </div>
      ))}

      <div className="mt-4 rounded-lg border border-blue-200 bg-blue-50 p-3 sm:mt-6 sm:p-4">
        <h4 className="mb-2 font-bold text-blue-900">💡 Team Notes</h4>
        <ul className="space-y-1 text-xs text-blue-800 sm:text-sm">
          <li>
            • This team is optimized for{' '}
            {mode === 'GBL' ? 'GO Battle League' : 'Play! Pokémon'} format
          </li>
          <li>• Check type coverage and adjust movesets as needed</li>
          {mode === 'PlayPokemon' && (
            <li>
              • Remember to select 3 Pokémon for each battle from your 6-team
              roster
            </li>
          )}
        </ul>
      </div>
    </div>
  );
}
