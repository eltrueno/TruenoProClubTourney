import { Router } from 'express';
import * as seriesController from '../controllers/series.controller.js';
import { requireAuth } from '../middleware/auth.js';

export const seriesRouter = Router();

// Público: bracket
seriesRouter.get('/', seriesController.list);

// IMPORTANTE: estas dos van ANTES de "/:id", si no Express las confunde con un id
seriesRouter.get('/mine', requireAuth, seriesController.listMine);
seriesRouter.get('/ea/candidates', requireAuth, seriesController.listEaCandidates);

seriesRouter.get('/:id', seriesController.getOne);

// Capitán: acciones sobre un slot concreto de una serie
seriesRouter.post('/:id/matches/:position/select-candidate', requireAuth, seriesController.selectCandidate);
seriesRouter.post('/:id/matches/:position/manual', requireAuth, seriesController.createManual);
seriesRouter.post('/:id/matches/:position/confirm', requireAuth, seriesController.confirm);
seriesRouter.patch('/:id/matches/:position', requireAuth, seriesController.edit);
