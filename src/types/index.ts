export type InstitutionType = 'COLLEGE' | 'INDEPENDENT';

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

export type UserRole = 'SUPERADMIN' | 'DIRECTOR' | 'TEACHER';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  institutionId: string;
  title?: string; // e.g. "Docente de Inglés", "Directora Académica"
  avatarUrl?: string;
}

export interface Group {
  id: string;
  institutionId: string;
  grade: number; // e.g. 12
  sectionCode: string; // e.g. "12-1"
  year: number; // 2026
  specialty?: string; // e.g. "Ejecutivo para Centro de Servicios"
  guideTeacherId?: string;
}

export interface Subject {
  id: string;
  institutionId: string;
  name: string;
  code: string;
  color?: string;
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
  percentage: number; // e.g. 25
  description?: string;
}

export interface EvaluationConfig {
  id: string;
  assignmentId: string; // linked to teacher + group + subject
  periodId: 'I_PERIODO' | 'II_PERIODO' | 'III_PERIODO';
  passingGrade: number; // e.g. 70
  periodWeight: number; // e.g. 50%
  rubrics: EvaluationRubricItem[];
}

export type AccommodationType = 'NONE' | 'NON_SIGNIFICANT' | 'SIGNIFICANT' | 'ACCESS';

export interface Student {
  id: string;
  groupId: string;
  idNumber: string; // Cédula
  firstName: string;
  firstLastName: string;
  secondLastName: string;
  gender?: 'M' | 'F' | 'OTHER';
  email?: string;
  parentContact?: string;
  accommodation?: AccommodationType;
  notes?: string;
}

export type AttendanceStatus = 'PRESENT' | 'UNEXCUSED_ABSENCE' | 'EXCUSED_ABSENCE' | 'TARDY';

export interface AttendanceRecord {
  id: string;
  assignmentId: string;
  studentId: string;
  date: string; // YYYY-MM-DD
  status: AttendanceStatus;
  lessonNumber?: number; // e.g. 1st block, 2nd block
  notes?: string;
}

export interface LearningIndicator {
  id: string;
  assignmentId: string;
  periodId: string;
  code: string; // e.g. "IND-01"
  title: string;
  description: string;
  maxPoints: number; // e.g. 3 (1=Inicial, 2=Intermedio, 3=Avanzado)
}

export interface IndicatorScore {
  id: string;
  indicatorId: string;
  studentId: string;
  score: number; // 1, 2, 3
  feedback?: string;
}

export interface EvaluationItemScore {
  id: string;
  assignmentId: string;
  studentId: string;
  periodId: string;
  category: 'tareas' | 'evaluaciones' | 'proyectos' | 'portafolio';
  itemTitle: string; // e.g. "Prueba Parcial 1" o "Tarea 1"
  itemNumber: number;
  pointsEarned: number;
  pointsTotal: number;
  percentageWeight: number; // e.g. 20%
}

export interface ScheduleItem {
  id: string;
  teacherId: string;
  groupId: string;
  subjectId: string;
  dayOfWeek: 1 | 2 | 3 | 4 | 5; // 1=Lunes, 5=Viernes
  startTime: string; // "07:00"
  endTime: string; // "08:20"
  classroom?: string;
}
