import { Router } from 'express';
import * as adminController from '../controllers/admin.controller.js';
import { requireAuth, requireAdmin } from '../middleware/auth.js';

export const adminRouter = Router();

adminRouter.use(requireAuth, requireAdmin);

adminRouter.get('/disputes', adminController.listDisputes);
adminRouter.post('/series/:id/matches/:position/resolve', adminController.resolveDispute);
adminRouter.post('/series', adminController.createSeries);
adminRouter.post('/stages/:stageId/resolve', adminController.resolveStage);
adminRouter.post('/stages/:stageId/seed', adminController.seedGroupsStage);
