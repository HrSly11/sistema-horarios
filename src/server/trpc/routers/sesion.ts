import { z } from 'zod/v4';
import { createTRPCRouter, baseProcedure } from '../init';
import { sortDocentesByHierarchy } from '@/server/services/schedule-engine/hierarchy';
import type { DocenteForSchedule } from '@/server/services/schedule-engine/types';

export const sesionRouter = createTRPCRouter({
  /** Create a filling session with auto-generated turns */
  create: baseProcedure
    .input(z.object({
      periodoId: z.string(),
      nombre: z.string(),
      fecha: z.coerce.date(),
      horaInicio: z.string(), // "08:00"
      horaFin: z.string(),    // "13:00"
      intervalo: z.number().min(5).max(60).default(15),
    }))
    .mutation(async ({ ctx, input }) => {
      // Get all active docentes and sort by hierarchy
      const docentesRaw = await ctx.prisma.docente.findMany({
        where: { activo: true },
        orderBy: [{ tipo: 'asc' }, { categoria: 'asc' }, { antiguedad: 'asc' }],
      });

      const docentesMapped: DocenteForSchedule[] = docentesRaw.map((d) => ({
        id: d.id,
        nombre: d.nombre,
        tipo: d.tipo,
        categoria: d.categoria,
        antiguedad: d.antiguedad,
      }));

      const sorted = sortDocentesByHierarchy(docentesMapped);

      // Generate time slots for turns
      const turnSlots = generateTurnSlots(input.horaInicio, input.horaFin, input.intervalo);

      // Create session with turns
      const sesion = await ctx.prisma.sesionLlenado.create({
        data: {
          periodoId: input.periodoId,
          nombre: input.nombre,
          fecha: input.fecha,
          horaInicio: input.horaInicio,
          horaFin: input.horaFin,
          intervalo: input.intervalo,
          turnos: {
            create: sorted.map((docente, i) => ({
              docenteId: docente.id,
              orden: i + 1,
              horaAsignada: turnSlots[i] ?? turnSlots[turnSlots.length - 1],
            })),
          },
        },
        include: {
          turnos: {
            include: { docente: true },
            orderBy: { orden: 'asc' },
          },
        },
      });

      return sesion;
    }),

  /** List sessions for a periodo */
  list: baseProcedure
    .input(z.object({ periodoId: z.string() }))
    .query(async ({ ctx, input }) => {
      return ctx.prisma.sesionLlenado.findMany({
        where: { periodoId: input.periodoId },
        include: {
          _count: { select: { turnos: true } },
        },
        orderBy: { fecha: 'asc' },
      });
    }),

  /** Get full session state with all turns */
  estado: baseProcedure
    .input(z.object({ sesionId: z.string() }))
    .query(async ({ ctx, input }) => {
      const sesion = await ctx.prisma.sesionLlenado.findUniqueOrThrow({
        where: { id: input.sesionId },
        include: {
          turnos: {
            include: {
              docente: {
                select: { id: true, nombre: true, tipo: true, categoria: true },
              },
            },
            orderBy: { orden: 'asc' },
          },
        },
      });

      const turnoActual = sesion.turnos.find((t) => t.estado === 'EN_TURNO');
      const siguientes = sesion.turnos.filter((t) => t.estado === 'PENDIENTE');
      const completados = sesion.turnos.filter((t) => t.estado === 'COMPLETADO');

      return {
        ...sesion,
        turnoActual,
        siguientes,
        completados,
        progreso: {
          total: sesion.turnos.length,
          completados: completados.length,
          porcentaje: Math.round((completados.length / sesion.turnos.length) * 100),
        },
      };
    }),

  /** Start the session (set first turn to EN_TURNO) */
  iniciar: baseProcedure
    .input(z.object({ sesionId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const primerTurno = await ctx.prisma.turnoDocente.findFirst({
        where: { sesionId: input.sesionId, estado: 'PENDIENTE' },
        orderBy: { orden: 'asc' },
      });

      if (!primerTurno) {
        return { success: false, reason: 'No hay turnos pendientes' };
      }

      await ctx.prisma.$transaction([
        ctx.prisma.sesionLlenado.update({
          where: { id: input.sesionId },
          data: { estado: 'EN_CURSO', turnoActual: primerTurno.orden },
        }),
        ctx.prisma.turnoDocente.update({
          where: { id: primerTurno.id },
          data: { estado: 'EN_TURNO' },
        }),
      ]);

      return { success: true, turnoId: primerTurno.id };
    }),

  /** Advance to the next turn (mark current as COMPLETADO, next as EN_TURNO) */
  avanzarTurno: baseProcedure
    .input(z.object({ sesionId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const turnoActual = await ctx.prisma.turnoDocente.findFirst({
        where: { sesionId: input.sesionId, estado: 'EN_TURNO' },
      });

      if (!turnoActual) {
        return { success: false, reason: 'No hay turno activo' };
      }

      const siguienteTurno = await ctx.prisma.turnoDocente.findFirst({
        where: {
          sesionId: input.sesionId,
          estado: 'PENDIENTE',
          orden: { gt: turnoActual.orden },
        },
        orderBy: { orden: 'asc' },
      });

      const operations = [
        ctx.prisma.turnoDocente.update({
          where: { id: turnoActual.id },
          data: { estado: 'COMPLETADO' },
        }),
      ];

      if (siguienteTurno) {
        operations.push(
          ctx.prisma.turnoDocente.update({
            where: { id: siguienteTurno.id },
            data: { estado: 'EN_TURNO' },
          })
        );
        operations.push(
          ctx.prisma.sesionLlenado.update({
            where: { id: input.sesionId },
            data: { turnoActual: siguienteTurno.orden },
          })
        );
      } else {
        // No more turns — session finished
        operations.push(
          ctx.prisma.sesionLlenado.update({
            where: { id: input.sesionId },
            data: { estado: 'FINALIZADA' },
          })
        );
      }

      await ctx.prisma.$transaction(operations);

      return {
        success: true,
        finished: !siguienteTurno,
        nextTurnoId: siguienteTurno?.id,
      };
    }),

  /** Mark a docente as absent (skip their turn) */
  marcarAusente: baseProcedure
    .input(z.object({ turnoId: z.string(), sesionId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.prisma.turnoDocente.update({
        where: { id: input.turnoId },
        data: { estado: 'AUSENTE' },
      });

      // Advance to next
      const siguiente = await ctx.prisma.turnoDocente.findFirst({
        where: { sesionId: input.sesionId, estado: 'PENDIENTE' },
        orderBy: { orden: 'asc' },
      });

      if (siguiente) {
        await ctx.prisma.$transaction([
          ctx.prisma.turnoDocente.update({
            where: { id: siguiente.id },
            data: { estado: 'EN_TURNO' },
          }),
          ctx.prisma.sesionLlenado.update({
            where: { id: input.sesionId },
            data: { turnoActual: siguiente.orden },
          }),
        ]);
      } else {
        await ctx.prisma.sesionLlenado.update({
          where: { id: input.sesionId },
          data: { estado: 'FINALIZADA' },
        });
      }

      return { success: true };
    }),
});

/** Generate turn time slots: "08:00", "08:15", "08:30"... */
function generateTurnSlots(horaInicio: string, horaFin: string, intervaloMin: number): string[] {
  const slots: string[] = [];
  const [startH, startM] = horaInicio.split(':').map(Number);
  const [endH, endM] = horaFin.split(':').map(Number);

  let totalMinutes = startH * 60 + startM;
  const endMinutes = endH * 60 + endM;

  while (totalMinutes < endMinutes) {
    const h = Math.floor(totalMinutes / 60);
    const m = totalMinutes % 60;
    slots.push(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`);
    totalMinutes += intervaloMin;
  }

  return slots;
}
