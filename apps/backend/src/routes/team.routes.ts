import { Router } from 'express';
import * as teamController from '../controllers/team.controller.js';
import { requireAuth, requireAdmin } from '../middleware/auth.js';

export const teamRouter = Router();

teamRouter.get('/', teamController.list);
teamRouter.get('/:id', teamController.getOne);

teamRouter.post('/', requireAuth, requireAdmin, teamController.create);
teamRouter.patch('/:id', requireAuth, requireAdmin, teamController.update);
teamRouter.post('/:id/captain', requireAuth, requireAdmin, teamController.assignCaptain);
teamRouter.delete('/:id/captain', requireAuth, requireAdmin, teamController.removeCaptain);

// Solo el capitan de ESE equipo puede tocar esto (se valida dentro del service)
teamRouter.patch('/:id/ea-club', requireAuth, teamController.setEaClubId);
