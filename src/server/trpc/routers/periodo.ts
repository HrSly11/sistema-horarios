import { z } from 'zod/v4';
import { createTRPCRouter, baseProcedure } from '../init';

const periodoInput = z.object({
  nombre: z.string().min(3, 'El nombre es obligatorio (ej: 2026-I)'),
  fechaInicio: z.coerce.date(),
  fechaFin: z.coerce.date(),
  activo: z.boolean().optional().default(false),
});

export const periodoRouter = createTRPCRouter({
  list: baseProcedure.query(async ({ ctx }) => {
    return ctx.prisma.periodoAcademico.findMany({
      include: {
        _count: { select: { grupos: true, asignaciones: true } },
      },
      orderBy: { fechaInicio: 'desc' },
    });
  }),

  active: baseProcedure.query(async ({ ctx }) => {
    return ctx.prisma.periodoAcademico.findFirst({
      where: { activo: true },
    });
  }),

  byId: baseProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      return ctx.prisma.periodoAcademico.findUniqueOrThrow({
        where: { id: input.id },
        include: {
          grupos: {
            include: { curso: true },
            orderBy: { curso: { ciclo: 'asc' } },
          },
        },
      });
    }),

  create: baseProcedure
    .input(periodoInput)
    .mutation(async ({ ctx, input }) => {
      // If setting as active, deactivate all others
      if (input.activo) {
        await ctx.prisma.periodoAcademico.updateMany({
          where: { activo: true },
          data: { activo: false },
        });
      }
      return ctx.prisma.periodoAcademico.create({ data: input });
    }),

  update: baseProcedure
    .input(z.object({ id: z.string() }).extend(periodoInput.partial().shape))
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;
      if (data.activo) {
        await ctx.prisma.periodoAcademico.updateMany({
          where: { activo: true, id: { not: id } },
          data: { activo: false },
        });
      }
      return ctx.prisma.periodoAcademico.update({ where: { id }, data });
    }),

  delete: baseProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.prisma.periodoAcademico.delete({ where: { id: input.id } });
    }),

  // ── Franjas Horarias ──────────────────────────
  franjas: baseProcedure.query(async ({ ctx }) => {
    return ctx.prisma.franjaHoraria.findMany({
      orderBy: [{ dia: 'asc' }, { numeroBloque: 'asc' }],
    });
  }),
});
