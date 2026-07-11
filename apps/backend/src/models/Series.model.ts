import { Schema, model, type Types } from 'mongoose';
import type { MatchStatus, StageType, SeriesStatus } from '@trueno-pro-club-tourney/shared';

export interface IMatchPlayerStatDoc {
  eaPlayerId: string;
  playerName: string;
  team: 'A' | 'B';
  goals: number;
  origin: 'ea' | 'manual';
  editedBy?: string;
  editedAt?: Date;
}

export interface IMatchDoc {
  position: number;
  status: MatchStatus;

  eaMatchId?: string;
  isManual: boolean;

  original?: {
    scoreA: number;
    scoreB: number;
    playerStats: IMatchPlayerStatDoc[];
    fetchedAt: Date;
  };

  effective: {
    scoreA: number | null;
    scoreB: number | null;
    playerStats: IMatchPlayerStatDoc[];
  };

  edits: { by: string; at: Date; change: string }[];

  confirmations: {
    byTeamA?: { userId: string; at: Date; scoreA: number; scoreB: number };
    byTeamB?: { userId: string; at: Date; scoreA: number; scoreB: number };
  };
}

// sourceA/sourceB son polimorficos (group | stageOthers | winnerOf), se guardan
// como Mixed y se validan en la capa de servicio, no aqui.
export interface ISeriesDoc {
  _id: Types.ObjectId;
  teamA: Types.ObjectId | null;
  teamB: Types.ObjectId | null;

  sourceA?: Record<string, unknown>;
  sourceB?: Record<string, unknown>;

  bracketSlot?: string;

  stageId: string;
  stageType: StageType;
  round: string;
  group?: string;

  bestOf: 1 | 3;
  matches: IMatchDoc[];

  usedEaMatchIds: string[];
  status: SeriesStatus;
  createdAt: Date;
}

const playerStatSchema = new Schema<IMatchPlayerStatDoc>(
  {
    eaPlayerId: { type: String, required: true },
    playerName: { type: String, required: true },
    team: { type: String, enum: ['A', 'B'], required: true },
    goals: { type: Number, required: true, default: 0 },
    origin: { type: String, enum: ['ea', 'manual'], required: true },
    editedBy: { type: String },
    editedAt: { type: Date },
  },
  { _id: false }
);

const matchSchema = new Schema<IMatchDoc>(
  {
    position: { type: Number, required: true },
    status: {
      type: String,
      enum: ['sin_seleccionar', 'pendiente_confirmacion', 'confirmado', 'disputado'],
      default: 'sin_seleccionar',
    },
    eaMatchId: { type: String },
    isManual: { type: Boolean, default: false },
    original: {
      scoreA: Number,
      scoreB: Number,
      playerStats: { type: [playerStatSchema], default: undefined },
      fetchedAt: Date,
    },
    effective: {
      scoreA: { type: Number, default: null },
      scoreB: { type: Number, default: null },
      playerStats: { type: [playerStatSchema], default: [] },
    },
    edits: {
      type: [
        {
          by: String,
          at: Date,
          change: String,
        },
      ],
      default: [],
    },
    confirmations: {
      byTeamA: {
        userId: String,
        at: Date,
        scoreA: Number,
        scoreB: Number,
      },
      byTeamB: {
        userId: String,
        at: Date,
        scoreA: Number,
        scoreB: Number,
      },
    },
  },
  { _id: false }
);

const seriesSchema = new Schema<ISeriesDoc>({
  teamA: { type: Schema.Types.ObjectId, ref: 'Team', default: null },
  teamB: { type: Schema.Types.ObjectId, ref: 'Team', default: null },

  sourceA: { type: Schema.Types.Mixed },
  sourceB: { type: Schema.Types.Mixed },

  bracketSlot: { type: String },

  stageId: { type: String, required: true, index: true },
  stageType: { type: String, enum: ['groups', 'swissLeague', 'knockout'], required: true },
  round: { type: String, required: true, trim: true },
  group: { type: String, trim: true },

  bestOf: { type: Number, enum: [1, 3], required: true },
  matches: { type: [matchSchema], default: [] },

  usedEaMatchIds: { type: [String], default: [] },
  status: {
    type: String,
    enum: ['pending', 'in_progress', 'completed'],
    default: 'pending',
  },
  createdAt: { type: Date, default: Date.now },
});

export const SeriesModel = model<ISeriesDoc>('Series', seriesSchema);
