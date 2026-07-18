import { Schema, model, type Document } from 'mongoose';

// Documento singleton: siempre hay como mucho uno, con _id fijo 'global'.
const SETTINGS_ID = 'global';

export interface ISettingsDoc extends Document<string> {
  _id: string;
  captainsCanChangeEaClubId: boolean;
  eaClubIdChangeCooldownHours: number;
}

const settingsSchema = new Schema<ISettingsDoc>({
  _id: { type: String, default: SETTINGS_ID },
  captainsCanChangeEaClubId: { type: Boolean, default: true },
  eaClubIdChangeCooldownHours: { type: Number, default: 24 },
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
