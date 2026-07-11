import { CaptainModel } from '../models/Captain.model.js';

/** Devuelve el teamId del que userId es capitan, o null si no capitanea ninguno */
export async function getTeamIdForCaptain(userId: string): Promise<string | null> {
  const captain = await CaptainModel.findOne({ userId });
  return captain ? captain.teamId.toString() : null;
}
