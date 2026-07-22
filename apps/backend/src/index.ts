import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { connectDB } from './config/db.js';
import { teamRouter } from './routes/team.routes.js';
import { seriesRouter } from './routes/series.routes.js';
import { adminRouter } from './routes/admin.routes.js';
import { playerStatsRouter } from './routes/playerStats.routes.js';
import { settingsRouter } from './routes/settings.routes.js';
import { eventBus } from './services/events.service.js';



const DEVMODE = process.env.DEVMODE === "true";

async function main() {
  await connectDB();
  await eventBus.init();

  const app = express();

  app.use(express.json());
  app.use(cookieParser());
  app.use(cors({
    origin: (origin, callback) => {
      if (DEVMODE) {
        return callback(null, true);
      }

      if (!origin || process.env.FRONTEND_ORIGIN === origin) {
        return callback(null, true);
      }

      return callback(new Error("Not allowed by CORS"));
    },
    credentials: true,
  }));

  app.get('/health', (_req, res) => res.json({ ok: true }));

  app.use('/teams', teamRouter);
  app.use('/series', seriesRouter);
  app.use('/admin', adminRouter);
  app.use('/playerstats', playerStatsRouter);
  app.use('/settings', settingsRouter);

  /*INDEX*/
  app.get("/", async function (req, res) {
    res.send({
      "routes": {
        "/teams": [
          { "GET /": "Listar todos los equipos" },
          { "POST /": "Crear equipo (Admin)" },
          { "GET /mine": "Obtener el equipo del capitán actual" },
          { "PATCH /:id": "Actualizar equipo (Admin)" },
          { "PATCH /:id/ea-club": "Asociar ID de EA Club al equipo" },
          { "POST /:id/captain": "Asignar capitán a equipo (Admin)" },
          { "DELETE /:id/captain": "Quitar capitán de equipo (Admin)" }
        ],
        "/series": [
          { "GET /": "Listar todas las series (enfrentamientos)" },
          { "GET /mine": "Listar series donde participa mi equipo" },
          { "GET /ea/candidates?eaClubId=": "Buscar partidos recientes en la API de EA" },
          { "GET /:id": "Obtener serie por ID" },
          { "POST /:id/matches/:position/select-candidate": "Vincular partido de EA a un match de la serie" },
          { "POST /:id/matches/:position/confirm": "Confirmar partido seleccionado" },
          { "PATCH /:id/matches/:position": "Abrir disputa o editar un partido manualmente" }
        ],
        "/admin": [
          { "GET /disputes": "Listar todos los partidos en disputa" },
          { "POST /series/:seriesId/matches/:position/resolve": "Resolver disputa forzando resultado" },
          { "POST /stages/:stageId/seed": "Generar emparejamientos/cruces para una fase (sembrar)" },
          { "POST /stages/:stageId/resolve": "Finalizar fase y calcular clasificados" }
        ],
        "/playerstats": [
          { "GET /": "Ranking agregado de estadísticas de todos los jugadores" },
          { "GET /:eaPlayerId": "Perfil completo e historial de partidos de un jugador" }
        ],
        "/settings": [
          { "GET /": "Obtener configuración del torneo" },
          { "PATCH /": "Actualizar configuración (Admin)" }
        ]
      }
    });
  });

  const port = Number(process.env.PORT ?? 4000);
  app.listen(port, () => {
    console.log(`[server] Escuchando en http://localhost:${port}`);
  });
}

main().catch((err) => {
  console.error('[server] Error al arrancar:', err);
  process.exit(1);
});
