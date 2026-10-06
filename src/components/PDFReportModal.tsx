import React, { useState } from 'react';
import {
  Printer,
  X,
  Users,
  User,
  Download
} from 'lucide-react';
import type {
  Group,
  Subject,
  Student,
  EvaluationConfig,
  ClassSession,
  SessionStudentDetail,
  TaskGrade,
  ExamGrade,
  ProjectGrade,
  PortfolioGrade
} from '../types';
import { computeMEPStudentGrades } from '../utils/gradeCalculations';

interface PDFReportModalProps {
  institutionName: string;
  group: Group;
  subject: Subject;
  teacherName: string;
  periodId: 'I_PERIODO' | 'II_PERIODO';
  periodName: string;
  students: Student[];
  config: EvaluationConfig;
  sessions: ClassSession[];
  sessionDetails: SessionStudentDetail[];
  taskGrades: TaskGrade[];
  examGrades: ExamGrade[];
  projectGrades: ProjectGrade[];
  portfolioGrades: PortfolioGrade[];
  initialStudentId?: string;
  onClose: () => void;
}

export const PDFReportModal: React.FC<PDFReportModalProps> = ({
  institutionName,
  group,
  subject,
  teacherName,
  periodId,
  periodName,
  students,
  config,
  sessions,
  sessionDetails,
  taskGrades,
  examGrades,
  projectGrades,
  portfolioGrades,
  initialStudentId,
  onClose
}) => {
  // Modo de exportación: INDIVIDUAL (Ficha individual vertical) o GRUPAL (Sábana horizontal)
  const [reportType, setReportType] = useState<'INDIVIDUAL' | 'GRUPAL'>('INDIVIDUAL');
  const [selectedStudentId, setSelectedStudentId] = useState<string>(
    initialStudentId || students[0]?.id || ''
  );

  // Filtrar sesiones y calificaciones pertenecientes al periodo actual
  const periodSessions = sessions.filter(s => s.periodId === periodId);
  const periodTasks = taskGrades.filter(t => t.periodId === periodId);
  const periodExams = examGrades.filter(e => e.periodId === periodId);
  const periodProjects = projectGrades.filter(p => p.periodId === periodId);
  const periodPortfolios = portfolioGrades.filter(p => p.periodId === periodId);

  // Calcular notas de todos los estudiantes
  const allComputed = students.map(st => {
    const studentGrades = computeMEPStudentGrades(
      st,
      config,
      periodSessions,
      sessionDetails,
      periodTasks,
      periodExams,
      periodProjects,
      periodPortfolios
    );
    return {
      student: st,
      grades: studentGrades
    };
  });

  const selectedStudentData = allComputed.find(s => s.student.id === selectedStudentId) || allComputed[0];

  // Estadísticas del grupo
  const passingCount = allComputed.filter(s => s.grades.condicion === 'Aprobado').length;
  const failingCount = allComputed.filter(s => s.grades.condicion === 'Aplazado').length;
  const groupAverage = allComputed.length > 0
    ? (allComputed.reduce((acc, curr) => acc + curr.grades.notaFinal, 0) / allComputed.length).toFixed(1)
    : '0';

  const handlePrint = () => {
    window.print();
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.8)',
      backdropFilter: 'blur(6px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 200,
      padding: '16px'
    }}>
      <div className="glass-panel" style={{
        width: '100%',
        maxWidth: reportType === 'GRUPAL' ? '1100px' : '900px',
        maxHeight: '94vh',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: '0 25px 50px -12px rgba(0,0,0,0.6)',
        overflow: 'hidden'
      }}>
        {/* Barra Superior / Controles (NO SE IMPRIME) */}
        <div className="no-print" style={{
          padding: '16px 20px',
          background: 'var(--bg-surface)',
          borderBottom: '1px solid var(--border-subtle)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '12px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              width: '40px',
              height: '40px',
              borderRadius: '10px',
              background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white',
              boxShadow: '0 2px 8px rgba(220, 38, 38, 0.3)'
            }}>
              <Printer size={22} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, color: 'var(--text-main)' }}>
                Generar Reporte Oficial PDF
              </h3>
              <p style={{ margin: 0, fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                Estructura de actas según formato oficial MEP / Control de Estudiantes
              </p>
            </div>
          </div>

          {/* Selector de Tipo de Reporte (Individual vs Grupal) */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{
              display: 'flex',
              background: 'var(--bg-main)',
              padding: '4px',
              borderRadius: '8px',
              border: '1px solid var(--border-subtle)'
            }}>
              <button
                onClick={() => setReportType('INDIVIDUAL')}
                style={{
                  padding: '7px 14px',
                  borderRadius: '6px',
                  border: 'none',
                  background: reportType === 'INDIVIDUAL' ? '#4f46e5' : 'transparent',
                  color: reportType === 'INDIVIDUAL' ? '#ffffff' : 'var(--text-main)',
                  fontSize: '0.82rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  boxShadow: reportType === 'INDIVIDUAL' ? '0 1px 4px rgba(79, 70, 229, 0.4)' : 'none',
                  transition: 'all 0.15s ease'
                }}
              >
                <User size={15} />
                <span>Ficha Individual (Vertical)</span>
              </button>
              <button
                onClick={() => setReportType('GRUPAL')}
                style={{
                  padding: '7px 14px',
                  borderRadius: '6px',
                  border: 'none',
                  background: reportType === 'GRUPAL' ? '#4f46e5' : 'transparent',
                  color: reportType === 'GRUPAL' ? '#ffffff' : 'var(--text-main)',
                  fontSize: '0.82rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  boxShadow: reportType === 'GRUPAL' ? '0 1px 4px rgba(79, 70, 229, 0.4)' : 'none',
                  transition: 'all 0.15s ease'
                }}
              >
                <Users size={15} />
                <span>Reporte Grupal (Horizontal)</span>
              </button>
            </div>

            {reportType === 'INDIVIDUAL' && (
              <select
                value={selectedStudentId}
                onChange={(e) => setSelectedStudentId(e.target.value)}
                style={{
                  padding: '8px 12px',
                  borderRadius: '8px',
                  border: '1px solid var(--border-subtle)',
                  background: 'var(--bg-card)',
                  color: 'var(--text-main)',
                  fontSize: '0.82rem',
                  fontWeight: 600,
                  maxWidth: '220px'
                }}
              >
                {students.map(st => (
                  <option key={st.id} value={st.id} style={{ background: 'var(--bg-card)', color: 'var(--text-main)' }}>
                    {st.firstLastName} {st.secondLastName} {st.firstName}
                  </option>
                ))}
              </select>
            )}

            <button
              onClick={handlePrint}
              className="btn btn-primary"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                color: '#ffffff',
                border: 'none',
                padding: '8px 16px',
                borderRadius: '8px',
                fontWeight: 700,
                cursor: 'pointer'
              }}
            >
              <Download size={16} />
              <span>Imprimir / Guardar PDF</span>
            </button>

            <button
              onClick={onClose}
              style={{
                background: 'transparent',
                border: 'none',
                color: 'var(--text-main)',
                cursor: 'pointer',
                padding: '6px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: '6px'
              }}
              title="Cerrar"
            >
              <X size={22} />
            </button>
          </div>
        </div>

        {/* CONTENIDO IMPRIMIBLE CON ESTILO OFICIAL (PREVIEW & PRINT) */}
        <div style={{
          flex: 1,
          overflowY: 'auto',
          padding: '24px',
          background: 'var(--bg-main)',
          color: 'var(--text-main)'
        }}>
          {/* ========================================================
              VISTA 1: FICHA INDIVIDUAL (VERTICAL / PORTRAIT)
             ======================================================== */}
          {reportType === 'INDIVIDUAL' && selectedStudentData && (() => {
            const cotWeight = config.rubrics.find(r => r.key === 'cotidiano')?.percentage || 0;
            const tarWeight = config.rubrics.find(r => r.key === 'tareas')?.percentage || 0;
            const evaWeight = config.rubrics.find(r => r.key === 'evaluaciones')?.percentage || 0;
            const proWeight = config.rubrics.find(r => r.key === 'proyectos')?.percentage || 0;
            const porWeight = config.rubrics.find(r => r.key === 'portafolio')?.percentage || 0;
            const asisWeight = config.rubrics.find(r => r.key === 'asistencia')?.percentage || 0;

            const cotNota = cotWeight > 0 ? (selectedStudentData.grades.cotidianoPts / cotWeight * 100).toFixed(1) : '100.0';
            const tarNota = tarWeight > 0 ? (selectedStudentData.grades.tareasPts / tarWeight * 100).toFixed(1) : '100.0';
            const evaNota = evaWeight > 0 ? (selectedStudentData.grades.evaluacionesPts / evaWeight * 100).toFixed(1) : '100.0';
            const proNota = proWeight > 0 ? (selectedStudentData.grades.proyectosPts / proWeight * 100).toFixed(1) : '100.0';
            const porNota = porWeight > 0 ? (selectedStudentData.grades.portafolioPts / porWeight * 100).toFixed(1) : '100.0';
            const asisNota = asisWeight > 0 ? (selectedStudentData.grades.asistenciaPts / asisWeight * 100).toFixed(1) : '100.0';

            return (
            <div
              className="pdf-printable-page"
              style={{
                maxWidth: '780px',
                margin: '0 auto',
                background: '#ffffff',
                padding: '36px 42px',
                borderRadius: '8px',
                boxShadow: '0 4px 15px rgba(0,0,0,0.06)',
                fontFamily: "'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
                color: '#0f172a'
              }}
            >
              {/* Encabezado Oficial MEP */}
              <div style={{
                textAlign: 'center',
                borderBottom: '2px solid #0f172a',
                paddingBottom: '14px',
                marginBottom: '18px'
              }}>
                <div style={{ fontSize: '0.75rem', fontWeight: 800, letterSpacing: '0.08em', color: '#334155', textTransform: 'uppercase' }}>
                  REPÚBLICA DE COSTA RICA • MINISTERIO DE EDUCACIÓN PÚBLICA
                </div>
                <div style={{ fontSize: '1.25rem', fontWeight: 900, color: '#0f172a', margin: '4px 0' }}>
                  {institutionName.toUpperCase()}
                </div>
                <div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#1d4ed8' }}>
                  INFORME DE RENDIMIENTO ACADÉMICO INDIVIDUAL • {periodName.toUpperCase()}
                </div>
              </div>

              {/* Ficha de Información del Estudiante y Asignatura */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: '1.2fr 1fr',
                gap: '12px',
                background: '#f8fafc',
                border: '1px solid #cbd5e1',
                padding: '12px 16px',
                borderRadius: '6px',
                marginBottom: '18px',
                fontSize: '0.84rem',
                color: '#0f172a'
              }}>
                <div>
                  <div><strong>Estudiante:</strong> {selectedStudentData.student.firstLastName} {selectedStudentData.student.secondLastName} {selectedStudentData.student.firstName}</div>
                  <div><strong>Cédula / Identificación:</strong> {selectedStudentData.student.idNumber}</div>
                  <div><strong>Adecuación Curricular:</strong> {
                    selectedStudentData.student.accommodation === 'NON_SIGNIFICANT' ? 'No Significativa' :
                    selectedStudentData.student.accommodation === 'SIGNIFICANT' ? 'Significativa' :
                    selectedStudentData.student.accommodation === 'ACCESS' ? 'De Acceso' : 'Ninguna'
                  }</div>
                </div>
                <div>
                  <div><strong>Asignatura:</strong> {subject.name}</div>
                  <div><strong>Nivel y Sección:</strong> Sección {group.sectionCode}</div>
                  <div><strong>Docente:</strong> {teacherName}</div>
                </div>
              </div>

              {/* Tabla de Rubros Evaluativos Oficiales */}
              <div style={{ marginBottom: '18px' }}>
                <div style={{ fontSize: '0.82rem', fontWeight: 800, textTransform: 'uppercase', marginBottom: '6px', color: '#334155' }}>
                  Desglose de Calificaciones por Rubros
                </div>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.84rem' }}>
                  <thead>
                    <tr style={{ background: '#0f172a', color: 'white' }}>
                      <th style={{ padding: '8px 10px', textAlign: 'left', border: '1px solid #0f172a' }}>Componente Evaluativo</th>
                      <th style={{ padding: '8px 10px', textAlign: 'center', border: '1px solid #0f172a', width: '90px' }}>Valor %</th>
                      <th style={{ padding: '8px 10px', textAlign: 'center', border: '1px solid #0f172a', width: '120px' }}>Calificación (1-100)</th>
                      <th style={{ padding: '8px 10px', textAlign: 'center', border: '1px solid #0f172a', width: '110px' }}>% Obtenido</th>
                    </tr>
                  </thead>
                  <tbody>
                    {/* Trabajo Cotidiano */}
                    <tr>
                      <td style={{ padding: '7px 10px', border: '1px solid #cbd5e1', fontWeight: 600 }}>Trabajo Cotidiano</td>
                      <td style={{ padding: '7px 10px', textAlign: 'center', border: '1px solid #cbd5e1' }}>{cotWeight}%</td>
                      <td style={{ padding: '7px 10px', textAlign: 'center', border: '1px solid #cbd5e1' }}>
                        {cotNota} <span style={{ fontSize: '0.74rem', color: '#64748b' }}>({selectedStudentData.grades.puntosCotidianoObtenidos} pts)</span>
                      </td>
                      <td style={{ padding: '7px 10px', textAlign: 'center', border: '1px solid #cbd5e1', fontWeight: 700 }}>{selectedStudentData.grades.cotidianoPts}%</td>
                    </tr>

                    {/* Tareas */}
                    <tr>
                      <td style={{ padding: '7px 10px', border: '1px solid #cbd5e1', fontWeight: 600 }}>Tareas</td>
                      <td style={{ padding: '7px 10px', textAlign: 'center', border: '1px solid #cbd5e1' }}>{tarWeight}%</td>
                      <td style={{ padding: '7px 10px', textAlign: 'center', border: '1px solid #cbd5e1' }}>{tarNota}</td>
                      <td style={{ padding: '7px 10px', textAlign: 'center', border: '1px solid #cbd5e1', fontWeight: 700 }}>{selectedStudentData.grades.tareasPts}%</td>
                    </tr>

                    {/* Evaluaciones */}
                    <tr>
                      <td style={{ padding: '7px 10px', border: '1px solid #cbd5e1', fontWeight: 600 }}>Evaluaciones (Pruebas / Exámenes)</td>
                      <td style={{ padding: '7px 10px', textAlign: 'center', border: '1px solid #cbd5e1' }}>{evaWeight}%</td>
                      <td style={{ padding: '7px 10px', textAlign: 'center', border: '1px solid #cbd5e1' }}>{evaNota}</td>
                      <td style={{ padding: '7px 10px', textAlign: 'center', border: '1px solid #cbd5e1', fontWeight: 700 }}>{selectedStudentData.grades.evaluacionesPts}%</td>
                    </tr>

                    {/* Proyectos (si aplica) */}
                    {config.rubrics.some(r => r.key === 'proyectos' && r.percentage > 0) && (
                      <tr>
                        <td style={{ padding: '7px 10px', border: '1px solid #cbd5e1', fontWeight: 600 }}>Proyecto Escolar</td>
                        <td style={{ padding: '7px 10px', textAlign: 'center', border: '1px solid #cbd5e1' }}>{proWeight}%</td>
                        <td style={{ padding: '7px 10px', textAlign: 'center', border: '1px solid #cbd5e1' }}>{proNota}</td>
                        <td style={{ padding: '7px 10px', textAlign: 'center', border: '1px solid #cbd5e1', fontWeight: 700 }}>{selectedStudentData.grades.proyectosPts}%</td>
                      </tr>
                    )}

                    {/* Portafolio (si aplica) */}
                    {config.rubrics.some(r => r.key === 'portafolio' && r.percentage > 0) && (
                      <tr>
                        <td style={{ padding: '7px 10px', border: '1px solid #cbd5e1', fontWeight: 600 }}>Portafolio de Evidencias</td>
                        <td style={{ padding: '7px 10px', textAlign: 'center', border: '1px solid #cbd5e1' }}>{porWeight}%</td>
                        <td style={{ padding: '7px 10px', textAlign: 'center', border: '1px solid #cbd5e1' }}>{porNota}</td>
                        <td style={{ padding: '7px 10px', textAlign: 'center', border: '1px solid #cbd5e1', fontWeight: 700 }}>{selectedStudentData.grades.portafolioPts}%</td>
                      </tr>
                    )}

                    {/* Asistencia */}
                    <tr>
                      <td style={{ padding: '7px 10px', border: '1px solid #cbd5e1', fontWeight: 600 }}>Asistencia y Puntualidad</td>
                      <td style={{ padding: '7px 10px', textAlign: 'center', border: '1px solid #cbd5e1' }}>{asisWeight}%</td>
                      <td style={{ padding: '7px 10px', textAlign: 'center', border: '1px solid #cbd5e1' }}>{asisNota}</td>
                      <td style={{ padding: '7px 10px', textAlign: 'center', border: '1px solid #cbd5e1', fontWeight: 700 }}>{selectedStudentData.grades.asistenciaPts}%</td>
                    </tr>

                    {/* Fila Total y Condición */}
                    <tr style={{ background: '#f8fafc', fontWeight: 800 }}>
                      <td colSpan={3} style={{ padding: '10px', border: '2px solid #0f172a', textAlign: 'right', fontSize: '0.9rem' }}>
                        CALIFICACIÓN FINAL DEL PERIODO (BASE 100):
                      </td>
                      <td style={{
                        padding: '10px',
                        textAlign: 'center',
                        border: '2px solid #0f172a',
                        fontSize: '1.15rem',
                        color: selectedStudentData.grades.notaFinal >= config.passingGrade ? '#16a34a' : '#dc2626'
                      }}>
                        {selectedStudentData.grades.notaFinal}
                      </td>
                    </tr>
                    <tr style={{ background: '#f1f5f9' }}>
                      <td colSpan={3} style={{ padding: '8px 10px', border: '1px solid #cbd5e1', textAlign: 'right', fontWeight: 700 }}>
                        CONDICIÓN ACADÉMICA DEL PERIODO:
                      </td>
                      <td style={{
                        padding: '8px 10px',
                        textAlign: 'center',
                        border: '1px solid #cbd5e1',
                        fontWeight: 800,
                        color: selectedStudentData.grades.condicion === 'Aprobado' ? '#16a34a' : '#dc2626'
                      }}>
                        {selectedStudentData.grades.condicion.toUpperCase()}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Desglose Detallado de Asistencia */}
              <div style={{ marginBottom: '18px' }}>
                <div style={{ fontSize: '0.82rem', fontWeight: 800, textTransform: 'uppercase', marginBottom: '6px', color: '#334155' }}>
                  Control y Registro de Asistencia
                </div>
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(5, 1fr)',
                  gap: '8px',
                  textAlign: 'center',
                  fontSize: '0.8rem'
                }}>
                  <div style={{ border: '1px solid #cbd5e1', padding: '6px', borderRadius: '4px', background: '#f8fafc' }}>
                    <div style={{ color: '#334155', fontWeight: 600, fontSize: '0.7rem' }}>Total Lecciones</div>
                    <div style={{ fontWeight: 800, fontSize: '1rem', color: '#0f172a' }}>{selectedStudentData.grades.totalLessons}</div>
                  </div>
                  <div style={{ border: '1px solid #cbd5e1', padding: '6px', borderRadius: '4px', background: '#f8fafc' }}>
                    <div style={{ color: '#15803d', fontWeight: 700, fontSize: '0.7rem' }}>Presentes</div>
                    <div style={{ fontWeight: 800, fontSize: '1rem', color: '#15803d' }}>
                      {Math.max(0, selectedStudentData.grades.totalLessons - (selectedStudentData.grades.unexcusedAbsences + selectedStudentData.grades.excusedAbsences + selectedStudentData.grades.lessonEscapes))}
                    </div>
                  </div>
                  <div style={{ border: '1px solid #cbd5e1', padding: '6px', borderRadius: '4px', background: '#f8fafc' }}>
                    <div style={{ color: '#b91c1c', fontWeight: 700, fontSize: '0.7rem' }}>Ausencias Injust.</div>
                    <div style={{ fontWeight: 800, fontSize: '1rem', color: '#b91c1c' }}>{selectedStudentData.grades.unexcusedAbsences}</div>
                  </div>
                  <div style={{ border: '1px solid #cbd5e1', padding: '6px', borderRadius: '4px', background: '#f8fafc' }}>
                    <div style={{ color: '#1d4ed8', fontWeight: 700, fontSize: '0.7rem' }}>Ausencias Just.</div>
                    <div style={{ fontWeight: 800, fontSize: '1rem', color: '#1d4ed8' }}>{selectedStudentData.grades.excusedAbsences}</div>
                  </div>
                  <div style={{ border: '1px solid #cbd5e1', padding: '6px', borderRadius: '4px', background: '#f8fafc' }}>
                    <div style={{ color: '#b45309', fontWeight: 700, fontSize: '0.7rem' }}>Tardías</div>
                    <div style={{ fontWeight: 800, fontSize: '1rem', color: '#b45309' }}>
                      {selectedStudentData.grades.tardies}
                    </div>
                  </div>
                </div>
              </div>

              {/* Espacio para Observaciones del Docente */}
              <div style={{
                border: '1px solid #cbd5e1',
                padding: '10px 14px',
                borderRadius: '6px',
                marginBottom: '26px',
                minHeight: '60px',
                fontSize: '0.8rem',
                background: '#f8fafc'
              }}>
                <div style={{ fontWeight: 700, color: '#1e293b', marginBottom: '4px' }}>
                  Observaciones y Recomendaciones del Docente:
                </div>
                <div style={{ color: '#334155', fontStyle: 'italic' }}>
                  {selectedStudentData.grades.condicion === 'Aprobado'
                    ? 'Excelente desempeño y constancia académica durante el periodo evaluado.'
                    : 'Se requiere mayor acompañamiento en casa y refuerzo en los componentes evaluativos.'}
                </div>
              </div>

              {/* Firmas Oficiales */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr 1fr',
                gap: '20px',
                textAlign: 'center',
                marginTop: '36px',
                fontSize: '0.78rem'
              }}>
                <div>
                  <div style={{ borderBottom: '1px solid #0f172a', marginBottom: '6px', height: '35px' }}></div>
                  <div style={{ fontWeight: 700, color: '#0f172a' }}>{teacherName}</div>
                  <div style={{ color: '#475569' }}>Firma del Docente</div>
                </div>
                <div>
                  <div style={{ borderBottom: '1px solid #0f172a', marginBottom: '6px', height: '35px' }}></div>
                  <div style={{ fontWeight: 700, color: '#0f172a' }}>Padre / Encargado Legal</div>
                  <div style={{ color: '#475569' }}>Firma y Cédula</div>
                </div>
                <div>
                  <div style={{ borderBottom: '1px solid #0f172a', marginBottom: '6px', height: '35px' }}></div>
                  <div style={{ fontWeight: 700, color: '#0f172a' }}>Dirección / Administración</div>
                  <div style={{ color: '#475569' }}>Sello de la Institución</div>
                </div>
              </div>
            </div>
            );
          })()}

          {/* ========================================================
              VISTA 2: REPORTE GRUPAL (HORIZONTAL / LANDSCAPE)
             ======================================================== */}
          {reportType === 'GRUPAL' && (
            <div
              className="pdf-printable-page"
              style={{
                maxWidth: '1020px',
                margin: '0 auto',
                background: '#ffffff',
                padding: '28px 32px',
                borderRadius: '8px',
                boxShadow: '0 4px 15px rgba(0,0,0,0.06)',
                fontFamily: "'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
                color: '#0f172a'
              }}
            >
              {/* Encabezado Oficial Grupal */}
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
                borderBottom: '2px solid #0f172a',
                paddingBottom: '10px',
                marginBottom: '14px'
              }}>
                <div>
                  <div style={{ fontSize: '0.72rem', fontWeight: 800, letterSpacing: '0.08em', color: '#334155', textTransform: 'uppercase' }}>
                    MINISTERIO DE EDUCACIÓN PÚBLICA • ACTA OFICIAL DE CALIFICACIONES
                  </div>
                  <div style={{ fontSize: '1.2rem', fontWeight: 900, color: '#0f172a' }}>
                    {institutionName.toUpperCase()}
                  </div>
                  <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#1d4ed8' }}>
                    SÁBANA DE CALIFICACIONES • {periodName.toUpperCase()}
                  </div>
                </div>
                <div style={{ textAlign: 'right', fontSize: '0.82rem', color: '#0f172a' }}>
                  <div><strong>Materia:</strong> {subject.name}</div>
                  <div><strong>Sección:</strong> Sección {group.sectionCode}</div>
                  <div><strong>Docente:</strong> {teacherName}</div>
                </div>
              </div>

              {/* Tabla Sábana de Estudiantes */}
              <div style={{ overflowX: 'auto', marginBottom: '14px' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.78rem' }}>
                  <thead>
                    <tr style={{ background: '#0f172a', color: 'white' }}>
                      <th style={{ padding: '6px 8px', width: '30px', textAlign: 'center', border: '1px solid #0f172a' }}>#</th>
                      <th style={{ padding: '6px 8px', textAlign: 'left', border: '1px solid #0f172a' }}>Estudiante</th>
                      <th style={{ padding: '6px 8px', textAlign: 'center', border: '1px solid #0f172a', width: '95px' }}>Cédula</th>
                      <th style={{ padding: '6px 6px', textAlign: 'center', border: '1px solid #0f172a', width: '65px' }}>Cot. %</th>
                      <th style={{ padding: '6px 6px', textAlign: 'center', border: '1px solid #0f172a', width: '65px' }}>Tar. %</th>
                      <th style={{ padding: '6px 6px', textAlign: 'center', border: '1px solid #0f172a', width: '65px' }}>Prb. %</th>
                      <th style={{ padding: '6px 6px', textAlign: 'center', border: '1px solid #0f172a', width: '65px' }}>Asis. %</th>
                      <th style={{ padding: '6px 8px', textAlign: 'center', border: '1px solid #0f172a', width: '75px', background: '#1e293b' }}>NOTA</th>
                      <th style={{ padding: '6px 8px', textAlign: 'center', border: '1px solid #0f172a', width: '90px' }}>Condición</th>
                    </tr>
                  </thead>
                  <tbody>
                    {allComputed.map((item, idx) => {
                      const isPassing = item.grades.condicion === 'Aprobado';
                      return (
                        <tr key={item.student.id} style={{ background: idx % 2 === 0 ? 'white' : '#f8fafc', color: '#0f172a' }}>
                          <td style={{ padding: '5px 8px', textAlign: 'center', border: '1px solid #cbd5e1', color: '#475569' }}>{idx + 1}</td>
                          <td style={{ padding: '5px 8px', border: '1px solid #cbd5e1', fontWeight: 600 }}>
                            {item.student.firstLastName} {item.student.secondLastName} {item.student.firstName}
                          </td>
                          <td style={{ padding: '5px 8px', textAlign: 'center', border: '1px solid #cbd5e1', fontFamily: 'monospace' }}>
                            {item.student.idNumber}
                          </td>
                          <td style={{ padding: '5px 6px', textAlign: 'center', border: '1px solid #cbd5e1' }}>
                            {item.grades.cotidianoPts}
                          </td>
                          <td style={{ padding: '5px 6px', textAlign: 'center', border: '1px solid #cbd5e1' }}>
                            {item.grades.tareasPts}
                          </td>
                          <td style={{ padding: '5px 6px', textAlign: 'center', border: '1px solid #cbd5e1' }}>
                            {item.grades.evaluacionesPts}
                          </td>
                          <td style={{ padding: '5px 6px', textAlign: 'center', border: '1px solid #cbd5e1' }}>
                            {item.grades.asistenciaPts}
                          </td>
                          <td style={{ padding: '5px 8px', textAlign: 'center', border: '1px solid #cbd5e1', fontWeight: 800, color: isPassing ? '#15803d' : '#b91c1c' }}>
                            {item.grades.notaFinal}
                          </td>
                          <td style={{ padding: '5px 8px', textAlign: 'center', border: '1px solid #cbd5e1', fontWeight: 700 }}>
                            <span style={{
                              padding: '2px 6px',
                              borderRadius: '4px',
                              fontSize: '0.72rem',
                              background: isPassing ? 'rgba(22, 163, 74, 0.12)' : 'rgba(220, 38, 38, 0.12)',
                              color: isPassing ? '#15803d' : '#b91c1c'
                            }}>
                              {item.grades.condicion}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Resumen Estadístico y Firmas Oficiales */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: '1.2fr 2fr',
                gap: '20px',
                alignItems: 'end',
                marginTop: '16px',
                fontSize: '0.8rem',
                color: '#0f172a'
              }}>
                {/* Cuadro Estadístico */}
                <div style={{
                  border: '1px solid #cbd5e1',
                  borderRadius: '6px',
                  padding: '10px 14px',
                  background: '#f8fafc'
                }}>
                  <div style={{ fontWeight: 800, marginBottom: '6px', fontSize: '0.82rem', color: '#0f172a' }}>
                    Resumen del Grupo:
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
                    <div>Total Alumnos: <strong>{students.length}</strong></div>
                    <div>Promedio: <strong>{groupAverage}</strong></div>
                    <div style={{ color: '#15803d' }}>Aprobados: <strong>{passingCount}</strong></div>
                    <div style={{ color: '#b91c1c' }}>Aplazados: <strong>{failingCount}</strong></div>
                  </div>
                </div>

                {/* Firmas */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', textAlign: 'center' }}>
                  <div>
                    <div style={{ borderBottom: '1px solid #0f172a', marginBottom: '6px', height: '30px' }}></div>
                    <div style={{ fontWeight: 700, color: '#0f172a' }}>{teacherName}</div>
                    <div style={{ color: '#475569', fontSize: '0.72rem' }}>Docente a Cargo</div>
                  </div>
                  <div>
                    <div style={{ borderBottom: '1px solid #0f172a', marginBottom: '6px', height: '30px' }}></div>
                    <div style={{ fontWeight: 700, color: '#0f172a' }}>Dirección del Centro Educativo</div>
                    <div style={{ color: '#475569', fontSize: '0.72rem' }}>Firma y Sello Oficial</div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
