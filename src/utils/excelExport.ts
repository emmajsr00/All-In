import * as XLSX from 'xlsx';
import type { Student, EvaluationConfig } from '../types';

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
  // Construir filas para la exportación
  const rows: (string | number)[][] = [
    ['INSTITUCIÓN:', institutionName, '', 'ASIGNATURA:', subjectName],
    ['SECCIÓN:', sectionCode, '', 'DOCENTE:', teacherName],
    ['FECHA GENERACIÓN:', new Date().toLocaleDateString('es-CR'), '', 'NOTA MÍNIMA APROBACIÓN:', config.passingGrade],
    [],
    ['RUBROS ACTIVOS Y PONDERACIONES:']
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
