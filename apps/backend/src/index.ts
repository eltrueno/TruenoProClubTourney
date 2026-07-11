import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { connectDB } from './config/db.js';
import { teamRouter } from './routes/team.routes.js';
import { seriesRouter } from './routes/series.routes.js';
import { adminRouter } from './routes/admin.routes.js';

async function main() {
  await connectDB();

  const app = express();

  app.use(express.json());
  app.use(cookieParser());
  app.use(
    cors({
      origin: process.env.FRONTEND_ORIGIN,
      credentials: true,
    })
  );

  app.get('/health', (_req, res) => res.json({ ok: true }));

  app.use('/api/teams', teamRouter);
  app.use('/api/series', seriesRouter);
  app.use('/api/admin', adminRouter);

  const port = Number(process.env.PORT ?? 4000);
  app.listen(port, () => {
    console.log(`[server] Escuchando en http://localhost:${port}`);
  });
}

main().catch((err) => {
  console.error('[server] Error al arrancar:', err);
  process.exit(1);
});
