import { z } from 'zod/v4';
import { createTRPCRouter, baseProcedure } from '../init';
import {
  renderPDF,
  generateAulaReportHTML,
  generateDocenteReportHTML,
  generateManagementReportHTML,
} from '@/server/services/reports';

export const reporteRouter = createTRPCRouter({
  /** Generate PDF report — returns base64-encoded PDF */
  generatePDF: baseProcedure
    .input(z.object({
      periodoId: z.string(),
      tipo: z.enum(['por-aula', 'por-laboratorio', 'por-docente', 'gestion']),
    }))
    .mutation(async ({ ctx, input }) => {
      const periodo = await ctx.prisma.periodoAcademico.findUniqueOrThrow({
        where: { id: input.periodoId },
      });

      let html: string;

      if (input.tipo === 'por-aula' || input.tipo === 'por-laboratorio') {
        const tipoAula = input.tipo === 'por-laboratorio' ? 'LABORATORIO' : 'TEORIA';
        const aulas = await ctx.prisma.aula.findMany({
          where: { tipo: tipoAula },
          include: {
            asignaciones: {
              where: { periodoId: input.periodoId },
              include: {
                grupo: { include: { curso: true } },
                docente: true,
                franjaHoraria: true,
              },
            },
          },
          orderBy: { codigo: 'asc' },
        });

        const aulaData = aulas.map((aula) => ({
          aulaCodigo: aula.codigo,
          aulaNombre: aula.nombre,
          tipo: aula.tipo,
          capacidad: aula.capacidad,
          slots: aula.asignaciones.map((a) => ({
            dia: a.franjaHoraria.dia,
            horaInicio: a.franjaHoraria.horaInicio,
            cursoCodigo: a.grupo.curso.codigo,
            cursoNombre: a.grupo.curso.nombre,
            grupoNombre: a.grupo.nombre,
            docenteNombre: a.docente.nombre,
            aulaCodigo: aula.codigo,
            tipo: a.tipo,
          })),
        }));

        html = generateAulaReportHTML(aulaData, periodo.nombre);

      } else if (input.tipo === 'por-docente') {
        const docentes = await ctx.prisma.docente.findMany({
          where: { activo: true },
          include: {
            asignaciones: {
              where: { periodoId: input.periodoId },
              include: {
                grupo: { include: { curso: true } },
                aula: true,
                franjaHoraria: true,
              },
            },
          },
          orderBy: [{ tipo: 'asc' }, { categoria: 'asc' }, { antiguedad: 'asc' }],
        });

        // Only include docentes who have assignments
        const docenteData = docentes
          .filter((d) => d.asignaciones.length > 0)
          .map((doc) => ({
            docenteNombre: doc.nombre,
            tipo: doc.tipo,
            categoria: doc.categoria,
            slots: doc.asignaciones.map((a) => ({
              dia: a.franjaHoraria.dia,
              horaInicio: a.franjaHoraria.horaInicio,
              cursoCodigo: a.grupo.curso.codigo,
              cursoNombre: a.grupo.curso.nombre,
              grupoNombre: a.grupo.nombre,
              docenteNombre: doc.nombre,
              aulaCodigo: a.aula.codigo,
              tipo: a.tipo,
            })),
          }));

        html = generateDocenteReportHTML(docenteData, periodo.nombre);

      } else {
        // Management report
        const [docentes, asignaciones, aulas] = await Promise.all([
          ctx.prisma.docente.findMany({
            where: { activo: true },
            select: { id: true, nombre: true, tipo: true, categoria: true },
          }),
          ctx.prisma.asignacion.findMany({
            where: { periodoId: input.periodoId },
            select: { docenteId: true, grupoId: true, confirmado: true },
          }),
          ctx.prisma.aula.findMany({
            include: {
              asignaciones: {
                where: { periodoId: input.periodoId },
              },
            },
          }),
        ]);

        const totalGrupos = await ctx.prisma.grupo.count({
          where: { periodoAcademicoId: input.periodoId },
        });

        const gruposAsignados = new Set(asignaciones.map((a) => a.grupoId)).size;
        const docentesConCarga = new Set(asignaciones.map((a) => a.docenteId)).size;
        const confirmadas = asignaciones.filter((a) => a.confirmado).length;
        const totalSlots = 75; // 5 days × 15 blocks

        html = generateManagementReportHTML({
          periodoNombre: periodo.nombre,
          totalDocentes: docentes.length,
          docentesConCarga,
          totalGrupos,
          gruposAsignados,
          totalAsignaciones: asignaciones.length,
          asignacionesConfirmadas: confirmadas,
          cargaDocente: docentes.map((d) => ({
            nombre: d.nombre,
            tipo: d.tipo,
            categoria: d.categoria,
            horasAsignadas: asignaciones.filter((a) => a.docenteId === d.id).length,
          })),
          ocupacionAulas: aulas.map((a) => ({
            codigo: a.codigo,
            tipo: a.tipo,
            slotsOcupados: a.asignaciones.length,
            totalSlots,
            ocupacion: Math.round((a.asignaciones.length / totalSlots) * 100),
          })),
        });
      }

      const pdfBuffer = await renderPDF(html, {
        landscape: input.tipo !== 'gestion',
      });

      return {
        base64: pdfBuffer.toString('base64'),
        filename: `reporte-${input.tipo}-${periodo.nombre}.pdf`,
      };
    }),
});
