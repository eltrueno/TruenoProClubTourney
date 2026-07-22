import { Router } from 'express';
import * as settingsController from '../controllers/settings.controller.js';

export const settingsRouter = Router();

// Público: el panel de capitán necesita saber si puede cambiar el eaClubId y con qué cooldown
settingsRouter.get('/', settingsController.getSettings);
settingsRouter.get('/config', settingsController.getTournamentConfig);
