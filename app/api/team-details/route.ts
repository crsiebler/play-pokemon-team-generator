import { NextRequest, NextResponse } from 'next/server';
import { getPokemonBySpeciesId } from '@/lib/data/pokemon';
import { getOptimalMoveset } from '@/lib/data/rankings';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { team } = body as { team: string[] };

    if (!team || !Array.isArray(team)) {
      return NextResponse.json({ error: 'Invalid team data' }, { status: 400 });
    }

    // Fetch full Pokémon data for each team member with optimal movesets
    const pokemonData = team
      .map((speciesId) => {
        const pokemon = getPokemonBySpeciesId(speciesId);
        if (!pokemon) return null;

        // Get optimal moveset from rankings
        const moveset = getOptimalMoveset(pokemon.speciesName);

        return {
          ...pokemon,
          recommendedMoveset: moveset,
        };
      })
      .filter(Boolean);

    return NextResponse.json({
      pokemon: pokemonData,
    });
  } catch (error) {
    console.error('Error fetching team details:', error);
    return NextResponse.json(
      { error: 'Failed to fetch team details' },
      { status: 500 },
    );
  }
}
