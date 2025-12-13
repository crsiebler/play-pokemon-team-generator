import { getGreatLeaguePokemon } from '@/lib/data/pokemon';
import { HomePage } from '@/components/HomePage';

export default function Page() {
  const availablePokemon = getGreatLeaguePokemon();
  const pokemonNames = availablePokemon.map((p) => p.speciesName);

  return <HomePage pokemonList={pokemonNames} />;
}
