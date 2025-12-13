import { NextRequest, NextResponse } from 'next/server';
import { generateTeam } from '@/lib/genetic/algorithm';
import type { TournamentMode } from '@/lib/types';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { mode, anchorPokemon } = body as {
      mode: TournamentMode;
      anchorPokemon?: string[];
    };

    // Validate mode
    if (!mode || (mode !== 'PlayPokemon' && mode !== 'GBL')) {
      return NextResponse.json(
        { error: 'Invalid tournament mode' },
        { status: 400 },
      );
    }

    // Run genetic algorithm
    const result = await generateTeam({
      mode,
      anchorPokemon: anchorPokemon || [],
      populationSize: 150,
      generations: 75,
    });

    return NextResponse.json({
      team: result.team,
      fitness: result.fitness,
    });
  } catch (error) {
    console.error('Error generating team:', error);
    return NextResponse.json(
      { error: 'Failed to generate team' },
      { status: 500 },
    );
  }
}
