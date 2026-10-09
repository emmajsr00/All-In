export type InstitutionType = 'COLLEGE' | 'SCHOOL' | 'UNIVERSITY' | 'INDEPENDENT';

export interface Institution {
  id: string;
  name: string;
  code: string;
  type: InstitutionType;
  circuit?: string;
  regionalDirection?: string;
  logoUrl?: string;
  createdAt: string;
}

export type UserRole = 'DEVELOPER' | 'SUPERADMIN' | 'DIRECTOR' | 'ADMIN' | 'TEACHER';

export interface User {
  id: string;
  name: string;
  email: string;
  password?: string;
  role: UserRole;
  institutionId: string;
  institutionIds?: string[]; // Instituciones donde labora el docente
  title?: string;
  avatarUrl?: string;
}

export interface Group {
  id: string;
  institutionId: string;
  institutionName?: string; // Nombre de la institución a la que pertenece esta sección
  grade: number;
  sectionCode: string; // e.g. "12-1" o "01"
  groupName?: string; // e.g. "Grupo 01 - Matutino", "NRC 4512" (para universidades)
  year: number;
  specialty?: string; // e.g. "Ejecutivo para Centro de Servicios", "Ingeniería Informática"
  guideTeacherId?: string;
}

export interface Subject {
  id: string;
  institutionId: string;
  name: string;
  code: string;
  color?: string;
  teacherId?: string;
}

export interface TeacherAssignment {
  id: string;
  teacherId: string;
  groupId: string;
  subjectId: string;
  isGuia?: boolean;
}

export interface EvaluationRubricItem {
  id: string;
  key: 'asistencia' | 'cotidiano' | 'tareas' | 'evaluaciones' | 'proyectos' | 'portafolio' | string;
  label: string;
  enabled: boolean;
  percentage: number;
  description?: string;
}

export interface RubricSubItemDef {
  id: string;
  number: number;
  title: string;
  percentage: number;
  totalPoints?: number; // Puntos totales (ej. 100 o 45 puntos)
  scoringMode?: 'PERCENTAGE' | 'POINTS';
}

export interface AcademicPeriodConfig {
  periodId: 'I_PERIODO' | 'II_PERIODO';
  name: string;
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  weightPercentage: number; // e.g. 50%
}

export interface RecoveryExamGrade {
  id: string;
  assignmentId: string;
  studentId: string;
  convocatoria1?: number; // 0 - 100
  convocatoria2?: number; // 0 - 100
}

export interface EvaluationConfig {
  id: string;
  assignmentId: string;
  periodId: 'I_PERIODO' | 'II_PERIODO';
  passingGrade: number; // e.g. 70 o 80
  periodWeight: number; // e.g. 50%
  periods?: AcademicPeriodConfig[]; // Configuración de fechas de los periodos
  recoveryGrades?: RecoveryExamGrade[]; // Calificaciones de convocatoria / estrategia de promoción
  rubrics: EvaluationRubricItem[];
  taskDefinitions: RubricSubItemDef[];
  examDefinitions: RubricSubItemDef[];
  projectDefinitions: RubricSubItemDef[];
}

export type AccommodationType = 'NONE' | 'NON_SIGNIFICANT' | 'SIGNIFICANT' | 'ACCESS';

export interface Student {
  id: string;
  groupId: string;
  idNumber: string; // Cédula
  firstName: string;
  firstLastName: string;
  secondLastName: string;
  accommodation?: AccommodationType;
  parentContact?: string;
}

export type AttendanceStatus =
  | 'PRESENT'              // Presente
  | 'UNEXCUSED_ABSENCE'   // Ausencia Injustificada
  | 'LESSON_ESCAPE'        // Escape de Lecciones
  | 'TARDY'                // Llegada Tardía
  | 'EXCUSED_ABSENCE';     // Ausencia Justificada / Motivada

export interface LearningIndicator {
  id: string;
  assignmentId: string;
  code: string; // e.g. "IND-01", "L-01"
  skillArea: string; // Manual / editable para cualquier docente
  description: string; // Aprendizaje o indicador general del planeamiento
  initialLevelDesc?: string;
  intermediateLevelDesc?: string;
  advancedLevelDesc?: string;
}

export interface ClassSession {
  id: string;
  assignmentId: string;
  periodId: 'I_PERIODO' | 'II_PERIODO';
  date: string; // YYYY-MM-DD
  lessonsCount: number; // Cantidad de lecciones (ej: 2, 3 o 4 lecciones)
  topic?: string;
  indicatorId?: string; // Ligado al planeamiento docente
}

export interface SessionStudentDetail {
  id: string;
  sessionId: string;
  studentId: string;
  attendance: AttendanceStatus;
  cotidianoLevel: 0 | 1 | 2 | 3; // 0=No eval/ausente, 1=Inicial (0.25), 2=Intermedio (0.50), 3=Avanzado (1.00)
}

export interface TaskGrade {
  id: string;
  assignmentId: string;
  studentId: string;
  periodId: 'I_PERIODO' | 'II_PERIODO';
  taskId: string;
  taskNumber: number;
  percentageEarned: number;
  pointsEarned?: number;
}

export interface ExamGrade {
  id: string;
  assignmentId: string;
  studentId: string;
  periodId: 'I_PERIODO' | 'II_PERIODO';
  examId: string;
  examNumber: number;
  percentageEarned: number;
  pointsEarned?: number;
}

export interface ProjectGrade {
  id: string;
  assignmentId: string;
  studentId: string;
  periodId: 'I_PERIODO' | 'II_PERIODO';
  projectId: string;
  projectNumber: number;
  percentageEarned: number;
  pointsEarned?: number;
}

export interface PortfolioGrade {
  id: string;
  assignmentId: string;
  studentId: string;
  periodId: 'I_PERIODO' | 'II_PERIODO';
  percentageEarned: number;
  pointsEarned?: number;
}

export interface ScheduleItem {
  id: string;
  teacherId: string;
  groupId: string;
  subjectId: string;
  dayOfWeek: 1 | 2 | 3 | 4 | 5;
  startTime: string;
  endTime: string;
  classroom?: string;
}
