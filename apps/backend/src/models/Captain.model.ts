import { Schema, model, type Types } from 'mongoose';

export interface ICaptainDoc {
  _id: Types.ObjectId;
  userId: string;
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
