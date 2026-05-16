import { sortDocentesByHierarchy } from './hierarchy';
import { ConstraintChecker } from './constraints';
import type {
  DocenteForSchedule,
  GrupoForSchedule,
  AulaForSchedule,
  FranjaForSchedule,
  Assignment,
  UnassignedItem,
  ScheduleResult,
} from './types';

interface ScheduleEngineInput {
  docentes: DocenteForSchedule[];
  grupos: GrupoForSchedule[];
  aulas: AulaForSchedule[];
  franjas: FranjaForSchedule[];
  /** Maps docenteId → grupoIds that the docente teaches */
  docenteGrupoMap: Map<string, string[]>;
}

/**
 * Greedy hierarchical scheduling engine.
 *
 * Processes docentes in strict priority order and assigns
 * available time slots to their grupos, avoiding all conflicts.
 */
export class ScheduleEngine {
  private input: ScheduleEngineInput;
  private checker: ConstraintChecker;
  private assignments: Assignment[] = [];
  private unassigned: UnassignedItem[] = [];

  constructor(input: ScheduleEngineInput) {
    this.input = input;
    this.checker = new ConstraintChecker();
  }

  generate(): ScheduleResult {
    this.assignments = [];
    this.unassigned = [];
    this.checker.clear();

    const sortedDocentes = sortDocentesByHierarchy(this.input.docentes);
    const grupoMap = new Map(this.input.grupos.map((g) => [g.id, g]));

    const teoriaAulas = this.input.aulas.filter((a) => a.tipo === 'TEORIA');
    const labAulas = this.input.aulas.filter((a) => a.tipo === 'LABORATORIO');

    const assignedGrupos = new Set<string>();

    for (const docente of sortedDocentes) {
      const grupoIds = this.input.docenteGrupoMap.get(docente.id) ?? [];

      for (const grupoId of grupoIds) {
        const grupo = grupoMap.get(grupoId);
        if (!grupo) continue;

        // Assign theory hours
        if (grupo.horasTeoria > 0) {
          const assigned = this.assignSlots(
            docente.id,
            grupoId,
            grupo.horasTeoria,
            teoriaAulas,
            'TEORIA'
          );

          if (assigned) {
            assignedGrupos.add(grupoId);
          }
        }

        // Assign lab hours independently
        if (grupo.horasLaboratorio > 0 && grupo.requiereLaboratorio) {
          const assigned = this.assignSlots(
            docente.id,
            grupoId,
            grupo.horasLaboratorio,
            labAulas,
            'LABORATORIO'
          );

          if (assigned) {
            assignedGrupos.add(grupoId);
          }
        }
      }
    }

    return {
      assignments: this.assignments,
      unassigned: this.unassigned,
      stats: {
        totalGrupos: this.input.grupos.length,
        assigned: assignedGrupos.size,
        unassignedCount: this.input.grupos.length - assignedGrupos.size,
        conflictsAvoided: this.checker.getConflictsAvoided(),
      },
    };
  }

  /**
   * Tries to assign `hoursNeeded` slots for a grupo/docente combination.
   * Returns true if ALL hours were assigned, false otherwise.
   */
  private assignSlots(
    docenteId: string,
    grupoId: string,
    hoursNeeded: number,
    availableAulas: AulaForSchedule[],
    tipo: 'TEORIA' | 'LABORATORIO'
  ): boolean {
    if (availableAulas.length === 0) {
      this.unassigned.push({
        grupoId,
        tipo,
        reason: `No hay aula de tipo ${tipo.toLowerCase()} disponible`,
      });
      return false;
    }

    let assignedCount = 0;

    for (const franja of this.input.franjas) {
      if (assignedCount >= hoursNeeded) break;

      // Check docente availability for this franja
      if (!this.checker.isDocenteAvailable(docenteId, franja.id)) continue;
      // Check grupo availability for this franja
      if (!this.checker.isGrupoAvailable(grupoId, franja.id)) continue;

      // Find first available aula in this franja
      for (const aula of availableAulas) {
        if (!this.checker.isSlotFullyAvailable(docenteId, aula.id, grupoId, franja.id)) {
          continue;
        }

        // Found a valid slot!
        const assignment: Assignment = {
          grupoId,
          docenteId,
          aulaId: aula.id,
          franjaHorariaId: franja.id,
          tipo,
        };

        this.assignments.push(assignment);
        this.checker.addAssignment(assignment);
        assignedCount++;
        break; // Move to next franja
      }
    }

    if (assignedCount < hoursNeeded) {
      this.unassigned.push({
        grupoId,
        tipo,
        reason: `Solo se asignaron ${assignedCount}/${hoursNeeded} horas — no hay slots disponibles sin conflictos`,
      });
      return false;
    }

    return true;
  }
}
