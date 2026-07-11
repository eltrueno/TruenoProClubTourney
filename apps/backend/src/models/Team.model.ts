import { Schema, model, type Types } from 'mongoose';

export interface ITeamDoc {
  _id: Types.ObjectId;
  name: string;
  countryCode?: string;
  logoUrl?: string;
  group?: string;
  eaClubId?: string;
  eaClubIdSetBy?: string;
  eaClubIdSetAt?: Date;
  createdAt: Date;
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
