import { IPlayerAggregateStats } from '@trueno-proclub-tourney/shared';
import { Schema, model } from 'mongoose';

export interface IPlayerStatsDoc extends IPlayerAggregateStats {
  _id: string; // eaPlayerId will be used as _id
  ratingSum?: number; // Internal sum for avgRating
}

const playerStatsSchema = new Schema<IPlayerStatsDoc>({
  _id: { type: String, required: true },
  eaPlayerId: { type: String, required: true },
  playerName: { type: String, required: true },
  matchesPlayed: { type: Number, default: 0 },
  minutesPlayed: { type: Number, default: 0 },
  wins: { type: Number, default: 0 },
  losses: { type: Number, default: 0 },
  ties: { type: Number, default: 0 },
  draws: { type: Number, default: 0 },
  goals: { type: Number, default: 0 },
  assists: { type: Number, default: 0 },
  shots: { type: Number, default: 0 },
  shotAccuracy: { type: Number, default: 0 },
  hattricks: { type: Number, default: 0 },
  pokers: { type: Number, default: 0 },
  positionsPlayed: { type: Map, of: Number, default: {} },
  passAttempts: { type: Number, default: 0 },
  passesMade: { type: Number, default: 0 },
  passAccuracy: { type: Number, default: 0 },
  tackleAttempts: { type: Number, default: 0 },
  tacklesMade: { type: Number, default: 0 },
  tackleAccuracy: { type: Number, default: 0 },
  saves: { type: Number, default: 0 },
  goalsConceded: { type: Number, default: 0 },
  cleanSheets: { type: Number, default: 0 },
  redCards: { type: Number, default: 0 },
  manOfTheMatch: { type: Number, default: 0 },
  avgRating: { type: Number, default: 0 },
  ratingSum: { type: Number, default: 0 }, // Para poder calcular la media fácilmente de forma incremental
}, {
  timestamps: true,
});

export const PlayerStatsModel = model<IPlayerStatsDoc>('PlayerStats', playerStatsSchema);
