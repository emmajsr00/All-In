import type {
  ClassSession,
  SessionStudentDetail,
  TaskGrade,
  ExamGrade,
  ProjectGrade,
  PortfolioGrade,
  EvaluationConfig,
  Student
} from '../types';

export interface StudentCalculatedGrades {
  studentId: string;
  student: Student;
  // Desglose Asistencia
  unexcusedAbsences: number;
  lessonEscapes: number;
  tardies: number;
  excusedAbsences: number;
  effectiveFaltas: number; // Injustificadas + Escapes + Math.floor(Tardias / 2)
  totalLessons: number;
  asistenciaPts: number; // Porcentaje obtenido (ej. 4.77 sobre 5%)

  // Desglose Cotidiano
  puntosCotidianoObtenidos: number; // Suma de lecciones multiplicadas por su factor de nivel
  cotidianoPts: number; // Porcentaje obtenido (ej. 25 sobre 25%)

  // Desglose Tareas
  tareasList: { taskNumber: number; percentageEarned: number }[];
  tareasPts: number; // Porcentaje obtenido (ej. 9.54 sobre 10%)

  // Desglose Evaluaciones
  evaluacionesList: { examNumber: number; percentageEarned: number }[];
  evaluacionesPts: number; // Porcentaje obtenido (ej. 43.24 sobre 45%)

  // Desglose Proyectos
  proyectosList: { projectNumber: number; percentageEarned: number }[];
  proyectosPts: number; // Porcentaje obtenido (ej. 15 sobre 15%)

  // Portafolio
  portafolioPts: number;

  // Totales
  notaFinal: number; // Suma de los rubros habilitados
  condicion: 'Aprobado' | 'Aplazado';
}

export function computeMEPStudentGrades(
  student: Student,
  config: EvaluationConfig,
  sessions: ClassSession[],
  details: SessionStudentDetail[],
  taskGrades: TaskGrade[],
  examGrades: ExamGrade[],
  projectGrades: ProjectGrade[],
  portfolioGrades: PortfolioGrade[]
): StudentCalculatedGrades {
  // 1. Total de lecciones impartidas en el periodo (Celda $A$8 del Excel Asis. Cot IP)
  const totalLessons = sessions.reduce((acc, s) => acc + (Number(s.lessonsCount) || 0), 0);

  // 2. Asistencia (Fórmula: G2 * (1 - (Injustificadas + Escapes + floor(Tardías/2)) / TotalLecciones))
  const studentDetails = details.filter(d => d.studentId === student.id);
  const unexcusedAbsences = studentDetails.filter(d => d.attendance === 'UNEXCUSED_ABSENCE').length;
  const lessonEscapes = studentDetails.filter(d => d.attendance === 'LESSON_ESCAPE').length;
  const tardies = studentDetails.filter(d => d.attendance === 'TARDY').length;
  const excusedAbsences = studentDetails.filter(d => d.attendance === 'EXCUSED_ABSENCE').length;

  const effectiveFaltas = unexcusedAbsences + lessonEscapes + Math.floor(tardies / 2);
  const asisRubric = config.rubrics.find(r => r.key === 'asistencia');
  const asisWeight = asisRubric && asisRubric.enabled ? asisRubric.percentage : 0;

  let asistenciaPts = asisWeight;
  if (totalLessons > 0 && asisWeight > 0) {
    const fraction = effectiveFaltas / totalLessons;
    asistenciaPts = Math.max(0, asisWeight * (1 - fraction));
  }

  // 3. Cotidiano (Fórmula Celda FM13: SUM(Lecciones_i * Factor_Nivel) / TotalLecciones * PesoCotidiano)
  // Factores MEP del Excel: Nivel 1 = 0.25, Nivel 2 = 0.50, Nivel 3 = 1.00
  let puntosCotidianoObtenidos = 0;
  sessions.forEach(sess => {
    const det = studentDetails.find(d => d.sessionId === sess.id);
    const lvl = det ? det.cotidianoLevel : 0;
    let factor = 0;
    if (lvl === 1) factor = 0.25;
    else if (lvl === 2) factor = 0.50;
    else if (lvl === 3) factor = 1.00;

    puntosCotidianoObtenidos += (Number(sess.lessonsCount) || 0) * factor;
  });

  const cotRubric = config.rubrics.find(r => r.key === 'cotidiano');
  const cotWeight = cotRubric && cotRubric.enabled ? cotRubric.percentage : 0;
  let cotidianoPts = 0;
  if (totalLessons > 0 && cotWeight > 0) {
    cotidianoPts = (puntosCotidianoObtenidos / totalLessons) * cotWeight;
  }

  // 4. Tareas
  const sTasks = taskGrades.filter(t => t.studentId === student.id);
  const tareasList = sTasks.map(t => ({ taskNumber: t.taskNumber, percentageEarned: t.percentageEarned }));
  const tarRubric = config.rubrics.find(r => r.key === 'tareas');
  const tareasPts = tarRubric && tarRubric.enabled ? sTasks.reduce((acc, t) => acc + (Number(t.percentageEarned) || 0), 0) : 0;

  // 5. Evaluaciones / Pruebas
  const sExams = examGrades.filter(e => e.studentId === student.id);
  const evaluacionesList = sExams.map(e => ({ examNumber: e.examNumber, percentageEarned: e.percentageEarned }));
  const evaRubric = config.rubrics.find(r => r.key === 'evaluaciones');
  const evaluacionesPts = evaRubric && evaRubric.enabled ? sExams.reduce((acc, e) => acc + (Number(e.percentageEarned) || 0), 0) : 0;

  // 6. Proyectos
  const sProjects = projectGrades.filter(p => p.studentId === student.id);
  const proyectosList = sProjects.map(p => ({ projectNumber: p.projectNumber, percentageEarned: p.percentageEarned }));
  const proRubric = config.rubrics.find(r => r.key === 'proyectos');
  const proyectosPts = proRubric && proRubric.enabled ? sProjects.reduce((acc, p) => acc + (Number(p.percentageEarned) || 0), 0) : 0;

  // 7. Portafolio
  const sPort = portfolioGrades.find(p => p.studentId === student.id);
  const porRubric = config.rubrics.find(r => r.key === 'portafolio');
  const portafolioPts = porRubric && porRubric.enabled ? (sPort ? sPort.percentageEarned : 0) : 0;

  // 8. Nota Final (Suma de los rubros habilitados)
  let notaFinal = 0;
  config.rubrics.forEach(r => {
    if (r.enabled) {
      if (r.key === 'asistencia') notaFinal += asistenciaPts;
      else if (r.key === 'cotidiano') notaFinal += cotidianoPts;
      else if (r.key === 'tareas') notaFinal += tareasPts;
      else if (r.key === 'evaluaciones') notaFinal += evaluacionesPts;
      else if (r.key === 'proyectos') notaFinal += proyectosPts;
      else if (r.key === 'portafolio') notaFinal += portafolioPts;
    }
  });

  const condicion: 'Aprobado' | 'Aplazado' = notaFinal >= config.passingGrade ? 'Aprobado' : 'Aplazado';

  return {
    studentId: student.id,
    student,
    unexcusedAbsences,
    lessonEscapes,
    tardies,
    excusedAbsences,
    effectiveFaltas,
    totalLessons,
    asistenciaPts: Number(asistenciaPts.toFixed(2)),
    puntosCotidianoObtenidos: Number(puntosCotidianoObtenidos.toFixed(2)),
    cotidianoPts: Number(cotidianoPts.toFixed(2)),
    tareasList,
    tareasPts: Number(tareasPts.toFixed(2)),
    evaluacionesList,
    evaluacionesPts: Number(evaluacionesPts.toFixed(2)),
    proyectosList,
    proyectosPts: Number(proyectosPts.toFixed(2)),
    portafolioPts: Number(portafolioPts.toFixed(2)),
    notaFinal: Number(notaFinal.toFixed(2)),
    condicion
  };
}
