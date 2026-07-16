import { Schema, model, type Types, type Document } from 'mongoose';

import type { ICaptain } from '@trueno-proclub-tourney/shared';

export interface ICaptainDoc extends Omit<ICaptain, 'id' | 'teamId' | 'createdAt'>, Document {
  teamId: Types.ObjectId;
  createdAt: Date;
}

const captainSchema = new Schema<ICaptainDoc>({
  userId: { type: String, required: true, index: true },
  teamId: { type: Schema.Types.ObjectId, ref: 'Team', required: true },
  createdAt: { type: Date, default: Date.now },
});

// Un equipo tiene un unico capitan activo
captainSchema.index({ teamId: 1 }, { unique: true });

export const CaptainModel = model<ICaptainDoc>('Captain', captainSchema);
