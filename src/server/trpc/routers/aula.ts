import { z } from 'zod/v4';
import { createTRPCRouter, baseProcedure } from '../init';

const aulaInput = z.object({
  codigo: z.string().min(2, 'El código es obligatorio'),
  nombre: z.string().min(3, 'El nombre debe tener al menos 3 caracteres'),
  capacidad: z.int().min(1, 'La capacidad debe ser al menos 1'),
  tipo: z.enum(['TEORIA', 'LABORATORIO'] as const),
  edificio: z.string().min(1),
  piso: z.int().min(0),
});

export const aulaRouter = createTRPCRouter({
  list: baseProcedure
    .input(
      z.object({
        tipo: z.enum(['TEORIA', 'LABORATORIO'] as const).optional(),
        search: z.string().optional(),
      }).optional()
    )
    .query(async ({ ctx, input }) => {
      const where: Record<string, unknown> = {};

      if (input?.tipo) where.tipo = input.tipo;
      if (input?.search) {
        where.OR = [
          { nombre: { contains: input.search, mode: 'insensitive' } },
          { codigo: { contains: input.search, mode: 'insensitive' } },
        ];
      }

      return ctx.prisma.aula.findMany({
        where,
        orderBy: [{ edificio: 'asc' }, { piso: 'asc' }, { codigo: 'asc' }],
      });
    }),

  byId: baseProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      return ctx.prisma.aula.findUniqueOrThrow({
        where: { id: input.id },
        include: {
          asignaciones: {
            include: {
              grupo: { include: { curso: true } },
              docente: true,
              franjaHoraria: true,
            },
          },
        },
      });
    }),

  create: baseProcedure
    .input(aulaInput)
    .mutation(async ({ ctx, input }) => {
      return ctx.prisma.aula.create({ data: input });
    }),

  update: baseProcedure
    .input(z.object({ id: z.string() }).extend(aulaInput.partial().shape))
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;
      return ctx.prisma.aula.update({ where: { id }, data });
    }),

  delete: baseProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.prisma.aula.delete({ where: { id: input.id } });
    }),

  // Stats for dashboard
  stats: baseProcedure
    .input(z.object({ periodoId: z.string() }).optional())
    .query(async ({ ctx, input }) => {
      const aulas = await ctx.prisma.aula.findMany({
        include: {
          asignaciones: input?.periodoId
            ? { where: { periodoId: input.periodoId } }
            : true,
        },
      });

      const totalSlots = 75; // 5 days × 15 blocks (Lun-Vie)

      return aulas.map((aula) => ({
        id: aula.id,
        codigo: aula.codigo,
        nombre: aula.nombre,
        tipo: aula.tipo,
        capacidad: aula.capacidad,
        slotsOcupados: aula.asignaciones.length,
        totalSlots,
        ocupacion: Math.round((aula.asignaciones.length / totalSlots) * 100),
      }));
    }),
});
