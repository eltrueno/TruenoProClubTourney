import type { ITournamentConfig } from '@trueno-proclub-tourney/shared';

/**
 * Carga src/config/tournament.<TOURNAMENT_CONFIG>.ts segun la env var.
 * Para un torneo nuevo: copia tournament.example.ts a tournament.<nombre>.ts,
 * ajusta los valores, y cambia TOURNAMENT_CONFIG en el .env. Sin tocar mas codigo.
 */
export async function loadTournamentConfig(): Promise<ITournamentConfig> {
  const name = process.env.TOURNAMENT_CONFIG ?? 'example';
  const mod = await import(`./tournament.${name}.js`);

  if (!mod.tournamentConfig) {
    throw new Error(
      `El archivo tournament.${name}.ts no exporta "tournamentConfig"`
    );
  }

  return mod.tournamentConfig as ITournamentConfig;
}
