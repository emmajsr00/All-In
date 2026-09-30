import Dexie, { type Table } from 'dexie';
import type {
  Institution,
  User,
  Group,
  Subject,
  TeacherAssignment,
  EvaluationConfig,
  Student,
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
  classSessions!: Table<ClassSession, string>;
  sessionDetails!: Table<SessionStudentDetail, string>;
  taskGrades!: Table<TaskGrade, string>;
  examGrades!: Table<ExamGrade, string>;
  projectGrades!: Table<ProjectGrade, string>;
  portfolioGrades!: Table<PortfolioGrade, string>;
  schedules!: Table<ScheduleItem, string>;

  constructor() {
    super('EduGradeProDB_v2');
    this.version(1).stores({
      institutions: 'id, code, type',
      users: 'id, email, role, institutionId',
      groups: 'id, institutionId, grade, sectionCode',
      subjects: 'id, institutionId, code',
      assignments: 'id, teacherId, groupId, subjectId',
      students: 'id, groupId, idNumber, firstLastName, secondLastName',
      evaluationConfigs: 'id, assignmentId, periodId',
      classSessions: 'id, assignmentId, periodId, date',
      sessionDetails: 'id, sessionId, studentId, attendance',
      taskGrades: 'id, assignmentId, studentId, periodId, taskNumber',
      examGrades: 'id, assignmentId, studentId, periodId, examNumber',
      projectGrades: 'id, assignmentId, studentId, periodId, projectNumber',
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

  // 6. Asignaciones Docentes (Separadas por materia aunque sea el mismo grupo)
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

  // 7. Estudiantes reales extraídos del Excel 12-1.xlsm
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

  // 8. Configuración Evaluativa Modular (Fórmulas exactas del Excel 12-1.xlsm)
  const evalConfig121: EvaluationConfig = {
    id: 'cfg-asg-121-bus-i',
    assignmentId: 'asg-hellen-12-1-bus',
    periodId: 'I_PERIODO',
    passingGrade: 70,
    periodWeight: 50,
    rubrics: [
      { id: 'r-asis', key: 'asistencia', label: 'Asistencia', enabled: true, percentage: 5, description: 'Porcentaje calculado según faltas y total de lecciones' },
      { id: 'r-cot', key: 'cotidiano', label: 'Trabajo Cotidiano', enabled: true, percentage: 25, description: 'Suma de desempeño por clase y lecciones efectivas' },
      { id: 'r-tar', key: 'tareas', label: 'Tareas', enabled: true, percentage: 10, description: '2 tareas (5% cada una)' },
      { id: 'r-eva', key: 'evaluaciones', label: 'Evaluaciones / Pruebas', enabled: true, percentage: 45, description: 'Prueba 1 (20%) y Prueba 2 (25%)' },
      { id: 'r-pro', key: 'proyectos', label: 'Proyectos', enabled: true, percentage: 15, description: 'Proyecto técnico de periodo' },
      { id: 'r-por', key: 'portafolio', label: 'Portafolio de Evidencias', enabled: false, percentage: 0, description: 'Opcional (Activable según colegio o materia)' }
    ],
    taskWeights: [
      { taskNumber: 1, percentage: 5 },
      { taskNumber: 2, percentage: 5 }
    ],
    examWeights: [
      { examNumber: 1, percentage: 20 },
      { examNumber: 2, percentage: 25 }
    ],
    projectWeights: [
      { projectNumber: 1, percentage: 15 }
    ]
  };

  await db.evaluationConfigs.add(evalConfig121);

  // 9. Clases reales impartidas (Extraídas de la hoja Asis. Cot IP del Excel)
  // Cada clase tiene su fecha y lecciones (3 lecciones por clase)
  const sessions: ClassSession[] = [
    { id: 'sess-01', assignmentId: 'asg-hellen-12-1-bus', periodId: 'I_PERIODO', date: '2026-02-27', lessonsCount: 3, topic: 'Professional Greeting & Executive Phone Etiquette' },
    { id: 'sess-02', assignmentId: 'asg-hellen-12-1-bus', periodId: 'I_PERIODO', date: '2026-03-02', lessonsCount: 3, topic: 'Customer Inquiry & Active Listening' },
    { id: 'sess-03', assignmentId: 'asg-hellen-12-1-bus', periodId: 'I_PERIODO', date: '2026-03-06', lessonsCount: 3, topic: 'Troubleshooting Protocols & Polite Expressions' },
    { id: 'sess-04', assignmentId: 'asg-hellen-12-1-bus', periodId: 'I_PERIODO', date: '2026-03-09', lessonsCount: 3, topic: 'Customer Service Emails & Case Studies' },
    { id: 'sess-05', assignmentId: 'asg-hellen-12-1-bus', periodId: 'I_PERIODO', date: '2026-03-13', lessonsCount: 3, topic: 'Oral Presentation & Role Play Practice' }
  ];

  await db.classSessions.bulkAdd(sessions);

  // 10. Detalle de asistencia y cotidiano por estudiante para cada clase
  // Alumnos reales del Excel con niveles 1 (Inicial 0.25), 2 (Intermedio 0.5), 3 (Avanzado 1.0)
  const sessionDetails: SessionStudentDetail[] = [];
  sessions.forEach(sess => {
    students121.forEach((st, idx) => {
      let att: SessionStudentDetail['attendance'] = 'PRESENT';
      let lvl: SessionStudentDetail['cotidianoLevel'] = 3; // Avanzado

      if (idx === 7 && sess.id === 'sess-02') {
        att = 'UNEXCUSED_ABSENCE';
        lvl = 0;
      } else if (idx === 5 && sess.id === 'sess-03') {
        att = 'TARDY';
        lvl = 2; // Intermedio
      } else if (idx === 14 && sess.id === 'sess-04') {
        att = 'EXCUSED_ABSENCE';
        lvl = 0;
      } else if (idx === 8 && sess.id === 'sess-01') {
        lvl = 2; // Intermedio
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

  // 11. Notas de Tareas reales extraídas del Excel
  const taskGrades: TaskGrade[] = [];
  students121.forEach((st, idx) => {
    // Tarea 1 (5%) y Tarea 2 (5%)
    const t1 = idx === 0 ? 4.54 : idx === 1 ? 4.37 : 5.0;
    const t2 = idx === 0 ? 5.0 : idx === 1 ? 4.70 : idx === 4 ? 3.86 : 5.0;

    taskGrades.push({
      id: `tg-${st.id}-1`,
      assignmentId: 'asg-hellen-12-1-bus',
      studentId: st.id,
      periodId: 'I_PERIODO',
      taskNumber: 1,
      percentageEarned: t1
    });
    taskGrades.push({
      id: `tg-${st.id}-2`,
      assignmentId: 'asg-hellen-12-1-bus',
      studentId: st.id,
      periodId: 'I_PERIODO',
      taskNumber: 2,
      percentageEarned: t2
    });
  });
  await db.taskGrades.bulkAdd(taskGrades);

  // 12. Notas de Evaluaciones reales (Prueba 1 sobre 20%, Prueba 2 sobre 25%)
  const examGrades: ExamGrade[] = [];
  students121.forEach((st, idx) => {
    const e1 = idx === 0 ? 19.23 : idx === 1 ? 20.0 : idx === 8 ? 16.5 : 19.5;
    const e2 = idx === 0 ? 24.01 : idx === 1 ? 23.03 : idx === 8 ? 21.0 : 24.5;

    examGrades.push({
      id: `eg-${st.id}-1`,
      assignmentId: 'asg-hellen-12-1-bus',
      studentId: st.id,
      periodId: 'I_PERIODO',
      examNumber: 1,
      percentageEarned: e1
    });
    examGrades.push({
      id: `eg-${st.id}-2`,
      assignmentId: 'asg-hellen-12-1-bus',
      studentId: st.id,
      periodId: 'I_PERIODO',
      examNumber: 2,
      percentageEarned: e2
    });
  });
  await db.examGrades.bulkAdd(examGrades);

  // 13. Notas de Proyecto (15%)
  const projectGrades: ProjectGrade[] = [];
  students121.forEach((st, idx) => {
    projectGrades.push({
      id: `pg-${st.id}-1`,
      assignmentId: 'asg-hellen-12-1-bus',
      studentId: st.id,
      periodId: 'I_PERIODO',
      projectNumber: 1,
      percentageEarned: idx === 8 ? 13.5 : 15.0
    });
  });
  await db.projectGrades.bulkAdd(projectGrades);

  // 14. Horarios semanales
  const schedules: ScheduleItem[] = [
    { id: 'sch-01', teacherId: 'user-hellen', groupId: 'grp-12-1', subjectId: 'sub-eng-business', dayOfWeek: 1, startTime: '07:00', endTime: '09:30', classroom: 'Laboratorio de Idiomas 2' },
    { id: 'sch-02', teacherId: 'user-hellen', groupId: 'grp-12-1', subjectId: 'sub-eng-oral', dayOfWeek: 1, startTime: '09:45', endTime: '11:15', classroom: 'Aula 14' },
    { id: 'sch-03', teacherId: 'user-hellen', groupId: 'grp-12-1', subjectId: 'sub-eng-business', dayOfWeek: 3, startTime: '07:00', endTime: '11:15', classroom: 'Laboratorio de Idiomas 2' },
    { id: 'sch-04', teacherId: 'user-hellen', groupId: 'grp-11-2', subjectId: 'sub-eng-business', dayOfWeek: 4, startTime: '08:00', endTime: '12:00', classroom: 'Aula 22' }
  ];
  await db.schedules.bulkAdd(schedules);
}
