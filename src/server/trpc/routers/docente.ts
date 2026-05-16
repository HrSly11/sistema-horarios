import { z } from 'zod/v4';
import { createTRPCRouter, baseProcedure } from '../init';
import { CategoriaDocente, TipoDocente } from '@/generated/prisma/enums';

const docenteInput = z.object({
  nombre: z.string().min(3, 'El nombre debe tener al menos 3 caracteres'),
  email: z.email('Email inválido'),
  categoria: z.enum(['PRINCIPAL', 'ASOCIADO', 'AUXILIAR', 'JEFE_PRACTICA'] as const),
  tipo: z.enum(['NOMBRADO', 'CONTRATADO'] as const),
  antiguedad: z.coerce.date(),
  activo: z.boolean().optional().default(true),
});

// Priority order for hierarchical sorting
const CATEGORIA_PRIORITY: Record<CategoriaDocente, number> = {
  PRINCIPAL: 1,
  ASOCIADO: 2,
  AUXILIAR: 3,
  JEFE_PRACTICA: 4,
};

const TIPO_PRIORITY: Record<TipoDocente, number> = {
  NOMBRADO: 1,
  CONTRATADO: 2,
};

export const docenteRouter = createTRPCRouter({
  list: baseProcedure
    .input(
      z.object({
        search: z.string().optional(),
        tipo: z.enum(['NOMBRADO', 'CONTRATADO'] as const).optional(),
        categoria: z.enum(['PRINCIPAL', 'ASOCIADO', 'AUXILIAR', 'JEFE_PRACTICA'] as const).optional(),
        activo: z.boolean().optional(),
      }).optional()
    )
    .query(async ({ ctx, input }) => {
      const where: Record<string, unknown> = {};

      if (input?.tipo) where.tipo = input.tipo;
      if (input?.categoria) where.categoria = input.categoria;
      if (input?.activo !== undefined) where.activo = input.activo;
      if (input?.search) {
        where.OR = [
          { nombre: { contains: input.search, mode: 'insensitive' } },
          { email: { contains: input.search, mode: 'insensitive' } },
        ];
      }

      const docentes = await ctx.prisma.docente.findMany({
        where,
        orderBy: [
          { tipo: 'asc' },
          { categoria: 'asc' },
          { antiguedad: 'asc' },
        ],
      });

      // Re-sort with proper hierarchy (Prisma sorts enums alphabetically)
      return docentes.sort((a, b) => {
        const tipoDiff = TIPO_PRIORITY[a.tipo] - TIPO_PRIORITY[b.tipo];
        if (tipoDiff !== 0) return tipoDiff;

        const catDiff = CATEGORIA_PRIORITY[a.categoria] - CATEGORIA_PRIORITY[b.categoria];
        if (catDiff !== 0) return catDiff;

        // Within same category: more senior (earlier date) first
        return a.antiguedad.getTime() - b.antiguedad.getTime();
      });
    }),

  byId: baseProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      return ctx.prisma.docente.findUniqueOrThrow({
        where: { id: input.id },
        include: {
          asignaciones: {
            include: {
              grupo: { include: { curso: true } },
              aula: true,
              franjaHoraria: true,
            },
          },
        },
      });
    }),

  create: baseProcedure
    .input(docenteInput)
    .mutation(async ({ ctx, input }) => {
      return ctx.prisma.docente.create({ data: input });
    }),

  update: baseProcedure
    .input(z.object({ id: z.string() }).extend(docenteInput.partial().shape))
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;
      return ctx.prisma.docente.update({ where: { id }, data });
    }),

  delete: baseProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.prisma.docente.delete({ where: { id: input.id } });
    }),

  // Get count stats by category and type
  stats: baseProcedure.query(async ({ ctx }) => {
    const docentes = await ctx.prisma.docente.findMany({
      where: { activo: true },
      select: { tipo: true, categoria: true },
    });

    const stats = {
      total: docentes.length,
      nombrados: docentes.filter((d) => d.tipo === 'NOMBRADO').length,
      contratados: docentes.filter((d) => d.tipo === 'CONTRATADO').length,
      porCategoria: Object.fromEntries(
        (['PRINCIPAL', 'ASOCIADO', 'AUXILIAR', 'JEFE_PRACTICA'] as const).map((cat) => [
          cat,
          docentes.filter((d) => d.categoria === cat).length,
        ])
      ),
    };

    return stats;
  }),

  /** Get groups assigned to a docente (via DocenteGrupo) */
  grupos: baseProcedure
    .input(z.object({ docenteId: z.string() }))
    .query(async ({ ctx, input }) => {
      return ctx.prisma.docenteGrupo.findMany({
        where: { docenteId: input.docenteId },
        include: {
          grupo: {
            include: { curso: true },
          },
        },
      });
    }),

  /** Assign a grupo to a docente */
  assignGrupo: baseProcedure
    .input(z.object({ docenteId: z.string(), grupoId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.prisma.docenteGrupo.create({
        data: { docenteId: input.docenteId, grupoId: input.grupoId },
      });
    }),

  /** Remove a grupo assignment */
  removeGrupo: baseProcedure
    .input(z.object({ docenteId: z.string(), grupoId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.prisma.docenteGrupo.delete({
        where: { docenteId_grupoId: { docenteId: input.docenteId, grupoId: input.grupoId } },
      });
    }),
});
