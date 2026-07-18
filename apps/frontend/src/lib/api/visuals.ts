import type { ITeam } from '@trueno-proclub-tourney/shared';

export function flagUrl(countryCode: string): string {
  return `https://flagcdn.com/${countryCode.toLowerCase()}.svg`;
}

/** Escudo de club si lo tiene, si no la bandera del país, si no null */
export function teamBadge(team: Pick<ITeam, 'logoUrl' | 'countryCode'> | undefined | null): string | null {
  if (!team) return null;
  if (team.logoUrl) return team.logoUrl;
  if (team.countryCode) return flagUrl(team.countryCode);
  return null;
}
