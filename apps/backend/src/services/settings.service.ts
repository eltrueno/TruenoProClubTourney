import { SettingsModel, getSettings as getSettingsDoc } from '../models/Settings.model.js';

export interface IPublicSettings {
  captainsCanChangeEaClubId: boolean;
  eaClubIdChangeCooldownHours: number;
}

export async function getSettings(): Promise<IPublicSettings> {
  const doc = await getSettingsDoc();
  return {
    captainsCanChangeEaClubId: doc.captainsCanChangeEaClubId,
    eaClubIdChangeCooldownHours: doc.eaClubIdChangeCooldownHours,
  };
}

export async function updateSettings(patch: Partial<IPublicSettings>): Promise<IPublicSettings> {
  await getSettingsDoc(); // asegura que el singleton existe antes de actualizar
  const doc = await SettingsModel.findByIdAndUpdate('global', patch, { new: true });
  return {
    captainsCanChangeEaClubId: doc!.captainsCanChangeEaClubId,
    eaClubIdChangeCooldownHours: doc!.eaClubIdChangeCooldownHours,
  };
}
