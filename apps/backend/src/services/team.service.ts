import type { ITeam, ITeamCreateInput } from '@trueno-pro-club-tourney/shared';
import { TeamModel, type ITeamDoc } from '../models/Team.model.js';
import { CaptainModel } from '../models/Captain.model.js';

function toITeam(doc: ITeamDoc): ITeam {
  return {
    id: doc._id.toString(),
    name: doc.name,
    countryCode: doc.countryCode,
    logoUrl: doc.logoUrl,
    group: doc.group,
    eaClubId: doc.eaClubId,
    eaClubIdSetBy: doc.eaClubIdSetBy,
    eaClubIdSetAt: doc.eaClubIdSetAt?.toISOString(),
    createdAt: doc.createdAt.toISOString(),
  };
}

export async function listTeams(): Promise<ITeam[]> {
  const docs = await TeamModel.find().sort({ group: 1, name: 1 });
  return docs.map(toITeam);
}

export async function getTeamById(id: string): Promise<ITeam | null> {
  const doc = await TeamModel.findById(id);
  return doc ? toITeam(doc) : null;
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

/** Solo el admin puede asignar/quitar capitan */
export async function setTeamCaptain(teamId: string, userId: string) {
  return CaptainModel.findOneAndUpdate(
    { teamId },
    { userId, teamId },
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

  const doc = await TeamModel.findByIdAndUpdate(
    teamId,
    { eaClubId, eaClubIdSetBy: requesterUserId, eaClubIdSetAt: new Date() },
    { new: true }
  );
  return doc ? toITeam(doc) : null;
}
