import { Schema, model, type Types, type Document } from 'mongoose';
import type { 
  MatchStatus, StageType, SeriesStatus, 
  ITeamMatchStats, IMatchPlayer, IMatchTeamData, IMatch, ISeries, IMatchEdit, IMatchConfirmation
} from '@trueno-proclub-tourney/shared';

export interface ITeamMatchStatsDoc extends ITeamMatchStats {}

export interface IMatchPlayerDoc extends Omit<IMatchPlayer, 'editedAt'> {
  editedAt?: Date;
}

export interface IMatchTeamDataDoc extends Omit<IMatchTeamData, 'stats' | 'players'> {
  eaClubId?: string;
  eaClubName?: string;
  stats: ITeamMatchStatsDoc;
  players: IMatchPlayerDoc[];
}

export interface IMatchConfirmationDoc extends Omit<IMatchConfirmation, 'at'> {
  at: Date;
}

export interface IMatchEditDoc extends Omit<IMatchEdit, 'at'> {
  at: Date;
}

export interface IMatchDoc extends Omit<IMatch, 'original' | 'effective' | 'edits' | 'confirmations'> {
  original?: {
    teamA: IMatchTeamDataDoc;
    teamB: IMatchTeamDataDoc;
    fetchedAt: Date;
  };
  effective: {
    teamA: IMatchTeamDataDoc;
    teamB: IMatchTeamDataDoc;
  };
  edits: IMatchEditDoc[];
  confirmations: {
    byTeamA?: IMatchConfirmationDoc;
    byTeamB?: IMatchConfirmationDoc;
  };
}

export interface ISeriesDoc extends Omit<ISeries, 'id' | 'teamA' | 'teamB' | 'matches' | 'createdAt'>, Document {
  teamA: Types.ObjectId | null;
  teamB: Types.ObjectId | null;
  matches: IMatchDoc[];
  createdAt: Date;
}

const teamMatchStatsSchema = new Schema<ITeamMatchStatsDoc>(
  {
    goals: { type: Number, default: 0 },
    shots: { type: Number, default: 0 },
    passesMade: { type: Number, default: 0 },
    passesSuccess: { type: Number, default: 0 },
    tacklesMade: { type: Number, default: 0 },
    tacklesSuccess: { type: Number, default: 0 },
    redCards: { type: Number, default: 0 },
  },
  { _id: false }
);

const matchPlayerSchema = new Schema<IMatchPlayerDoc>(
  {
    eaId: { type: String, required: true },
    name: { type: String, required: true },
    position: { type: String, default: 'midfielder' },
    origin: { type: String, enum: ['ea', 'manual'], required: true },
    rating: { type: Number, default: 0 },
    secondsPlayed: { type: Number, default: 0 },
    manOfTheMatch: { type: Boolean, default: false },
    goals: { type: Number, default: 0 },
    assists: { type: Number, default: 0 },
    shots: { type: Number, default: 0 },
    goalsConceded: { type: Number, default: 0 },
    redCards: { type: Number, default: 0 },
    cleanSheet: { type: Boolean, default: false },
    passesMade: { type: Number, default: 0 },
    passesSuccess: { type: Number, default: 0 },
    tacklesMade: { type: Number, default: 0 },
    tacklesSuccess: { type: Number, default: 0 },
    saves: { type: Number, default: 0 },
    goodDirectionSaves: { type: Number, default: 0 },
    crossSaves: { type: Number, default: 0 },
    ballDiveSaves: { type: Number, default: 0 },
    parrySaves: { type: Number, default: 0 },
    punchSaves: { type: Number, default: 0 },
    reflexSaves: { type: Number, default: 0 },
    editedBy: { type: String },
    editedAt: { type: Date },
  },
  { _id: false }
);

const matchTeamDataSchema = new Schema<IMatchTeamDataDoc>(
  {
    eaClubId: { type: String },
    eaClubName: { type: String },
    score: { type: Number, default: null },
    penaltiesScore: { type: Number, default: null },
    stats: { type: teamMatchStatsSchema, required: true },
    players: { type: [matchPlayerSchema], default: [] },
  },
  { _id: false }
);

const matchSchema = new Schema<IMatchDoc>(
  {
    position: { type: Number, required: true },
    status: {
      type: String,
      enum: ['unselected', 'pending_confirmation', 'confirmed', 'disputed'],
      default: 'unselected',
    },
    eaMatchId: { type: String },
    isManual: { type: Boolean, default: false },
    winnerByDnf: { type: Boolean, default: false },
    winnerByPen: { type: Boolean, default: false },
    original: {
      teamA: matchTeamDataSchema,
      teamB: matchTeamDataSchema,
      fetchedAt: Date,
    },
    effective: {
      teamA: { type: matchTeamDataSchema, default: null },
      teamB: { type: matchTeamDataSchema, default: null },
    },
    edits: {
      type: [{ by: String, at: Date, change: String }],
      default: [],
    },
    confirmations: {
      byTeamA: {
        userId: String,
        at: Date,
        teamA: { score: Number, penaltiesScore: Number },
        teamB: { score: Number, penaltiesScore: Number }
      },
      byTeamB: {
        userId: String,
        at: Date,
        teamA: { score: Number, penaltiesScore: Number },
        teamB: { score: Number, penaltiesScore: Number }
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
