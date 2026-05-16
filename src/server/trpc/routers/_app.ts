import { createTRPCRouter } from '../init';
import { docenteRouter } from './docente';
import { cursoRouter } from './curso';
import { aulaRouter } from './aula';
import { periodoRouter } from './periodo';
import { horarioRouter } from './horario';
import { sesionRouter } from './sesion';
import { reporteRouter } from './reporte';

export const appRouter = createTRPCRouter({
  docente: docenteRouter,
  curso: cursoRouter,
  aula: aulaRouter,
  periodo: periodoRouter,
  horario: horarioRouter,
  sesion: sesionRouter,
  reporte: reporteRouter,
});

export type AppRouter = typeof appRouter;

