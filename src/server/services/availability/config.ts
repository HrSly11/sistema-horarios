/**
 * Scheduling configuration — institutional constraints.
 * All values are configurable per escuela.
 */
export const SCHEDULING_CONFIG = {
  /** Días laborables */
  diasLaborables: ['LUNES', 'MARTES', 'MIERCOLES', 'JUEVES', 'VIERNES'] as const,

  /** Franja horaria institucional */
  horaInicio: '07:00',
  horaFin: '22:00',

  /** Máximo de horas continuas que un docente puede tener en un día */
  maxHorasContinuasDia: 8,

  /** Opciones de ventana de almuerzo */
  ventanaAlmuerzoOpciones: ['12:00-13:00', '13:00-14:00'] as const,

  /** Horas continuas en la mañana para que se active la ventana de almuerzo */
  umbralAlmuerzo: 4,

  /** Duración de cada franja en minutos */
  duracionFranjaMin: 60,
};

export type SlotStatus =
  | 'LIBRE'
  | 'OCUPADO'
  | 'MANTENIMIENTO'
  | 'FERIADO'
  | 'DOCENTE_OCUPADO'
  | 'ALMUERZO_REQUERIDO'
  | 'MAX_HORAS_EXCEDIDO'
  | 'RESTRICCION_DOCENTE';

export interface AvailabilityCell {
  franjaId: string;
  dia: string;
  horaInicio: string;
  horaFin: string;
  status: SlotStatus;
  ocupadoPor?: {
    cursoNombre: string;
    cursoCodigo: string;
    grupoNombre: string;
    docenteNombre: string;
  };
}

export interface AulaAvailability {
  aulaId: string;
  aulaCodigo: string;
  aulaNombre: string;
  tipo: string;
  capacidad: number;
  slots: AvailabilityCell[];
}

export interface ValidationResult {
  valid: boolean;
  reasons: string[];
}
