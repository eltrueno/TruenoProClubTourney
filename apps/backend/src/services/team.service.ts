import type { ITeam, ITeamCreateInput } from '@trueno-proclub-tourney/shared';
import { TeamModel, type ITeamDoc } from '../models/Team.model.js';
import { CaptainModel } from '../models/Captain.model.js';
import * as eaService from './ea.service.js';
import { getPublicUserName } from './authUser.service.js';
import { getSettings } from './settings.service.js';

function toITeam(doc: ITeamDoc): ITeam {
  return {
    id: doc._id.toString(),
    name: doc.name,
    countryCode: doc.countryCode,
    logoUrl: doc.logoUrl,
    group: doc.group,
    eaClubId: doc.eaClubId,
    eaClubName: doc.eaClubName,
    eaClubIdSetBy: doc.eaClubIdSetBy,
    eaClubIdSetAt: doc.eaClubIdSetAt?.toISOString(),
    createdAt: doc.createdAt.toISOString(),
  };
}

/** Añade captainName a una lista de equipos haciendo un solo join contra Captain (sin llamar al auth server, usa el userName ya cacheado ahi). */
async function attachCaptainNames(teams: ITeam[]): Promise<ITeam[]> {
  if (teams.length === 0) return teams;
  const captains = await CaptainModel.find({ teamId: { $in: teams.map((t) => t.id) } });
  const nameByTeamId = new Map(captains.map((c) => [c.teamId.toString(), c.userName]));
  return teams.map((t) => ({ ...t, captainName: nameByTeamId.get(t.id) }));
}

export async function listTeams(): Promise<ITeam[]> {
  const docs = await TeamModel.find().sort({ group: 1, name: 1 });
  return attachCaptainNames(docs.map(toITeam));
}

export async function getTeamById(id: string): Promise<ITeam | null> {
  const doc = await TeamModel.findById(id);
  if (!doc) return null;
  const [team] = await attachCaptainNames([toITeam(doc)]);
  return team;
}

export async function createTeam(input: ITeamCreateInput): Promise<ITeam> {
  if (!input.countryCode && !input.logoUrl) {
    throw new Error('Hace falta countryCode (selección) o logoUrl (club)');
  }
  const doc = await TeamModel.create(input);
  return toITeam(doc);
}

export async function updateTeam(
  id: string,
  input: Partial<ITeamCreateInput>
): Promise<ITeam | null> {
  const doc = await TeamModel.findByIdAndUpdate(id, input, { new: true });
  return doc ? toITeam(doc) : null;
}

/**
 * Solo el admin puede asignar/quitar capitan.
 * Resolvemos y cacheamos el nombre publico del usuario contra el auth server;
 * si falla, se guarda sin nombre y quedara sin mostrar hasta la proxima asignacion.
 */
export async function setTeamCaptain(teamId: string, userId: string) {
  let userName: string | undefined;
  try {
    userName = await getPublicUserName(userId);
  } catch (err) {
    console.warn(`[team.service] No se pudo resolver el nombre del usuario ${userId}:`, err);
  }

  return CaptainModel.findOneAndUpdate(
    { teamId },
    { userId, userName, teamId },
    { upsert: true, new: true }
  );
}

export async function removeTeamCaptain(teamId: string) {
  await CaptainModel.findOneAndDelete({ teamId });
}

/**
 * El propio capitan configura el eaClubId de su equipo (no el admin).
 * requesterUserId debe coincidir con el capitan asignado a ese equipo.
 */
export async function setEaClubId(
  teamId: string,
  eaClubId: string,
  requesterUserId: string
): Promise<ITeam | null> {
  const captain = await CaptainModel.findOne({ teamId });
  if (!captain || captain.userId !== requesterUserId) {
    throw new Error('FORBIDDEN');
  }

  const settings = await getSettings();
  if (!settings.captainsCanChangeEaClubId) {
    throw new Error('EA_CLUB_ID_CHANGES_DISABLED');
  }

  const currentTeam = await TeamModel.findById(teamId);
  if (currentTeam?.eaClubIdSetAt) {
    const cooldownMs = settings.eaClubIdChangeCooldownHours * 60 * 60 * 1000;
    const elapsedMs = Date.now() - currentTeam.eaClubIdSetAt.getTime();
    if (elapsedMs < cooldownMs) {
      const remainingHours = Math.ceil((cooldownMs - elapsedMs) / (60 * 60 * 1000));
      throw new Error(`EA_CLUB_ID_COOLDOWN:${remainingHours}`);
    }
  }

  // Resolvemos el nombre del club contra la API de EA. Si falla (ID invalido,
  // EA caida...) no bloqueamos el guardado del eaClubId.
  let eaClubName: string | undefined;
  try {
    eaClubName = await eaService.getClubName(eaClubId);
  } catch (err) {
    console.warn(`[team.service] No se pudo resolver el nombre del club EA ${eaClubId}:`, err);
  }

  // Si no se pudo resolver el nombre, no lo incluimos en el $set: asi no
  // pisamos con undefined un nombre que ya estuviera guardado de antes.
  const update: Record<string, unknown> = {
    eaClubId,
    eaClubIdSetBy: requesterUserId,
    eaClubIdSetAt: new Date(),
  };
  if (eaClubName) update.eaClubName = eaClubName;

  const doc = await TeamModel.findByIdAndUpdate(teamId, update, { new: true });
  return doc ? toITeam(doc) : null;
}
