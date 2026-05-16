import { describe, it, expect, beforeEach } from 'vitest';
import { ConstraintChecker } from './constraints';
import type { Assignment } from './types';

describe('ConstraintChecker', () => {
  let checker: ConstraintChecker;

  beforeEach(() => {
    checker = new ConstraintChecker();
  });

  describe('addAssignment / isSlotAvailable', () => {
    const baseAssignment: Assignment = {
      grupoId: 'grupo-1',
      docenteId: 'docente-1',
      aulaId: 'aula-1',
      franjaHorariaId: 'franja-1',
      tipo: 'TEORIA',
    };

    it('slot is available when no assignments exist', () => {
      expect(checker.isDocenteAvailable('docente-1', 'franja-1')).toBe(true);
      expect(checker.isAulaAvailable('aula-1', 'franja-1')).toBe(true);
      expect(checker.isGrupoAvailable('grupo-1', 'franja-1')).toBe(true);
    });

    it('blocks docente double-booking', () => {
      checker.addAssignment(baseAssignment);
      expect(checker.isDocenteAvailable('docente-1', 'franja-1')).toBe(false);
      // Different docente in same slot is fine
      expect(checker.isDocenteAvailable('docente-2', 'franja-1')).toBe(true);
      // Same docente in different slot is fine
      expect(checker.isDocenteAvailable('docente-1', 'franja-2')).toBe(true);
    });

    it('blocks aula double-booking', () => {
      checker.addAssignment(baseAssignment);
      expect(checker.isAulaAvailable('aula-1', 'franja-1')).toBe(false);
      expect(checker.isAulaAvailable('aula-2', 'franja-1')).toBe(true);
      expect(checker.isAulaAvailable('aula-1', 'franja-2')).toBe(true);
    });

    it('blocks grupo double-booking', () => {
      checker.addAssignment(baseAssignment);
      expect(checker.isGrupoAvailable('grupo-1', 'franja-1')).toBe(false);
      expect(checker.isGrupoAvailable('grupo-2', 'franja-1')).toBe(true);
    });

    it('isSlotFullyAvailable checks all three constraints', () => {
      checker.addAssignment(baseAssignment);

      // All different → available
      expect(checker.isSlotFullyAvailable('docente-2', 'aula-2', 'grupo-2', 'franja-1')).toBe(true);

      // Same docente → blocked
      expect(checker.isSlotFullyAvailable('docente-1', 'aula-2', 'grupo-2', 'franja-1')).toBe(false);

      // Same aula → blocked
      expect(checker.isSlotFullyAvailable('docente-2', 'aula-1', 'grupo-2', 'franja-1')).toBe(false);

      // Same grupo → blocked
      expect(checker.isSlotFullyAvailable('docente-2', 'aula-2', 'grupo-1', 'franja-1')).toBe(false);
    });
  });

  describe('clear', () => {
    it('resets all constraints', () => {
      checker.addAssignment({
        grupoId: 'g1', docenteId: 'd1', aulaId: 'a1',
        franjaHorariaId: 'f1', tipo: 'TEORIA',
      });

      checker.clear();

      expect(checker.isDocenteAvailable('d1', 'f1')).toBe(true);
      expect(checker.isAulaAvailable('a1', 'f1')).toBe(true);
      expect(checker.isGrupoAvailable('g1', 'f1')).toBe(true);
    });
  });

  describe('getConflictsAvoided', () => {
    it('starts at 0', () => {
      expect(checker.getConflictsAvoided()).toBe(0);
    });

    it('increments when a conflict is detected', () => {
      checker.addAssignment({
        grupoId: 'g1', docenteId: 'd1', aulaId: 'a1',
        franjaHorariaId: 'f1', tipo: 'TEORIA',
      });

      // This should detect a conflict
      checker.isSlotFullyAvailable('d1', 'a2', 'g2', 'f1');
      expect(checker.getConflictsAvoided()).toBe(1);
    });
  });
});
