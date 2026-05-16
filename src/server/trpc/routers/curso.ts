import { z } from 'zod/v4';
import { createTRPCRouter, baseProcedure } from '../init';

const cursoInput = z.object({
  codigo: z.string().min(2, 'El código es obligatorio'),
  nombre: z.string().min(3, 'El nombre debe tener al menos 3 caracteres'),
  creditos: z.int().min(1).max(10),
  horasTeoria: z.int().min(0),
  horasLaboratorio: z.int().min(0),
  ciclo: z.int().min(1).max(12),
  requiereLaboratorio: z.boolean().optional().default(false),
});

const grupoInput = z.object({
  nombre: z.string().min(1, 'El nombre del grupo es obligatorio'),
  cursoId: z.string(),
  periodoAcademicoId: z.string(),
});

export const cursoRouter = createTRPCRouter({
  list: baseProcedure
    .input(
      z.object({
        ciclo: z.int().optional(),
        search: z.string().optional(),
      }).optional()
    )
    .query(async ({ ctx, input }) => {
      const where: Record<string, unknown> = {};

      if (input?.ciclo) where.ciclo = input.ciclo;
      if (input?.search) {
        where.OR = [
          { nombre: { contains: input.search, mode: 'insensitive' } },
          { codigo: { contains: input.search, mode: 'insensitive' } },
        ];
      }

      return ctx.prisma.curso.findMany({
        where,
        include: {
          grupos: {
            include: { periodoAcademico: true },
            orderBy: { nombre: 'asc' },
          },
        },
        orderBy: [{ ciclo: 'asc' }, { codigo: 'asc' }],
      });
    }),

  byId: baseProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      return ctx.prisma.curso.findUniqueOrThrow({
        where: { id: input.id },
        include: {
          grupos: {
            include: {
              periodoAcademico: true,
              asignaciones: {
                include: { docente: true, aula: true, franjaHoraria: true },
              },
            },
          },
        },
      });
    }),

  create: baseProcedure
    .input(cursoInput)
    .mutation(async ({ ctx, input }) => {
      return ctx.prisma.curso.create({ data: input });
    }),

  update: baseProcedure
    .input(z.object({ id: z.string() }).extend(cursoInput.partial().shape))
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;
      return ctx.prisma.curso.update({ where: { id }, data });
    }),

  delete: baseProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.prisma.curso.delete({ where: { id: input.id } });
    }),

  // ── Grupo management ──────────────────────────
  createGrupo: baseProcedure
    .input(grupoInput)
    .mutation(async ({ ctx, input }) => {
      return ctx.prisma.grupo.create({ data: input });
    }),

  deleteGrupo: baseProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.prisma.grupo.delete({ where: { id: input.id } });
    }),

  // Get all unique ciclos (for filters)
  ciclos: baseProcedure.query(async ({ ctx }) => {
    const cursos = await ctx.prisma.curso.findMany({
      select: { ciclo: true },
      distinct: ['ciclo'],
      orderBy: { ciclo: 'asc' },
    });
    return cursos.map((c) => c.ciclo);
  }),
});
