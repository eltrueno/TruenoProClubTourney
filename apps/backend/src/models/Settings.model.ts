import { ITournamentSettings } from '@trueno-proclub-tourney/shared';
import { Schema, model } from 'mongoose';

// Documento singleton: siempre hay como mucho uno, con _id fijo 'global'.
const SETTINGS_ID = 'global';

export interface ISettingsDoc extends ITournamentSettings {
  _id: string;
}

const settingsSchema = new Schema<ISettingsDoc>({
  _id: { type: String, default: SETTINGS_ID },
  captainsCanChangeEaClubId: { type: Boolean, default: true },
  eaClubIdChangeCooldownHours: { type: Number, default: 24 },
  captainsCanSetMatches: { type: Boolean, default: true },
});

export const SettingsModel = model<ISettingsDoc>('Settings', settingsSchema);

export async function getSettings(): Promise<ISettingsDoc> {
  const doc = await SettingsModel.findByIdAndUpdate(
    SETTINGS_ID,
    { $setOnInsert: { _id: SETTINGS_ID } },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
  return doc!;
}
