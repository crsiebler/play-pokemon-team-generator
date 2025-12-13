import { NextResponse } from 'next/server';
import { getGreatLeaguePokemon } from '@/lib/data/pokemon';

export async function GET() {
  try {
    const availablePokemon = getGreatLeaguePokemon();

    // Return list of speciesNames for autocomplete
    const pokemonNames = availablePokemon.map((p) => p.speciesName);

    return NextResponse.json({
      pokemon: pokemonNames,
      count: pokemonNames.length,
    });
  } catch (error) {
    console.error('Error fetching Pokémon list:', error);
    return NextResponse.json(
      { error: 'Failed to fetch Pokémon list' },
      { status: 500 },
    );
  }
}
