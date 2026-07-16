import { Schema, model, type Types, type Document } from 'mongoose';

import type { ITeam } from '@trueno-proclub-tourney/shared';

export interface ITeamDoc extends Omit<ITeam, 'id' | 'createdAt' | 'eaClubIdSetAt'>, Document {
  createdAt: Date;
  eaClubIdSetAt?: Date;
}

const teamSchema = new Schema<ITeamDoc>({
  name: { type: String, required: true, trim: true },
  countryCode: {
    type: String,
    lowercase: true,
    trim: true,
    match: /^[a-z]{2}$/,
  },
  logoUrl: { type: String, trim: true },
  group: { type: String, trim: true },
  eaClubId: { type: String, trim: true },
  eaClubIdSetBy: { type: String },
  eaClubIdSetAt: { type: Date },
  createdAt: { type: Date, default: Date.now },
});

export const TeamModel = model<ITeamDoc>('Team', teamSchema);
