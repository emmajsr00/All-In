import React, { useState } from 'react';
import {
  ArrowLeft,
  FileSpreadsheet,
  CalendarDays,
  CheckSquare,
  FileText,
  FolderGit2,
  FolderArchive,
  UserCheck,
  SlidersHorizontal,
  Download,
  Plus,
  Trash2,
  CheckCircle,
  AlertCircle,
  Clock,
  Sparkles,
  Search,
  Printer
} from 'lucide-react';
import type {
  Group,
  Subject,
  TeacherAssignment,
  Student,
  EvaluationConfig,
  ClassSession,
  SessionStudentDetail,
  TaskGrade,
  ExamGrade,
  ProjectGrade,
  PortfolioGrade
} from '../types';
import { computeMEPStudentGrades, type StudentCalculatedGrades } from '../utils/gradeCalculations';
import { exportGradebookToExcel } from '../utils/excelExport';
import { db } from '../db';

interface GroupWorkspaceViewProps {
  institutionName: string;
  assignment: TeacherAssignment;
  group: Group;
  subject: Subject;
  teacherName: string;
  students: Student[];
  config: EvaluationConfig;
  sessions: ClassSession[];
  sessionDetails: SessionStudentDetail[];
  taskGrades: TaskGrade[];
  examGrades: ExamGrade[];
  projectGrades: ProjectGrade[];
  portfolioGrades: PortfolioGrade[];
  onBackToDashboard: () => void;
  onOpenRubricsConfig: () => void;
  onDataChanged: () => void;
}

type TabType = 'REGISTRO_GENERAL' | 'ASIS_COT' | 'TAREAS' | 'EVALUACIONES' | 'PROYECTOS' | 'PORTAFOLIO' | 'INDIVIDUAL';

export const GroupWorkspaceView: React.FC<GroupWorkspaceViewProps> = ({
  institutionName,
  assignment,
  group,
  subject,
  teacherName,
  students,
  config,
  sessions,
  sessionDetails,
  taskGrades,
  examGrades,
  projectGrades,
  portfolioGrades,
  onBackToDashboard,
  onOpenRubricsConfig,
  onDataChanged
}) => {
  const [activeTab, setActiveTab] = useState<TabType>('REGISTRO_GENERAL');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStudentId, setSelectedStudentId] = useState<string>(students[0]?.id || '');

  // Modal para agregar una nueva sesión/clase
  const [showAddSessionModal, setShowAddSessionModal] = useState(false);
  const [newSessionDate, setNewSessionDate] = useState(new Date().toISOString().split('T')[0]);
  const [newSessionLessons, setNewSessionLessons] = useState(3);
  const [newSessionTopic, setNewSessionTopic] = useState('');

  // Calcular todas las notas con la fórmula oficial
  const calculatedStudents: StudentCalculatedGrades[] = students.map(st =>
    computeMEPStudentGrades(
      st,
      config,
      sessions,
      sessionDetails,
      taskGrades,
      examGrades,
      projectGrades,
      portfolioGrades
    )
  );

  const filteredList = calculatedStudents.filter(c => {
    const full = `${c.student.firstLastName} ${c.student.secondLastName} ${c.student.firstName} ${c.student.idNumber}`.toLowerCase();
    return full.includes(searchTerm.toLowerCase());
  });

  // Estadísticas del grupo
  const passingCount = calculatedStudents.filter(c => c.condicion === 'Aprobado').length;
  const failingCount = calculatedStudents.length - passingCount;
  const avgGrade = (calculatedStudents.reduce((acc, curr) => acc + curr.notaFinal, 0) / (calculatedStudents.length || 1)).toFixed(1);
  const totalLessons = sessions.reduce((acc, s) => acc + (Number(s.lessonsCount) || 0), 0);

  // Crear nueva sesión de clase
  const handleCreateSession = async () => {
    const newSession: ClassSession = {
      id: `sess-${Date.now()}`,
      assignmentId: assignment.id,
      periodId: 'I_PERIODO',
      date: newSessionDate,
      lessonsCount: Number(newSessionLessons) || 2,
      topic: newSessionTopic.trim() || 'Lección Regular'
    };

    await db.classSessions.add(newSession);

    // Inicializar detalles de cada estudiante como Presente y Nivel 3 por defecto
    const detailsToInsert: SessionStudentDetail[] = students.map(s => ({
      id: `dtl-${newSession.id}-${s.id}`,
      sessionId: newSession.id,
      studentId: s.id,
      attendance: 'PRESENT',
      cotidianoLevel: 3
    }));

    await db.sessionDetails.bulkAdd(detailsToInsert);
    setShowAddSessionModal(false);
    setNewSessionTopic('');
    onDataChanged();
  };

  // Actualizar asistencia o cotidiano de un estudiante en una sesión
  const handleUpdateSessionDetail = async (
    sessionId: string,
    studentId: string,
    updates: Partial<SessionStudentDetail>
  ) => {
    const existing = sessionDetails.find(d => d.sessionId === sessionId && d.studentId === studentId);
    if (existing) {
      await db.sessionDetails.update(existing.id, updates);
    } else {
      await db.sessionDetails.add({
        id: `dtl-${sessionId}-${studentId}`,
        sessionId,
        studentId,
        attendance: updates.attendance || 'PRESENT',
        cotidianoLevel: updates.cotidianoLevel !== undefined ? updates.cotidianoLevel : 3
      });
    }
    onDataChanged();
  };

  // Actualizar nota de tarea
  const handleUpdateTaskGrade = async (studentId: string, taskNumber: number, value: number) => {
    const existing = taskGrades.find(t => t.assignmentId === assignment.id && t.studentId === studentId && t.taskNumber === taskNumber);
    if (existing) {
      await db.taskGrades.update(existing.id, { percentageEarned: value });
    } else {
      await db.taskGrades.add({
        id: `tg-${studentId}-${taskNumber}`,
        assignmentId: assignment.id,
        studentId,
        periodId: 'I_PERIODO',
        taskNumber,
        percentageEarned: value
      });
    }
    onDataChanged();
  };

  // Actualizar nota de examen
  const handleUpdateExamGrade = async (studentId: string, examNumber: number, value: number) => {
    const existing = examGrades.find(e => e.assignmentId === assignment.id && e.studentId === studentId && e.examNumber === examNumber);
    if (existing) {
      await db.examGrades.update(existing.id, { percentageEarned: value });
    } else {
      await db.examGrades.add({
        id: `eg-${studentId}-${examNumber}`,
        assignmentId: assignment.id,
        studentId,
        periodId: 'I_PERIODO',
        examNumber,
        percentageEarned: value
      });
    }
    onDataChanged();
  };

  // Actualizar nota de proyecto
  const handleUpdateProjectGrade = async (studentId: string, projectNumber: number, value: number) => {
    const existing = projectGrades.find(p => p.assignmentId === assignment.id && p.studentId === studentId && p.projectNumber === projectNumber);
    if (existing) {
      await db.projectGrades.update(existing.id, { percentageEarned: value });
    } else {
      await db.projectGrades.add({
        id: `pg-${studentId}-${projectNumber}`,
        assignmentId: assignment.id,
        studentId,
        periodId: 'I_PERIODO',
        projectNumber,
        percentageEarned: value
      });
    }
    onDataChanged();
  };

  const handleExportExcel = () => {
    exportGradebookToExcel(
      institutionName,
      group.sectionCode,
      subject.name,
      teacherName,
      students,
      config,
      calculatedStudents.map(c => ({
        studentId: c.studentId,
        asistencia: c.asistenciaPts,
        cotidiano: c.cotidianoPts,
        tareas: c.tareasPts,
        evaluaciones: c.evaluacionesPts,
        proyectos: c.proyectosPts,
        portafolio: c.portafolioPts,
        notaFinal: c.notaFinal,
        condicion: c.condicion
      }))
    );
  };

  const isPortafolioEnabled = config.rubrics.some(r => r.key === 'portafolio' && r.enabled);
  const selectedStudentComputed = calculatedStudents.find(c => c.studentId === selectedStudentId);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Top Breadcrumb & Actions Bar */}
      <div className="glass-panel" style={{
        padding: '16px 24px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '12px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <button onClick={onBackToDashboard} className="btn btn-secondary btn-sm">
            <ArrowLeft size={16} />
            Volver al Panel
          </button>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span className="badge" style={{ background: '#4f46e5', color: 'white', fontWeight: 800 }}>
                Sección {group.sectionCode}
              </span>
              <span style={{ fontSize: '1.15rem', fontWeight: 800 }}>
                {subject.name}
              </span>
            </div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              {institutionName} • Docente: {teacherName} • Total Lecciones Impartidas: <strong>{totalLessons} lecciones</strong>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button onClick={onOpenRubricsConfig} className="btn btn-secondary btn-sm">
            <SlidersHorizontal size={14} color="#6366f1" />
            Configurar Rubros
          </button>
          <button onClick={handleExportExcel} className="btn btn-primary btn-sm" style={{ background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)' }}>
            <Download size={14} />
            Exportar Registro Oficial (.xlsx)
          </button>
        </div>
      </div>

      {/* Navigation Menu Tabs (Separated Modules like in Excel) */}
      <div style={{
        display: 'flex',
        background: 'var(--bg-surface)',
        padding: '6px',
        borderRadius: '14px',
        gap: '6px',
        overflowX: 'auto',
        border: '1px solid var(--border-subtle)'
      }}>
        <button
          onClick={() => setActiveTab('REGISTRO_GENERAL')}
          className={`btn btn-sm ${activeTab === 'REGISTRO_GENERAL' ? 'btn-primary' : 'btn-secondary'}`}
          style={{ whiteSpace: 'nowrap' }}
        >
          <FileSpreadsheet size={15} />
          Registro General de Calificaciones
        </button>

        <button
          onClick={() => setActiveTab('ASIS_COT')}
          className={`btn btn-sm ${activeTab === 'ASIS_COT' ? 'btn-primary' : 'btn-secondary'}`}
          style={{ whiteSpace: 'nowrap' }}
        >
          <CalendarDays size={15} />
          Asistencia y Cotidiano ({sessions.length} clases)
        </button>

        <button
          onClick={() => setActiveTab('TAREAS')}
          className={`btn btn-sm ${activeTab === 'TAREAS' ? 'btn-primary' : 'btn-secondary'}`}
          style={{ whiteSpace: 'nowrap' }}
        >
          <CheckSquare size={15} />
          Tareas ({config.rubrics.find(r => r.key === 'tareas')?.percentage || 10}%)
        </button>

        <button
          onClick={() => setActiveTab('EVALUACIONES')}
          className={`btn btn-sm ${activeTab === 'EVALUACIONES' ? 'btn-primary' : 'btn-secondary'}`}
          style={{ whiteSpace: 'nowrap' }}
        >
          <FileText size={15} />
          Evaluaciones / Pruebas ({config.rubrics.find(r => r.key === 'evaluaciones')?.percentage || 45}%)
        </button>

        <button
          onClick={() => setActiveTab('PROYECTOS')}
          className={`btn btn-sm ${activeTab === 'PROYECTOS' ? 'btn-primary' : 'btn-secondary'}`}
          style={{ whiteSpace: 'nowrap' }}
        >
          <FolderGit2 size={15} />
          Proyectos ({config.rubrics.find(r => r.key === 'proyectos')?.percentage || 15}%)
        </button>

        {isPortafolioEnabled && (
          <button
            onClick={() => setActiveTab('PORTAFOLIO')}
            className={`btn btn-sm ${activeTab === 'PORTAFOLIO' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ whiteSpace: 'nowrap' }}
          >
            <FolderArchive size={15} />
            Portafolio
          </button>
        )}

        <button
          onClick={() => setActiveTab('INDIVIDUAL')}
          className={`btn btn-sm ${activeTab === 'INDIVIDUAL' ? 'btn-primary' : 'btn-secondary'}`}
          style={{ whiteSpace: 'nowrap', marginLeft: 'auto' }}
        >
          <UserCheck size={15} color="#06b6d4" />
          Expediente Individual por Alumno
        </button>
      </div>

      {/* ========================================================
          TAB 1: REGISTRO GENERAL DE CALIFICACIONES (Hoja Principal)
         ======================================================== */}
      {activeTab === 'REGISTRO_GENERAL' && (
        <div className="glass-panel" style={{ overflow: 'hidden' }}>
          {/* Header Summary Bar */}
          <div style={{
            padding: '14px 24px',
            background: 'var(--bg-surface)',
            borderBottom: '1px solid var(--border-subtle)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '12px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Search size={15} color="#64748b" />
              <input
                type="text"
                placeholder="Filtrar por estudiante o cédula..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{
                  padding: '6px 12px',
                  borderRadius: '8px',
                  border: '1px solid var(--border-subtle)',
                  background: 'var(--bg-main)',
                  color: 'var(--text-main)',
                  fontSize: '0.85rem',
                  outline: 'none',
                  width: '240px'
                }}
              />
            </div>

            <div style={{ display: 'flex', gap: '16px', alignItems: 'center', fontSize: '0.85rem' }}>
              <span>Nota de Aprobación: <strong style={{ color: '#4f46e5' }}>{config.passingGrade} pts</strong></span>
              <span>Promedio General: <strong>{avgGrade}</strong></span>
              <span style={{ color: '#16a34a', fontWeight: 700 }}>● {passingCount} Aprobados</span>
              {failingCount > 0 && <span style={{ color: '#dc2626', fontWeight: 700 }}>● {failingCount} Aplazados</span>}
            </div>
          </div>

          {/* Full MEP Table */}
          <div style={{ overflowX: 'auto', maxHeight: '68vh' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
              <thead style={{ position: 'sticky', top: 0, background: 'var(--bg-card)', zIndex: 10, borderBottom: '2px solid var(--border-subtle)' }}>
                <tr>
                  <th style={{ padding: '12px 14px', width: '35px', color: 'var(--text-muted)' }}>#</th>
                  <th style={{ padding: '12px 14px', color: 'var(--text-muted)' }}>Estudiante</th>
                  <th style={{ padding: '12px 14px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>Cédula</th>

                  {/* Rubros activos con sus porcentajes */}
                  {config.rubrics.filter(r => r.enabled).map(r => (
                    <th key={r.id} style={{ padding: '12px 10px', textAlign: 'center' }}>
                      <div style={{ fontWeight: 700 }}>{r.label}</div>
                      <div style={{ fontSize: '0.72rem', color: '#6366f1', fontWeight: 800 }}>{r.percentage}%</div>
                    </th>
                  ))}

                  <th style={{ padding: '12px 14px', textAlign: 'center', background: 'rgba(79, 70, 229, 0.08)' }}>
                    <div style={{ fontWeight: 800, color: '#4f46e5' }}>NOTA FINAL</div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>100%</div>
                  </th>
                  <th style={{ padding: '12px 14px', textAlign: 'center' }}>Condición</th>
                </tr>
              </thead>
              <tbody>
                {filteredList.map((item, idx) => (
                  <tr
                    key={item.studentId}
                    style={{ borderBottom: '1px solid var(--border-subtle)' }}
                    onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--bg-surface)')}
                    onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                  >
                    <td style={{ padding: '10px 14px', color: 'var(--text-muted)', fontWeight: 600 }}>{idx + 1}</td>
                    <td style={{ padding: '10px 14px', fontWeight: 700 }}>
                      {item.student.firstLastName} {item.student.secondLastName} {item.student.firstName}
                    </td>
                    <td style={{ padding: '10px 14px', fontFamily: 'var(--font-mono)', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                      {item.student.idNumber}
                    </td>

                    {/* Columnas dinámicas según rubros activos */}
                    {config.rubrics.filter(r => r.enabled).map(r => {
                      let val = 0;
                      if (r.key === 'asistencia') val = item.asistenciaPts;
                      else if (r.key === 'cotidiano') val = item.cotidianoPts;
                      else if (r.key === 'tareas') val = item.tareasPts;
                      else if (r.key === 'evaluaciones') val = item.evaluacionesPts;
                      else if (r.key === 'proyectos') val = item.proyectosPts;
                      else if (r.key === 'portafolio') val = item.portafolioPts;

                      return (
                        <td key={r.id} style={{ padding: '10px', textAlign: 'center', fontWeight: 600, fontFamily: 'var(--font-mono)' }}>
                          {val}
                        </td>
                      );
                    })}

                    <td style={{
                      padding: '10px 14px',
                      textAlign: 'center',
                      fontWeight: 800,
                      fontFamily: 'var(--font-mono)',
                      fontSize: '0.95rem',
                      background: 'rgba(79, 70, 229, 0.05)',
                      color: item.notaFinal >= config.passingGrade ? '#10b981' : '#ef4444'
                    }}>
                      {item.notaFinal}
                    </td>

                    <td style={{ padding: '10px 14px', textAlign: 'center' }}>
                      <span className="badge" style={{
                        background: item.condicion === 'Aprobado' ? 'var(--badge-present-bg)' : 'var(--badge-absent-bg)',
                        color: item.condicion === 'Aprobado' ? 'var(--badge-present-text)' : 'var(--badge-absent-text)'
                      }}>
                        {item.condicion === 'Aprobado' ? <CheckCircle size={12} /> : <AlertCircle size={12} />}
                        {item.condicion}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================
          TAB 2: ASISTENCIA Y COTIDIANO (Hoja Asis. Cot IP del Excel)
         ======================================================== */}
      {activeTab === 'ASIS_COT' && (
        <div className="glass-panel" style={{ overflow: 'hidden' }}>
          {/* Action Bar */}
          <div style={{
            padding: '16px 24px',
            background: 'var(--bg-surface)',
            borderBottom: '1px solid var(--border-subtle)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '12px'
          }}>
            <div>
              <h3 style={{ fontSize: '1.05rem', fontWeight: 800 }}>
                Control Detallado de Clases, Lecciones y Desempeño Diario
              </h3>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                Fórmula oficial: Cada clase define sus lecciones. El cotidiano suma puntos según nivel (1=0.25, 2=0.5, 3=1.0).
              </p>
            </div>

            <button onClick={() => setShowAddSessionModal(true)} className="btn btn-primary btn-sm">
              <Plus size={15} />
              + Registrar Nueva Clase / Lección
            </button>
          </div>

          {/* Table with all sessions */}
          <div style={{ overflowX: 'auto', maxHeight: '68vh' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.82rem' }}>
              <thead style={{ position: 'sticky', top: 0, background: 'var(--bg-card)', zIndex: 10, borderBottom: '2px solid var(--border-subtle)' }}>
                <tr>
                  <th style={{ padding: '12px 14px', width: '35px' }}>#</th>
                  <th style={{ padding: '12px 14px', minWidth: '180px' }}>Estudiante</th>

                  {/* Resumen de Asistencia */}
                  <th style={{ padding: '10px', textAlign: 'center', background: 'rgba(239, 68, 68, 0.08)' }}>AI</th>
                  <th style={{ padding: '10px', textAlign: 'center', background: 'rgba(245, 158, 11, 0.08)' }}>ESC</th>
                  <th style={{ padding: '10px', textAlign: 'center', background: 'rgba(99, 102, 241, 0.08)' }}>T</th>
                  <th style={{ padding: '10px', textAlign: 'center', background: 'rgba(16, 185, 129, 0.08)' }}>AJ</th>
                  <th style={{ padding: '10px', textAlign: 'center', fontWeight: 800, color: '#4f46e5' }}>% Asis ({config.rubrics.find(r => r.key === 'asistencia')?.percentage || 5}%)</th>
                  <th style={{ padding: '10px', textAlign: 'center', fontWeight: 800, color: '#06b6d4' }}>% Cot ({config.rubrics.find(r => r.key === 'cotidiano')?.percentage || 25}%)</th>

                  {/* Columnas de cada Clase/Sesión */}
                  {sessions.map(sess => (
                    <th key={sess.id} style={{ padding: '8px 12px', textAlign: 'center', borderLeft: '1px solid var(--border-subtle)', minWidth: '130px' }}>
                      <div style={{ fontWeight: 800, color: '#4f46e5' }}>{sess.date}</div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{sess.lessonsCount} Lecciones</div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredList.map((item, idx) => (
                  <tr key={item.studentId} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                    <td style={{ padding: '8px 14px', color: 'var(--text-muted)' }}>{idx + 1}</td>
                    <td style={{ padding: '8px 14px', fontWeight: 700 }}>
                      {item.student.firstLastName} {item.student.firstName}
                    </td>

                    {/* Contadores Asistencia */}
                    <td style={{ padding: '8px', textAlign: 'center', color: '#dc2626', fontWeight: 700 }}>{item.unexcusedAbsences}</td>
                    <td style={{ padding: '8px', textAlign: 'center', color: '#d97706', fontWeight: 700 }}>{item.lessonEscapes}</td>
                    <td style={{ padding: '8px', textAlign: 'center', color: '#4f46e5', fontWeight: 700 }}>{item.tardies}</td>
                    <td style={{ padding: '8px', textAlign: 'center', color: '#16a34a', fontWeight: 700 }}>{item.excusedAbsences}</td>

                    <td style={{ padding: '8px', textAlign: 'center', fontWeight: 800, fontFamily: 'var(--font-mono)', color: '#4f46e5' }}>
                      {item.asistenciaPts}%
                    </td>
                    <td style={{ padding: '8px', textAlign: 'center', fontWeight: 800, fontFamily: 'var(--font-mono)', color: '#06b6d4' }}>
                      {item.cotidianoPts}%
                    </td>

                    {/* Celdas interactivas por cada sesión */}
                    {sessions.map(sess => {
                      const det = sessionDetails.find(d => d.sessionId === sess.id && d.studentId === item.studentId) || {
                        attendance: 'PRESENT',
                        cotidianoLevel: 3
                      };

                      return (
                        <td key={sess.id} style={{ padding: '6px 8px', textAlign: 'center', borderLeft: '1px solid var(--border-subtle)' }}>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', alignItems: 'center' }}>
                            {/* Selector Asistencia */}
                            <select
                              value={det.attendance}
                              onChange={(e) => handleUpdateSessionDetail(sess.id, item.studentId, { attendance: e.target.value as any })}
                              style={{
                                fontSize: '0.72rem',
                                padding: '2px 4px',
                                borderRadius: '4px',
                                border: '1px solid var(--border-subtle)',
                                background: det.attendance === 'PRESENT' ? 'var(--badge-present-bg)' : det.attendance === 'UNEXCUSED_ABSENCE' ? 'var(--badge-absent-bg)' : 'var(--badge-excused-bg)',
                                color: det.attendance === 'PRESENT' ? 'var(--badge-present-text)' : det.attendance === 'UNEXCUSED_ABSENCE' ? 'var(--badge-absent-text)' : 'var(--badge-excused-text)',
                                fontWeight: 700
                              }}
                            >
                              <option value="PRESENT">P (Presente)</option>
                              <option value="UNEXCUSED_ABSENCE">AI (Injustificada)</option>
                              <option value="LESSON_ESCAPE">ESC (Escape)</option>
                              <option value="TARDY">T (Tardía)</option>
                              <option value="EXCUSED_ABSENCE">AJ (Justificada)</option>
                            </select>

                            {/* Selector Cotidiano (Niveles MEP 1, 2, 3) */}
                            <select
                              value={det.cotidianoLevel}
                              onChange={(e) => handleUpdateSessionDetail(sess.id, item.studentId, { cotidianoLevel: parseInt(e.target.value) as any })}
                              style={{
                                fontSize: '0.72rem',
                                padding: '2px 4px',
                                borderRadius: '4px',
                                border: '1px solid var(--border-subtle)',
                                background: 'var(--bg-main)',
                                color: det.cotidianoLevel === 3 ? '#16a34a' : det.cotidianoLevel === 2 ? '#d97706' : '#dc2626',
                                fontWeight: 700
                              }}
                            >
                              <option value={3}>Nivel 3 (100%)</option>
                              <option value={2}>Nivel 2 (50%)</option>
                              <option value={1}>Nivel 1 (25%)</option>
                              <option value={0}>0 (No Eval / Ausente)</option>
                            </select>
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================
          TAB 3: TAREAS (Hoja Tareas del Excel)
         ======================================================== */}
      {activeTab === 'TAREAS' && (
        <div className="glass-panel" style={{ padding: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <div>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 800 }}>Registro de Tareas</h3>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                Total asignado al rubro: <strong>{config.rubrics.find(r => r.key === 'tareas')?.percentage || 10}%</strong> (Tarea 1: 5%, Tarea 2: 5%)
              </p>
            </div>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
              <thead style={{ background: 'var(--bg-surface)', borderBottom: '2px solid var(--border-subtle)' }}>
                <tr>
                  <th style={{ padding: '10px 14px' }}>#</th>
                  <th style={{ padding: '10px 14px' }}>Estudiante</th>
                  <th style={{ padding: '10px', textAlign: 'center' }}>Tarea 1 (Valor: 5%)</th>
                  <th style={{ padding: '10px', textAlign: 'center' }}>Tarea 2 (Valor: 5%)</th>
                  <th style={{ padding: '10px', textAlign: 'center', fontWeight: 800, color: '#4f46e5' }}>Total Tareas (10%)</th>
                </tr>
              </thead>
              <tbody>
                {filteredList.map((item, idx) => {
                  const t1 = taskGrades.find(t => t.assignmentId === assignment.id && t.studentId === item.studentId && t.taskNumber === 1)?.percentageEarned || 0;
                  const t2 = taskGrades.find(t => t.assignmentId === assignment.id && t.studentId === item.studentId && t.taskNumber === 2)?.percentageEarned || 0;

                  return (
                    <tr key={item.studentId} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                      <td style={{ padding: '10px 14px', color: 'var(--text-muted)' }}>{idx + 1}</td>
                      <td style={{ padding: '10px 14px', fontWeight: 700 }}>
                        {item.student.firstLastName} {item.student.firstName}
                      </td>
                      <td style={{ padding: '8px', textAlign: 'center' }}>
                        <input
                          type="number"
                          step="0.01"
                          max={5}
                          min={0}
                          value={t1}
                          onChange={(e) => handleUpdateTaskGrade(item.studentId, 1, parseFloat(e.target.value) || 0)}
                          style={{ width: '70px', padding: '5px', textAlign: 'center', borderRadius: '6px', border: '1px solid var(--border-subtle)', background: 'var(--bg-main)', color: 'var(--text-main)', fontWeight: 700 }}
                        />
                      </td>
                      <td style={{ padding: '8px', textAlign: 'center' }}>
                        <input
                          type="number"
                          step="0.01"
                          max={5}
                          min={0}
                          value={t2}
                          onChange={(e) => handleUpdateTaskGrade(item.studentId, 2, parseFloat(e.target.value) || 0)}
                          style={{ width: '70px', padding: '5px', textAlign: 'center', borderRadius: '6px', border: '1px solid var(--border-subtle)', background: 'var(--bg-main)', color: 'var(--text-main)', fontWeight: 700 }}
                        />
                      </td>
                      <td style={{ padding: '10px', textAlign: 'center', fontWeight: 800, fontFamily: 'var(--font-mono)', color: '#4f46e5' }}>
                        {item.tareasPts}%
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================
          TAB 4: EVALUACIONES (Hoja Evaluaciones del Excel)
         ======================================================== */}
      {activeTab === 'EVALUACIONES' && (
        <div className="glass-panel" style={{ padding: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <div>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 800 }}>Registro de Evaluaciones / Exámenes</h3>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                Total asignado: <strong>{config.rubrics.find(r => r.key === 'evaluaciones')?.percentage || 45}%</strong> (Evaluación I: 20%, Evaluación II: 25%)
              </p>
            </div>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
              <thead style={{ background: 'var(--bg-surface)', borderBottom: '2px solid var(--border-subtle)' }}>
                <tr>
                  <th style={{ padding: '10px 14px' }}>#</th>
                  <th style={{ padding: '10px 14px' }}>Estudiante</th>
                  <th style={{ padding: '10px', textAlign: 'center' }}>Evaluación I (20%)</th>
                  <th style={{ padding: '10px', textAlign: 'center' }}>Evaluación II (25%)</th>
                  <th style={{ padding: '10px', textAlign: 'center', fontWeight: 800, color: '#4f46e5' }}>Total Evaluaciones (45%)</th>
                </tr>
              </thead>
              <tbody>
                {filteredList.map((item, idx) => {
                  const e1 = examGrades.find(e => e.assignmentId === assignment.id && e.studentId === item.studentId && e.examNumber === 1)?.percentageEarned || 0;
                  const e2 = examGrades.find(e => e.assignmentId === assignment.id && e.studentId === item.studentId && e.examNumber === 2)?.percentageEarned || 0;

                  return (
                    <tr key={item.studentId} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                      <td style={{ padding: '10px 14px', color: 'var(--text-muted)' }}>{idx + 1}</td>
                      <td style={{ padding: '10px 14px', fontWeight: 700 }}>
                        {item.student.firstLastName} {item.student.firstName}
                      </td>
                      <td style={{ padding: '8px', textAlign: 'center' }}>
                        <input
                          type="number"
                          step="0.01"
                          max={20}
                          min={0}
                          value={e1}
                          onChange={(e) => handleUpdateExamGrade(item.studentId, 1, parseFloat(e.target.value) || 0)}
                          style={{ width: '75px', padding: '5px', textAlign: 'center', borderRadius: '6px', border: '1px solid var(--border-subtle)', background: 'var(--bg-main)', color: 'var(--text-main)', fontWeight: 700 }}
                        />
                      </td>
                      <td style={{ padding: '8px', textAlign: 'center' }}>
                        <input
                          type="number"
                          step="0.01"
                          max={25}
                          min={0}
                          value={e2}
                          onChange={(e) => handleUpdateExamGrade(item.studentId, 2, parseFloat(e.target.value) || 0)}
                          style={{ width: '75px', padding: '5px', textAlign: 'center', borderRadius: '6px', border: '1px solid var(--border-subtle)', background: 'var(--bg-main)', color: 'var(--text-main)', fontWeight: 700 }}
                        />
                      </td>
                      <td style={{ padding: '10px', textAlign: 'center', fontWeight: 800, fontFamily: 'var(--font-mono)', color: '#4f46e5' }}>
                        {item.evaluacionesPts}%
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================
          TAB 5: PROYECTOS (Hoja Proyectos del Excel)
         ======================================================== */}
      {activeTab === 'PROYECTOS' && (
        <div className="glass-panel" style={{ padding: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <div>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 800 }}>Registro de Proyectos</h3>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                Total asignado al rubro: <strong>{config.rubrics.find(r => r.key === 'proyectos')?.percentage || 15}%</strong>
              </p>
            </div>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
              <thead style={{ background: 'var(--bg-surface)', borderBottom: '2px solid var(--border-subtle)' }}>
                <tr>
                  <th style={{ padding: '10px 14px' }}>#</th>
                  <th style={{ padding: '10px 14px' }}>Estudiante</th>
                  <th style={{ padding: '10px', textAlign: 'center' }}>Proyecto I (Valor: 15%)</th>
                  <th style={{ padding: '10px', textAlign: 'center', fontWeight: 800, color: '#4f46e5' }}>Total Proyecto (15%)</th>
                </tr>
              </thead>
              <tbody>
                {filteredList.map((item, idx) => {
                  const p1 = projectGrades.find(p => p.assignmentId === assignment.id && p.studentId === item.studentId && p.projectNumber === 1)?.percentageEarned || 0;

                  return (
                    <tr key={item.studentId} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                      <td style={{ padding: '10px 14px', color: 'var(--text-muted)' }}>{idx + 1}</td>
                      <td style={{ padding: '10px 14px', fontWeight: 700 }}>
                        {item.student.firstLastName} {item.student.firstName}
                      </td>
                      <td style={{ padding: '8px', textAlign: 'center' }}>
                        <input
                          type="number"
                          step="0.01"
                          max={15}
                          min={0}
                          value={p1}
                          onChange={(e) => handleUpdateProjectGrade(item.studentId, 1, parseFloat(e.target.value) || 0)}
                          style={{ width: '75px', padding: '5px', textAlign: 'center', borderRadius: '6px', border: '1px solid var(--border-subtle)', background: 'var(--bg-main)', color: 'var(--text-main)', fontWeight: 700 }}
                        />
                      </td>
                      <td style={{ padding: '10px', textAlign: 'center', fontWeight: 800, fontFamily: 'var(--font-mono)', color: '#4f46e5' }}>
                        {item.proyectosPts}%
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================
          TAB 6: PORTAFOLIO (Si está activo)
         ======================================================== */}
      {activeTab === 'PORTAFOLIO' && isPortafolioEnabled && (
        <div className="glass-panel" style={{ padding: '24px' }}>
          <h3 style={{ fontSize: '1.15rem', fontWeight: 800, marginBottom: '8px' }}>Portafolio de Evidencias</h3>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
            Valor asignado: {config.rubrics.find(r => r.key === 'portafolio')?.percentage}%
          </p>
        </div>
      )}

      {/* ========================================================
          TAB 7: CALIFICACIÓN INDIVIDUAL / EXPEDIENTE DEL ESTUDIANTE
         ======================================================== */}
      {activeTab === 'INDIVIDUAL' && selectedStudentComputed && (
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(280px, 320px) 1fr', gap: '20px' }}>
          {/* Student Selector Sidebar */}
          <div className="glass-panel" style={{ padding: '16px', maxHeight: '75vh', overflowY: 'auto' }}>
            <h4 style={{ fontSize: '0.9rem', fontWeight: 800, marginBottom: '12px' }}>
              Seleccionar Estudiante:
            </h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {students.map((st, idx) => (
                <button
                  key={st.id}
                  onClick={() => setSelectedStudentId(st.id)}
                  style={{
                    padding: '10px 12px',
                    borderRadius: '10px',
                    border: `1px solid ${selectedStudentId === st.id ? 'var(--border-focus)' : 'var(--border-subtle)'}`,
                    background: selectedStudentId === st.id ? 'var(--bg-surface)' : 'transparent',
                    textAlign: 'left',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    fontFamily: 'inherit'
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '0.85rem', color: 'var(--text-main)' }}>
                      {idx + 1}. {st.firstLastName} {st.firstName}
                    </div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                      Céd: {st.idNumber}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Student Detail Dossier */}
          <div className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {/* Header Card */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
              <div>
                <span className="badge" style={{ background: '#4f46e5', color: 'white', marginBottom: '6px' }}>
                  Expediente de Calificaciones
                </span>
                <h2 style={{ fontSize: '1.4rem', fontWeight: 800 }}>
                  {selectedStudentComputed.student.firstLastName} {selectedStudentComputed.student.secondLastName} {selectedStudentComputed.student.firstName}
                </h2>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                  Cédula: <strong>{selectedStudentComputed.student.idNumber}</strong> • Sección {group.sectionCode} • {subject.name}
                </div>
              </div>

              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '2rem', fontWeight: 800, fontFamily: 'var(--font-mono)', color: selectedStudentComputed.notaFinal >= config.passingGrade ? '#10b981' : '#ef4444' }}>
                  {selectedStudentComputed.notaFinal}
                </div>
                <span className="badge" style={{
                  background: selectedStudentComputed.condicion === 'Aprobado' ? 'var(--badge-present-bg)' : 'var(--badge-absent-bg)',
                  color: selectedStudentComputed.condicion === 'Aprobado' ? 'var(--badge-present-text)' : 'var(--badge-absent-text)'
                }}>
                  {selectedStudentComputed.condicion}
                </span>
              </div>
            </div>

            {/* Rubrics breakdown cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '14px' }}>
              <div style={{ background: 'var(--bg-surface)', padding: '14px', borderRadius: '12px', border: '1px solid var(--border-subtle)' }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 700 }}>ASISTENCIA (5%)</div>
                <div style={{ fontSize: '1.3rem', fontWeight: 800, color: '#4f46e5', marginTop: '4px' }}>
                  {selectedStudentComputed.asistenciaPts}%
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                  {selectedStudentComputed.unexcusedAbsences} Injustificadas • {selectedStudentComputed.tardies} Tardías
                </div>
              </div>

              <div style={{ background: 'var(--bg-surface)', padding: '14px', borderRadius: '12px', border: '1px solid var(--border-subtle)' }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 700 }}>COTIDIANO (25%)</div>
                <div style={{ fontSize: '1.3rem', fontWeight: 800, color: '#06b6d4', marginTop: '4px' }}>
                  {selectedStudentComputed.cotidianoPts}%
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                  {selectedStudentComputed.puntosCotidianoObtenidos} de {selectedStudentComputed.totalLessons} lecciones efectivas
                </div>
              </div>

              <div style={{ background: 'var(--bg-surface)', padding: '14px', borderRadius: '12px', border: '1px solid var(--border-subtle)' }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 700 }}>TAREAS (10%)</div>
                <div style={{ fontSize: '1.3rem', fontWeight: 800, color: '#8b5cf6', marginTop: '4px' }}>
                  {selectedStudentComputed.tareasPts}%
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                  {selectedStudentComputed.tareasList.length} Tareas entregadas
                </div>
              </div>

              <div style={{ background: 'var(--bg-surface)', padding: '14px', borderRadius: '12px', border: '1px solid var(--border-subtle)' }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 700 }}>EVALUACIONES (45%)</div>
                <div style={{ fontSize: '1.3rem', fontWeight: 800, color: '#10b981', marginTop: '4px' }}>
                  {selectedStudentComputed.evaluacionesPts}%
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                  Pruebas comprensivas
                </div>
              </div>

              <div style={{ background: 'var(--bg-surface)', padding: '14px', borderRadius: '12px', border: '1px solid var(--border-subtle)' }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 700 }}>PROYECTO (15%)</div>
                <div style={{ fontSize: '1.3rem', fontWeight: 800, color: '#f59e0b', marginTop: '4px' }}>
                  {selectedStudentComputed.proyectosPts}%
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                  Proyecto técnico final
                </div>
              </div>
            </div>

            {/* Attendance & Class History of this student */}
            <div>
              <h4 style={{ fontSize: '0.95rem', fontWeight: 800, marginBottom: '10px' }}>
                Historial de Clases y Desempeño Diario de este Estudiante:
              </h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {sessions.map(sess => {
                  const det = sessionDetails.find(d => d.sessionId === sess.id && d.studentId === selectedStudentId);
                  const att = det?.attendance || 'PRESENT';
                  const lvl = det?.cotidianoLevel !== undefined ? det.cotidianoLevel : 3;

                  return (
                    <div
                      key={sess.id}
                      style={{
                        padding: '10px 14px',
                        borderRadius: '10px',
                        background: 'var(--bg-surface)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        fontSize: '0.85rem'
                      }}
                    >
                      <div>
                        <strong>{sess.date}</strong> • {sess.lessonsCount} Lecciones • <em>{sess.topic}</em>
                      </div>
                      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                        <span className="badge" style={{
                          background: att === 'PRESENT' ? 'var(--badge-present-bg)' : 'var(--badge-absent-bg)',
                          color: att === 'PRESENT' ? 'var(--badge-present-text)' : 'var(--badge-absent-text)'
                        }}>
                          {att === 'PRESENT' ? 'Presente' : att === 'UNEXCUSED_ABSENCE' ? 'Ausencia Injustificada' : att === 'TARDY' ? 'Tardía' : 'Justificada'}
                        </span>
                        <span className="badge" style={{ background: 'var(--bg-main)', border: '1px solid var(--border-subtle)' }}>
                          Nivel {lvl} ({lvl === 3 ? '100%' : lvl === 2 ? '50%' : lvl === 1 ? '25%' : '0%'})
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal para crear nueva clase/lección */}
      {showAddSessionModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.7)',
          backdropFilter: 'blur(6px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 100,
          padding: '20px'
        }}>
          <div className="glass-panel" style={{ width: '100%', maxWidth: '500px', padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 800 }}>
              + Registrar Nueva Clase / Lección
            </h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              Agrega una fecha con su número de lecciones para habilitar el pase de asistencia y la evaluación del cotidiano.
            </p>

            <div>
              <label style={{ fontSize: '0.8rem', fontWeight: 700, display: 'block', marginBottom: '6px' }}>
                Fecha de la Clase:
              </label>
              <input
                type="date"
                value={newSessionDate}
                onChange={(e) => setNewSessionDate(e.target.value)}
                style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--border-subtle)', background: 'var(--bg-surface)', color: 'var(--text-main)' }}
              />
            </div>

            <div>
              <label style={{ fontSize: '0.8rem', fontWeight: 700, display: 'block', marginBottom: '6px' }}>
                Cantidad de Lecciones Impartidas:
              </label>
              <input
                type="number"
                min="1"
                max="8"
                value={newSessionLessons}
                onChange={(e) => setNewSessionLessons(parseInt(e.target.value) || 2)}
                style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--border-subtle)', background: 'var(--bg-surface)', color: 'var(--text-main)', fontWeight: 700 }}
              />
            </div>

            <div>
              <label style={{ fontSize: '0.8rem', fontWeight: 700, display: 'block', marginBottom: '6px' }}>
                Tema o Aprendizaje Esperado (Opcional):
              </label>
              <input
                type="text"
                placeholder="Ej. Vocabulario técnico, Práctica de laboratorio..."
                value={newSessionTopic}
                onChange={(e) => setNewSessionTopic(e.target.value)}
                style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--border-subtle)', background: 'var(--bg-surface)', color: 'var(--text-main)' }}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
              <button onClick={() => setShowAddSessionModal(false)} className="btn btn-secondary">
                Cancelar
              </button>
              <button onClick={handleCreateSession} className="btn btn-primary">
                Guardar e Iniciar Clase
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
