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

export class AllInDatabase extends Dexie {
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

export const db = new AllInDatabase();

export async function seedDatabaseIfEmpty() {
  const count = await db.institutions.count();
  if (count > 0) {
    // Asegurar existencia del usuario Desarrollador
    const devUser = await db.users.where('email').equals('admin@allin.com').first();
    if (!devUser) {
      await db.users.add({
        id: 'user-developer',
        name: 'Emmanuel (Desarrollador ALL-IN)',
        email: 'admin@allin.com',
        password: 'admin',
        role: 'DEVELOPER',
        institutionId: 'inst-ctp-poas',
        title: 'Desarrollador y Creador del Sistema'
      });
    }

    // Asegurar contraseña por defecto en usuarios existentes
    const currentUsers = await db.users.toArray();
    for (const u of currentUsers) {
      if (!u.password) {
        await db.users.update(u.id, { password: u.role === 'DEVELOPER' ? 'admin' : '123' });
      }
    }

    // Asegurar existencia de la institución independiente
    const indepInst = await db.institutions.get('inst-indep-01');
    if (!indepInst) {
      await db.institutions.add({
        id: 'inst-indep-01',
        name: 'Espacio Docente Independiente',
        code: 'INDEP-001',
        type: 'INDEPENDENT',
        createdAt: new Date().toISOString()
      });
    }

    // Asegurar existencia del usuario Docente Independiente
    const indepUser = await db.users.where('email').equals('marcos.tutor@gmail.com').first();
    if (!indepUser) {
      await db.users.add({
        id: 'user-marcos-indep',
        name: 'Prof. Marcos Varela Q.',
        email: 'marcos.tutor@gmail.com',
        password: '123',
        role: 'TEACHER',
        institutionId: 'inst-indep-01',
        title: 'Docente y Tutor Particular'
      });
    }

    // Asegurar grupo independiente
    const indepGroup = await db.groups.get('grp-tutor-a');
    if (!indepGroup) {
      await db.groups.add({
        id: 'grp-tutor-a',
        institutionId: 'inst-indep-01',
        grade: 10,
        sectionCode: 'Bachillerato Intensivo',
        groupName: 'Tutoría Grupal Sábados',
        specialty: 'Preparación MEP',
        year: 2026,
        guideTeacherId: 'user-marcos-indep'
      });
    }

    // Asegurar materia independiente
    const indepSubject = await db.subjects.get('sub-math-tutoring');
    if (!indepSubject) {
      await db.subjects.add({
        id: 'sub-math-tutoring',
        institutionId: 'inst-indep-01',
        name: 'Matemática y Lógica Preparatoria',
        code: 'MAT-PREP',
        color: '#059669',
        teacherId: 'user-marcos-indep'
      });
    }

    // Asegurar asignación independiente
    const indepAsg = await db.assignments.get('asg-marcos-indep');
    if (!indepAsg) {
      await db.assignments.add({
        id: 'asg-marcos-indep',
        teacherId: 'user-marcos-indep',
        groupId: 'grp-tutor-a',
        subjectId: 'sub-math-tutoring',
        isGuia: true
      });
    }

    // Asegurar configuración de evaluación para Marcos
    const indepCfg = await db.evaluationConfigs.get('cfg-asg-marcos-indep');
    if (!indepCfg) {
      await db.evaluationConfigs.add({
        id: 'cfg-asg-marcos-indep',
        assignmentId: 'asg-marcos-indep',
        periodId: 'I_PERIODO',
        passingGrade: 70,
        periodWeight: 50,
        rubrics: [
          { id: 'r-1', key: 'asistencia', label: 'Asistencia', enabled: true, percentage: 5, description: 'Asistencia y puntualidad' },
          { id: 'r-2', key: 'cotidiano', label: 'Trabajo Cotidiano', enabled: true, percentage: 25, description: 'Desempeño diario en clase' },
          { id: 'r-3', key: 'tareas', label: 'Tareas', enabled: true, percentage: 10, description: 'Trabajos extraclase' },
          { id: 'r-4', key: 'evaluaciones', label: 'Evaluaciones / Pruebas', enabled: true, percentage: 45, description: 'Pruebas escritas o prácticas' },
          { id: 'r-5', key: 'proyecto', label: 'Proyecto', enabled: false, percentage: 15, description: 'Proyecto de aula' },
          { id: 'r-6', key: 'portafolio', label: 'Portafolio', enabled: false, percentage: 10, description: 'Portafolio de evidencias' }
        ],
        taskDefinitions: [],
        examDefinitions: [],
        projectDefinitions: [],
        periods: [
          { periodId: 'I_PERIODO', name: 'I Periodo', startDate: '2026-02-09', endDate: '2026-06-26', weightPercentage: 50 },
          { periodId: 'II_PERIODO', name: 'II Periodo', startDate: '2026-07-13', endDate: '2026-12-11', weightPercentage: 50 }
        ]
      });
    }

    // Asegurar estudiantes de prueba para grp-tutor-a
    const indepStudentsCount = await db.students.where('groupId').equals('grp-tutor-a').count();
    if (indepStudentsCount === 0) {
      await db.students.bulkAdd([
        { id: 'std-indep-01', groupId: 'grp-tutor-a', idNumber: '118540932', firstLastName: 'Alvarado', secondLastName: 'Solano', firstName: 'Sofía Elena', accommodation: 'NONE' },
        { id: 'std-indep-02', groupId: 'grp-tutor-a', idNumber: '119230485', firstLastName: 'Castillo', secondLastName: 'Navarro', firstName: 'Matías José', accommodation: 'NONE' },
        { id: 'std-indep-03', groupId: 'grp-tutor-a', idNumber: '117890321', firstLastName: 'Vargas', secondLastName: 'Chinchilla', firstName: 'Valeria', accommodation: 'NON_SIGNIFICANT' }
      ]);
    }

    // Migración ligera: asegurar que existan los periodos y datos de prueba de II periodo
    const configs = await db.evaluationConfigs.toArray();
    for (const c of configs) {
      if (!c.periods || c.periods.length === 0) {
        await db.evaluationConfigs.update(c.id, {
          periods: [
            { periodId: 'I_PERIODO', name: 'I Periodo', startDate: '2026-02-09', endDate: '2026-06-26', weightPercentage: 50 },
            { periodId: 'II_PERIODO', name: 'II Periodo', startDate: '2026-07-13', endDate: '2026-12-11', weightPercentage: 50 }
          ]
        });
      }
    }

    const p2SessionsCount = await db.classSessions.filter(s => s.periodId === 'II_PERIODO').count();
    if (p2SessionsCount === 0) {
      const p2Sessions: ClassSession[] = [
        { id: 'sess-06', assignmentId: 'asg-hellen-12-1-bus', periodId: 'II_PERIODO', date: '2026-07-20', lessonsCount: 3, topic: 'Advanced Negotiation & Cross-Cultural Communication', indicatorId: 'ind-01' },
        { id: 'sess-07', assignmentId: 'asg-hellen-12-1-bus', periodId: 'II_PERIODO', date: '2026-08-03', lessonsCount: 3, topic: 'Market Research Presentations & Analysis', indicatorId: 'ind-02' },
        { id: 'sess-08', assignmentId: 'asg-hellen-12-1-bus', periodId: 'II_PERIODO', date: '2026-08-17', lessonsCount: 3, topic: 'Digital Marketing Strategies & Client Acquisition', indicatorId: 'ind-03' },
        { id: 'sess-09', assignmentId: 'asg-hellen-12-1-bus', periodId: 'II_PERIODO', date: '2026-09-07', lessonsCount: 3, topic: 'Final Business Pitch & Proposal Review', indicatorId: 'ind-05' }
      ];
      await db.classSessions.bulkAdd(p2Sessions);

      const allStudents = await db.students.toArray();
      const p2Details: SessionStudentDetail[] = [];
      p2Sessions.forEach(sess => {
        allStudents.forEach((st, idx) => {
          p2Details.push({
            id: `dtl-${sess.id}-${st.id}`,
            sessionId: sess.id,
            studentId: st.id,
            attendance: idx === 8 && sess.id === 'sess-08' ? 'UNEXCUSED_ABSENCE' : 'PRESENT',
            cotidianoLevel: idx === 8 ? 1 : 3
          });
        });
      });
      await db.sessionDetails.bulkAdd(p2Details);

      const p2Tasks: TaskGrade[] = [];
      const p2Exams: ExamGrade[] = [];
      const p2Projects: ProjectGrade[] = [];

      allStudents.forEach((st, idx) => {
        p2Tasks.push(
          { id: `tg-${st.id}-1-p2`, assignmentId: 'asg-hellen-12-1-bus', studentId: st.id, periodId: 'II_PERIODO', taskId: 'tdef-1', taskNumber: 1, percentageEarned: idx === 8 ? 3.0 : 5.0 },
          { id: `tg-${st.id}-2-p2`, assignmentId: 'asg-hellen-12-1-bus', studentId: st.id, periodId: 'II_PERIODO', taskId: 'tdef-2', taskNumber: 2, percentageEarned: idx === 8 ? 2.5 : 4.8 }
        );
        p2Exams.push(
          { id: `eg-${st.id}-1-p2`, assignmentId: 'asg-hellen-12-1-bus', studentId: st.id, periodId: 'II_PERIODO', examId: 'edef-1', examNumber: 1, percentageEarned: idx === 8 ? 11.5 : 19.5 },
          { id: `eg-${st.id}-2-p2`, assignmentId: 'asg-hellen-12-1-bus', studentId: st.id, periodId: 'II_PERIODO', examId: 'edef-2', examNumber: 2, percentageEarned: idx === 8 ? 13.0 : 24.0 }
        );
        p2Projects.push(
          { id: `pg-${st.id}-1-p2`, assignmentId: 'asg-hellen-12-1-bus', studentId: st.id, periodId: 'II_PERIODO', projectId: 'pdef-1', projectNumber: 1, percentageEarned: idx === 8 ? 9.0 : 15.0 }
        );
      });

      await db.taskGrades.bulkAdd(p2Tasks);
      await db.examGrades.bulkAdd(p2Exams);
      await db.projectGrades.bulkAdd(p2Projects);
    }
    return;
  }

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
      id: 'user-developer',
      name: 'Emmanuel (Desarrollador ALL-IN)',
      email: 'admin@allin.com',
      password: 'admin',
      role: 'DEVELOPER',
      institutionId: 'inst-ctp-poas',
      title: 'Desarrollador y Creador del Sistema'
    },
    {
      id: 'user-hellen',
      name: 'Hellen María Rodríguez R.',
      email: 'hrodriguez@mep.go.cr',
      password: '123',
      role: 'TEACHER',
      institutionId: 'inst-ctp-poas',
      title: 'Docente Especialidad Inglés'
    },
    {
      id: 'user-director-carlos',
      name: 'Lic. Carlos Méndez A.',
      email: 'director.ctppoas@mep.go.cr',
      password: '123',
      role: 'DIRECTOR',
      institutionId: 'inst-ctp-poas',
      title: 'Director Institucional'
    },
    {
      id: 'user-marcos-indep',
      name: 'Prof. Marcos Varela Q.',
      email: 'marcos.tutor@gmail.com',
      password: '123',
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
    periods: [
      {
        periodId: 'I_PERIODO',
        name: 'I Periodo',
        startDate: '2026-02-09',
        endDate: '2026-06-26',
        weightPercentage: 50
      },
      {
        periodId: 'II_PERIODO',
        name: 'II Periodo',
        startDate: '2026-07-13',
        endDate: '2026-12-11',
        weightPercentage: 50
      }
    ],
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
    // --- I PERIODO ---
    { id: 'sess-01', assignmentId: 'asg-hellen-12-1-bus', periodId: 'I_PERIODO', date: '2026-02-27', lessonsCount: 3, topic: 'Professional Greeting & Executive Phone Etiquette', indicatorId: 'ind-01' },
    { id: 'sess-02', assignmentId: 'asg-hellen-12-1-bus', periodId: 'I_PERIODO', date: '2026-03-02', lessonsCount: 3, topic: 'Customer Inquiry & Active Listening', indicatorId: 'ind-02' },
    { id: 'sess-03', assignmentId: 'asg-hellen-12-1-bus', periodId: 'I_PERIODO', date: '2026-03-06', lessonsCount: 3, topic: 'Troubleshooting Protocols & Polite Expressions', indicatorId: 'ind-03' },
    { id: 'sess-04', assignmentId: 'asg-hellen-12-1-bus', periodId: 'I_PERIODO', date: '2026-03-09', lessonsCount: 3, topic: 'Customer Service Emails & Case Studies', indicatorId: 'ind-05' },
    { id: 'sess-05', assignmentId: 'asg-hellen-12-1-bus', periodId: 'I_PERIODO', date: '2026-03-13', lessonsCount: 3, topic: 'Oral Presentation & Role Play Practice', indicatorId: 'ind-06' },
    // --- II PERIODO ---
    { id: 'sess-06', assignmentId: 'asg-hellen-12-1-bus', periodId: 'II_PERIODO', date: '2026-07-20', lessonsCount: 3, topic: 'Advanced Negotiation & Cross-Cultural Communication', indicatorId: 'ind-01' },
    { id: 'sess-07', assignmentId: 'asg-hellen-12-1-bus', periodId: 'II_PERIODO', date: '2026-08-03', lessonsCount: 3, topic: 'Market Research Presentations & Analysis', indicatorId: 'ind-02' },
    { id: 'sess-08', assignmentId: 'asg-hellen-12-1-bus', periodId: 'II_PERIODO', date: '2026-08-17', lessonsCount: 3, topic: 'Digital Marketing Strategies & Client Acquisition', indicatorId: 'ind-03' },
    { id: 'sess-09', assignmentId: 'asg-hellen-12-1-bus', periodId: 'II_PERIODO', date: '2026-09-07', lessonsCount: 3, topic: 'Final Business Pitch & Proposal Review', indicatorId: 'ind-05' }
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

// Exportar copia de seguridad completa en JSON
export async function exportDatabaseBackup(): Promise<string> {
  const backup = {
    appName: 'ALL-IN Educational System',
    version: '3.0',
    exportDate: new Date().toISOString(),
    institutions: await db.institutions.toArray(),
    users: await db.users.toArray(),
    groups: await db.groups.toArray(),
    subjects: await db.subjects.toArray(),
    assignments: await db.assignments.toArray(),
    students: await db.students.toArray(),
    evaluationConfigs: await db.evaluationConfigs.toArray(),
    indicators: await db.indicators.toArray(),
    classSessions: await db.classSessions.toArray(),
    sessionDetails: await db.sessionDetails.toArray(),
    taskGrades: await db.taskGrades.toArray(),
    examGrades: await db.examGrades.toArray(),
    projectGrades: await db.projectGrades.toArray(),
    portfolioGrades: await db.portfolioGrades.toArray(),
    schedules: await db.schedules.toArray()
  };
  return JSON.stringify(backup, null, 2);
}

// Importar copia de seguridad desde JSON
export async function importDatabaseBackup(jsonData: string): Promise<boolean> {
  const data = JSON.parse(jsonData);
  if (!data.users || !data.groups || !data.students) {
    throw new Error('El archivo no contiene un formato de respaldo válido de ALL-IN.');
  }

  await db.transaction('rw', [
    db.institutions,
    db.users,
    db.groups,
    db.subjects,
    db.assignments,
    db.students,
    db.evaluationConfigs,
    db.indicators,
    db.classSessions,
    db.sessionDetails,
    db.taskGrades,
    db.examGrades,
    db.projectGrades,
    db.portfolioGrades,
    db.schedules
  ], async () => {
    if (data.institutions?.length) { await db.institutions.clear(); await db.institutions.bulkAdd(data.institutions); }
    if (data.users?.length) { await db.users.clear(); await db.users.bulkAdd(data.users); }
    if (data.groups?.length) { await db.groups.clear(); await db.groups.bulkAdd(data.groups); }
    if (data.subjects?.length) { await db.subjects.clear(); await db.subjects.bulkAdd(data.subjects); }
    if (data.assignments?.length) { await db.assignments.clear(); await db.assignments.bulkAdd(data.assignments); }
    if (data.students?.length) { await db.students.clear(); await db.students.bulkAdd(data.students); }
    if (data.evaluationConfigs?.length) { await db.evaluationConfigs.clear(); await db.evaluationConfigs.bulkAdd(data.evaluationConfigs); }
    if (data.indicators?.length) { await db.indicators.clear(); await db.indicators.bulkAdd(data.indicators); }
    if (data.classSessions?.length) { await db.classSessions.clear(); await db.classSessions.bulkAdd(data.classSessions); }
    if (data.sessionDetails?.length) { await db.sessionDetails.clear(); await db.sessionDetails.bulkAdd(data.sessionDetails); }
    if (data.taskGrades?.length) { await db.taskGrades.clear(); await db.taskGrades.bulkAdd(data.taskGrades); }
    if (data.examGrades?.length) { await db.examGrades.clear(); await db.examGrades.bulkAdd(data.examGrades); }
    if (data.projectGrades?.length) { await db.projectGrades.clear(); await db.projectGrades.bulkAdd(data.projectGrades); }
    if (data.portfolioGrades?.length) { await db.portfolioGrades.clear(); await db.portfolioGrades.bulkAdd(data.portfolioGrades); }
    if (data.schedules?.length) { await db.schedules.clear(); await db.schedules.bulkAdd(data.schedules); }
  });

  return true;
}

