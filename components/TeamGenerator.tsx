'use client';

import { useState, useEffect } from 'react';
import clsx from 'clsx';
import { TournamentMode } from '@/lib/types';

interface TeamGeneratorProps {
  mode: TournamentMode;
  pokemonList: string[];
  onAnchorsChange: (anchors: string[]) => void;
  onExclusionsChange: (exclusions: string[]) => void;
}

export default function TeamGenerator({
  mode,
  pokemonList,
  onAnchorsChange,
  onExclusionsChange,
}: TeamGeneratorProps) {
  const maxAnchors = mode === 'GBL' ? 3 : 6;
  const [anchorInputs, setAnchorInputs] = useState<string[]>(
    Array(maxAnchors).fill(''),
  );
  const [filteredSuggestions, setFilteredSuggestions] = useState<string[][]>(
    Array(maxAnchors).fill([]),
  );
  const [excludedPokemon, setExcludedPokemon] = useState<string[]>([]);
  const [exclusionInput, setExclusionInput] = useState<string>('');
  const [exclusionSuggestions, setExclusionSuggestions] = useState<string[]>(
    [],
  );

  // Update parent when anchors change - but only non-empty values
  useEffect(() => {
    const validAnchors = anchorInputs.filter(Boolean);
    onAnchorsChange(validAnchors);
  }, [anchorInputs]); // Remove onAnchorsChange from dependencies to prevent infinite loop

  // Update parent when exclusions change
  useEffect(() => {
    onExclusionsChange(excludedPokemon);
  }, [excludedPokemon]);

  // Reset anchors when mode changes
  useEffect(() => {
    setAnchorInputs(Array(maxAnchors).fill(''));
    setFilteredSuggestions(Array(maxAnchors).fill([]));
    setExcludedPokemon([]);
    setExclusionInput('');
    setExclusionSuggestions([]);
  }, [mode, maxAnchors]);

  const handleInputChange = (index: number, value: string) => {
    const newInputs = [...anchorInputs];
    newInputs[index] = value;
    setAnchorInputs(newInputs);

    // Filter suggestions
    if (value.length >= 2) {
      const filtered = pokemonList
        .filter((p) => p.toLowerCase().includes(value.toLowerCase()))
        .slice(0, 10);

      const newSuggestions = [...filteredSuggestions];
      newSuggestions[index] = filtered;
      setFilteredSuggestions(newSuggestions);
    } else {
      const newSuggestions = [...filteredSuggestions];
      newSuggestions[index] = [];
      setFilteredSuggestions(newSuggestions);
    }
  };

  const handleSuggestionClick = (index: number, suggestion: string) => {
    const newInputs = [...anchorInputs];
    newInputs[index] = suggestion;
    setAnchorInputs(newInputs);

    const newSuggestions = [...filteredSuggestions];
    newSuggestions[index] = [];
    setFilteredSuggestions(newSuggestions);
  };

  const clearAnchor = (index: number) => {
    const newInputs = [...anchorInputs];
    newInputs[index] = '';
    setAnchorInputs(newInputs);

    const newSuggestions = [...filteredSuggestions];
    newSuggestions[index] = [];
    setFilteredSuggestions(newSuggestions);
  };

  const handleExclusionInputChange = (value: string) => {
    setExclusionInput(value);

    // Filter suggestions (exclude already excluded and anchored Pokemon)
    if (value.length >= 2) {
      const filtered = pokemonList
        .filter((p) => {
          const lowerValue = value.toLowerCase();
          const lowerPokemon = p.toLowerCase();
          const isAlreadyExcluded = excludedPokemon.includes(p);
          const isAnchored = anchorInputs.includes(p);
          return (
            lowerPokemon.includes(lowerValue) &&
            !isAlreadyExcluded &&
            !isAnchored
          );
        })
        .slice(0, 10);
      setExclusionSuggestions(filtered);
    } else {
      setExclusionSuggestions([]);
    }
  };

  const handleExclusionSelect = (pokemon: string) => {
    setExclusionInput(pokemon);
    setExclusionSuggestions([]);
  };

  const addExclusion = () => {
    if (
      exclusionInput &&
      !excludedPokemon.includes(exclusionInput) &&
      !anchorInputs.includes(exclusionInput) &&
      pokemonList.includes(exclusionInput)
    ) {
      setExcludedPokemon([...excludedPokemon, exclusionInput]);
      setExclusionInput('');
      setExclusionSuggestions([]);
    }
  };

  const removeExclusion = (pokemon: string) => {
    setExcludedPokemon(excludedPokemon.filter((p) => p !== pokemon));
  };

  const handleExclusionKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addExclusion();
    }
  };

  return (
    <div className="mb-6 sm:mb-8">
      <label className="mb-3 block text-sm font-semibold text-gray-700">
        Anchor Pokémon (Optional)
      </label>
      <p className="mb-4 text-xs text-gray-600 sm:text-sm">
        Select up to {maxAnchors} Pokémon you want to use. The algorithm will
        build a team around them.
      </p>

      <div className="space-y-2 sm:space-y-3">
        {anchorInputs.map((input, index) => (
          <div key={index} className="relative">
            <div className="flex items-center gap-2">
              <span className="w-6 text-xs font-medium text-gray-500 sm:w-8 sm:text-sm">
                #{index + 1}
              </span>
              <div className="relative flex-1">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => handleInputChange(index, e.target.value)}
                  placeholder={`Pokémon ${index + 1}`}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:outline-none sm:text-base"
                />
                {input && (
                  <button
                    onClick={() => clearAnchor(index)}
                    className="absolute top-1/2 right-2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    aria-label="Clear input"
                  >
                    <svg
                      className="h-4 w-4 sm:h-5 sm:w-5"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M6 18L18 6M6 6l12 12"
                      />
                    </svg>
                  </button>
                )}

                {/* Autocomplete Dropdown */}
                {filteredSuggestions[index].length > 0 && (
                  <div className="absolute z-10 mt-1 max-h-48 w-full overflow-y-auto rounded-lg border border-gray-300 bg-white shadow-lg sm:max-h-60">
                    {filteredSuggestions[index].map((suggestion, suggIdx) => (
                      <button
                        key={suggIdx}
                        onClick={() => handleSuggestionClick(index, suggestion)}
                        className={clsx(
                          'block w-full px-3 py-2 text-left text-sm transition-colors hover:bg-blue-50 sm:text-base',
                          suggIdx === 0 && 'rounded-t-lg',
                          suggIdx === filteredSuggestions[index].length - 1 &&
                            'rounded-b-lg',
                        )}
                      >
                        {suggestion}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Exclusion Section */}
      <div className="mt-6 border-t pt-6">
        <label className="mb-3 block text-sm font-semibold text-gray-700">
          Exclude Pokémon (Optional)
        </label>
        <p className="mb-4 text-xs text-gray-600 sm:text-sm">
          Exclude specific Pokémon from being selected in generated teams.
        </p>

        <div className="mb-4 flex gap-2">
          <div className="relative flex-1">
            <input
              type="text"
              value={exclusionInput}
              onChange={(e) => handleExclusionInputChange(e.target.value)}
              onKeyPress={handleExclusionKeyPress}
              placeholder="Type to search Pokémon..."
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-red-500 focus:ring-2 focus:ring-red-500 focus:outline-none sm:text-base"
            />

            {/* Autocomplete Dropdown */}
            {exclusionSuggestions.length > 0 && (
              <div className="absolute z-10 mt-1 max-h-48 w-full overflow-y-auto rounded-lg border border-gray-300 bg-white shadow-lg sm:max-h-60">
                {exclusionSuggestions.map((suggestion, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleExclusionSelect(suggestion)}
                    className={clsx(
                      'block w-full px-3 py-2 text-left text-sm transition-colors hover:bg-red-50 sm:text-base',
                      idx === 0 && 'rounded-t-lg',
                      idx === exclusionSuggestions.length - 1 && 'rounded-b-lg',
                    )}
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            )}
          </div>

          <button
            onClick={addExclusion}
            disabled={
              !exclusionInput ||
              excludedPokemon.includes(exclusionInput) ||
              !pokemonList.includes(exclusionInput)
            }
            className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-red-700 disabled:cursor-not-allowed disabled:bg-gray-300 disabled:text-gray-500 sm:text-base"
          >
            Add
          </button>
        </div>

        {/* Excluded Pokémon Pills */}
        {excludedPokemon.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {excludedPokemon.map((pokemon) => (
              <button
                key={pokemon}
                onClick={() => removeExclusion(pokemon)}
                className="group inline-flex items-center gap-1.5 rounded-full bg-red-100 px-3 py-1.5 text-xs font-medium text-red-800 transition-all hover:bg-red-200 sm:text-sm"
              >
                <span>{pokemon}</span>
                <svg
                  className="h-3 w-3 text-red-600 group-hover:text-red-800 sm:h-4 sm:w-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
