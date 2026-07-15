import { Router } from 'express';
import * as playerStatsController from '../controllers/playerStats.controller.js';

export const playerStatsRouter = Router();

// Publico: rankings y perfiles, igual que el bracket
playerStatsRouter.get('/', playerStatsController.list);
playerStatsRouter.get('/:eaPlayerId', playerStatsController.getOne);
