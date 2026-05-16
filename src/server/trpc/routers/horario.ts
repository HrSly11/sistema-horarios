import { z } from 'zod/v4';
import { createTRPCRouter, baseProcedure } from '../init';
import { AvailabilityService } from '@/server/services/availability';

export const horarioRouter = createTRPCRouter({
  // ─── Availability (Real-time) ────────────────────────

  /** Availability matrix for a single aula (raw — no docente constraints) */
  aulaAvailability: baseProcedure
    .input(z.object({ periodoId: z.string(), aulaId: z.string() }))
    .query(async ({ ctx, input }) => {
      const service = new AvailabilityService(ctx.prisma);
      return service.getAulaAvailability(input.periodoId, input.aulaId);
    }),

  /** Availability matrix for a single aula annotated with docente-specific constraints */
  docenteAulaAvailability: baseProcedure
    .input(z.object({ periodoId: z.string(), aulaId: z.string(), docenteId: z.string() }))
    .query(async ({ ctx, input }) => {
      const service = new AvailabilityService(ctx.prisma);
      return service.getDocenteAulaAvailability(input.periodoId, input.aulaId, input.docenteId);
    }),

  /** All aulas of a type with their availability */
  aulasAvailabilityByTipo: baseProcedure
    .input(z.object({ periodoId: z.string(), tipo: z.enum(['TEORIA', 'LABORATORIO']) }))
    .query(async ({ ctx, input }) => {
      const service = new AvailabilityService(ctx.prisma);
      return service.getAulasAvailabilityByTipo(input.periodoId, input.tipo);
    }),

  // ─── Slot Selection (Docente picks a slot) ──────────

  /** Validate + assign a slot. Returns validation result. */
  selectSlot: baseProcedure
    .input(z.object({
      docenteId: z.string(),
      grupoId: z.string(),
      aulaId: z.string(),
      franjaHorariaId: z.string(),
      periodoId: z.string(),
      tipo: z.enum(['TEORIA', 'LABORATORIO']),
    }))
    .mutation(async ({ ctx, input }) => {
      const service = new AvailabilityService(ctx.prisma);

      // Validate against all constraints
      const validation = await service.validateSlotSelection(
        input.docenteId,
        input.aulaId,
        input.grupoId,
        input.franjaHorariaId,
        input.periodoId,
        input.tipo
      );

      if (!validation.valid) {
        return { success: false, reasons: validation.reasons };
      }

      // Create the assignment
      await ctx.prisma.asignacion.create({
        data: {
          docenteId: input.docenteId,
          grupoId: input.grupoId,
          aulaId: input.aulaId,
          franjaHorariaId: input.franjaHorariaId,
          periodoId: input.periodoId,
          tipo: input.tipo,
          confirmado: false,
        },
      });

      return { success: true, reasons: [] };
    }),

  /** Remove a slot (docente changes their mind before confirming) */
  releaseSlot: baseProcedure
    .input(z.object({ asignacionId: z.string(), docenteId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      // Only allow releasing non-confirmed assignments owned by this docente
      const asignacion = await ctx.prisma.asignacion.findUnique({
        where: { id: input.asignacionId },
      });

      if (!asignacion) {
        return { success: false, reason: 'Asignación no encontrada' };
      }
      if (asignacion.docenteId !== input.docenteId) {
        return { success: false, reason: 'No puede liberar asignaciones de otro docente' };
      }
      if (asignacion.confirmado) {
        return { success: false, reason: 'No puede liberar una asignación ya confirmada' };
      }

      await ctx.prisma.asignacion.delete({ where: { id: input.asignacionId } });
      return { success: true };
    }),

  /** Confirm all pending assignments for a docente */
  confirmSchedule: baseProcedure
    .input(z.object({ docenteId: z.string(), periodoId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const result = await ctx.prisma.asignacion.updateMany({
        where: {
          docenteId: input.docenteId,
          periodoId: input.periodoId,
          confirmado: false,
        },
        data: { confirmado: true },
      });

      return { confirmed: result.count };
    }),

  // ─── Queries (Read) ──────────────────────────────────

  /** List all assignments for a periodo */
  list: baseProcedure
    .input(z.object({ periodoId: z.string() }))
    .query(async ({ ctx, input }) => {
      return ctx.prisma.asignacion.findMany({
        where: { periodoId: input.periodoId },
        include: {
          grupo: { include: { curso: true } },
          docente: true,
          aula: true,
          franjaHoraria: true,
        },
        orderBy: [
          { franjaHoraria: { dia: 'asc' } },
          { franjaHoraria: { numeroBloque: 'asc' } },
        ],
      });
    }),

  /** Docente's own schedule for current filling session */
  byDocente: baseProcedure
    .input(z.object({ docenteId: z.string(), periodoId: z.string() }))
    .query(async ({ ctx, input }) => {
      return ctx.prisma.asignacion.findMany({
        where: { docenteId: input.docenteId, periodoId: input.periodoId },
        include: {
          grupo: { include: { curso: true } },
          aula: true,
          franjaHoraria: true,
        },
        orderBy: [
          { franjaHoraria: { dia: 'asc' } },
          { franjaHoraria: { numeroBloque: 'asc' } },
        ],
      });
    }),

  /** Schedule by aula (for reports) */
  byAula: baseProcedure
    .input(z.object({ aulaId: z.string(), periodoId: z.string() }))
    .query(async ({ ctx, input }) => {
      return ctx.prisma.asignacion.findMany({
        where: { aulaId: input.aulaId, periodoId: input.periodoId },
        include: {
          grupo: { include: { curso: true } },
          docente: true,
          franjaHoraria: true,
        },
        orderBy: [
          { franjaHoraria: { dia: 'asc' } },
          { franjaHoraria: { numeroBloque: 'asc' } },
        ],
      });
    }),

  /** Clear all assignments for a periodo */
  clear: baseProcedure
    .input(z.object({ periodoId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const deleted = await ctx.prisma.asignacion.deleteMany({
        where: { periodoId: input.periodoId },
      });
      return { deletedCount: deleted.count };
    }),

  // ─── Dashboard Stats ────────────────────────────────

  stats: baseProcedure
    .input(z.object({ periodoId: z.string() }))
    .query(async ({ ctx, input }) => {
      const [totalGrupos, asignaciones, docentes] = await Promise.all([
        ctx.prisma.grupo.count({
          where: { periodoAcademicoId: input.periodoId },
        }),
        ctx.prisma.asignacion.findMany({
          where: { periodoId: input.periodoId },
          select: { docenteId: true, grupoId: true, tipo: true, confirmado: true },
        }),
        ctx.prisma.docente.findMany({
          where: { activo: true },
          select: { id: true, nombre: true, categoria: true, tipo: true },
        }),
      ]);

      const gruposAsignados = new Set(asignaciones.map((a) => a.grupoId)).size;
      const docentesConCarga = new Set(asignaciones.map((a) => a.docenteId)).size;
      const confirmadas = asignaciones.filter((a) => a.confirmado).length;

      const cargaDocente = docentes.map((d) => {
        const horasAsignadas = asignaciones.filter((a) => a.docenteId === d.id).length;
        return {
          id: d.id, nombre: d.nombre, categoria: d.categoria,
          tipo: d.tipo, horasAsignadas,
        };
      });

      return {
        totalGrupos,
        gruposAsignados,
        gruposSinAsignar: totalGrupos - gruposAsignados,
        totalDocentes: docentes.length,
        docentesConCarga,
        docentesSinCarga: docentes.length - docentesConCarga,
        totalAsignaciones: asignaciones.length,
        asignacionesConfirmadas: confirmadas,
        cargaDocente,
      };
    }),
});
