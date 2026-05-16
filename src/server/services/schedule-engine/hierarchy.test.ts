import { describe, it, expect } from 'vitest';
import { sortDocentesByHierarchy, CATEGORIA_ORDER, TIPO_ORDER } from './hierarchy';
import type { DocenteForSchedule } from './types';

function makeDocente(overrides: Partial<DocenteForSchedule> & { id: string }): DocenteForSchedule {
  return {
    nombre: 'Test Docente',
    categoria: 'AUXILIAR',
    tipo: 'CONTRATADO',
    antiguedad: new Date('2020-01-01'),
    ...overrides,
  };
}

describe('hierarchy', () => {
  describe('TIPO_ORDER', () => {
    it('NOMBRADO has lower order than CONTRATADO', () => {
      expect(TIPO_ORDER.NOMBRADO).toBeLessThan(TIPO_ORDER.CONTRATADO);
    });
  });

  describe('CATEGORIA_ORDER', () => {
    it('follows PRINCIPAL < ASOCIADO < AUXILIAR < JEFE_PRACTICA', () => {
      expect(CATEGORIA_ORDER.PRINCIPAL).toBeLessThan(CATEGORIA_ORDER.ASOCIADO);
      expect(CATEGORIA_ORDER.ASOCIADO).toBeLessThan(CATEGORIA_ORDER.AUXILIAR);
      expect(CATEGORIA_ORDER.AUXILIAR).toBeLessThan(CATEGORIA_ORDER.JEFE_PRACTICA);
    });
  });

  describe('sortDocentesByHierarchy', () => {
    it('sorts NOMBRADO before CONTRATADO', () => {
      const docentes = [
        makeDocente({ id: 'contratado', tipo: 'CONTRATADO', categoria: 'PRINCIPAL', antiguedad: new Date('1990-01-01') }),
        makeDocente({ id: 'nombrado', tipo: 'NOMBRADO', categoria: 'PRINCIPAL', antiguedad: new Date('2020-01-01') }),
      ];

      const sorted = sortDocentesByHierarchy(docentes);
      expect(sorted[0].id).toBe('nombrado');
      expect(sorted[1].id).toBe('contratado');
    });

    it('sorts by categoria within same tipo', () => {
      const docentes = [
        makeDocente({ id: 'auxiliar', tipo: 'NOMBRADO', categoria: 'AUXILIAR' }),
        makeDocente({ id: 'principal', tipo: 'NOMBRADO', categoria: 'PRINCIPAL' }),
        makeDocente({ id: 'asociado', tipo: 'NOMBRADO', categoria: 'ASOCIADO' }),
      ];

      const sorted = sortDocentesByHierarchy(docentes);
      expect(sorted.map((d) => d.id)).toEqual(['principal', 'asociado', 'auxiliar']);
    });

    it('sorts by antiguedad (most senior first) within same tipo and categoria', () => {
      const docentes = [
        makeDocente({ id: 'junior', tipo: 'NOMBRADO', categoria: 'PRINCIPAL', antiguedad: new Date('2010-01-01') }),
        makeDocente({ id: 'senior', tipo: 'NOMBRADO', categoria: 'PRINCIPAL', antiguedad: new Date('1995-01-01') }),
        makeDocente({ id: 'mid', tipo: 'NOMBRADO', categoria: 'PRINCIPAL', antiguedad: new Date('2000-01-01') }),
      ];

      const sorted = sortDocentesByHierarchy(docentes);
      expect(sorted.map((d) => d.id)).toEqual(['senior', 'mid', 'junior']);
    });

    it('full hierarchy: Nombrado Principal > Nombrado Asociado > Contratado Principal', () => {
      const docentes = [
        makeDocente({ id: 'cont-principal', tipo: 'CONTRATADO', categoria: 'PRINCIPAL', antiguedad: new Date('1990-01-01') }),
        makeDocente({ id: 'nomb-asociado', tipo: 'NOMBRADO', categoria: 'ASOCIADO', antiguedad: new Date('2020-01-01') }),
        makeDocente({ id: 'nomb-principal', tipo: 'NOMBRADO', categoria: 'PRINCIPAL', antiguedad: new Date('2020-01-01') }),
      ];

      const sorted = sortDocentesByHierarchy(docentes);
      expect(sorted.map((d) => d.id)).toEqual(['nomb-principal', 'nomb-asociado', 'cont-principal']);
    });

    it('does not mutate the original array', () => {
      const docentes = [
        makeDocente({ id: 'b', tipo: 'CONTRATADO', categoria: 'AUXILIAR' }),
        makeDocente({ id: 'a', tipo: 'NOMBRADO', categoria: 'PRINCIPAL' }),
      ];

      const original = [...docentes];
      sortDocentesByHierarchy(docentes);
      expect(docentes).toEqual(original);
    });

    it('returns empty array for empty input', () => {
      expect(sortDocentesByHierarchy([])).toEqual([]);
    });
  });
});
