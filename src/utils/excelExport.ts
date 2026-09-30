import * as XLSX from 'xlsx';
import type { Student, EvaluationConfig, ClassSession, SessionStudentDetail } from '../types';
import type { StudentCalculatedGrades } from './gradeCalculations';

export function exportGradebookToExcel(
  institutionName: string,
  sectionCode: string,
  subjectName: string,
  teacherName: string,
  students: Student[],
  config: EvaluationConfig,
  studentGrades: {
    studentId: string;
    asistencia: number;
    cotidiano: number;
    tareas: number;
    evaluaciones: number;
    proyectos: number;
    portafolio: number;
    notaFinal: number;
    condicion: string;
  }[]
) {
  const rows: (string | number)[][] = [
    ['INSTITUCIÓN:', institutionName, '', 'ASIGNATURA:', subjectName],
    ['SECCIÓN:', sectionCode, '', 'DOCENTE:', teacherName],
    ['FECHA GENERACIÓN:', new Date().toLocaleDateString('es-CR'), '', 'NOTA MÍNIMA APROBACIÓN:', config.passingGrade],
    [],
    ['REGISTRO GENERAL DE CALIFICACIONES:']
  ];

  const rubricsHeader = config.rubrics
    .filter(r => r.enabled)
    .map(r => `${r.label} (${r.percentage}%)`);

  rows.push(['#', 'CÉDULA', 'PRIMER APELLIDO', 'SEGUNDO APELLIDO', 'NOMBRE', ...rubricsHeader, 'NOTA FINAL (100%)', 'CONDICIÓN']);

  students.forEach((s, idx) => {
    const grades = studentGrades.find(g => g.studentId === s.id) || {
      studentId: s.id,
      asistencia: 0,
      cotidiano: 0,
      tareas: 0,
      evaluaciones: 0,
      proyectos: 0,
      portafolio: 0,
      notaFinal: 0,
      condicion: 'Pendiente'
    };

    const rubricValues: number[] = [];
    config.rubrics.forEach(r => {
      if (r.enabled) {
        if (r.key === 'asistencia') rubricValues.push(Number(grades.asistencia.toFixed(2)));
        else if (r.key === 'cotidiano') rubricValues.push(Number(grades.cotidiano.toFixed(2)));
        else if (r.key === 'tareas') rubricValues.push(Number(grades.tareas.toFixed(2)));
        else if (r.key === 'evaluaciones') rubricValues.push(Number(grades.evaluaciones.toFixed(2)));
        else if (r.key === 'proyectos') rubricValues.push(Number(grades.proyectos.toFixed(2)));
        else if (r.key === 'portafolio') rubricValues.push(Number(grades.portafolio.toFixed(2)));
        else rubricValues.push(0);
      }
    });

    rows.push([
      idx + 1,
      s.idNumber,
      s.firstLastName,
      s.secondLastName,
      s.firstName,
      ...rubricValues,
      Number(grades.notaFinal.toFixed(2)),
      grades.condicion
    ]);
  });

  const ws = XLSX.utils.aoa_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, `Registro ${sectionCode}`);

  const fileName = `Registro_${sectionCode}_${subjectName.substring(0, 15)}_${new Date().toISOString().split('T')[0]}.xlsx`;
  XLSX.writeFile(wb, fileName);
}

// Exportar ficha/expediente individual de un estudiante en específico
export function exportStudentDossierToExcel(
  institutionName: string,
  sectionCode: string,
  subjectName: string,
  teacherName: string,
  calculated: StudentCalculatedGrades,
  sessions: ClassSession[],
  sessionDetails: SessionStudentDetail[]
) {
  const rows: (string | number)[][] = [
    ['EXPEDIENTE INDIVIDUAL DE CALIFICACIONES Y ASISTENCIA'],
    ['INSTITUCIÓN:', institutionName, '', 'FECHA:', new Date().toLocaleDateString('es-CR')],
    ['SECCIÓN:', sectionCode, '', 'ASIGNATURA:', subjectName],
    ['DOCENTE:', teacherName],
    [],
    ['DATOS DEL ESTUDIANTE:'],
    ['NOMBRE COMPLETO:', `${calculated.student.firstLastName} ${calculated.student.secondLastName} ${calculated.student.firstName}`],
    ['CÉDULA:', calculated.student.idNumber],
    ['NOTA FINAL OBTENIDA:', calculated.notaFinal, 'CONDICIÓN:', calculated.condicion],
    [],
    ['DESGLOSE POR RUBROS EVALUATIVOS:'],
    ['Rubro', 'Puntaje / Porcentaje Obtenido', 'Detalle'],
    ['Asistencia', `${calculated.asistenciaPts}%`, `${calculated.unexcusedAbsences} Injustificadas, ${calculated.tardies} Tardías`],
    ['Trabajo Cotidiano', `${calculated.cotidianoPts}%`, `${calculated.puntosCotidianoObtenidos} de ${calculated.totalLessons} lecciones efectivas`],
    ['Tareas', `${calculated.tareasPts}%`, `${calculated.tareasList.length} Tareas`],
    ['Evaluaciones / Pruebas', `${calculated.evaluacionesPts}%`, `${calculated.evaluacionesList.length} Pruebas`],
    ['Proyectos', `${calculated.proyectosPts}%`, `${calculated.proyectosList.length} Proyectos`],
    [],
    ['HISTORIAL DETALLADO DE ASISTENCIA Y COTIDIANO POR CLASE:'],
    ['Fecha', 'Lecciones', 'Estado Asistencia', 'Nivel Cotidiano', 'Tema']
  ];

  sessions.forEach(sess => {
    const det = sessionDetails.find(d => d.sessionId === sess.id && d.studentId === calculated.studentId);
    const attStr = det?.attendance === 'PRESENT'
      ? 'Presente'
      : det?.attendance === 'UNEXCUSED_ABSENCE'
      ? 'Ausencia Injustificada'
      : det?.attendance === 'TARDY'
      ? 'Tardía'
      : det?.attendance === 'LESSON_ESCAPE'
      ? 'Escape de Lección'
      : 'Ausencia Justificada';

    const lvlStr = det?.cotidianoLevel === 3
      ? 'Nivel 3 (Avanzado 100%)'
      : det?.cotidianoLevel === 2
      ? 'Nivel 2 (Intermedio 50%)'
      : det?.cotidianoLevel === 1
      ? 'Nivel 1 (Inicial 25%)'
      : '0 (Ausente / No eval)';

    rows.push([
      sess.date,
      sess.lessonsCount,
      attStr,
      lvlStr,
      sess.topic || ''
    ]);
  });

  const ws = XLSX.utils.aoa_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, `Expediente ${calculated.student.firstLastName}`);

  const fileName = `Expediente_${calculated.student.firstLastName}_${sectionCode}_${new Date().toISOString().split('T')[0]}.xlsx`;
  XLSX.writeFile(wb, fileName);
}

export function exportAnnualConsolidatedToExcel(
  institutionName: string,
  sectionCode: string,
  subjectName: string,
  teacherName: string,
  passingGrade: number,
  p1Weight: number,
  p2Weight: number,
  consolidatedData: {
    studentId: string;
    idNumber: string;
    fullName: string;
    period1Grade: number;
    period2Grade: number;
    annualAverage: number;
    annualCondition: string;
    convocatoria1?: number;
    convocatoria2?: number;
    finalCondition: string;
  }[]
) {
  const rows: (string | number)[][] = [
    ['INSTITUCIÓN:', institutionName, '', 'ASIGNATURA:', subjectName],
    ['SECCIÓN:', sectionCode, '', 'DOCENTE:', teacherName],
    ['CONSOLIDADO ANUAL DE CALIFICACIONES Y CONVOCATORIAS (MEP)', '', '', 'NOTA MÍNIMA:', passingGrade],
    ['FECHA:', new Date().toLocaleDateString('es-CR'), '', `PONDERACIÓN: I Per (${p1Weight}%) - II Per (${p2Weight}%)`],
    [],
    [
      '#',
      'CÉDULA',
      'ESTUDIANTE',
      `I PERIODO (${p1Weight}%)`,
      `II PERIODO (${p2Weight}%)`,
      'PROMEDIO ANUAL (100%)',
      'CONDICIÓN ANUAL',
      '1° CONVOCATORIA',
      '2° CONVOCATORIA',
      'CONDICIÓN FINAL'
    ]
  ];

  consolidatedData.forEach((st, idx) => {
    rows.push([
      idx + 1,
      st.idNumber,
      st.fullName,
      st.period1Grade,
      st.period2Grade,
      st.annualAverage,
      st.annualCondition,
      st.convocatoria1 !== undefined ? st.convocatoria1 : '-',
      st.convocatoria2 !== undefined ? st.convocatoria2 : '-',
      st.finalCondition
    ]);
  });

  const ws = XLSX.utils.aoa_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Consolidado Anual');

  const fileName = `Consolidado_Anual_${sectionCode}_${new Date().toISOString().split('T')[0]}.xlsx`;
  XLSX.writeFile(wb, fileName);
}

