import Dexie, { type Table } from 'dexie';
import type {
  Institution,
  User,
  Group,
  Subject,
  TeacherAssignment,
  EvaluationConfig,
  Student,
  AttendanceRecord,
  LearningIndicator,
  IndicatorScore,
  EvaluationItemScore,
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
  attendance!: Table<AttendanceRecord, string>;
  indicators!: Table<LearningIndicator, string>;
  indicatorScores!: Table<IndicatorScore, string>;
  evaluationItemScores!: Table<EvaluationItemScore, string>;
  schedules!: Table<ScheduleItem, string>;

  constructor() {
    super('EduGradeProDB');
    this.version(1).stores({
      institutions: 'id, code, type',
      users: 'id, email, role, institutionId',
      groups: 'id, institutionId, grade, sectionCode',
      subjects: 'id, institutionId, code',
      assignments: 'id, teacherId, groupId, subjectId',
      students: 'id, groupId, idNumber, firstLastName, secondLastName',
      evaluationConfigs: 'id, assignmentId, periodId',
      attendance: 'id, assignmentId, studentId, date, status',
      indicators: 'id, assignmentId, periodId',
      indicatorScores: 'id, indicatorId, studentId',
      evaluationItemScores: 'id, assignmentId, studentId, category',
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

  // 3. Usuarios de prueba con diferentes roles
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

  // 6. Asignaciones Docentes (Demuestra: Profe con múltiples materias en el mismo grupo y en otros grupos)
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

  // 8. Configuración Evaluativa Modular (Fórmula exacta del Excel 12-1.xlsm)
  const evalConfig121: EvaluationConfig = {
    id: 'cfg-asg-121-bus-i',
    assignmentId: 'asg-hellen-12-1-bus',
    periodId: 'I_PERIODO',
    passingGrade: 70,
    periodWeight: 50,
    rubrics: [
      { id: 'r-asis', key: 'asistencia', label: 'Asistencia', enabled: true, percentage: 5, description: 'Asistencia y puntualidad a lecciones' },
      { id: 'r-cot', key: 'cotidiano', label: 'Trabajo Cotidiano', enabled: true, percentage: 25, description: 'Desempeño diario en el aula con rúbricas de aprendizaje' },
      { id: 'r-tar', key: 'tareas', label: 'Tareas', enabled: true, percentage: 10, description: 'Tareas individuales y extra-clase' },
      { id: 'r-eva', key: 'evaluaciones', label: 'Pruebas / Evaluaciones', enabled: true, percentage: 45, description: 'Exámenes y pruebas comprensivas' },
      { id: 'r-pro', key: 'proyectos', label: 'Proyectos', enabled: true, percentage: 15, description: 'Proyectos de investigación o ejecución técnica' },
      { id: 'r-por', key: 'portafolio', label: 'Portafolio de Evidencias', enabled: false, percentage: 0, description: 'Recopilación estructurada de evidencias' }
    ]
  };

  await db.evaluationConfigs.add(evalConfig121);

  // 9. Horarios semanales para detección inteligente de la clase actual
  const schedules: ScheduleItem[] = [
    {
      id: 'sch-01',
      teacherId: 'user-hellen',
      groupId: 'grp-12-1',
      subjectId: 'sub-eng-business',
      dayOfWeek: 1, // Lunes
      startTime: '07:00',
      endTime: '09:30',
      classroom: 'Laboratorio de Idiomas 2'
    },
    {
      id: 'sch-02',
      teacherId: 'user-hellen',
      groupId: 'grp-12-1',
      subjectId: 'sub-eng-oral',
      dayOfWeek: 1, // Lunes
      startTime: '09:45',
      endTime: '11:15',
      classroom: 'Aula 14'
    },
    {
      id: 'sch-03',
      teacherId: 'user-hellen',
      groupId: 'grp-12-1',
      subjectId: 'sub-eng-business',
      dayOfWeek: 3, // Miércoles
      startTime: '07:00',
      endTime: '11:15',
      classroom: 'Laboratorio de Idiomas 2'
    },
    {
      id: 'sch-04',
      teacherId: 'user-hellen',
      groupId: 'grp-11-2',
      subjectId: 'sub-eng-business',
      dayOfWeek: 4, // Jueves
      startTime: '08:00',
      endTime: '12:00',
      classroom: 'Aula 22'
    }
  ];

  await db.schedules.bulkAdd(schedules);

  // 10. Indicadores de muestra para trabajo cotidiano
  const sampleIndicators: LearningIndicator[] = [
    {
      id: 'ind-01',
      assignmentId: 'asg-hellen-12-1-bus',
      periodId: 'I_PERIODO',
      code: 'IND-01',
      title: 'Professional Greeting & Executive Phone Etiquette',
      description: 'Aplica fórmulas de cortesía y vocabulario profesional en atención a llamadas corporativas simuladas.',
      maxPoints: 3
    },
    {
      id: 'ind-02',
      assignmentId: 'asg-hellen-12-1-bus',
      periodId: 'I_PERIODO',
      code: 'IND-02',
      title: 'Customer Inquiry & Troubleshooting Protocols',
      description: 'Elabora respuestas estructuradas y asertivas frente a consultas de clientes utilizando lenguaje formal.',
      maxPoints: 3
    }
  ];

  await db.indicators.bulkAdd(sampleIndicators);

  // 11. Asistencias de muestra
  const todayStr = new Date().toISOString().split('T')[0];
  const attendanceRecords: AttendanceRecord[] = students121.map((s, index) => {
    let status: AttendanceRecord['status'] = 'PRESENT';
    if (index === 2) status = 'TARDY';
    if (index === 7) status = 'UNEXCUSED_ABSENCE';
    if (index === 14) status = 'EXCUSED_ABSENCE';
    return {
      id: `att-${todayStr}-${s.id}`,
      assignmentId: 'asg-hellen-12-1-bus',
      studentId: s.id,
      date: todayStr,
      status
    };
  });

  await db.attendance.bulkAdd(attendanceRecords);

  // 12. Puntuaciones de indicadores
  const scores: IndicatorScore[] = [
    { id: 'sc-1', indicatorId: 'ind-01', studentId: 'std-01', score: 3 },
    { id: 'sc-2', indicatorId: 'ind-01', studentId: 'std-02', score: 3 },
    { id: 'sc-3', indicatorId: 'ind-01', studentId: 'std-03', score: 3 },
    { id: 'sc-4', indicatorId: 'ind-01', studentId: 'std-04', score: 2 },
    { id: 'sc-5', indicatorId: 'ind-01', studentId: 'std-05', score: 3 }
  ];
  await db.indicatorScores.bulkAdd(scores);
}
