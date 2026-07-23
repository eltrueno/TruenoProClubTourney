import type { ITeam } from '@trueno-proclub-tourney/shared';

export function flagUrl(countryCode: string): string {
  return `https://flagcdn.com/${countryCode.toLowerCase()}.svg`;
}

/**
 * URL del escudo de un club de EA FC a partir de su crestAssetId.
 * Ej: crestAssetId "1362" -> .../crests/256x256/l1362.png
 * Nota: el hash de versión de la URL es fijo, tocará actualizarlo si EA cambia de temporada/juego.
 */
export function eaCrestUrl(crestAssetId: string | undefined | null): string | null {
  if (!crestAssetId) return null;
  return `https://eafc24.content.easports.com/fifa/fltOnlineAssets/24B23FDE-7835-41C2-87A2-F453DFDB2E82/2024/fcweb/crests/256x256/l${crestAssetId}.png`;
}

/** Escudo de club si lo tiene, si no la bandera del país, si no null */
export function teamBadge(team: Pick<ITeam, 'logoUrl' | 'countryCode'> | undefined | null): string | null {
  if (!team) return null;
  if (team.logoUrl) return team.logoUrl;
  if (team.countryCode) return flagUrl(team.countryCode);
  return null;
}
