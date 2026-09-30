import Dexie, { type Table } from 'dexie';
import type {
  Institution,
  User,
  Group,
  Subject,
  TeacherAssignment,
  EvaluationConfig,
  Student,
  LearningIndicator,
  ClassSession,
  SessionStudentDetail,
  TaskGrade,
  ExamGrade,
  ProjectGrade,
  PortfolioGrade,
  ScheduleItem
} from '../types';

export class EduGradeDatabase extends Dexie {
  institutions!: Table<Institution, string>;
  users!: Table<User, string>;
  groups!: Table<Group, string>;
  subjects!: Table<Subject, string>;
  assignments!: Table<TeacherAssignment, string>;
  students!: Table<Student, string>;
  evaluationConfigs!: Table<EvaluationConfig, string>;
  indicators!: Table<LearningIndicator, string>;
  classSessions!: Table<ClassSession, string>;
  sessionDetails!: Table<SessionStudentDetail, string>;
  taskGrades!: Table<TaskGrade, string>;
  examGrades!: Table<ExamGrade, string>;
  projectGrades!: Table<ProjectGrade, string>;
  portfolioGrades!: Table<PortfolioGrade, string>;
  schedules!: Table<ScheduleItem, string>;

  constructor() {
    super('EduGradeProDB_v3');
    this.version(1).stores({
      institutions: 'id, code, type',
      users: 'id, email, role, institutionId',
      groups: 'id, institutionId, grade, sectionCode',
      subjects: 'id, institutionId, code',
      assignments: 'id, teacherId, groupId, subjectId',
      students: 'id, groupId, idNumber, firstLastName, secondLastName',
      evaluationConfigs: 'id, assignmentId, periodId',
      indicators: 'id, assignmentId, code',
      classSessions: 'id, assignmentId, periodId, date, indicatorId',
      sessionDetails: 'id, sessionId, studentId, attendance',
      taskGrades: 'id, assignmentId, studentId, periodId, taskId',
      examGrades: 'id, assignmentId, studentId, periodId, examId',
      projectGrades: 'id, assignmentId, studentId, periodId, projectId',
      portfolioGrades: 'id, assignmentId, studentId, periodId',
      schedules: 'id, teacherId, groupId, subjectId, dayOfWeek'
    });
  }
}

export const db = new EduGradeDatabase();

export async function seedDatabaseIfEmpty() {
  const count = await db.institutions.count();
  if (count > 0) return;

  // 1. Institución 1: Colegio Técnico (Multi-tenant contratado)
  const ctpPoas: Institution = {
    id: 'inst-ctp-poas',
    name: 'CTP San Rafael de Poás',
    code: '7345',
    type: 'COLLEGE',
    circuit: '07',
    regionalDirection: 'Alajuela',
    createdAt: new Date().toISOString()
  };

  // 2. Institución 2: Espacio Personal (Profesor Independiente)
  const personalWorkspace: Institution = {
    id: 'inst-indep-01',
    name: 'Espacio Docente Independiente',
    code: 'INDEP-001',
    type: 'INDEPENDENT',
    createdAt: new Date().toISOString()
  };

  await db.institutions.bulkAdd([ctpPoas, personalWorkspace]);

  // 3. Usuarios de prueba
  const users: User[] = [
    {
      id: 'user-hellen',
      name: 'Hellen María Rodríguez R.',
      email: 'hrodriguez@mep.go.cr',
      role: 'TEACHER',
      institutionId: 'inst-ctp-poas',
      title: 'Docente Especialidad Inglés'
    },
    {
      id: 'user-director-carlos',
      name: 'Lic. Carlos Méndez A.',
      email: 'director.ctppoas@mep.go.cr',
      role: 'DIRECTOR',
      institutionId: 'inst-ctp-poas',
      title: 'Director Institucional'
    },
    {
      id: 'user-marcos-indep',
      name: 'Prof. Marcos Varela Q.',
      email: 'marcos.tutor@gmail.com',
      role: 'TEACHER',
      institutionId: 'inst-indep-01',
      title: 'Docente y Tutor Particular'
    }
  ];

  await db.users.bulkAdd(users);

  // 4. Materias
  const subjects: Subject[] = [
    {
      id: 'sub-eng-business',
      institutionId: 'inst-ctp-poas',
      name: 'English Oriented to Business & Customer Service',
      code: 'ING-BUS-12',
      color: '#4f46e5'
    },
    {
      id: 'sub-eng-oral',
      institutionId: 'inst-ctp-poas',
      name: 'Oral Communication Lab',
      code: 'ING-ORAL-12',
      color: '#0891b2'
    },
    {
      id: 'sub-math-tutoring',
      institutionId: 'inst-indep-01',
      name: 'Matemática y Lógica Preparatoria',
      code: 'MAT-PREP',
      color: '#059669'
    }
  ];

  await db.subjects.bulkAdd(subjects);

  // 5. Grupos / Secciones
  const groups: Group[] = [
    {
      id: 'grp-12-1',
      institutionId: 'inst-ctp-poas',
      grade: 12,
      sectionCode: '12-1',
      year: 2026,
      specialty: 'Ejecutivo para Centro de Servicios',
      guideTeacherId: 'user-hellen'
    },
    {
      id: 'grp-11-2',
      institutionId: 'inst-ctp-poas',
      grade: 11,
      sectionCode: '11-2',
      year: 2026,
      specialty: 'Contabilidad y Finanzas'
    },
    {
      id: 'grp-tutor-a',
      institutionId: 'inst-indep-01',
      grade: 10,
      sectionCode: 'Bachillerato Intensivo',
      year: 2026
    }
  ];

  await db.groups.bulkAdd(groups);

  // 6. Asignaciones Docentes
  const assignments: TeacherAssignment[] = [
    {
      id: 'asg-hellen-12-1-bus',
      teacherId: 'user-hellen',
      groupId: 'grp-12-1',
      subjectId: 'sub-eng-business',
      isGuia: true
    },
    {
      id: 'asg-hellen-12-1-oral',
      teacherId: 'user-hellen',
      groupId: 'grp-12-1',
      subjectId: 'sub-eng-oral',
      isGuia: true
    },
    {
      id: 'asg-hellen-11-2-bus',
      teacherId: 'user-hellen',
      groupId: 'grp-11-2',
      subjectId: 'sub-eng-business'
    },
    {
      id: 'asg-marcos-indep',
      teacherId: 'user-marcos-indep',
      groupId: 'grp-tutor-a',
      subjectId: 'sub-math-tutoring'
    }
  ];

  await db.assignments.bulkAdd(assignments);

  // 7. Estudiantes reales de 12-1.xlsm
  const students121: Student[] = [
    { id: 'std-01', groupId: 'grp-12-1', idNumber: '209070147', firstLastName: 'Alfaro', secondLastName: 'Céspedes', firstName: 'Bryan Mauricio', accommodation: 'NONE' },
    { id: 'std-02', groupId: 'grp-12-1', idNumber: '209040532', firstLastName: 'Alfaro', secondLastName: 'González', firstName: 'Ian', accommodation: 'NONE' },
    { id: 'std-03', groupId: 'grp-12-1', idNumber: '120100787', firstLastName: 'Blanco', secondLastName: 'Ulloa', firstName: 'Gloriana', accommodation: 'NON_SIGNIFICANT' },
    { id: 'std-04', groupId: 'grp-12-1', idNumber: '209010382', firstLastName: 'Chaves', secondLastName: 'Castro', firstName: 'Steven Josué', accommodation: 'NONE' },
    { id: 'std-05', groupId: 'grp-12-1', idNumber: '209050852', firstLastName: 'Chaves', secondLastName: 'Corella', firstName: 'José Luis', accommodation: 'NONE' },
    { id: 'std-06', groupId: 'grp-12-1', idNumber: '209050481', firstLastName: 'Herrera', secondLastName: 'Rodríguez', firstName: 'Derek', accommodation: 'NONE' },
    { id: 'std-07', groupId: 'grp-12-1', idNumber: '208910947', firstLastName: 'León', secondLastName: 'Brenes', firstName: 'Jordan David', accommodation: 'NONE' },
    { id: 'std-08', groupId: 'grp-12-1', idNumber: '209100689', firstLastName: 'Marín', secondLastName: 'Ugalde', firstName: 'Yoseph David', accommodation: 'NONE' },
    { id: 'std-09', groupId: 'grp-12-1', idNumber: '209060003', firstLastName: 'Martínez', secondLastName: 'Irola', firstName: 'Danny', accommodation: 'NONE' },
    { id: 'std-10', groupId: 'grp-12-1', idNumber: '208980531', firstLastName: 'Morales', secondLastName: 'Alfaro', firstName: 'Dereck Josué', accommodation: 'NONE' },
    { id: 'std-11', groupId: 'grp-12-1', idNumber: '208990532', firstLastName: 'Morera', secondLastName: 'Quirós', firstName: 'Kendall Steff', accommodation: 'NONE' },
    { id: 'std-12', groupId: 'grp-12-1', idNumber: '209040294', firstLastName: 'Murillo', secondLastName: 'Morales', firstName: 'Emily Zharick', accommodation: 'NONE' },
    { id: 'std-13', groupId: 'grp-12-1', idNumber: '209020129', firstLastName: 'Salazar', secondLastName: 'Rojas', firstName: 'Fabricio Javier', accommodation: 'NONE' },
    { id: 'std-14', groupId: 'grp-12-1', idNumber: '208980881', firstLastName: 'Ugalde', secondLastName: 'Masis', firstName: 'Pablo David', accommodation: 'NONE' },
    { id: 'std-15', groupId: 'grp-12-1', idNumber: '120280412', firstLastName: 'Víquez', secondLastName: 'Morera', firstName: 'Adriano', accommodation: 'NONE' }
  ];

  await db.students.bulkAdd(students121);

  // 8. Indicadores Oficiales extraídos de la hoja 'Indicadores' del Excel 12-1.xlsm
  const indicators: LearningIndicator[] = [
    {
      id: 'ind-01',
      assignmentId: 'asg-hellen-12-1-bus',
      code: 'IND-01',
      skillArea: 'Listening',
      description: 'L/ Follow the main points of extended discussion around him/her about the types of apps marketing.',
      initialLevelDesc: 'Reconoce palabras clave aisladas del tema con apoyo.',
      intermediateLevelDesc: 'Comprende los puntos principales con repeticiones moderadas.',
      advancedLevelDesc: 'Sigue fluidamente los puntos principales y detalles específicos de la discusión.'
    },
    {
      id: 'ind-02',
      assignmentId: 'asg-hellen-12-1-bus',
      code: 'IND-02',
      skillArea: 'Reading',
      description: 'R/ Understand clearly written instructions about the aspects required to compare app marketing and consumers reactions.',
      initialLevelDesc: 'Identifica vocabulario básico de instrucciones escritas.',
      intermediateLevelDesc: 'Interpreta las instrucciones principales del reporte.',
      advancedLevelDesc: 'Comprende con precisión todas las instrucciones y relaciones causa-efecto.'
    },
    {
      id: 'ind-03',
      assignmentId: 'asg-hellen-12-1-bus',
      code: 'IND-03',
      skillArea: 'Spoken Interaction',
      description: 'SI/ Maintain a conversation or discussion about essential app marketing strategies.',
      initialLevelDesc: 'Participa con respuestas breves y estructuradas.',
      intermediateLevelDesc: 'Mantiene el intercambio con fluidez intermedia.',
      advancedLevelDesc: 'Interactúa con espontaneidad argumentando estrategias de mercadeo.'
    },
    {
      id: 'ind-04',
      assignmentId: 'asg-hellen-12-1-bus',
      code: 'IND-04',
      skillArea: 'Spoken Interaction',
      description: 'SI/ Enter unprepared into a conversation about the differences between different types of marketing.',
      initialLevelDesc: 'Interviene con preparación previa necesaria.',
      intermediateLevelDesc: 'Se integra a la conversación con pausas ocasionales.',
      advancedLevelDesc: 'Participa sin preparación previa de forma asertiva.'
    },
    {
      id: 'ind-05',
      assignmentId: 'asg-hellen-12-1-bus',
      code: 'IND-05',
      skillArea: 'Spoken Production',
      description: 'SP/ Report straightforward information about the features taken into account for the development of an app marketing plan.',
      initialLevelDesc: 'Describe características de forma puntual.',
      intermediateLevelDesc: 'Estructura una presentación comprensible.',
      advancedLevelDesc: 'Presenta la información de forma detallada y profesional.'
    },
    {
      id: 'ind-06',
      assignmentId: 'asg-hellen-12-1-bus',
      code: 'IND-06',
      skillArea: 'Writing',
      description: 'W/ Write brief standard reports conveying factual information, stating reasons for actions that will be done in the marketing plan.',
      initialLevelDesc: 'Redacta enunciados simples con errores menores.',
      intermediateLevelDesc: 'Elabora un reporte básico coherente.',
      advancedLevelDesc: 'Redacta un reporte ejecutivo estructurado con argumentos claros.'
    }
  ];

  await db.indicators.bulkAdd(indicators);

  // 9. Configuración Evaluativa Modular con definición dinámica de tareas, exámenes y proyectos
  const evalConfig121: EvaluationConfig = {
    id: 'cfg-asg-121-bus-i',
    assignmentId: 'asg-hellen-12-1-bus',
    periodId: 'I_PERIODO',
    passingGrade: 70,
    periodWeight: 50,
    rubrics: [
      { id: 'r-asis', key: 'asistencia', label: 'Asistencia', enabled: true, percentage: 5, description: 'Porcentaje calculado según faltas y total de lecciones' },
      { id: 'r-cot', key: 'cotidiano', label: 'Trabajo Cotidiano', enabled: true, percentage: 25, description: 'Suma de desempeño por clase y lecciones efectivas' },
      { id: 'r-tar', key: 'tareas', label: 'Tareas', enabled: true, percentage: 10, description: 'Tareas y trabajos extra-clase' },
      { id: 'r-eva', key: 'evaluaciones', label: 'Evaluaciones / Pruebas', enabled: true, percentage: 45, description: 'Pruebas comprensivas' },
      { id: 'r-pro', key: 'proyectos', label: 'Proyectos', enabled: true, percentage: 15, description: 'Proyecto técnico de periodo' },
      { id: 'r-por', key: 'portafolio', label: 'Portafolio de Evidencias', enabled: false, percentage: 0, description: 'Opcional (Activable según colegio o materia)' }
    ],
    taskDefinitions: [
      { id: 'tdef-1', number: 1, title: 'Tarea 1: Glosario de Términos Corporativos', percentage: 5 },
      { id: 'tdef-2', number: 2, title: 'Tarea 2: Análisis de Casos de Atención al Cliente', percentage: 5 }
    ],
    examDefinitions: [
      { id: 'edef-1', number: 1, title: 'Evaluación I: Prueba Escrita Comprensiva', percentage: 20 },
      { id: 'edef-2', number: 2, title: 'Evaluación II: Prueba Práctica Oral en Laboratorio', percentage: 25 }
    ],
    projectDefinitions: [
      { id: 'pdef-1', number: 1, title: 'Proyecto I: Plan de Mercadeo y Protocolos de Servicio', percentage: 15 }
    ]
  };

  await db.evaluationConfigs.add(evalConfig121);

  // 10. Clases reales impartidas ligadas a los Indicadores del planeamiento
  const sessions: ClassSession[] = [
    { id: 'sess-01', assignmentId: 'asg-hellen-12-1-bus', periodId: 'I_PERIODO', date: '2026-02-27', lessonsCount: 3, topic: 'Professional Greeting & Executive Phone Etiquette', indicatorId: 'ind-01' },
    { id: 'sess-02', assignmentId: 'asg-hellen-12-1-bus', periodId: 'I_PERIODO', date: '2026-03-02', lessonsCount: 3, topic: 'Customer Inquiry & Active Listening', indicatorId: 'ind-02' },
    { id: 'sess-03', assignmentId: 'asg-hellen-12-1-bus', periodId: 'I_PERIODO', date: '2026-03-06', lessonsCount: 3, topic: 'Troubleshooting Protocols & Polite Expressions', indicatorId: 'ind-03' },
    { id: 'sess-04', assignmentId: 'asg-hellen-12-1-bus', periodId: 'I_PERIODO', date: '2026-03-09', lessonsCount: 3, topic: 'Customer Service Emails & Case Studies', indicatorId: 'ind-05' },
    { id: 'sess-05', assignmentId: 'asg-hellen-12-1-bus', periodId: 'I_PERIODO', date: '2026-03-13', lessonsCount: 3, topic: 'Oral Presentation & Role Play Practice', indicatorId: 'ind-06' }
  ];

  await db.classSessions.bulkAdd(sessions);

  // 11. Detalle de asistencia y cotidiano por estudiante
  const sessionDetails: SessionStudentDetail[] = [];
  sessions.forEach(sess => {
    students121.forEach((st, idx) => {
      let att: SessionStudentDetail['attendance'] = 'PRESENT';
      let lvl: SessionStudentDetail['cotidianoLevel'] = 3;

      if (idx === 7 && sess.id === 'sess-02') {
        att = 'UNEXCUSED_ABSENCE';
        lvl = 0;
      } else if (idx === 5 && sess.id === 'sess-03') {
        att = 'TARDY';
        lvl = 2;
      } else if (idx === 14 && sess.id === 'sess-04') {
        att = 'EXCUSED_ABSENCE';
        lvl = 0;
      } else if (idx === 8 && sess.id === 'sess-01') {
        lvl = 2;
      }

      sessionDetails.push({
        id: `dtl-${sess.id}-${st.id}`,
        sessionId: sess.id,
        studentId: st.id,
        attendance: att,
        cotidianoLevel: lvl
      });
    });
  });

  await db.sessionDetails.bulkAdd(sessionDetails);

  // 12. Notas de Tareas
  const taskGrades: TaskGrade[] = [];
  students121.forEach((st, idx) => {
    const t1 = idx === 0 ? 4.54 : idx === 1 ? 4.37 : 5.0;
    const t2 = idx === 0 ? 5.0 : idx === 1 ? 4.70 : idx === 4 ? 3.86 : 5.0;

    taskGrades.push({
      id: `tg-${st.id}-1`,
      assignmentId: 'asg-hellen-12-1-bus',
      studentId: st.id,
      periodId: 'I_PERIODO',
      taskId: 'tdef-1',
      taskNumber: 1,
      percentageEarned: t1
    });
    taskGrades.push({
      id: `tg-${st.id}-2`,
      assignmentId: 'asg-hellen-12-1-bus',
      studentId: st.id,
      periodId: 'I_PERIODO',
      taskId: 'tdef-2',
      taskNumber: 2,
      percentageEarned: t2
    });
  });
  await db.taskGrades.bulkAdd(taskGrades);

  // 13. Notas de Evaluaciones
  const examGrades: ExamGrade[] = [];
  students121.forEach((st, idx) => {
    const e1 = idx === 0 ? 19.23 : idx === 1 ? 20.0 : idx === 8 ? 16.5 : 19.5;
    const e2 = idx === 0 ? 24.01 : idx === 1 ? 23.03 : idx === 8 ? 21.0 : 24.5;

    examGrades.push({
      id: `eg-${st.id}-1`,
      assignmentId: 'asg-hellen-12-1-bus',
      studentId: st.id,
      periodId: 'I_PERIODO',
      examId: 'edef-1',
      examNumber: 1,
      percentageEarned: e1
    });
    examGrades.push({
      id: `eg-${st.id}-2`,
      assignmentId: 'asg-hellen-12-1-bus',
      studentId: st.id,
      periodId: 'I_PERIODO',
      examId: 'edef-2',
      examNumber: 2,
      percentageEarned: e2
    });
  });
  await db.examGrades.bulkAdd(examGrades);

  // 14. Notas de Proyectos
  const projectGrades: ProjectGrade[] = [];
  students121.forEach((st, idx) => {
    projectGrades.push({
      id: `pg-${st.id}-1`,
      assignmentId: 'asg-hellen-12-1-bus',
      studentId: st.id,
      periodId: 'I_PERIODO',
      projectId: 'pdef-1',
      projectNumber: 1,
      percentageEarned: idx === 8 ? 13.5 : 15.0
    });
  });
  await db.projectGrades.bulkAdd(projectGrades);

  // 15. Horarios
  const schedules: ScheduleItem[] = [
    { id: 'sch-01', teacherId: 'user-hellen', groupId: 'grp-12-1', subjectId: 'sub-eng-business', dayOfWeek: 1, startTime: '07:00', endTime: '09:30', classroom: 'Laboratorio de Idiomas 2' },
    { id: 'sch-02', teacherId: 'user-hellen', groupId: 'grp-12-1', subjectId: 'sub-eng-oral', dayOfWeek: 1, startTime: '09:45', endTime: '11:15', classroom: 'Aula 14' },
    { id: 'sch-03', teacherId: 'user-hellen', groupId: 'grp-12-1', subjectId: 'sub-eng-business', dayOfWeek: 3, startTime: '07:00', endTime: '11:15', classroom: 'Laboratorio de Idiomas 2' },
    { id: 'sch-04', teacherId: 'user-hellen', groupId: 'grp-11-2', subjectId: 'sub-eng-business', dayOfWeek: 4, startTime: '08:00', endTime: '12:00', classroom: 'Aula 22' }
  ];
  await db.schedules.bulkAdd(schedules);
}
