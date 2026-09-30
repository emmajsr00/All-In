import React, { useState } from 'react';
import {
  ArrowLeft,
  FileSpreadsheet,
  CalendarCheck,
  Target,
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
  BookOpen,
  Calculator,
  Percent,
  Hash
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
  PortfolioGrade,
  LearningIndicator,
  RubricSubItemDef
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
  indicators: LearningIndicator[];
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

type TabType =
  | 'REGISTRO_GENERAL'
  | 'ASISTENCIA'
  | 'COTIDIANO'
  | 'INDICADORES'
  | 'TAREAS'
  | 'EVALUACIONES'
  | 'PROYECTOS'
  | 'PORTAFOLIO'
  | 'INDIVIDUAL';

export const GroupWorkspaceView: React.FC<GroupWorkspaceViewProps> = ({
  institutionName,
  assignment,
  group,
  subject,
  teacherName,
  students,
  config,
  indicators,
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

  // Modo de ingreso: 'POINTS' (Nota / Puntos) o 'PERCENTAGE' (Porcentaje)
  const [scoringInputMode, setScoringInputMode] = useState<'POINTS' | 'PERCENTAGE'>('POINTS');

  // Modal para agregar una nueva sesión/clase
  const [showAddSessionModal, setShowAddSessionModal] = useState(false);
  const [newSessionDate, setNewSessionDate] = useState(new Date().toISOString().split('T')[0]);
  const [newSessionLessons, setNewSessionLessons] = useState(3);
  const [newSessionTopic, setNewSessionTopic] = useState('');
  const [newSessionIndicatorId, setNewSessionIndicatorId] = useState<string>(indicators[0]?.id || '');

  // Modal para nuevo indicador de planeamiento (Habilidad / Área 100% manual)
  const [showAddIndicatorModal, setShowAddIndicatorModal] = useState(false);
  const [newIndCode, setNewIndCode] = useState(`IND-0${indicators.length + 1}`);
  const [newIndSkill, setNewIndSkill] = useState('');
  const [newIndDesc, setNewIndDesc] = useState('');
  const [newIndL1, setNewIndL1] = useState('');
  const [newIndL2, setNewIndL2] = useState('');
  const [newIndL3, setNewIndL3] = useState('');

  // Modales para agregar sub-ítems (Tareas, Evaluaciones, Proyectos)
  const [showAddItemModal, setShowAddItemModal] = useState<'TAREA' | 'EVALUACION' | 'PROYECTO' | null>(null);
  const [newItemTitle, setNewItemTitle] = useState('');
  const [newItemPercentage, setNewItemPercentage] = useState<number>(5);
  const [newItemTotalPoints, setNewItemTotalPoints] = useState<number>(100);

  // Calcular todas las notas con la fórmula oficial del MEP
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

  const passingCount = calculatedStudents.filter(c => c.condicion === 'Aprobado').length;
  const failingCount = calculatedStudents.length - passingCount;
  const avgGrade = (calculatedStudents.reduce((acc, curr) => acc + curr.notaFinal, 0) / (calculatedStudents.length || 1)).toFixed(1);
  const totalLessons = sessions.reduce((acc, s) => acc + (Number(s.lessonsCount) || 0), 0);

  // Rubro caps y sumas actuales
  const tareasMaxWeight = config.rubrics.find(r => r.key === 'tareas')?.percentage || 10;
  const tareasCurrentSum = (config.taskDefinitions || []).reduce((acc, t) => acc + Number(t.percentage), 0);

  const evaluacionesMaxWeight = config.rubrics.find(r => r.key === 'evaluaciones')?.percentage || 45;
  const evaluacionesCurrentSum = (config.examDefinitions || []).reduce((acc, e) => acc + Number(e.percentage), 0);

  const proyectosMaxWeight = config.rubrics.find(r => r.key === 'proyectos')?.percentage || 15;
  const proyectosCurrentSum = (config.projectDefinitions || []).reduce((acc, p) => acc + Number(p.percentage), 0);

  // Registrar nueva clase/lección
  const handleCreateSession = async () => {
    const newSession: ClassSession = {
      id: `sess-${Date.now()}`,
      assignmentId: assignment.id,
      periodId: 'I_PERIODO',
      date: newSessionDate,
      lessonsCount: Number(newSessionLessons) || 2,
      topic: newSessionTopic.trim() || 'Lección Regular',
      indicatorId: newSessionIndicatorId || undefined
    };

    await db.classSessions.add(newSession);

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

  // Crear nuevo indicador con habilidad/área manual
  const handleCreateIndicator = async () => {
    if (!newIndDesc.trim()) return;

    const newInd: LearningIndicator = {
      id: `ind-${Date.now()}`,
      assignmentId: assignment.id,
      code: newIndCode.trim() || `IND-0${indicators.length + 1}`,
      skillArea: newIndSkill.trim() || 'General / Competencia',
      description: newIndDesc.trim(),
      initialLevelDesc: newIndL1.trim() || 'Desempeño con apoyo.',
      intermediateLevelDesc: newIndL2.trim() || 'Desempeño autónomo básico.',
      advancedLevelDesc: newIndL3.trim() || 'Desempeño fluido y completo.'
    };

    await db.indicators.add(newInd);
    setShowAddIndicatorModal(false);
    setNewIndDesc('');
    setNewIndSkill('');
    setNewIndL1('');
    setNewIndL2('');
    setNewIndL3('');
    onDataChanged();
  };

  // Eliminar un indicador
  const handleDeleteIndicator = async (indId: string) => {
    if (!confirm('¿Deseas eliminar este indicador del planeamiento?')) return;
    await db.indicators.delete(indId);
    onDataChanged();
  };

  // Actualizar asistencia o cotidiano
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

  // Agregar sub-ítem con puntos totales y valor porcentual
  const handleAddSubItem = async () => {
    if (!newItemTitle.trim()) return;

    if (showAddItemModal === 'TAREA') {
      const remaining = tareasMaxWeight - tareasCurrentSum;
      if (newItemPercentage > remaining) {
        alert(`No puedes exceder el porcentaje del rubro. Disponible: ${remaining.toFixed(2)}%`);
        return;
      }
      const newDef: RubricSubItemDef = {
        id: `tdef-${Date.now()}`,
        number: (config.taskDefinitions || []).length + 1,
        title: newItemTitle.trim(),
        percentage: newItemPercentage,
        totalPoints: newItemTotalPoints || 100
      };
      const updated = {
        ...config,
        taskDefinitions: [...(config.taskDefinitions || []), newDef]
      };
      await db.evaluationConfigs.put(updated);
    } else if (showAddItemModal === 'EVALUACION') {
      const remaining = evaluacionesMaxWeight - evaluacionesCurrentSum;
      if (newItemPercentage > remaining) {
        alert(`No puedes exceder el porcentaje del rubro. Disponible: ${remaining.toFixed(2)}%`);
        return;
      }
      const newDef: RubricSubItemDef = {
        id: `edef-${Date.now()}`,
        number: (config.examDefinitions || []).length + 1,
        title: newItemTitle.trim(),
        percentage: newItemPercentage,
        totalPoints: newItemTotalPoints || 100
      };
      const updated = {
        ...config,
        examDefinitions: [...(config.examDefinitions || []), newDef]
      };
      await db.evaluationConfigs.put(updated);
    } else if (showAddItemModal === 'PROYECTO') {
      const remaining = proyectosMaxWeight - proyectosCurrentSum;
      if (newItemPercentage > remaining) {
        alert(`No puedes exceder el porcentaje del rubro. Disponible: ${remaining.toFixed(2)}%`);
        return;
      }
      const newDef: RubricSubItemDef = {
        id: `pdef-${Date.now()}`,
        number: (config.projectDefinitions || []).length + 1,
        title: newItemTitle.trim(),
        percentage: newItemPercentage,
        totalPoints: newItemTotalPoints || 100
      };
      const updated = {
        ...config,
        projectDefinitions: [...(config.projectDefinitions || []), newDef]
      };
      await db.evaluationConfigs.put(updated);
    }

    setShowAddItemModal(null);
    setNewItemTitle('');
    onDataChanged();
  };

  // ELIMINAR SUB-ÍTEMS (Permite quitar tareas o evaluaciones para liberar porcentaje y crear nuevas)
  const handleDeleteTask = async (taskId: string) => {
    if (!confirm('¿Deseas eliminar esta tarea? Se liberará su porcentaje y se borrarán sus notas.')) return;
    const updatedTasks = (config.taskDefinitions || []).filter(t => t.id !== taskId);
    await db.evaluationConfigs.put({ ...config, taskDefinitions: updatedTasks });
    const gradesToDelete = await db.taskGrades.where('assignmentId').equals(assignment.id).filter(t => t.taskId === taskId).toArray();
    if (gradesToDelete.length > 0) {
      await db.taskGrades.bulkDelete(gradesToDelete.map(g => g.id));
    }
    onDataChanged();
  };

  const handleDeleteExam = async (examId: string) => {
    if (!confirm('¿Deseas eliminar esta evaluación? Se liberará su porcentaje y se borrarán sus notas.')) return;
    const updatedExams = (config.examDefinitions || []).filter(e => e.id !== examId);
    await db.evaluationConfigs.put({ ...config, examDefinitions: updatedExams });
    const gradesToDelete = await db.examGrades.where('assignmentId').equals(assignment.id).filter(e => e.examId === examId).toArray();
    if (gradesToDelete.length > 0) {
      await db.examGrades.bulkDelete(gradesToDelete.map(g => g.id));
    }
    onDataChanged();
  };

  const handleDeleteProject = async (projectId: string) => {
    if (!confirm('¿Deseas eliminar este proyecto? Se liberará su porcentaje.')) return;
    const updated = (config.projectDefinitions || []).filter(p => p.id !== projectId);
    await db.evaluationConfigs.put({ ...config, projectDefinitions: updated });
    const gradesToDelete = await db.projectGrades.where('assignmentId').equals(assignment.id).filter(p => p.projectId === projectId).toArray();
    if (gradesToDelete.length > 0) {
      await db.projectGrades.bulkDelete(gradesToDelete.map(g => g.id));
    }
    onDataChanged();
  };

  // Conversión bidireccional Nota <-> Porcentaje
  // Pts = (Pct / ItemPct) * ItemTotalPts
  // Pct = (Pts / ItemTotalPts) * ItemPct
  const handleUpdateTaskByPointsOrPct = async (
    studentId: string,
    tDef: RubricSubItemDef,
    inputValue: number,
    isPointsInput: boolean
  ) => {
    const totalPts = tDef.totalPoints || 100;
    const maxPct = tDef.percentage;

    let finalPct = 0;
    let finalPts = 0;

    if (isPointsInput) {
      finalPts = Math.min(totalPts, Math.max(0, inputValue));
      finalPct = totalPts > 0 ? (finalPts / totalPts) * maxPct : 0;
    } else {
      finalPct = Math.min(maxPct, Math.max(0, inputValue));
      finalPts = maxPct > 0 ? (finalPct / maxPct) * totalPts : 0;
    }

    finalPct = Number(finalPct.toFixed(2));
    finalPts = Number(finalPts.toFixed(1));

    const existing = taskGrades.find(g => g.assignmentId === assignment.id && g.studentId === studentId && (g.taskId === tDef.id || g.taskNumber === tDef.number));
    if (existing) {
      await db.taskGrades.update(existing.id, { percentageEarned: finalPct, pointsEarned: finalPts, taskId: tDef.id });
    } else {
      await db.taskGrades.add({
        id: `tg-${studentId}-${tDef.id}`,
        assignmentId: assignment.id,
        studentId,
        periodId: 'I_PERIODO',
        taskId: tDef.id,
        taskNumber: tDef.number,
        percentageEarned: finalPct,
        pointsEarned: finalPts
      });
    }
    onDataChanged();
  };

  const handleUpdateExamByPointsOrPct = async (
    studentId: string,
    eDef: RubricSubItemDef,
    inputValue: number,
    isPointsInput: boolean
  ) => {
    const totalPts = eDef.totalPoints || 100;
    const maxPct = eDef.percentage;

    let finalPct = 0;
    let finalPts = 0;

    if (isPointsInput) {
      finalPts = Math.min(totalPts, Math.max(0, inputValue));
      finalPct = totalPts > 0 ? (finalPts / totalPts) * maxPct : 0;
    } else {
      finalPct = Math.min(maxPct, Math.max(0, inputValue));
      finalPts = maxPct > 0 ? (finalPct / maxPct) * totalPts : 0;
    }

    finalPct = Number(finalPct.toFixed(2));
    finalPts = Number(finalPts.toFixed(1));

    const existing = examGrades.find(g => g.assignmentId === assignment.id && g.studentId === studentId && (g.examId === eDef.id || g.examNumber === eDef.number));
    if (existing) {
      await db.examGrades.update(existing.id, { percentageEarned: finalPct, pointsEarned: finalPts, examId: eDef.id });
    } else {
      await db.examGrades.add({
        id: `eg-${studentId}-${eDef.id}`,
        assignmentId: assignment.id,
        studentId,
        periodId: 'I_PERIODO',
        examId: eDef.id,
        examNumber: eDef.number,
        percentageEarned: finalPct,
        pointsEarned: finalPts
      });
    }
    onDataChanged();
  };

  const handleUpdateProjectByPointsOrPct = async (
    studentId: string,
    pDef: RubricSubItemDef,
    inputValue: number,
    isPointsInput: boolean
  ) => {
    const totalPts = pDef.totalPoints || 100;
    const maxPct = pDef.percentage;

    let finalPct = 0;
    let finalPts = 0;

    if (isPointsInput) {
      finalPts = Math.min(totalPts, Math.max(0, inputValue));
      finalPct = totalPts > 0 ? (finalPts / totalPts) * maxPct : 0;
    } else {
      finalPct = Math.min(maxPct, Math.max(0, inputValue));
      finalPts = maxPct > 0 ? (finalPct / maxPct) * totalPts : 0;
    }

    finalPct = Number(finalPct.toFixed(2));
    finalPts = Number(finalPts.toFixed(1));

    const existing = projectGrades.find(g => g.assignmentId === assignment.id && g.studentId === studentId && (g.projectId === pDef.id || g.projectNumber === pDef.number));
    if (existing) {
      await db.projectGrades.update(existing.id, { percentageEarned: finalPct, pointsEarned: finalPts, projectId: pDef.id });
    } else {
      await db.projectGrades.add({
        id: `pg-${studentId}-${pDef.id}`,
        assignmentId: assignment.id,
        studentId,
        periodId: 'I_PERIODO',
        projectId: pDef.id,
        projectNumber: pDef.number,
        percentageEarned: finalPct,
        pointsEarned: finalPts
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
              {institutionName} • Docente: {teacherName} • Total Lecciones: <strong>{totalLessons} lecciones</strong> ({sessions.length} clases)
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

      {/* Navigation Menu Tabs: ASISTENCIA y COTIDIANO separados + INDICADORES */}
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
          Registro General
        </button>

        <button
          onClick={() => setActiveTab('ASISTENCIA')}
          className={`btn btn-sm ${activeTab === 'ASISTENCIA' ? 'btn-primary' : 'btn-secondary'}`}
          style={{ whiteSpace: 'nowrap' }}
        >
          <CalendarCheck size={15} color="#4f46e5" />
          Asistencia ({config.rubrics.find(r => r.key === 'asistencia')?.percentage || 5}%)
        </button>

        <button
          onClick={() => setActiveTab('COTIDIANO')}
          className={`btn btn-sm ${activeTab === 'COTIDIANO' ? 'btn-primary' : 'btn-secondary'}`}
          style={{ whiteSpace: 'nowrap' }}
        >
          <Target size={15} color="#06b6d4" />
          Trabajo Cotidiano ({config.rubrics.find(r => r.key === 'cotidiano')?.percentage || 25}%)
        </button>

        <button
          onClick={() => setActiveTab('INDICADORES')}
          className={`btn btn-sm ${activeTab === 'INDICADORES' ? 'btn-primary' : 'btn-secondary'}`}
          style={{ whiteSpace: 'nowrap' }}
        >
          <BookOpen size={15} color="#8b5cf6" />
          Indicadores / Planeamiento ({indicators.length})
        </button>

        <button
          onClick={() => setActiveTab('TAREAS')}
          className={`btn btn-sm ${activeTab === 'TAREAS' ? 'btn-primary' : 'btn-secondary'}`}
          style={{ whiteSpace: 'nowrap' }}
        >
          <CheckSquare size={15} />
          Tareas ({tareasMaxWeight}%)
        </button>

        <button
          onClick={() => setActiveTab('EVALUACIONES')}
          className={`btn btn-sm ${activeTab === 'EVALUACIONES' ? 'btn-primary' : 'btn-secondary'}`}
          style={{ whiteSpace: 'nowrap' }}
        >
          <FileText size={15} />
          Evaluaciones ({evaluacionesMaxWeight}%)
        </button>

        <button
          onClick={() => setActiveTab('PROYECTOS')}
          className={`btn btn-sm ${activeTab === 'PROYECTOS' ? 'btn-primary' : 'btn-secondary'}`}
          style={{ whiteSpace: 'nowrap' }}
        >
          <FolderGit2 size={15} />
          Proyectos ({proyectosMaxWeight}%)
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
          Expediente Individual
        </button>
      </div>

      {/* ========================================================
          TAB 1: REGISTRO GENERAL DE CALIFICACIONES
         ======================================================== */}
      {activeTab === 'REGISTRO_GENERAL' && (
        <div className="glass-panel" style={{ overflow: 'hidden' }}>
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

          <div style={{ overflowX: 'auto', maxHeight: '68vh' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
              <thead style={{ position: 'sticky', top: 0, background: 'var(--bg-card)', zIndex: 10, borderBottom: '2px solid var(--border-subtle)' }}>
                <tr>
                  <th style={{ padding: '12px 14px', width: '35px', color: 'var(--text-muted)' }}>#</th>
                  <th style={{ padding: '12px 14px', color: 'var(--text-muted)' }}>Estudiante</th>
                  <th style={{ padding: '12px 14px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>Cédula</th>

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
          TAB 2: ASISTENCIA (CON COLUMNAS FIJAS / STICKY EN SCROLL)
         ======================================================== */}
      {activeTab === 'ASISTENCIA' && (
        <div className="glass-panel" style={{ overflow: 'hidden' }}>
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
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <CalendarCheck size={18} color="#4f46e5" />
                <h3 style={{ fontSize: '1.05rem', fontWeight: 800 }}>
                  Control de Asistencia por Fecha y Lecciones
                </h3>
              </div>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                Columnas fijadas a la izquierda: desplaza hacia la derecha para registrar clases pasadas o nuevas.
              </p>
            </div>

            <button onClick={() => setShowAddSessionModal(true)} className="btn btn-primary btn-sm">
              <Plus size={15} />
              + Registrar Nueva Fecha / Clase
            </button>
          </div>

          <div style={{ overflowX: 'auto', maxHeight: '68vh', position: 'relative' }}>
            <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: 0, textAlign: 'left', fontSize: '0.82rem' }}>
              <thead style={{ position: 'sticky', top: 0, zIndex: 20 }}>
                <tr>
                  <th style={{
                    position: 'sticky',
                    left: 0,
                    zIndex: 25,
                    background: 'var(--bg-card)',
                    padding: '12px 10px',
                    width: '35px',
                    borderBottom: '2px solid var(--border-subtle)',
                    borderRight: '1px solid var(--border-subtle)'
                  }}>#</th>

                  <th style={{
                    position: 'sticky',
                    left: '35px',
                    zIndex: 25,
                    background: 'var(--bg-card)',
                    padding: '12px 14px',
                    minWidth: '180px',
                    borderBottom: '2px solid var(--border-subtle)'
                  }}>Estudiante</th>

                  <th style={{
                    position: 'sticky',
                    left: '215px',
                    zIndex: 25,
                    background: 'var(--bg-card)',
                    padding: '12px 10px',
                    width: '110px',
                    fontFamily: 'var(--font-mono)',
                    borderBottom: '2px solid var(--border-subtle)'
                  }}>Cédula</th>

                  <th style={{
                    position: 'sticky',
                    left: '325px',
                    zIndex: 25,
                    background: 'var(--bg-card)',
                    padding: '10px',
                    textAlign: 'center',
                    fontWeight: 800,
                    color: '#4f46e5',
                    minWidth: '110px',
                    borderBottom: '2px solid var(--border-subtle)',
                    borderRight: '2px solid var(--border-focus)',
                    boxShadow: '4px 0 8px rgba(0,0,0,0.08)'
                  }}>
                    <div>% ASISTENCIA</div>
                    <div style={{ fontSize: '0.7rem' }}>Valor: {config.rubrics.find(r => r.key === 'asistencia')?.percentage || 5}%</div>
                  </th>

                  {/* Resumen Faltas */}
                  <th style={{ padding: '10px', textAlign: 'center', background: 'rgba(239, 68, 68, 0.08)', borderBottom: '2px solid var(--border-subtle)' }}>AI</th>
                  <th style={{ padding: '10px', textAlign: 'center', background: 'rgba(245, 158, 11, 0.08)', borderBottom: '2px solid var(--border-subtle)' }}>ESC</th>
                  <th style={{ padding: '10px', textAlign: 'center', background: 'rgba(99, 102, 241, 0.08)', borderBottom: '2px solid var(--border-subtle)' }}>T</th>
                  <th style={{ padding: '10px', textAlign: 'center', background: 'rgba(16, 185, 129, 0.08)', borderBottom: '2px solid var(--border-subtle)' }}>AJ</th>

                  {/* Fechas de clase con scroll horizontal */}
                  {sessions.map(sess => (
                    <th key={sess.id} style={{
                      padding: '8px 12px',
                      textAlign: 'center',
                      borderLeft: '1px solid var(--border-subtle)',
                      borderBottom: '2px solid var(--border-subtle)',
                      background: 'var(--bg-surface)',
                      minWidth: '120px'
                    }}>
                      <div style={{ fontWeight: 800, color: '#4f46e5' }}>{sess.date}</div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{sess.lessonsCount} Lecciones</div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredList.map((item, idx) => (
                  <tr key={item.studentId}>
                    <td style={{
                      position: 'sticky',
                      left: 0,
                      zIndex: 15,
                      background: 'var(--bg-card)',
                      padding: '10px',
                      color: 'var(--text-muted)',
                      borderBottom: '1px solid var(--border-subtle)',
                      borderRight: '1px solid var(--border-subtle)'
                    }}>{idx + 1}</td>

                    <td style={{
                      position: 'sticky',
                      left: '35px',
                      zIndex: 15,
                      background: 'var(--bg-card)',
                      padding: '10px 14px',
                      fontWeight: 700,
                      borderBottom: '1px solid var(--border-subtle)',
                      whiteSpace: 'nowrap'
                    }}>
                      {item.student.firstLastName} {item.student.secondLastName} {item.student.firstName}
                    </td>

                    <td style={{
                      position: 'sticky',
                      left: '215px',
                      zIndex: 15,
                      background: 'var(--bg-card)',
                      padding: '10px',
                      fontFamily: 'var(--font-mono)',
                      fontSize: '0.78rem',
                      color: 'var(--text-muted)',
                      borderBottom: '1px solid var(--border-subtle)'
                    }}>
                      {item.student.idNumber}
                    </td>

                    <td style={{
                      position: 'sticky',
                      left: '325px',
                      zIndex: 15,
                      background: 'var(--bg-card)',
                      padding: '10px',
                      textAlign: 'center',
                      fontWeight: 800,
                      fontFamily: 'var(--font-mono)',
                      color: '#4f46e5',
                      borderBottom: '1px solid var(--border-subtle)',
                      borderRight: '2px solid var(--border-focus)',
                      boxShadow: '4px 0 8px rgba(0,0,0,0.08)'
                    }}>
                      {item.asistenciaPts}%
                    </td>

                    <td style={{ padding: '8px', textAlign: 'center', color: '#dc2626', fontWeight: 700, borderBottom: '1px solid var(--border-subtle)' }}>{item.unexcusedAbsences}</td>
                    <td style={{ padding: '8px', textAlign: 'center', color: '#d97706', fontWeight: 700, borderBottom: '1px solid var(--border-subtle)' }}>{item.lessonEscapes}</td>
                    <td style={{ padding: '8px', textAlign: 'center', color: '#4f46e5', fontWeight: 700, borderBottom: '1px solid var(--border-subtle)' }}>{item.tardies}</td>
                    <td style={{ padding: '8px', textAlign: 'center', color: '#16a34a', fontWeight: 700, borderBottom: '1px solid var(--border-subtle)' }}>{item.excusedAbsences}</td>

                    {sessions.map(sess => {
                      const det = sessionDetails.find(d => d.sessionId === sess.id && d.studentId === item.studentId) || {
                        attendance: 'PRESENT',
                        cotidianoLevel: 3
                      };

                      return (
                        <td key={sess.id} style={{
                          padding: '6px 8px',
                          textAlign: 'center',
                          borderLeft: '1px solid var(--border-subtle)',
                          borderBottom: '1px solid var(--border-subtle)'
                        }}>
                          <select
                            value={det.attendance}
                            onChange={(e) => handleUpdateSessionDetail(sess.id, item.studentId, { attendance: e.target.value as any })}
                            style={{
                              fontSize: '0.75rem',
                              padding: '4px 8px',
                              borderRadius: '6px',
                              border: '1px solid var(--border-subtle)',
                              background: det.attendance === 'PRESENT' ? 'var(--badge-present-bg)' : det.attendance === 'UNEXCUSED_ABSENCE' ? 'var(--badge-absent-bg)' : det.attendance === 'TARDY' ? 'var(--badge-tardy-bg)' : 'var(--badge-excused-bg)',
                              color: det.attendance === 'PRESENT' ? 'var(--badge-present-text)' : det.attendance === 'UNEXCUSED_ABSENCE' ? 'var(--badge-absent-text)' : det.attendance === 'TARDY' ? 'var(--badge-tardy-text)' : 'var(--badge-excused-text)',
                              fontWeight: 700,
                              cursor: 'pointer'
                            }}
                          >
                            <option value="PRESENT">Presente</option>
                            <option value="UNEXCUSED_ABSENCE">Injustificada</option>
                            <option value="LESSON_ESCAPE">Escape</option>
                            <option value="TARDY">Tardía</option>
                            <option value="EXCUSED_ABSENCE">Justificada</option>
                          </select>
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
          TAB 3: TRABAJO COTIDIANO (LIGADO A INDICADORES DEL PLANEAMIENTO)
         ======================================================== */}
      {activeTab === 'COTIDIANO' && (
        <div className="glass-panel" style={{ overflow: 'hidden' }}>
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
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Target size={18} color="#06b6d4" />
                <h3 style={{ fontSize: '1.05rem', fontWeight: 800 }}>
                  Evaluación de Trabajo Cotidiano por Clase e Indicadores
                </h3>
              </div>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                Cada clase evalúa un indicador del planeamiento. Escala MEP: Nivel 3 = 100% de lecciones, Nivel 2 = 50%, Nivel 1 = 25%.
              </p>
            </div>

            <button onClick={() => setShowAddSessionModal(true)} className="btn btn-primary btn-sm">
              <Plus size={15} />
              + Nueva Clase de Cotidiano
            </button>
          </div>

          <div style={{ overflowX: 'auto', maxHeight: '68vh' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.82rem' }}>
              <thead style={{ position: 'sticky', top: 0, background: 'var(--bg-card)', zIndex: 10, borderBottom: '2px solid var(--border-subtle)' }}>
                <tr>
                  <th style={{ padding: '12px 14px', width: '35px' }}>#</th>
                  <th style={{ padding: '12px 14px', minWidth: '180px' }}>Estudiante</th>
                  <th style={{ padding: '10px', textAlign: 'center', fontWeight: 800, color: '#06b6d4' }}>
                    % COTIDIANO ({config.rubrics.find(r => r.key === 'cotidiano')?.percentage || 25}%)
                  </th>
                  <th style={{ padding: '10px', textAlign: 'center' }}>Ptos Obtenidos</th>

                  {sessions.map(sess => {
                    const ind = indicators.find(i => i.id === sess.indicatorId);

                    return (
                      <th key={sess.id} style={{ padding: '8px 12px', textAlign: 'center', borderLeft: '1px solid var(--border-subtle)', minWidth: '140px' }}>
                        <div style={{ fontWeight: 800, color: '#4f46e5' }}>{sess.date}</div>
                        <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{sess.lessonsCount} Lecciones</div>
                        {ind && (
                          <div className="badge" style={{ background: 'rgba(6, 182, 212, 0.15)', color: '#0891b2', fontSize: '0.68rem', marginTop: '4px' }} title={ind.description}>
                            {ind.code} ({ind.skillArea || 'Indicador'})
                          </div>
                        )}
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody>
                {filteredList.map((item, idx) => (
                  <tr key={item.studentId} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                    <td style={{ padding: '8px 14px', color: 'var(--text-muted)' }}>{idx + 1}</td>
                    <td style={{ padding: '8px 14px', fontWeight: 700 }}>
                      {item.student.firstLastName} {item.student.firstName}
                    </td>

                    <td style={{ padding: '8px', textAlign: 'center', fontWeight: 800, fontFamily: 'var(--font-mono)', color: '#06b6d4', fontSize: '0.9rem' }}>
                      {item.cotidianoPts}%
                    </td>
                    <td style={{ padding: '8px', textAlign: 'center', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>
                      {item.puntosCotidianoObtenidos} / {item.totalLessons}
                    </td>

                    {sessions.map(sess => {
                      const det = sessionDetails.find(d => d.sessionId === sess.id && d.studentId === item.studentId) || {
                        attendance: 'PRESENT',
                        cotidianoLevel: 3
                      };

                      return (
                        <td key={sess.id} style={{ padding: '6px 8px', textAlign: 'center', borderLeft: '1px solid var(--border-subtle)' }}>
                          <select
                            value={det.cotidianoLevel}
                            onChange={(e) => handleUpdateSessionDetail(sess.id, item.studentId, { cotidianoLevel: parseInt(e.target.value) as any })}
                            style={{
                              fontSize: '0.75rem',
                              padding: '4px 6px',
                              borderRadius: '6px',
                              border: '1px solid var(--border-subtle)',
                              background: 'var(--bg-main)',
                              color: det.cotidianoLevel === 3 ? '#16a34a' : det.cotidianoLevel === 2 ? '#d97706' : det.cotidianoLevel === 1 ? '#dc2626' : 'var(--text-muted)',
                              fontWeight: 700,
                              cursor: 'pointer'
                            }}
                          >
                            <option value={3}>Nivel 3 (Avanzado 1.0)</option>
                            <option value={2}>Nivel 2 (Intermedio 0.5)</option>
                            <option value={1}>Nivel 1 (Inicial 0.25)</option>
                            <option value={0}>0 (Ausente / No eval)</option>
                          </select>
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
          TAB 4: INDICADORES / PLANEAMIENTO (HABILIDAD/ÁREA 100% MANUAL)
         ======================================================== */}
      {activeTab === 'INDICADORES' && (
        <div className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <BookOpen size={20} color="#8b5cf6" />
                <h3 style={{ fontSize: '1.2rem', fontWeight: 800 }}>
                  Aprendizajes e Indicadores del Planeamiento Oficial
                </h3>
              </div>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                Personaliza las áreas o habilidades según tu especialidad (Matemática, Ciencias, Idiomas, Talleres, etc.).
              </p>
            </div>

            <button onClick={() => setShowAddIndicatorModal(true)} className="btn btn-primary btn-sm">
              <Plus size={15} />
              + Agregar Indicador de Planeamiento
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {indicators.map((ind) => (
              <div
                key={ind.id}
                style={{
                  padding: '16px',
                  borderRadius: '12px',
                  background: 'var(--bg-surface)',
                  border: '1px solid var(--border-subtle)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '10px'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span className="badge" style={{ background: '#4f46e5', color: 'white', fontWeight: 700 }}>
                      {ind.code}
                    </span>
                    {ind.skillArea && (
                      <span className="badge" style={{ background: 'rgba(139, 92, 246, 0.15)', color: '#8b5cf6', fontWeight: 700 }}>
                        {ind.skillArea}
                      </span>
                    )}
                  </div>

                  <button
                    onClick={() => handleDeleteIndicator(ind.id)}
                    className="btn btn-secondary btn-sm"
                    style={{ color: '#ef4444', padding: '4px 8px' }}
                    title="Eliminar este indicador"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>

                <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>
                  {ind.description}
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '10px', marginTop: '6px' }}>
                  <div style={{ background: 'var(--bg-main)', padding: '10px', borderRadius: '8px', border: '1px solid var(--border-subtle)' }}>
                    <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#dc2626' }}>NIVEL INICIAL (1 pt - 25%)</div>
                    <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '2px' }}>{ind.initialLevelDesc || 'Con apoyo básico'}</div>
                  </div>
                  <div style={{ background: 'var(--bg-main)', padding: '10px', borderRadius: '8px', border: '1px solid var(--border-subtle)' }}>
                    <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#d97706' }}>NIVEL INTERMEDIO (2 pts - 50%)</div>
                    <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '2px' }}>{ind.intermediateLevelDesc || 'Autónomo con dudas menores'}</div>
                  </div>
                  <div style={{ background: 'var(--bg-main)', padding: '10px', borderRadius: '8px', border: '1px solid var(--border-subtle)' }}>
                    <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#16a34a' }}>NIVEL AVANZADO (3 pts - 100%)</div>
                    <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '2px' }}>{ind.advancedLevelDesc || 'Dominio completo del aprendizaje'}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ========================================================
          TAB 5: TAREAS (CALIFICACIÓN POR NOTA O PORCENTAJE + BORRADO)
         ======================================================== */}
      {activeTab === 'TAREAS' && (
        <div className="glass-panel" style={{ padding: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
            <div>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 800 }}>Registro de Tareas</h3>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                Tope máximo del rubro: <strong>{tareasMaxWeight}%</strong>
              </p>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
              {/* Selector de modo de ingreso: Nota vs Porcentaje */}
              <div style={{
                display: 'flex',
                background: 'var(--bg-surface)',
                borderRadius: '8px',
                padding: '3px',
                border: '1px solid var(--border-subtle)'
              }}>
                <button
                  onClick={() => setScoringInputMode('POINTS')}
                  className={`btn btn-sm ${scoringInputMode === 'POINTS' ? 'btn-primary' : 'btn-secondary'}`}
                  style={{ fontSize: '0.75rem', padding: '4px 10px' }}
                >
                  <Hash size={13} />
                  Ingresar por Nota (0-100 / Pts)
                </button>
                <button
                  onClick={() => setScoringInputMode('PERCENTAGE')}
                  className={`btn btn-sm ${scoringInputMode === 'PERCENTAGE' ? 'btn-primary' : 'btn-secondary'}`}
                  style={{ fontSize: '0.75rem', padding: '4px 10px' }}
                >
                  <Percent size={13} />
                  Ingresar por Porcentaje (%)
                </button>
              </div>

              {/* Barra de Porcentaje */}
              <div style={{
                padding: '6px 12px',
                borderRadius: '8px',
                background: tareasCurrentSum === tareasMaxWeight ? 'rgba(16, 185, 129, 0.1)' : 'rgba(245, 158, 11, 0.1)',
                border: `1px solid ${tareasCurrentSum === tareasMaxWeight ? 'rgba(16, 185, 129, 0.3)' : 'rgba(245, 158, 11, 0.3)'}`,
                fontSize: '0.82rem',
                fontWeight: 700,
                color: tareasCurrentSum === tareasMaxWeight ? '#10b981' : '#d97706'
              }}>
                Asignado: {tareasCurrentSum}% / {tareasMaxWeight}% (Disponible: {(tareasMaxWeight - tareasCurrentSum).toFixed(1)}%)
              </div>

              <button
                onClick={() => {
                  setNewItemTitle(`Tarea ${(config.taskDefinitions || []).length + 1}`);
                  setNewItemPercentage(Math.max(1, tareasMaxWeight - tareasCurrentSum));
                  setNewItemTotalPoints(100);
                  setShowAddItemModal('TAREA');
                }}
                disabled={tareasCurrentSum >= tareasMaxWeight}
                className="btn btn-primary btn-sm"
              >
                <Plus size={15} />
                + Nueva Tarea
              </button>
            </div>
          </div>

          {(config.taskDefinitions || []).length === 0 ? (
            <div style={{ textAlign: 'center', padding: '48px', color: 'var(--text-muted)', background: 'var(--bg-surface)', borderRadius: '12px', border: '1px dashed var(--border-subtle)' }}>
              <CheckSquare size={32} style={{ margin: '0 auto 8px', opacity: 0.5 }} />
              <div style={{ fontWeight: 700 }}>No hay tareas registradas</div>
              <div style={{ fontSize: '0.85rem', marginTop: '4px' }}>Tienes los {tareasMaxWeight}% del rubro disponibles. Haz clic en "+ Nueva Tarea" para crear una.</div>
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
                <thead style={{ background: 'var(--bg-surface)', borderBottom: '2px solid var(--border-subtle)' }}>
                  <tr>
                    <th style={{ padding: '10px 14px' }}>#</th>
                    <th style={{ padding: '10px 14px', minWidth: '180px' }}>Estudiante</th>
                    {(config.taskDefinitions || []).map(t => (
                      <th key={t.id} style={{ padding: '10px', textAlign: 'center', minWidth: '130px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                          <span style={{ fontWeight: 700 }}>{t.title}</span>
                          <button
                            onClick={() => handleDeleteTask(t.id)}
                            style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '2px' }}
                            title="Eliminar esta tarea y liberar porcentaje"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                        <div style={{ fontSize: '0.72rem', color: '#6366f1', fontWeight: 800 }}>
                          Valor: {t.percentage}% • Base: {t.totalPoints || 100} pts
                        </div>
                      </th>
                    ))}
                    <th style={{ padding: '10px', textAlign: 'center', fontWeight: 800, color: '#4f46e5' }}>Total Tareas ({tareasMaxWeight}%)</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredList.map((item, idx) => (
                    <tr key={item.studentId} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                      <td style={{ padding: '10px 14px', color: 'var(--text-muted)' }}>{idx + 1}</td>
                      <td style={{ padding: '10px 14px', fontWeight: 700 }}>
                        {item.student.firstLastName} {item.student.firstName}
                      </td>

                      {(config.taskDefinitions || []).map(t => {
                        const tg = taskGrades.find(g => g.assignmentId === assignment.id && g.studentId === item.studentId && (g.taskId === t.id || g.taskNumber === t.number));
                        const pctVal = tg ? tg.percentageEarned : 0;
                        const totalPts = t.totalPoints || 100;
                        const ptsVal = tg && tg.pointsEarned !== undefined ? tg.pointsEarned : Number(((pctVal / t.percentage) * totalPts).toFixed(1));

                        return (
                          <td key={t.id} style={{ padding: '8px', textAlign: 'center' }}>
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '3px' }}>
                              {scoringInputMode === 'POINTS' ? (
                                <>
                                  <input
                                    type="number"
                                    step="0.5"
                                    max={totalPts}
                                    min={0}
                                    value={ptsVal}
                                    onChange={(e) => handleUpdateTaskByPointsOrPct(item.studentId, t, parseFloat(e.target.value) || 0, true)}
                                    style={{ width: '70px', padding: '4px', textAlign: 'center', borderRadius: '6px', border: '1px solid var(--border-subtle)', background: 'var(--bg-main)', color: 'var(--text-main)', fontWeight: 700 }}
                                  />
                                  <span style={{ fontSize: '0.7rem', color: '#6366f1', fontWeight: 700 }}>
                                    = {pctVal}% / {t.percentage}%
                                  </span>
                                </>
                              ) : (
                                <>
                                  <input
                                    type="number"
                                    step="0.1"
                                    max={t.percentage}
                                    min={0}
                                    value={pctVal}
                                    onChange={(e) => handleUpdateTaskByPointsOrPct(item.studentId, t, parseFloat(e.target.value) || 0, false)}
                                    style={{ width: '70px', padding: '4px', textAlign: 'center', borderRadius: '6px', border: '1px solid var(--border-subtle)', background: 'var(--bg-main)', color: 'var(--text-main)', fontWeight: 700 }}
                                  />
                                  <span style={{ fontSize: '0.7rem', color: '#10b981', fontWeight: 700 }}>
                                    Nota: {ptsVal} / {totalPts}
                                  </span>
                                </>
                              )}
                            </div>
                          </td>
                        );
                      })}

                      <td style={{ padding: '10px', textAlign: 'center', fontWeight: 800, fontFamily: 'var(--font-mono)', color: '#4f46e5' }}>
                        {item.tareasPts}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ========================================================
          TAB 6: EVALUACIONES (CALIFICACIÓN POR NOTA O PORCENTAJE + BORRADO)
         ======================================================== */}
      {activeTab === 'EVALUACIONES' && (
        <div className="glass-panel" style={{ padding: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
            <div>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 800 }}>Registro de Evaluaciones / Exámenes</h3>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                Tope asignado a Evaluaciones: <strong>{evaluacionesMaxWeight}%</strong>
              </p>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
              <div style={{
                display: 'flex',
                background: 'var(--bg-surface)',
                borderRadius: '8px',
                padding: '3px',
                border: '1px solid var(--border-subtle)'
              }}>
                <button
                  onClick={() => setScoringInputMode('POINTS')}
                  className={`btn btn-sm ${scoringInputMode === 'POINTS' ? 'btn-primary' : 'btn-secondary'}`}
                  style={{ fontSize: '0.75rem', padding: '4px 10px' }}
                >
                  <Hash size={13} />
                  Ingresar por Nota (0-100 / Pts)
                </button>
                <button
                  onClick={() => setScoringInputMode('PERCENTAGE')}
                  className={`btn btn-sm ${scoringInputMode === 'PERCENTAGE' ? 'btn-primary' : 'btn-secondary'}`}
                  style={{ fontSize: '0.75rem', padding: '4px 10px' }}
                >
                  <Percent size={13} />
                  Ingresar por Porcentaje (%)
                </button>
              </div>

              <div style={{
                padding: '6px 12px',
                borderRadius: '8px',
                background: evaluacionesCurrentSum === evaluacionesMaxWeight ? 'rgba(16, 185, 129, 0.1)' : 'rgba(245, 158, 11, 0.1)',
                border: `1px solid ${evaluacionesCurrentSum === evaluacionesMaxWeight ? 'rgba(16, 185, 129, 0.3)' : 'rgba(245, 158, 11, 0.3)'}`,
                fontSize: '0.82rem',
                fontWeight: 700,
                color: evaluacionesCurrentSum === evaluacionesMaxWeight ? '#10b981' : '#d97706'
              }}>
                Asignado: {evaluacionesCurrentSum}% / {evaluacionesMaxWeight}% (Disponible: {(evaluacionesMaxWeight - evaluacionesCurrentSum).toFixed(1)}%)
              </div>

              <button
                onClick={() => {
                  setNewItemTitle(`Evaluación ${(config.examDefinitions || []).length + 1}`);
                  setNewItemPercentage(Math.max(1, evaluacionesMaxWeight - evaluacionesCurrentSum));
                  setNewItemTotalPoints(100);
                  setShowAddItemModal('EVALUACION');
                }}
                disabled={evaluacionesCurrentSum >= evaluacionesMaxWeight}
                className="btn btn-primary btn-sm"
              >
                <Plus size={15} />
                + Nueva Evaluación
              </button>
            </div>
          </div>

          {(config.examDefinitions || []).length === 0 ? (
            <div style={{ textAlign: 'center', padding: '48px', color: 'var(--text-muted)', background: 'var(--bg-surface)', borderRadius: '12px', border: '1px dashed var(--border-subtle)' }}>
              <FileText size={32} style={{ margin: '0 auto 8px', opacity: 0.5 }} />
              <div style={{ fontWeight: 700 }}>No hay evaluaciones registradas</div>
              <div style={{ fontSize: '0.85rem', marginTop: '4px' }}>Tienes los {evaluacionesMaxWeight}% del rubro disponibles. Haz clic en "+ Nueva Evaluación" para crear una.</div>
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
                <thead style={{ background: 'var(--bg-surface)', borderBottom: '2px solid var(--border-subtle)' }}>
                  <tr>
                    <th style={{ padding: '10px 14px' }}>#</th>
                    <th style={{ padding: '10px 14px', minWidth: '180px' }}>Estudiante</th>
                    {(config.examDefinitions || []).map(e => (
                      <th key={e.id} style={{ padding: '10px', textAlign: 'center', minWidth: '140px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                          <span style={{ fontWeight: 700 }}>{e.title}</span>
                          <button
                            onClick={() => handleDeleteExam(e.id)}
                            style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '2px' }}
                            title="Eliminar esta evaluación y liberar porcentaje"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                        <div style={{ fontSize: '0.72rem', color: '#6366f1', fontWeight: 800 }}>
                          Valor: {e.percentage}% • Base: {e.totalPoints || 100} pts
                        </div>
                      </th>
                    ))}
                    <th style={{ padding: '10px', textAlign: 'center', fontWeight: 800, color: '#4f46e5' }}>Total Evaluaciones ({evaluacionesMaxWeight}%)</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredList.map((item, idx) => (
                    <tr key={item.studentId} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                      <td style={{ padding: '10px 14px', color: 'var(--text-muted)' }}>{idx + 1}</td>
                      <td style={{ padding: '10px 14px', fontWeight: 700 }}>
                        {item.student.firstLastName} {item.student.firstName}
                      </td>

                      {(config.examDefinitions || []).map(e => {
                        const eg = examGrades.find(g => g.assignmentId === assignment.id && g.studentId === item.studentId && (g.examId === e.id || g.examNumber === e.number));
                        const pctVal = eg ? eg.percentageEarned : 0;
                        const totalPts = e.totalPoints || 100;
                        const ptsVal = eg && eg.pointsEarned !== undefined ? eg.pointsEarned : Number(((pctVal / e.percentage) * totalPts).toFixed(1));

                        return (
                          <td key={e.id} style={{ padding: '8px', textAlign: 'center' }}>
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '3px' }}>
                              {scoringInputMode === 'POINTS' ? (
                                <>
                                  <input
                                    type="number"
                                    step="0.5"
                                    max={totalPts}
                                    min={0}
                                    value={ptsVal}
                                    onChange={(ev) => handleUpdateExamByPointsOrPct(item.studentId, e, parseFloat(ev.target.value) || 0, true)}
                                    style={{ width: '75px', padding: '4px', textAlign: 'center', borderRadius: '6px', border: '1px solid var(--border-subtle)', background: 'var(--bg-main)', color: 'var(--text-main)', fontWeight: 700 }}
                                  />
                                  <span style={{ fontSize: '0.7rem', color: '#6366f1', fontWeight: 700 }}>
                                    = {pctVal}% / {e.percentage}%
                                  </span>
                                </>
                              ) : (
                                <>
                                  <input
                                    type="number"
                                    step="0.1"
                                    max={e.percentage}
                                    min={0}
                                    value={pctVal}
                                    onChange={(ev) => handleUpdateExamByPointsOrPct(item.studentId, e, parseFloat(ev.target.value) || 0, false)}
                                    style={{ width: '75px', padding: '4px', textAlign: 'center', borderRadius: '6px', border: '1px solid var(--border-subtle)', background: 'var(--bg-main)', color: 'var(--text-main)', fontWeight: 700 }}
                                  />
                                  <span style={{ fontSize: '0.7rem', color: '#10b981', fontWeight: 700 }}>
                                    Nota: {ptsVal} / {totalPts}
                                  </span>
                                </>
                              )}
                            </div>
                          </td>
                        );
                      })}

                      <td style={{ padding: '10px', textAlign: 'center', fontWeight: 800, fontFamily: 'var(--font-mono)', color: '#4f46e5' }}>
                        {item.evaluacionesPts}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ========================================================
          TAB 7: PROYECTOS (CALIFICACIÓN BIDIRECCIONAL + BORRADO)
         ======================================================== */}
      {activeTab === 'PROYECTOS' && (
        <div className="glass-panel" style={{ padding: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
            <div>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 800 }}>Registro de Proyectos</h3>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                Tope asignado a Proyectos: <strong>{proyectosMaxWeight}%</strong>
              </p>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
              <div style={{
                padding: '6px 12px',
                borderRadius: '8px',
                background: proyectosCurrentSum === proyectosMaxWeight ? 'rgba(16, 185, 129, 0.1)' : 'rgba(245, 158, 11, 0.1)',
                border: `1px solid ${proyectosCurrentSum === proyectosMaxWeight ? 'rgba(16, 185, 129, 0.3)' : 'rgba(245, 158, 11, 0.3)'}`,
                fontSize: '0.82rem',
                fontWeight: 700,
                color: proyectosCurrentSum === proyectosMaxWeight ? '#10b981' : '#d97706'
              }}>
                Asignado: {proyectosCurrentSum}% / {proyectosMaxWeight}%
              </div>

              <button
                onClick={() => {
                  setNewItemTitle(`Proyecto ${(config.projectDefinitions || []).length + 1}`);
                  setNewItemPercentage(Math.max(1, proyectosMaxWeight - proyectosCurrentSum));
                  setNewItemTotalPoints(100);
                  setShowAddItemModal('PROYECTO');
                }}
                disabled={proyectosCurrentSum >= proyectosMaxWeight}
                className="btn btn-primary btn-sm"
              >
                <Plus size={15} />
                + Nuevo Proyecto / Etapa
              </button>
            </div>
          </div>

          {(config.projectDefinitions || []).length === 0 ? (
            <div style={{ textAlign: 'center', padding: '48px', color: 'var(--text-muted)', background: 'var(--bg-surface)', borderRadius: '12px', border: '1px dashed var(--border-subtle)' }}>
              <FolderGit2 size={32} style={{ margin: '0 auto 8px', opacity: 0.5 }} />
              <div style={{ fontWeight: 700 }}>No hay proyectos registrados</div>
              <div style={{ fontSize: '0.85rem', marginTop: '4px' }}>Tienes los {proyectosMaxWeight}% del rubro disponibles.</div>
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
                <thead style={{ background: 'var(--bg-surface)', borderBottom: '2px solid var(--border-subtle)' }}>
                  <tr>
                    <th style={{ padding: '10px 14px' }}>#</th>
                    <th style={{ padding: '10px 14px', minWidth: '180px' }}>Estudiante</th>
                    {(config.projectDefinitions || []).map(p => (
                      <th key={p.id} style={{ padding: '10px', textAlign: 'center', minWidth: '140px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                          <span style={{ fontWeight: 700 }}>{p.title}</span>
                          <button
                            onClick={() => handleDeleteProject(p.id)}
                            style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '2px' }}
                            title="Eliminar este proyecto y liberar porcentaje"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                        <div style={{ fontSize: '0.72rem', color: '#6366f1', fontWeight: 800 }}>Valor: {p.percentage}% • Base: {p.totalPoints || 100} pts</div>
                      </th>
                    ))}
                    <th style={{ padding: '10px', textAlign: 'center', fontWeight: 800, color: '#4f46e5' }}>Total Proyectos ({proyectosMaxWeight}%)</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredList.map((item, idx) => (
                    <tr key={item.studentId} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                      <td style={{ padding: '10px 14px', color: 'var(--text-muted)' }}>{idx + 1}</td>
                      <td style={{ padding: '10px 14px', fontWeight: 700 }}>
                        {item.student.firstLastName} {item.student.firstName}
                      </td>

                      {(config.projectDefinitions || []).map(p => {
                        const pg = projectGrades.find(g => g.assignmentId === assignment.id && g.studentId === item.studentId && (g.projectId === p.id || g.projectNumber === p.number));
                        const pctVal = pg ? pg.percentageEarned : 0;
                        const totalPts = p.totalPoints || 100;
                        const ptsVal = pg && pg.pointsEarned !== undefined ? pg.pointsEarned : Number(((pctVal / p.percentage) * totalPts).toFixed(1));

                        return (
                          <td key={p.id} style={{ padding: '8px', textAlign: 'center' }}>
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '3px' }}>
                              {scoringInputMode === 'POINTS' ? (
                                <>
                                  <input
                                    type="number"
                                    step="0.5"
                                    max={totalPts}
                                    min={0}
                                    value={ptsVal}
                                    onChange={(ev) => handleUpdateProjectByPointsOrPct(item.studentId, p, parseFloat(ev.target.value) || 0, true)}
                                    style={{ width: '75px', padding: '4px', textAlign: 'center', borderRadius: '6px', border: '1px solid var(--border-subtle)', background: 'var(--bg-main)', color: 'var(--text-main)', fontWeight: 700 }}
                                  />
                                  <span style={{ fontSize: '0.7rem', color: '#6366f1', fontWeight: 700 }}>
                                    = {pctVal}% / {p.percentage}%
                                  </span>
                                </>
                              ) : (
                                <>
                                  <input
                                    type="number"
                                    step="0.1"
                                    max={p.percentage}
                                    min={0}
                                    value={pctVal}
                                    onChange={(ev) => handleUpdateProjectByPointsOrPct(item.studentId, p, parseFloat(ev.target.value) || 0, false)}
                                    style={{ width: '75px', padding: '4px', textAlign: 'center', borderRadius: '6px', border: '1px solid var(--border-subtle)', background: 'var(--bg-main)', color: 'var(--text-main)', fontWeight: 700 }}
                                  />
                                  <span style={{ fontSize: '0.7rem', color: '#10b981', fontWeight: 700 }}>
                                    Nota: {ptsVal} / {totalPts}
                                  </span>
                                </>
                              )}
                            </div>
                          </td>
                        );
                      })}

                      <td style={{ padding: '10px', textAlign: 'center', fontWeight: 800, fontFamily: 'var(--font-mono)', color: '#4f46e5' }}>
                        {item.proyectosPts}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ========================================================
          TAB 8: PORTAFOLIO
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
          TAB 9: EXPEDIENTE INDIVIDUAL POR ESTUDIANTE
         ======================================================== */}
      {activeTab === 'INDIVIDUAL' && selectedStudentComputed && (
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(280px, 320px) 1fr', gap: '20px' }}>
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

          <div className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
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
          </div>
        </div>
      )}

      {/* Modal para crear nueva fecha de clase */}
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
          <div className="glass-panel" style={{ width: '100%', maxWidth: '520px', padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 800 }}>
              + Registrar Nueva Fecha de Clase
            </h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              Se agregará la fecha con el número de lecciones y su indicador de planeamiento asociado.
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
                Indicador del Planeamiento que se Evaluará en Cotidiano:
              </label>
              <select
                value={newSessionIndicatorId}
                onChange={(e) => setNewSessionIndicatorId(e.target.value)}
                style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--border-subtle)', background: 'var(--bg-surface)', color: 'var(--text-main)', fontSize: '0.82rem' }}
              >
                {indicators.map(ind => (
                  <option key={ind.id} value={ind.id}>
                    {ind.code} ({ind.skillArea}): {ind.description.substring(0, 55)}...
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label style={{ fontSize: '0.8rem', fontWeight: 700, display: 'block', marginBottom: '6px' }}>
                Tema o Detalle Adicional (Opcional):
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

      {/* Modal para crear nuevo indicador (Habilidad/Área MANUAL) */}
      {showAddIndicatorModal && (
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
          <div className="glass-panel" style={{ width: '100%', maxWidth: '600px', padding: '24px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 800 }}>
              + Nuevo Indicador de Aprendizaje (Planeamiento)
            </h3>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '10px' }}>
              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: 700 }}>Código:</label>
                <input
                  type="text"
                  placeholder="IND-01, MAT-1..."
                  value={newIndCode}
                  onChange={(e) => setNewIndCode(e.target.value)}
                  style={{ width: '100%', padding: '6px 10px', borderRadius: '8px', border: '1px solid var(--border-subtle)', background: 'var(--bg-surface)', color: 'var(--text-main)' }}
                />
              </div>
              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: 700 }}>Habilidad / Área (Manual):</label>
                <input
                  type="text"
                  list="skillsList"
                  placeholder="Ej. Álgebra, Comprensión Lectora, Taller, Listening..."
                  value={newIndSkill}
                  onChange={(e) => setNewIndSkill(e.target.value)}
                  style={{ width: '100%', padding: '6px 10px', borderRadius: '8px', border: '1px solid var(--border-subtle)', background: 'var(--bg-surface)', color: 'var(--text-main)' }}
                />
                <datalist id="skillsList">
                  <option value="Comprensión Lectora" />
                  <option value="Expresión Escrita" />
                  <option value="Resolución de Problemas" />
                  <option value="Álgebra y Geometría" />
                  <option value="Indagación Científica" />
                  <option value="Procedimientos de Taller" />
                  <option value="Listening" />
                  <option value="Reading" />
                  <option value="Spoken Interaction" />
                  <option value="Writing" />
                </datalist>
              </div>
            </div>

            <div>
              <label style={{ fontSize: '0.75rem', fontWeight: 700 }}>Descripción del Aprendizaje Esperado:</label>
              <textarea
                rows={2}
                placeholder="Ej. Aplica fórmulas y procedimientos para la resolución de situaciones del entorno..."
                value={newIndDesc}
                onChange={(e) => setNewIndDesc(e.target.value)}
                style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', border: '1px solid var(--border-subtle)', background: 'var(--bg-surface)', color: 'var(--text-main)', fontSize: '0.85rem' }}
              />
            </div>

            <div>
              <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#dc2626' }}>Criterio Nivel Inicial (1 pt):</label>
              <input
                type="text"
                placeholder="Requiere apoyo sustancial..."
                value={newIndL1}
                onChange={(e) => setNewIndL1(e.target.value)}
                style={{ width: '100%', padding: '6px 10px', borderRadius: '8px', border: '1px solid var(--border-subtle)', background: 'var(--bg-surface)', color: 'var(--text-main)', fontSize: '0.82rem' }}
              />
            </div>

            <div>
              <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#d97706' }}>Criterio Nivel Intermedio (2 pts):</label>
              <input
                type="text"
                placeholder="Logra el objetivo con asistencia moderada..."
                value={newIndL2}
                onChange={(e) => setNewIndL2(e.target.value)}
                style={{ width: '100%', padding: '6px 10px', borderRadius: '8px', border: '1px solid var(--border-subtle)', background: 'var(--bg-surface)', color: 'var(--text-main)', fontSize: '0.82rem' }}
              />
            </div>

            <div>
              <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#16a34a' }}>Criterio Nivel Avanzado (3 pts):</label>
              <input
                type="text"
                placeholder="Domina el indicador con autonomía total..."
                value={newIndL3}
                onChange={(e) => setNewIndL3(e.target.value)}
                style={{ width: '100%', padding: '6px 10px', borderRadius: '8px', border: '1px solid var(--border-subtle)', background: 'var(--bg-surface)', color: 'var(--text-main)', fontSize: '0.82rem' }}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
              <button onClick={() => setShowAddIndicatorModal(false)} className="btn btn-secondary">
                Cancelar
              </button>
              <button onClick={handleCreateIndicator} className="btn btn-primary">
                Guardar Indicador
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal para agregar sub-ítem con Valor Porcentual Y Puntos Totales */}
      {showAddItemModal && (
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
              + Agregar {showAddItemModal === 'TAREA' ? 'Nueva Tarea' : showAddItemModal === 'EVALUACION' ? 'Nueva Evaluación' : 'Nuevo Proyecto'}
            </h3>

            <div style={{
              padding: '10px 14px',
              borderRadius: '8px',
              background: 'rgba(79, 70, 229, 0.1)',
              border: '1px solid rgba(79, 70, 229, 0.25)',
              fontSize: '0.8rem',
              color: 'var(--text-main)'
            }}>
              Tope máximo del rubro:{' '}
              <strong>
                {showAddItemModal === 'TAREA' ? tareasMaxWeight : showAddItemModal === 'EVALUACION' ? evaluacionesMaxWeight : proyectosMaxWeight}%
              </strong>
              {' '}• Disponible:{' '}
              <strong style={{ color: '#10b981' }}>
                {(showAddItemModal === 'TAREA' ? tareasMaxWeight - tareasCurrentSum : showAddItemModal === 'EVALUACION' ? evaluacionesMaxWeight - evaluacionesCurrentSum : proyectosMaxWeight - proyectosCurrentSum).toFixed(2)}%
              </strong>
            </div>

            <div>
              <label style={{ fontSize: '0.8rem', fontWeight: 700, display: 'block', marginBottom: '6px' }}>
                Nombre / Título:
              </label>
              <input
                type="text"
                placeholder="Ej. Tarea 3: Síntesis de lectura..."
                value={newItemTitle}
                onChange={(e) => setNewItemTitle(e.target.value)}
                style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--border-subtle)', background: 'var(--bg-surface)', color: 'var(--text-main)' }}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div>
                <label style={{ fontSize: '0.8rem', fontWeight: 700, display: 'block', marginBottom: '6px' }}>
                  Valor Porcentual (%):
                </label>
                <input
                  type="number"
                  step="0.5"
                  min="0.5"
                  max={showAddItemModal === 'TAREA' ? tareasMaxWeight - tareasCurrentSum : showAddItemModal === 'EVALUACION' ? evaluacionesMaxWeight - evaluacionesCurrentSum : proyectosMaxWeight - proyectosCurrentSum}
                  value={newItemPercentage}
                  onChange={(e) => setNewItemPercentage(parseFloat(e.target.value) || 0)}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--border-subtle)', background: 'var(--bg-surface)', color: 'var(--text-main)', fontWeight: 700 }}
                />
              </div>

              <div>
                <label style={{ fontSize: '0.8rem', fontWeight: 700, display: 'block', marginBottom: '6px' }}>
                  Puntos Totales / Base Nota:
                </label>
                <input
                  type="number"
                  step="1"
                  min="1"
                  value={newItemTotalPoints}
                  onChange={(e) => setNewItemTotalPoints(parseInt(e.target.value) || 100)}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--border-subtle)', background: 'var(--bg-surface)', color: 'var(--text-main)', fontWeight: 700 }}
                />
              </div>
            </div>

            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              Podrás calificar digitando la <strong>nota/puntos</strong> o digitando el <strong>porcentaje directo</strong>. El sistema convertirá el valor automáticamente.
            </p>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
              <button onClick={() => setShowAddItemModal(null)} className="btn btn-secondary">
                Cancelar
              </button>
              <button onClick={handleAddSubItem} className="btn btn-primary">
                Guardar y Habilitar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
