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
  Printer,
  AlertTriangle,
  Percent,
  Hash,
  Filter,
  FileDown,
  Calendar,
  Award,
  UserPlus
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
  RubricSubItemDef,
  AcademicPeriodConfig,
  RecoveryExamGrade
} from '../types';
import {
  computeMEPStudentGrades,
  computeAnnualConsolidatedStudent,
  type StudentCalculatedGrades,
  type AnnualConsolidatedStudent
} from '../utils/gradeCalculations';
import {
  exportGradebookToExcel,
  exportStudentDossierToExcel,
  exportAnnualConsolidatedToExcel
} from '../utils/excelExport';
import { db } from '../db';
import { PeriodDatesModal } from './PeriodDatesModal';
import { AddStudentModal } from './AddStudentModal';
import { ImportStudentsModal } from './ImportStudentsModal';



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
  | 'TAREAS'
  | 'EVALUACIONES'
  | 'PROYECTOS'
  | 'PORTAFOLIO'
  | 'INDICADORES'
  | 'INDIVIDUAL';

type DossierViewMode = 'ALL' | 'ASISTENCIA' | 'COTIDIANO' | 'TAREAS' | 'EVALUACIONES' | 'PROYECTOS';

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
  const [dossierMode, setDossierMode] = useState<DossierViewMode>('ALL');

  // Modo de ingreso: 'POINTS' (Nota / Puntos) o 'PERCENTAGE' (Porcentaje)
  const [scoringInputMode, setScoringInputMode] = useState<'POINTS' | 'PERCENTAGE'>('POINTS');

  // Modal Flotante Personalizado para Confirmar Eliminación (Sin usar confirm() nativo)
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  } | null>(null);

  // Modal para agregar una nueva sesión/clase
  const [showAddSessionModal, setShowAddSessionModal] = useState(false);
  const [newSessionDate, setNewSessionDate] = useState(new Date().toISOString().split('T')[0]);
  const [newSessionLessonsStr, setNewSessionLessonsStr] = useState('2');
  const [newSessionTopic, setNewSessionTopic] = useState('');
  const [newSessionIndicatorId, setNewSessionIndicatorId] = useState<string>(indicators[0]?.id || '');

  // Estudiante activo resaltado al calificar
  const [activeGradingStudentId, setActiveGradingStudentId] = useState<string | null>(null);

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

  // Modales de Estudiantes (Agregar Individual con Hacienda e Importar desde Excel)
  const [showAddStudentModal, setShowAddStudentModal] = useState(false);
  const [showImportStudentsModal, setShowImportStudentsModal] = useState(false);


  // Periodos Académicos y Detección Automática por Calendario
  const defaultPeriods: AcademicPeriodConfig[] = [
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
  ];

  const periodConfigs: AcademicPeriodConfig[] = (config.periods && config.periods.length >= 2)
    ? config.periods
    : defaultPeriods;

  // Carga automática del periodo según la fecha actual del sistema
  // Si la fecha actual supera el cierre del I Periodo, automáticamente carga el II Periodo.
  // Pero el docente siempre puede cambiar manualmente al I Periodo o a Consolidado Anual.
  const determineAutoPeriod = (): 'I_PERIODO' | 'II_PERIODO' => {
    const today = new Date().toISOString().split('T')[0];
    const p1 = periodConfigs.find(p => p.periodId === 'I_PERIODO');
    const p2 = periodConfigs.find(p => p.periodId === 'II_PERIODO');
    if (p1?.endDate && today > p1.endDate) {
      return 'II_PERIODO';
    }
    if (p2?.startDate && today >= p2.startDate) {
      return 'II_PERIODO';
    }
    return 'I_PERIODO';
  };

  const [selectedPeriod, setSelectedPeriod] = useState<'I_PERIODO' | 'II_PERIODO' | 'CONSOLIDADO_ANUAL'>(determineAutoPeriod);
  const [showPeriodDatesModal, setShowPeriodDatesModal] = useState(false);

  // Periodo activo para ingresar notas / clases
  const currentPeriodId: 'I_PERIODO' | 'II_PERIODO' = selectedPeriod === 'CONSOLIDADO_ANUAL' ? 'II_PERIODO' : selectedPeriod;

  // Filtrar registros correspondientes al periodo seleccionado
  const activeSessions = sessions.filter(s => (s.periodId || 'I_PERIODO') === currentPeriodId);
  const activeTaskGrades = taskGrades.filter(tg => (tg.periodId || 'I_PERIODO') === currentPeriodId);
  const activeExamGrades = examGrades.filter(eg => (eg.periodId || 'I_PERIODO') === currentPeriodId);
  const activeProjectGrades = projectGrades.filter(pg => (pg.periodId || 'I_PERIODO') === currentPeriodId);
  const activePortfolioGrades = portfolioGrades.filter(pfg => (pfg.periodId || 'I_PERIODO') === currentPeriodId);

  // Calcular todas las notas del periodo seleccionado con la fórmula oficial del MEP
  const calculatedStudents: StudentCalculatedGrades[] = students.map(st =>
    computeMEPStudentGrades(
      st,
      config,
      activeSessions,
      sessionDetails,
      activeTaskGrades,
      activeExamGrades,
      activeProjectGrades,
      activePortfolioGrades
    )
  );

  // Calcular notas de I Periodo para consolidado anual
  const p1Students = students.map(st =>
    computeMEPStudentGrades(
      st,
      config,
      sessions.filter(s => (s.periodId || 'I_PERIODO') === 'I_PERIODO'),
      sessionDetails,
      taskGrades.filter(tg => (tg.periodId || 'I_PERIODO') === 'I_PERIODO'),
      examGrades.filter(eg => (eg.periodId || 'I_PERIODO') === 'I_PERIODO'),
      projectGrades.filter(pg => (pg.periodId || 'I_PERIODO') === 'I_PERIODO'),
      portfolioGrades.filter(pfg => (pfg.periodId || 'I_PERIODO') === 'I_PERIODO')
    )
  );

  // Calcular notas de II Periodo para consolidado anual
  const p2Students = students.map(st =>
    computeMEPStudentGrades(
      st,
      config,
      sessions.filter(s => s.periodId === 'II_PERIODO'),
      sessionDetails,
      taskGrades.filter(tg => tg.periodId === 'II_PERIODO'),
      examGrades.filter(eg => eg.periodId === 'II_PERIODO'),
      projectGrades.filter(pg => pg.periodId === 'II_PERIODO'),
      portfolioGrades.filter(pfg => pfg.periodId === 'II_PERIODO')
    )
  );

  const p1Weight = periodConfigs.find(p => p.periodId === 'I_PERIODO')?.weightPercentage || 50;
  const p2Weight = periodConfigs.find(p => p.periodId === 'II_PERIODO')?.weightPercentage || 50;

  // Consolidado Anual con Convocatorias (MEP)
  const annualConsolidatedStudents: AnnualConsolidatedStudent[] = students.map(st => {
    const g1 = p1Students.find(p => p.studentId === st.id)!;
    const g2 = p2Students.find(p => p.studentId === st.id)!;
    const rec = (config.recoveryGrades || []).find(r => r.studentId === st.id);

    return computeAnnualConsolidatedStudent(
      st,
      g1,
      g2,
      config.passingGrade || 70,
      p1Weight,
      p2Weight,
      rec?.convocatoria1,
      rec?.convocatoria2
    );
  });

  const filteredList = calculatedStudents.filter(c => {
    const full = `${c.student.firstLastName} ${c.student.secondLastName} ${c.student.firstName} ${c.student.idNumber}`.toLowerCase();
    return full.includes(searchTerm.toLowerCase());
  });

  const filteredAnnualList = annualConsolidatedStudents.filter(a => {
    const full = `${a.student.firstLastName} ${a.student.secondLastName} ${a.student.firstName} ${a.student.idNumber}`.toLowerCase();
    return full.includes(searchTerm.toLowerCase());
  });

  const passingCount = calculatedStudents.filter(c => c.condicion === 'Aprobado').length;
  const failingCount = calculatedStudents.length - passingCount;
  const avgGrade = (calculatedStudents.reduce((acc, curr) => acc + curr.notaFinal, 0) / (calculatedStudents.length || 1)).toFixed(1);
  const totalLessons = activeSessions.reduce((acc, s) => acc + (Number(s.lessonsCount) || 0), 0);

  // Estadísticas del Consolidado Anual
  const annualPassingCount = annualConsolidatedStudents.filter(a => a.finalCondition.includes('Aprobado')).length;
  const annualFailingCount = annualConsolidatedStudents.length - annualPassingCount;
  const annualInRecoveryCount = annualConsolidatedStudents.filter(a => a.annualCondition === 'Aplazado').length;
  const annualAvgGrade = (annualConsolidatedStudents.reduce((acc, curr) => acc + curr.annualAverage, 0) / (annualConsolidatedStudents.length || 1)).toFixed(1);

  // Rubro caps y sumas actuales
  const tareasMaxWeight = config.rubrics.find(r => r.key === 'tareas')?.percentage || 10;
  const tareasCurrentSum = (config.taskDefinitions || []).reduce((acc, t) => acc + Number(t.percentage), 0);

  const evaluacionesMaxWeight = config.rubrics.find(r => r.key === 'evaluaciones')?.percentage || 45;
  const evaluacionesCurrentSum = (config.examDefinitions || []).reduce((acc, e) => acc + Number(e.percentage), 0);

  const proyectosMaxWeight = config.rubrics.find(r => r.key === 'proyectos')?.percentage || 15;
  const proyectosCurrentSum = (config.projectDefinitions || []).reduce((acc, p) => acc + Number(p.percentage), 0);

  // Registrar nueva clase/lección en el periodo activo
  const handleCreateSession = async () => {
    const newSession: ClassSession = {
      id: `sess-${Date.now()}`,
      assignmentId: assignment.id,
      periodId: currentPeriodId,
      date: newSessionDate,
      lessonsCount: Math.max(1, parseInt(newSessionLessonsStr) || 2),
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

  // Eliminar un indicador con modal personalizado
  const handleDeleteIndicator = (indId: string) => {
    setConfirmModal({
      isOpen: true,
      title: 'Eliminar Indicador del Planeamiento',
      message: '¿Estás seguro de que deseas eliminar este indicador de aprendizaje? Las clases existentes conservarán sus registros.',
      onConfirm: async () => {
        await db.indicators.delete(indId);
        setConfirmModal(null);
        onDataChanged();
      }
    });
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

  // ELIMINAR SUB-ÍTEMS CON MODAL FLOTANTE PERSONALIZADO
  const handleDeleteTask = (taskId: string, taskTitle: string) => {
    setConfirmModal({
      isOpen: true,
      title: `Eliminar ${taskTitle}`,
      message: `¿Estás seguro de que deseas eliminar esta tarea? Se liberará su porcentaje (${config.taskDefinitions.find(t => t.id === taskId)?.percentage}%) y se removerán las notas asignadas a los alumnos.`,
      onConfirm: async () => {
        const updatedTasks = (config.taskDefinitions || []).filter(t => t.id !== taskId);
        await db.evaluationConfigs.put({ ...config, taskDefinitions: updatedTasks });
        const gradesToDelete = await db.taskGrades.where('assignmentId').equals(assignment.id).filter(t => t.taskId === taskId).toArray();
        if (gradesToDelete.length > 0) {
          await db.taskGrades.bulkDelete(gradesToDelete.map(g => g.id));
        }
        setConfirmModal(null);
        onDataChanged();
      }
    });
  };

  const handleDeleteExam = (examId: string, examTitle: string) => {
    setConfirmModal({
      isOpen: true,
      title: `Eliminar ${examTitle}`,
      message: `¿Estás seguro de que deseas eliminar esta evaluación? Se liberará su porcentaje y se borrarán las notas asociadas.`,
      onConfirm: async () => {
        const updatedExams = (config.examDefinitions || []).filter(e => e.id !== examId);
        await db.evaluationConfigs.put({ ...config, examDefinitions: updatedExams });
        const gradesToDelete = await db.examGrades.where('assignmentId').equals(assignment.id).filter(e => e.examId === examId).toArray();
        if (gradesToDelete.length > 0) {
          await db.examGrades.bulkDelete(gradesToDelete.map(g => g.id));
        }
        setConfirmModal(null);
        onDataChanged();
      }
    });
  };

  const handleDeleteProject = (projectId: string, projectTitle: string) => {
    setConfirmModal({
      isOpen: true,
      title: `Eliminar ${projectTitle}`,
      message: `¿Estás seguro de que deseas eliminar este proyecto? Se liberará su porcentaje.`,
      onConfirm: async () => {
        const updated = (config.projectDefinitions || []).filter(p => p.id !== projectId);
        await db.evaluationConfigs.put({ ...config, projectDefinitions: updated });
        const gradesToDelete = await db.projectGrades.where('assignmentId').equals(assignment.id).filter(p => p.projectId === projectId).toArray();
        if (gradesToDelete.length > 0) {
          await db.projectGrades.bulkDelete(gradesToDelete.map(g => g.id));
        }
        setConfirmModal(null);
        onDataChanged();
      }
    });
  };

  // Conversión bidireccional Nota <-> Porcentaje
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

    const existing = taskGrades.find(g =>
      g.assignmentId === assignment.id &&
      g.studentId === studentId &&
      (g.taskId === tDef.id || g.taskNumber === tDef.number) &&
      (g.periodId || 'I_PERIODO') === currentPeriodId
    );
    if (existing) {
      await db.taskGrades.update(existing.id, { percentageEarned: finalPct, pointsEarned: finalPts, taskId: tDef.id });
    } else {
      await db.taskGrades.add({
        id: `tg-${studentId}-${tDef.id}-${currentPeriodId}`,
        assignmentId: assignment.id,
        studentId,
        periodId: currentPeriodId,
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

    const existing = examGrades.find(g =>
      g.assignmentId === assignment.id &&
      g.studentId === studentId &&
      (g.examId === eDef.id || g.examNumber === eDef.number) &&
      (g.periodId || 'I_PERIODO') === currentPeriodId
    );
    if (existing) {
      await db.examGrades.update(existing.id, { percentageEarned: finalPct, pointsEarned: finalPts, examId: eDef.id });
    } else {
      await db.examGrades.add({
        id: `eg-${studentId}-${eDef.id}-${currentPeriodId}`,
        assignmentId: assignment.id,
        studentId,
        periodId: currentPeriodId,
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

    const existing = projectGrades.find(g =>
      g.assignmentId === assignment.id &&
      g.studentId === studentId &&
      (g.projectId === pDef.id || g.projectNumber === pDef.number) &&
      (g.periodId || 'I_PERIODO') === currentPeriodId
    );
    if (existing) {
      await db.projectGrades.update(existing.id, { percentageEarned: finalPct, pointsEarned: finalPts, projectId: pDef.id });
    } else {
      await db.projectGrades.add({
        id: `pg-${studentId}-${pDef.id}-${currentPeriodId}`,
        assignmentId: assignment.id,
        studentId,
        periodId: currentPeriodId,
        projectId: pDef.id,
        projectNumber: pDef.number,
        percentageEarned: finalPct,
        pointsEarned: finalPts
      });
    }
    onDataChanged();
  };

  // Actualizar nota de Convocatoria (I Convocatoria y II Convocatoria)
  const handleUpdateConvocatoria = async (studentId: string, convNum: 1 | 2, val: number | undefined) => {
    const currentRecs = config.recoveryGrades || [];
    const existingIdx = currentRecs.findIndex(r => r.studentId === studentId);
    let updatedRecs: RecoveryExamGrade[];
    if (existingIdx >= 0) {
      updatedRecs = [...currentRecs];
      updatedRecs[existingIdx] = {
        ...updatedRecs[existingIdx],
        [convNum === 1 ? 'convocatoria1' : 'convocatoria2']: val
      };
    } else {
      updatedRecs = [
        ...currentRecs,
        {
          id: `rec-${assignment.id}-${studentId}`,
          assignmentId: assignment.id,
          studentId,
          [convNum === 1 ? 'convocatoria1' : 'convocatoria2']: val
        }
      ];
    }
    await db.evaluationConfigs.update(config.id, { recoveryGrades: updatedRecs });
    onDataChanged();
  };

  // Guardar fechas y ponderaciones de periodos
  const handleSavePeriodDates = async (updatedPeriods: AcademicPeriodConfig[]) => {
    await db.evaluationConfigs.update(config.id, { periods: updatedPeriods });
    onDataChanged();
  };

  // Exportar Consolidado Anual a Excel
  const handleExportAnnualExcel = () => {
    exportAnnualConsolidatedToExcel(
      institutionName,
      group.sectionCode,
      subject.name,
      teacherName,
      config.passingGrade || 70,
      p1Weight,
      p2Weight,
      annualConsolidatedStudents.map(a => ({
        studentId: a.studentId,
        idNumber: a.student.idNumber,
        fullName: `${a.student.firstLastName} ${a.student.secondLastName} ${a.student.firstName}`,
        period1Grade: a.period1Grade,
        period2Grade: a.period2Grade,
        annualAverage: a.annualAverage,
        annualCondition: a.annualCondition,
        convocatoria1: a.convocatoria1,
        convocatoria2: a.convocatoria2,
        finalCondition: a.finalCondition
      }))
    );
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

  const handleExportSingleStudentExcel = () => {
    if (!selectedStudentComputed) return;
    exportStudentDossierToExcel(
      institutionName,
      group.sectionCode,
      subject.name,
      teacherName,
      selectedStudentComputed,
      sessions,
      sessionDetails
    );
  };

  const isPortafolioEnabled = config.rubrics.some(r => r.key === 'portafolio' && r.enabled);
  const selectedStudentComputed = calculatedStudents.find(c => c.studentId === selectedStudentId);

  // Menú lateral ordenado según tus requerimientos
  const navMenuItems: { id: TabType; label: string; icon: React.ReactNode; badge?: string }[] = [
    { id: 'REGISTRO_GENERAL', label: 'Registro General', icon: <FileSpreadsheet size={16} /> },
    { id: 'ASISTENCIA', label: 'Asistencia', icon: <CalendarCheck size={16} color="#4f46e5" />, badge: `${config.rubrics.find(r => r.key === 'asistencia')?.percentage || 5}%` },
    { id: 'COTIDIANO', label: 'Trabajo Cotidiano', icon: <Target size={16} color="#06b6d4" />, badge: `${config.rubrics.find(r => r.key === 'cotidiano')?.percentage || 25}%` },
    { id: 'TAREAS', label: 'Tareas', icon: <CheckSquare size={16} />, badge: `${tareasMaxWeight}%` },
    { id: 'EVALUACIONES', label: 'Evaluaciones', icon: <FileText size={16} />, badge: `${evaluacionesMaxWeight}%` },
    { id: 'PROYECTOS', label: 'Proyectos', icon: <FolderGit2 size={16} />, badge: `${proyectosMaxWeight}%` },
    ...(isPortafolioEnabled ? [{ id: 'PORTAFOLIO' as TabType, label: 'Portafolio', icon: <FolderArchive size={16} />, badge: `${config.rubrics.find(r => r.key === 'portafolio')?.percentage}%` }] : []),
    { id: 'INDICADORES', label: 'Indicadores / Planeamiento', icon: <BookOpen size={16} color="#8b5cf6" />, badge: `${indicators.length}` },
    { id: 'INDIVIDUAL', label: 'Expediente Individual', icon: <UserCheck size={16} color="#06b6d4" /> }
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Top Header & Actions Bar */}
      {/* Top Header & Actions Bar */}
      <div className="glass-panel no-print" style={{
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
              {institutionName} • Docente: {teacherName} • Total Lecciones: <strong>{totalLessons} lecciones</strong> ({activeSessions.length} clases)
            </div>
          </div>
        </div>

        {/* SELECTOR DE PERIODOS CON BOTÓN DE FECHAS */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          background: 'var(--bg-main)',
          padding: '4px',
          borderRadius: '12px',
          border: '1px solid var(--border-subtle)',
          gap: '4px'
        }}>
          <button
            onClick={() => setSelectedPeriod('I_PERIODO')}
            style={{
              padding: '6px 14px',
              borderRadius: '8px',
              border: 'none',
              background: selectedPeriod === 'I_PERIODO' ? 'linear-gradient(135deg, #4f46e5 0%, #3730a3 100%)' : 'transparent',
              color: selectedPeriod === 'I_PERIODO' ? 'white' : 'var(--text-main)',
              fontWeight: selectedPeriod === 'I_PERIODO' ? 800 : 600,
              fontSize: '0.82rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              transition: 'all 0.2s ease'
            }}
          >
            I Periodo
            <span style={{
              fontSize: '0.7rem',
              opacity: selectedPeriod === 'I_PERIODO' ? 0.9 : 0.6
            }}>({p1Weight}%)</span>
          </button>

          <button
            onClick={() => setSelectedPeriod('II_PERIODO')}
            style={{
              padding: '6px 14px',
              borderRadius: '8px',
              border: 'none',
              background: selectedPeriod === 'II_PERIODO' ? 'linear-gradient(135deg, #4f46e5 0%, #3730a3 100%)' : 'transparent',
              color: selectedPeriod === 'II_PERIODO' ? 'white' : 'var(--text-main)',
              fontWeight: selectedPeriod === 'II_PERIODO' ? 800 : 600,
              fontSize: '0.82rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              transition: 'all 0.2s ease'
            }}
          >
            II Periodo
            <span style={{
              fontSize: '0.7rem',
              opacity: selectedPeriod === 'II_PERIODO' ? 0.9 : 0.6
            }}>({p2Weight}%)</span>
          </button>

          <button
            onClick={() => setSelectedPeriod('CONSOLIDADO_ANUAL')}
            style={{
              padding: '6px 14px',
              borderRadius: '8px',
              border: 'none',
              background: selectedPeriod === 'CONSOLIDADO_ANUAL' ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)' : 'transparent',
              color: selectedPeriod === 'CONSOLIDADO_ANUAL' ? 'white' : 'var(--text-main)',
              fontWeight: selectedPeriod === 'CONSOLIDADO_ANUAL' ? 800 : 600,
              fontSize: '0.82rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              transition: 'all 0.2s ease'
            }}
          >
            <Sparkles size={14} />
            Consolidado Anual
          </button>

          <div style={{ width: '1px', height: '20px', background: 'var(--border-subtle)', margin: '0 2px' }} />

          <button
            onClick={() => setShowPeriodDatesModal(true)}
            title="Configurar Fechas de Inicio y Finalización del Calendario Escolar"
            style={{
              padding: '6px 10px',
              borderRadius: '8px',
              border: '1px solid transparent',
              background: 'transparent',
              color: 'var(--text-muted)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '5px',
              fontSize: '0.78rem',
              fontWeight: 600
            }}
            onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--text-main)'; e.currentTarget.style.backgroundColor = 'var(--bg-surface)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--text-muted)'; e.currentTarget.style.backgroundColor = 'transparent'; }}
          >
            <Calendar size={14} color="#6366f1" />
            Fechas
          </button>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button onClick={onOpenRubricsConfig} className="btn btn-secondary btn-sm">
            <SlidersHorizontal size={14} color="#6366f1" />
            Configurar Rubros
          </button>
          {selectedPeriod === 'CONSOLIDADO_ANUAL' ? (
            <button onClick={handleExportAnnualExcel} className="btn btn-primary btn-sm" style={{ background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)' }}>
              <Download size={14} />
              Exportar Consolidado (.xlsx)
            </button>
          ) : (
            <button onClick={handleExportExcel} className="btn btn-primary btn-sm" style={{ background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)' }}>
              <Download size={14} />
              Exportar {selectedPeriod === 'I_PERIODO' ? 'I Per' : 'II Per'} (.xlsx)
            </button>
          )}
        </div>
      </div>

      {/* RENDERIZADO SEGÚN EL MODO: CONSOLIDADO ANUAL O MÓDULOS DE PERIODO */}
      {selectedPeriod === 'CONSOLIDADO_ANUAL' ? (
        <div className="glass-panel" style={{ overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          {/* Header del Consolidado Anual */}
          <div style={{
            padding: '16px 22px',
            background: 'var(--bg-surface)',
            borderBottom: '1px solid var(--border-subtle)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '14px'
          }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span className="badge" style={{ background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)', color: 'white', fontWeight: 800 }}>
                  Sábana Anual Oficial
                </span>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 800 }}>
                  Consolidado Anual de Calificaciones y Convocatorias (MEP)
                </h3>
              </div>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '3px' }}>
                Fórmula MEP: {p1Weight}% (I Periodo) + {p2Weight}% (II Periodo) = Promedio Anual (100%). Nota mínima de aprobación: <strong>{config.passingGrade} pts</strong>.
              </p>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Search size={15} color="#64748b" />
                <input
                  type="text"
                  placeholder="Buscar estudiante o cédula..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  style={{
                    padding: '7px 12px',
                    borderRadius: '8px',
                    border: '1px solid var(--border-subtle)',
                    background: 'var(--bg-main)',
                    color: 'var(--text-main)',
                    fontSize: '0.85rem',
                    outline: 'none',
                    width: '230px'
                  }}
                />
              </div>

              <button
                onClick={() => setShowAddStudentModal(true)}
                className="btn btn-secondary btn-sm"
                style={{ display: 'flex', alignItems: 'center', gap: '5px' }}
              >
                <UserPlus size={14} color="#4f46e5" />
                + Agregar Estudiante
              </button>
              <button
                onClick={() => setShowImportStudentsModal(true)}
                className="btn btn-secondary btn-sm"
                style={{ display: 'flex', alignItems: 'center', gap: '5px' }}
              >
                <FileSpreadsheet size={14} color="#10b981" />
                Importar Nómina (.xlsx)
              </button>
              <button
                onClick={handleExportAnnualExcel}
                className="btn btn-primary btn-sm"
                style={{ background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)' }}
              >
                <Download size={14} />
                Exportar Consolidado (.xlsx)
              </button>
            </div>
          </div>


          {/* Fila de Tarjetas Resumen de Rendimiento Anual */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
            gap: '12px',
            padding: '16px 22px',
            background: 'rgba(0,0,0,0.02)',
            borderBottom: '1px solid var(--border-subtle)'
          }}>
            <div className="card" style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ width: '38px', height: '38px', borderRadius: '10px', background: 'rgba(79, 70, 229, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#4f46e5' }}>
                <FileSpreadsheet size={20} />
              </div>
              <div>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>Total Alumnos</div>
                <div style={{ fontSize: '1.25rem', fontWeight: 800 }}>{students.length}</div>
              </div>
            </div>

            <div className="card" style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ width: '38px', height: '38px', borderRadius: '10px', background: 'rgba(16, 185, 129, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#10b981' }}>
                <CheckCircle size={20} />
              </div>
              <div>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>Aprobados Directos</div>
                <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#10b981' }}>
                  {annualConsolidatedStudents.filter(a => a.annualCondition === 'Aprobado').length}
                </div>
              </div>
            </div>

            <div className="card" style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ width: '38px', height: '38px', borderRadius: '10px', background: 'rgba(245, 158, 11, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#f59e0b' }}>
                <AlertTriangle size={20} />
              </div>
              <div>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>En Convocatoria</div>
                <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#f59e0b' }}>
                  {annualInRecoveryCount}
                </div>
              </div>
            </div>

            <div className="card" style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ width: '38px', height: '38px', borderRadius: '10px', background: 'rgba(5, 150, 105, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#059669' }}>
                <Award size={20} />
              </div>
              <div>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>Promovidos Convocatoria</div>
                <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#059669' }}>
                  {annualConsolidatedStudents.filter(a => a.finalCondition.includes('Convocatoria')).length}
                </div>
              </div>
            </div>

            <div className="card" style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ width: '38px', height: '38px', borderRadius: '10px', background: 'rgba(99, 102, 241, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#6366f1' }}>
                <Percent size={20} />
              </div>
              <div>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>Promedio Anual</div>
                <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#6366f1' }}>{annualAvgGrade}</div>
              </div>
            </div>
          </div>

          {/* Tabla Maestra del Consolidado Anual */}
          <div style={{ overflowX: 'auto', maxHeight: '72vh' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
              <thead style={{ position: 'sticky', top: 0, background: 'var(--bg-card)', zIndex: 10, borderBottom: '2px solid var(--border-subtle)' }}>
                <tr>
                  <th style={{ padding: '12px 14px', width: '35px', color: 'var(--text-muted)' }}>#</th>
                  <th style={{ padding: '12px 14px', color: 'var(--text-muted)' }}>Estudiante</th>
                  <th style={{ padding: '12px 14px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>Cédula</th>
                  <th style={{ padding: '12px 12px', textAlign: 'center' }}>
                    <div style={{ fontWeight: 700 }}>I Periodo</div>
                    <div style={{ fontSize: '0.72rem', color: '#4f46e5', fontWeight: 800 }}>{p1Weight}%</div>
                  </th>
                  <th style={{ padding: '12px 12px', textAlign: 'center' }}>
                    <div style={{ fontWeight: 700 }}>II Periodo</div>
                    <div style={{ fontSize: '0.72rem', color: '#4f46e5', fontWeight: 800 }}>{p2Weight}%</div>
                  </th>
                  <th style={{ padding: '12px 14px', textAlign: 'center', background: 'rgba(79, 70, 229, 0.08)' }}>
                    <div style={{ fontWeight: 800, color: '#4f46e5' }}>PROMEDIO ANUAL</div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>100%</div>
                  </th>
                  <th style={{ padding: '12px 12px', textAlign: 'center' }}>Condición Anual</th>
                  <th style={{ padding: '12px 12px', textAlign: 'center', background: 'rgba(245, 158, 11, 0.06)' }}>
                    <div style={{ fontWeight: 700, color: '#f59e0b' }}>1° Convocatoria</div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Pase: {config.passingGrade} pts</div>
                  </th>
                  <th style={{ padding: '12px 12px', textAlign: 'center', background: 'rgba(245, 158, 11, 0.06)' }}>
                    <div style={{ fontWeight: 700, color: '#f59e0b' }}>2° Convocatoria</div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Pase: {config.passingGrade} pts</div>
                  </th>
                  <th style={{ padding: '12px 14px', textAlign: 'center' }}>Condición Final</th>
                </tr>
              </thead>
              <tbody>
                {filteredAnnualList.map((item, idx) => {
                  const isAplazado = item.annualCondition === 'Aplazado';
                  const isConv1Failed = isAplazado && item.convocatoria1 !== undefined && item.convocatoria1 < (config.passingGrade || 70);

                  return (
                    <tr
                      key={item.studentId}
                      className={`grading-row ${activeGradingStudentId === item.studentId ? 'is-active-grading' : ''}`}
                      onMouseEnter={() => setActiveGradingStudentId(item.studentId)}
                      onClick={() => setActiveGradingStudentId(item.studentId)}
                      style={{ borderBottom: '1px solid var(--border-subtle)', cursor: 'pointer' }}
                    >
                      <td style={{ padding: '10px 14px', color: 'var(--text-muted)', fontWeight: 600 }}>{idx + 1}</td>
                      <td style={{ padding: '10px 14px', fontWeight: 700 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span>{item.student.firstLastName} {item.student.secondLastName} {item.student.firstName}</span>
                          {item.student.accommodation && item.student.accommodation !== 'NONE' && (
                            <span className="badge" style={{ fontSize: '0.68rem', padding: '1px 5px', background: 'rgba(139, 92, 246, 0.15)', color: '#8b5cf6' }}>
                              Adecuación
                            </span>
                          )}
                        </div>
                      </td>
                      <td style={{ padding: '10px 14px', fontFamily: 'var(--font-mono)', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                        {item.student.idNumber}
                      </td>

                      <td style={{ padding: '10px 12px', textAlign: 'center', fontFamily: 'var(--font-mono)', fontWeight: 700 }}>
                        {item.period1Grade}
                      </td>

                      <td style={{ padding: '10px 12px', textAlign: 'center', fontFamily: 'var(--font-mono)', fontWeight: 700 }}>
                        {item.period2Grade}
                      </td>

                      <td style={{
                        padding: '10px 14px',
                        textAlign: 'center',
                        fontWeight: 900,
                        fontSize: '0.95rem',
                        fontFamily: 'var(--font-mono)',
                        background: 'rgba(79, 70, 229, 0.05)',
                        color: item.annualAverage >= (config.passingGrade || 70) ? '#10b981' : '#ef4444'
                      }}>
                        {item.annualAverage}
                      </td>

                      <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                        <span className="badge" style={{
                          background: item.annualCondition === 'Aprobado' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(245, 158, 11, 0.15)',
                          color: item.annualCondition === 'Aprobado' ? '#10b981' : '#f59e0b',
                          fontWeight: 800,
                          fontSize: '0.78rem'
                        }}>
                          {item.annualCondition}
                        </span>
                      </td>

                      {/* 1° Convocatoria */}
                      <td style={{ padding: '8px 12px', textAlign: 'center', background: 'rgba(245, 158, 11, 0.03)' }}>
                        {isAplazado ? (
                          <input
                            type="number"
                            min="0"
                            max="100"
                            step="1"
                            placeholder="Nota..."
                            value={item.convocatoria1 !== undefined ? item.convocatoria1 : ''}
                            onChange={(e) => {
                              const val = e.target.value === '' ? undefined : parseFloat(e.target.value);
                              handleUpdateConvocatoria(item.studentId, 1, val);
                            }}
                            style={{
                              width: '70px',
                              padding: '5px 8px',
                              textAlign: 'center',
                              borderRadius: '6px',
                              border: '1px solid #f59e0b',
                              background: 'var(--bg-main)',
                              color: 'var(--text-main)',
                              fontWeight: 800,
                              fontFamily: 'var(--font-mono)',
                              fontSize: '0.85rem'
                            }}
                          />
                        ) : (
                          <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>-</span>
                        )}
                      </td>

                      {/* 2° Convocatoria */}
                      <td style={{ padding: '8px 12px', textAlign: 'center', background: 'rgba(245, 158, 11, 0.03)' }}>
                        {isConv1Failed ? (
                          <input
                            type="number"
                            min="0"
                            max="100"
                            step="1"
                            placeholder="Nota..."
                            value={item.convocatoria2 !== undefined ? item.convocatoria2 : ''}
                            onChange={(e) => {
                              const val = e.target.value === '' ? undefined : parseFloat(e.target.value);
                              handleUpdateConvocatoria(item.studentId, 2, val);
                            }}
                            style={{
                              width: '70px',
                              padding: '5px 8px',
                              textAlign: 'center',
                              borderRadius: '6px',
                              border: '1px solid #f59e0b',
                              background: 'var(--bg-main)',
                              color: 'var(--text-main)',
                              fontWeight: 800,
                              fontFamily: 'var(--font-mono)',
                              fontSize: '0.85rem'
                            }}
                          />
                        ) : (
                          <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>-</span>
                        )}
                      </td>

                      {/* Condición Final */}
                      <td style={{ padding: '10px 14px', textAlign: 'center' }}>
                        <span className="badge" style={{
                          background: item.finalCondition.includes('Aprobado')
                            ? 'rgba(16, 185, 129, 0.15)'
                            : item.finalCondition === 'Reprobado'
                            ? 'rgba(239, 68, 68, 0.15)'
                            : 'rgba(245, 158, 11, 0.15)',
                          color: item.finalCondition.includes('Aprobado')
                            ? '#10b981'
                            : item.finalCondition === 'Reprobado'
                            ? '#ef4444'
                            : '#f59e0b',
                          fontWeight: 800,
                          fontSize: '0.8rem'
                        }}>
                          {item.finalCondition}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* WORKSPACE LAYOUT: SIDEBAR IZQUIERDO + CONTENIDO DERECHO */
        <div style={{ display: 'grid', gridTemplateColumns: '220px 1fr', gap: '16px', alignItems: 'start' }}>

        {/* SIDEBAR LATERAL IZQUIERDO */}
        <aside className="glass-panel no-print workspace-sidebar" style={{
          padding: '10px',
          display: 'flex',
          flexDirection: 'column',
          gap: '6px',
          position: 'sticky',
          top: '80px'
        }}>
          <div style={{ padding: '8px 12px 10px', borderBottom: '1px solid var(--border-subtle)', marginBottom: '4px' }}>
            <div style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Módulos de Calificación
            </div>
          </div>

          {navMenuItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '10px 14px',
                borderRadius: '10px',
                border: '1px solid transparent',
                background: activeTab === item.id ? 'var(--primary-gradient)' : 'transparent',
                color: activeTab === item.id ? 'white' : 'var(--text-main)',
                fontWeight: activeTab === item.id ? 700 : 600,
                fontSize: '0.85rem',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                fontFamily: 'inherit',
                textAlign: 'left'
              }}
              onMouseEnter={(e) => {
                if (activeTab !== item.id) e.currentTarget.style.backgroundColor = 'var(--bg-surface)';
              }}
              onMouseLeave={(e) => {
                if (activeTab !== item.id) e.currentTarget.style.backgroundColor = 'transparent';
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                {item.icon}
                <span>{item.label}</span>
              </div>

              {item.badge && (
                <span style={{
                  fontSize: '0.72rem',
                  padding: '2px 6px',
                  borderRadius: '6px',
                  background: activeTab === item.id ? 'rgba(255, 255, 255, 0.25)' : 'var(--bg-surface)',
                  color: activeTab === item.id ? 'white' : 'var(--text-muted)',
                  fontWeight: 700
                }}>
                  {item.badge}
                </span>
              )}
            </button>
          ))}
        </aside>

        {/* CONTENIDO PRINCIPAL DERECHO */}
        <div style={{ minWidth: 0 }}>
          {/* ========================================================
              TAB 1: REGISTRO GENERAL DE CALIFICACIONES
             ======================================================== */}
          {activeTab === 'REGISTRO_GENERAL' && (
            <div className="glass-panel" style={{ overflow: 'hidden' }}>
              <div style={{
                padding: '14px 20px',
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
                      width: '220px'
                    }}
                  />
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <button
                    onClick={() => setShowAddStudentModal(true)}
                    className="btn btn-primary"
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      fontSize: '0.82rem',
                      padding: '6px 14px'
                    }}
                    title="Agregar estudiante nuevo con autocompletado de Hacienda o registro manual"
                  >
                    <UserPlus size={15} />
                    <span>+ Estudiante</span>
                  </button>

                  <button
                    onClick={() => setShowImportStudentsModal(true)}
                    className="btn btn-secondary"
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      fontSize: '0.82rem',
                      padding: '6px 14px'
                    }}
                    title="Cargar lista de estudiantes desde archivo Excel (.xlsx / .xls)"
                  >
                    <FileSpreadsheet size={15} color="#16a34a" />
                    <span>Importar Nómina Excel</span>
                  </button>
                </div>

                <div style={{ display: 'flex', gap: '14px', alignItems: 'center', fontSize: '0.82rem' }}>
                  <span>Pase: <strong style={{ color: '#4f46e5' }}>{config.passingGrade} pts</strong></span>
                  <span>Promedio: <strong>{avgGrade}</strong></span>
                  <span style={{ color: '#16a34a', fontWeight: 700 }}>● {passingCount} Aprobados</span>
                  {failingCount > 0 && <span style={{ color: '#dc2626', fontWeight: 700 }}>● {failingCount} Aplazados</span>}
                </div>
              </div>

              <div style={{ overflowX: 'auto', maxHeight: '72vh' }}>
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
                        className={`grading-row ${activeGradingStudentId === item.studentId ? 'is-active-grading' : ''}`}
                        onMouseEnter={() => setActiveGradingStudentId(item.studentId)}
                        onClick={() => setActiveGradingStudentId(item.studentId)}
                        style={{ borderBottom: '1px solid var(--border-subtle)', cursor: 'pointer' }}
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
                padding: '14px 20px',
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
                    Columnas fijadas: desplázate horizontalmente para ver las fechas de clase sin perder el nombre.
                  </p>
                </div>

                <button onClick={() => setShowAddSessionModal(true)} className="btn btn-primary btn-sm">
                  <Plus size={15} />
                  + Registrar Fecha / Clase
                </button>
              </div>

              <div style={{ overflowX: 'auto', maxHeight: '72vh', position: 'relative' }}>
                <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: 0, textAlign: 'left', fontSize: '0.82rem' }}>
                  <thead style={{ position: 'sticky', top: 0, zIndex: 20 }}>
                    <tr>
                      <th style={{
                        position: 'sticky',
                        left: 0,
                        zIndex: 25,
                        background: 'var(--bg-card)',
                        padding: '12px 8px',
                        width: '35px',
                        borderBottom: '2px solid var(--border-subtle)',
                        borderRight: '1px solid var(--border-subtle)'
                      }}>#</th>

                      <th style={{
                        position: 'sticky',
                        left: '35px',
                        zIndex: 25,
                        background: 'var(--bg-card)',
                        padding: '12px 10px',
                        minWidth: '175px',
                        borderBottom: '2px solid var(--border-subtle)'
                      }}>Estudiante</th>

                      <th style={{
                        position: 'sticky',
                        left: '210px',
                        zIndex: 25,
                        background: 'var(--bg-card)',
                        padding: '12px 8px',
                        width: '95px',
                        fontFamily: 'var(--font-mono)',
                        borderBottom: '2px solid var(--border-subtle)'
                      }}>Cédula</th>

                      <th style={{
                        position: 'sticky',
                        left: '305px',
                        zIndex: 25,
                        background: 'var(--bg-card)',
                        padding: '8px',
                        textAlign: 'center',
                        fontWeight: 800,
                        color: '#4f46e5',
                        width: '85px',
                        borderBottom: '2px solid var(--border-subtle)'
                      }}>
                        <div>% ASIS</div>
                        <div style={{ fontSize: '0.68rem' }}>{config.rubrics.find(r => r.key === 'asistencia')?.percentage || 5}%</div>
                      </th>

                      <th style={{
                        position: 'sticky',
                        left: '390px',
                        zIndex: 25,
                        background: 'rgba(239, 68, 68, 0.08)',
                        padding: '8px',
                        textAlign: 'center',
                        width: '45px',
                        borderBottom: '2px solid var(--border-subtle)',
                        color: '#dc2626',
                        fontWeight: 800
                      }}>AI</th>

                      <th style={{
                        position: 'sticky',
                        left: '435px',
                        zIndex: 25,
                        background: 'rgba(245, 158, 11, 0.08)',
                        padding: '8px',
                        textAlign: 'center',
                        width: '45px',
                        borderBottom: '2px solid var(--border-subtle)',
                        color: '#d97706',
                        fontWeight: 800
                      }}>ESC</th>

                      <th style={{
                        position: 'sticky',
                        left: '480px',
                        zIndex: 25,
                        background: 'rgba(99, 102, 241, 0.08)',
                        padding: '8px',
                        textAlign: 'center',
                        width: '45px',
                        borderBottom: '2px solid var(--border-subtle)',
                        color: '#4f46e5',
                        fontWeight: 800
                      }}>T</th>

                      <th style={{
                        position: 'sticky',
                        left: '525px',
                        zIndex: 25,
                        background: 'rgba(16, 185, 129, 0.08)',
                        padding: '8px',
                        textAlign: 'center',
                        width: '45px',
                        borderBottom: '2px solid var(--border-subtle)',
                        borderRight: '2px solid var(--border-focus)',
                        boxShadow: '4px 0 8px rgba(0,0,0,0.12)',
                        color: '#16a34a',
                        fontWeight: 800
                      }}>AJ</th>

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
                      <tr
                        key={item.studentId}
                        className={`grading-row ${activeGradingStudentId === item.studentId ? 'is-active-grading' : ''}`}
                        onMouseEnter={() => setActiveGradingStudentId(item.studentId)}
                        onClick={() => setActiveGradingStudentId(item.studentId)}
                      >
                        <td style={{
                          position: 'sticky',
                          left: 0,
                          zIndex: 15,
                          background: 'var(--bg-card)',
                          padding: '8px 10px',
                          color: 'var(--text-muted)',
                          borderBottom: '1px solid var(--border-subtle)',
                          borderRight: '1px solid var(--border-subtle)'
                        }}>{idx + 1}</td>

                        <td style={{
                          position: 'sticky',
                          left: '35px',
                          zIndex: 15,
                          background: 'var(--bg-card)',
                          padding: '8px 10px',
                          fontWeight: 700,
                          borderBottom: '1px solid var(--border-subtle)',
                          whiteSpace: 'nowrap'
                        }}>
                          {item.student.firstLastName} {item.student.secondLastName} {item.student.firstName}
                        </td>

                        <td style={{
                          position: 'sticky',
                          left: '210px',
                          zIndex: 15,
                          background: 'var(--bg-card)',
                          padding: '8px',
                          fontFamily: 'var(--font-mono)',
                          fontSize: '0.78rem',
                          color: 'var(--text-muted)',
                          borderBottom: '1px solid var(--border-subtle)'
                        }}>
                          {item.student.idNumber}
                        </td>

                        <td style={{
                          position: 'sticky',
                          left: '305px',
                          zIndex: 15,
                          background: 'var(--bg-card)',
                          padding: '8px',
                          textAlign: 'center',
                          fontWeight: 800,
                          fontFamily: 'var(--font-mono)',
                          color: '#4f46e5',
                          borderBottom: '1px solid var(--border-subtle)'
                        }}>
                          {item.asistenciaPts}%
                        </td>

                        <td style={{
                          position: 'sticky',
                          left: '390px',
                          zIndex: 15,
                          background: 'var(--bg-card)',
                          padding: '8px',
                          textAlign: 'center',
                          color: '#dc2626',
                          fontWeight: 700,
                          borderBottom: '1px solid var(--border-subtle)'
                        }}>{item.unexcusedAbsences}</td>

                        <td style={{
                          position: 'sticky',
                          left: '435px',
                          zIndex: 15,
                          background: 'var(--bg-card)',
                          padding: '8px',
                          textAlign: 'center',
                          color: '#d97706',
                          fontWeight: 700,
                          borderBottom: '1px solid var(--border-subtle)'
                        }}>{item.lessonEscapes}</td>

                        <td style={{
                          position: 'sticky',
                          left: '480px',
                          zIndex: 15,
                          background: 'var(--bg-card)',
                          padding: '8px',
                          textAlign: 'center',
                          color: '#4f46e5',
                          fontWeight: 700,
                          borderBottom: '1px solid var(--border-subtle)'
                        }}>{item.tardies}</td>

                        <td style={{
                          position: 'sticky',
                          left: '525px',
                          zIndex: 15,
                          background: 'var(--bg-card)',
                          padding: '8px',
                          textAlign: 'center',
                          color: '#16a34a',
                          fontWeight: 700,
                          borderBottom: '1px solid var(--border-subtle)',
                          borderRight: '2px solid var(--border-focus)',
                          boxShadow: '4px 0 8px rgba(0,0,0,0.12)'
                        }}>{item.excusedAbsences}</td>

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
                                onFocus={() => setActiveGradingStudentId(item.studentId)}
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
              TAB 3: TRABAJO COTIDIANO (LIGADO A INDICADORES)
             ======================================================== */}
          {activeTab === 'COTIDIANO' && (
            <div className="glass-panel" style={{ overflow: 'hidden' }}>
              <div style={{
                padding: '14px 20px',
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
                    Cada clase evalúa un indicador del planeamiento. Nivel 3 = 100%, Nivel 2 = 50%, Nivel 1 = 25%.
                  </p>
                </div>

                <button onClick={() => setShowAddSessionModal(true)} className="btn btn-primary btn-sm">
                  <Plus size={15} />
                  + Nueva Clase de Cotidiano
                </button>
              </div>

              <div style={{ overflowX: 'auto', maxHeight: '72vh' }}>
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
                      <tr
                        key={item.studentId}
                        className={`grading-row ${activeGradingStudentId === item.studentId ? 'is-active-grading' : ''}`}
                        onMouseEnter={() => setActiveGradingStudentId(item.studentId)}
                        onClick={() => setActiveGradingStudentId(item.studentId)}
                        style={{ borderBottom: '1px solid var(--border-subtle)' }}
                      >
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
                                onFocus={() => setActiveGradingStudentId(item.studentId)}
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
              TAB 4: TAREAS (CALIFICACIÓN NOTA O PORCENTAJE + BORRADO)
             ======================================================== */}
          {activeTab === 'TAREAS' && (
            <div className="glass-panel" style={{ padding: '24px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
                <div>
                  <h3 style={{ fontSize: '1.15rem', fontWeight: 800 }}>Registro de Tareas</h3>
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                    Tope asignado al rubro: <strong>{tareasMaxWeight}%</strong>
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
                      Por Nota (Pts)
                    </button>
                    <button
                      onClick={() => setScoringInputMode('PERCENTAGE')}
                      className={`btn btn-sm ${scoringInputMode === 'PERCENTAGE' ? 'btn-primary' : 'btn-secondary'}`}
                      style={{ fontSize: '0.75rem', padding: '4px 10px' }}
                    >
                      <Percent size={13} />
                      Por Porcentaje (%)
                    </button>
                  </div>

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
                                onClick={() => handleDeleteTask(t.id, t.title)}
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
                        <tr
                          key={item.studentId}
                          className={`grading-row ${activeGradingStudentId === item.studentId ? 'is-active-grading' : ''}`}
                          onMouseEnter={() => setActiveGradingStudentId(item.studentId)}
                          onClick={() => setActiveGradingStudentId(item.studentId)}
                          style={{ borderBottom: '1px solid var(--border-subtle)' }}
                        >
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
                                        onFocus={() => setActiveGradingStudentId(item.studentId)}
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
                                        onFocus={() => setActiveGradingStudentId(item.studentId)}
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
              TAB 5: EVALUACIONES (CALIFICACIÓN NOTA O PORCENTAJE + BORRADO)
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
                      Por Nota (Pts)
                    </button>
                    <button
                      onClick={() => setScoringInputMode('PERCENTAGE')}
                      className={`btn btn-sm ${scoringInputMode === 'PERCENTAGE' ? 'btn-primary' : 'btn-secondary'}`}
                      style={{ fontSize: '0.75rem', padding: '4px 10px' }}
                    >
                      <Percent size={13} />
                      Por Porcentaje (%)
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
                  <div style={{ fontSize: '0.85rem', marginTop: '4px' }}>Tienes los {evaluacionesMaxWeight}% disponibles. Haz clic en "+ Nueva Evaluación" para crear una.</div>
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
                                onClick={() => handleDeleteExam(e.id, e.title)}
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
                        <tr
                          key={item.studentId}
                          className={`grading-row ${activeGradingStudentId === item.studentId ? 'is-active-grading' : ''}`}
                          onMouseEnter={() => setActiveGradingStudentId(item.studentId)}
                          onClick={() => setActiveGradingStudentId(item.studentId)}
                          style={{ borderBottom: '1px solid var(--border-subtle)' }}
                        >
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
                                        onFocus={() => setActiveGradingStudentId(item.studentId)}
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
                                        onFocus={() => setActiveGradingStudentId(item.studentId)}
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
              TAB 6: PROYECTOS (CALIFICACIÓN BIDIRECCIONAL + BORRADO)
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
                    + Nuevo Proyecto
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
                                onClick={() => handleDeleteProject(p.id, p.title)}
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
                        <tr
                          key={item.studentId}
                          className={`grading-row ${activeGradingStudentId === item.studentId ? 'is-active-grading' : ''}`}
                          onMouseEnter={() => setActiveGradingStudentId(item.studentId)}
                          onClick={() => setActiveGradingStudentId(item.studentId)}
                          style={{ borderBottom: '1px solid var(--border-subtle)' }}
                        >
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
                                        onFocus={() => setActiveGradingStudentId(item.studentId)}
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
                                        onFocus={() => setActiveGradingStudentId(item.studentId)}
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
              TAB 7: PORTAFOLIO
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
              TAB 8: INDICADORES / PLANEAMIENTO (JUSTO ANTES DE EXPEDIENTE)
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
              TAB 9: EXPEDIENTE INDIVIDUAL CON REPORTE Y FILTRADO POR RUBRO
             ======================================================== */}
          {activeTab === 'INDIVIDUAL' && selectedStudentComputed && (
            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(240px, 280px) 1fr', gap: '20px' }}>
              {/* Selector de Estudiante */}
              <div className="glass-panel no-print" style={{ padding: '16px', maxHeight: '78vh', overflowY: 'auto' }}>
                <h4 style={{ fontSize: '0.9rem', fontWeight: 800, marginBottom: '12px' }}>
                  Lista de Estudiantes:
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

              {/* Dossier y Reporte del Estudiante */}
              <div className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
                {/* Header del Expediente */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span className="badge" style={{ background: '#4f46e5', color: 'white' }}>
                        Expediente Oficial de Calificaciones
                      </span>
                      <span className="badge" style={{ background: 'var(--bg-surface)' }}>
                        Sección {group.sectionCode}
                      </span>
                    </div>
                    <h2 style={{ fontSize: '1.4rem', fontWeight: 800, marginTop: '6px' }}>
                      {selectedStudentComputed.student.firstLastName} {selectedStudentComputed.student.secondLastName} {selectedStudentComputed.student.firstName}
                    </h2>
                    <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                      Cédula: <strong>{selectedStudentComputed.student.idNumber}</strong> • Materia: {subject.name} • Institución: {institutionName}
                    </div>
                  </div>

                  {/* Acciones de exportación e impresión */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <button
                      onClick={handleExportSingleStudentExcel}
                      className="btn btn-secondary btn-sm no-print"
                      title="Descargar reporte en formato Excel"
                    >
                      <FileDown size={14} color="#10b981" />
                      Exportar Excel
                    </button>
                    <button
                      onClick={() => window.print()}
                      className="btn btn-primary btn-sm no-print"
                      title="Imprimir boleta o guardar en PDF"
                    >
                      <Printer size={14} />
                      Imprimir Boleta / PDF
                    </button>

                    <div style={{ textAlign: 'right', marginLeft: '12px' }}>
                      <div style={{ fontSize: '1.8rem', fontWeight: 800, fontFamily: 'var(--font-mono)', color: selectedStudentComputed.notaFinal >= config.passingGrade ? '#10b981' : '#ef4444' }}>
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
                </div>

                {/* FILTRO DE VISTA INDIVIDUAL (Todos los rubros o solo uno en específico) */}
                <div className="no-print" style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  background: 'var(--bg-surface)',
                  padding: '8px 12px',
                  borderRadius: '10px',
                  overflowX: 'auto'
                }}>
                  <span style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Filter size={13} /> Ver Detalle:
                  </span>
                  <button
                    onClick={() => setDossierMode('ALL')}
                    className={`btn btn-sm ${dossierMode === 'ALL' ? 'btn-primary' : 'btn-secondary'}`}
                    style={{ fontSize: '0.75rem', padding: '3px 8px' }}
                  >
                    Reporte Integral
                  </button>
                  <button
                    onClick={() => setDossierMode('ASISTENCIA')}
                    className={`btn btn-sm ${dossierMode === 'ASISTENCIA' ? 'btn-primary' : 'btn-secondary'}`}
                    style={{ fontSize: '0.75rem', padding: '3px 8px' }}
                  >
                    Solo Asistencia y Ausencias
                  </button>
                  <button
                    onClick={() => setDossierMode('COTIDIANO')}
                    className={`btn btn-sm ${dossierMode === 'COTIDIANO' ? 'btn-primary' : 'btn-secondary'}`}
                    style={{ fontSize: '0.75rem', padding: '3px 8px' }}
                  >
                    Solo Trabajo Cotidiano
                  </button>
                  <button
                    onClick={() => setDossierMode('TAREAS')}
                    className={`btn btn-sm ${dossierMode === 'TAREAS' ? 'btn-primary' : 'btn-secondary'}`}
                    style={{ fontSize: '0.75rem', padding: '3px 8px' }}
                  >
                    Solo Tareas
                  </button>
                  <button
                    onClick={() => setDossierMode('EVALUACIONES')}
                    className={`btn btn-sm ${dossierMode === 'EVALUACIONES' ? 'btn-primary' : 'btn-secondary'}`}
                    style={{ fontSize: '0.75rem', padding: '3px 8px' }}
                  >
                    Solo Evaluaciones
                  </button>
                  <button
                    onClick={() => setDossierMode('PROYECTOS')}
                    className={`btn btn-sm ${dossierMode === 'PROYECTOS' ? 'btn-primary' : 'btn-secondary'}`}
                    style={{ fontSize: '0.75rem', padding: '3px 8px' }}
                  >
                    Solo Proyectos
                  </button>
                </div>

                {/* Resumen de Tarjetas Métricas */}
                {(dossierMode === 'ALL' || dossierMode === 'ASISTENCIA' || dossierMode === 'COTIDIANO') && (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '12px' }}>
                    <div style={{ background: 'var(--bg-surface)', padding: '12px', borderRadius: '10px', border: '1px solid var(--border-subtle)' }}>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 700 }}>ASISTENCIA (5%)</div>
                      <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#4f46e5', marginTop: '2px' }}>
                        {selectedStudentComputed.asistenciaPts}%
                      </div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                        {selectedStudentComputed.unexcusedAbsences} Injustificadas • {selectedStudentComputed.tardies} Tardías
                      </div>
                    </div>

                    <div style={{ background: 'var(--bg-surface)', padding: '12px', borderRadius: '10px', border: '1px solid var(--border-subtle)' }}>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 700 }}>COTIDIANO (25%)</div>
                      <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#06b6d4', marginTop: '2px' }}>
                        {selectedStudentComputed.cotidianoPts}%
                      </div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                        {selectedStudentComputed.puntosCotidianoObtenidos} de {selectedStudentComputed.totalLessons} pts
                      </div>
                    </div>

                    <div style={{ background: 'var(--bg-surface)', padding: '12px', borderRadius: '10px', border: '1px solid var(--border-subtle)' }}>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 700 }}>TAREAS (10%)</div>
                      <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#8b5cf6', marginTop: '2px' }}>
                        {selectedStudentComputed.tareasPts}%
                      </div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                        {selectedStudentComputed.tareasList.length} Tareas entregadas
                      </div>
                    </div>

                    <div style={{ background: 'var(--bg-surface)', padding: '12px', borderRadius: '10px', border: '1px solid var(--border-subtle)' }}>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 700 }}>EVALUACIONES (45%)</div>
                      <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#10b981', marginTop: '2px' }}>
                        {selectedStudentComputed.evaluacionesPts}%
                      </div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                        Pruebas comprensivas
                      </div>
                    </div>

                    <div style={{ background: 'var(--bg-surface)', padding: '12px', borderRadius: '10px', border: '1px solid var(--border-subtle)' }}>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 700 }}>PROYECTOS (15%)</div>
                      <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#f59e0b', marginTop: '2px' }}>
                        {selectedStudentComputed.proyectosPts}%
                      </div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                        Proyecto técnico final
                      </div>
                    </div>
                  </div>
                )}

                {/* VISTA 1: REPORTE INTEGRAL (TABLA GENERAL + CUADRO RESUMEN DE ASISTENCIA CON TOTALES) */}
                {dossierMode === 'ALL' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    {/* TABLA GENERAL DE CALIFICACIONES DEL ESTUDIANTE */}
                    <div style={{ background: 'var(--bg-surface)', padding: '18px 20px', borderRadius: '12px', border: '1px solid var(--border-subtle)' }}>
                      <h4 style={{ fontSize: '1rem', fontWeight: 800, marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <FileSpreadsheet size={18} color="#4f46e5" />
                        Tabla General de Calificaciones (Sábana Individual):
                      </h4>
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem', textAlign: 'left' }}>
                        <thead style={{ background: 'var(--bg-main)', borderBottom: '2px solid var(--border-subtle)' }}>
                          <tr>
                            <th style={{ padding: '10px 14px' }}>Componente / Rubro</th>
                            <th style={{ padding: '10px', textAlign: 'center' }}>Valor Asignado (%)</th>
                            <th style={{ padding: '10px', textAlign: 'center' }}>Detalle / Puntuación Obtenida</th>
                            <th style={{ padding: '10px', textAlign: 'center' }}>Porcentaje Obtenido (%)</th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                            <td style={{ padding: '10px 14px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <Target size={15} color="#06b6d4" /> Trabajo Cotidiano
                            </td>
                            <td style={{ padding: '10px', textAlign: 'center' }}>{config.rubrics.find(r => r.key === 'cotidiano')?.percentage || 25}%</td>
                            <td style={{ padding: '10px', textAlign: 'center', color: 'var(--text-muted)' }}>
                              {selectedStudentComputed.puntosCotidianoObtenidos} de {selectedStudentComputed.totalLessons} pts acumulados
                            </td>
                            <td style={{ padding: '10px', textAlign: 'center', fontWeight: 800, fontFamily: 'var(--font-mono)', color: '#06b6d4', fontSize: '0.95rem' }}>
                              {selectedStudentComputed.cotidianoPts}%
                            </td>
                          </tr>

                          <tr style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                            <td style={{ padding: '10px 14px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <CheckSquare size={15} color="#8b5cf6" /> Tareas
                            </td>
                            <td style={{ padding: '10px', textAlign: 'center' }}>{tareasMaxWeight}%</td>
                            <td style={{ padding: '10px', textAlign: 'center', color: 'var(--text-muted)' }}>
                              {(config.taskDefinitions || []).length} tareas asignadas en periodo
                            </td>
                            <td style={{ padding: '10px', textAlign: 'center', fontWeight: 800, fontFamily: 'var(--font-mono)', color: '#8b5cf6', fontSize: '0.95rem' }}>
                              {selectedStudentComputed.tareasPts}%
                            </td>
                          </tr>

                          <tr style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                            <td style={{ padding: '10px 14px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <FileText size={15} color="#10b981" /> Evaluaciones / Pruebas
                            </td>
                            <td style={{ padding: '10px', textAlign: 'center' }}>{evaluacionesMaxWeight}%</td>
                            <td style={{ padding: '10px', textAlign: 'center', color: 'var(--text-muted)' }}>
                              {(config.examDefinitions || []).length} pruebas realizadas
                            </td>
                            <td style={{ padding: '10px', textAlign: 'center', fontWeight: 800, fontFamily: 'var(--font-mono)', color: '#10b981', fontSize: '0.95rem' }}>
                              {selectedStudentComputed.evaluacionesPts}%
                            </td>
                          </tr>

                          <tr style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                            <td style={{ padding: '10px 14px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <FolderGit2 size={15} color="#f59e0b" /> Proyectos
                            </td>
                            <td style={{ padding: '10px', textAlign: 'center' }}>{proyectosMaxWeight}%</td>
                            <td style={{ padding: '10px', textAlign: 'center', color: 'var(--text-muted)' }}>
                              {(config.projectDefinitions || []).length} proyecto técnico evaluado
                            </td>
                            <td style={{ padding: '10px', textAlign: 'center', fontWeight: 800, fontFamily: 'var(--font-mono)', color: '#f59e0b', fontSize: '0.95rem' }}>
                              {selectedStudentComputed.proyectosPts}%
                            </td>
                          </tr>

                          {isPortafolioEnabled && (
                            <tr style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                              <td style={{ padding: '10px 14px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <FolderArchive size={15} /> Portafolio de Evidencias
                              </td>
                              <td style={{ padding: '10px', textAlign: 'center' }}>{config.rubrics.find(r => r.key === 'portafolio')?.percentage}%</td>
                              <td style={{ padding: '10px', textAlign: 'center', color: 'var(--text-muted)' }}>Evidencias del estudiante</td>
                              <td style={{ padding: '10px', textAlign: 'center', fontWeight: 800, fontFamily: 'var(--font-mono)', fontSize: '0.95rem' }}>
                                {selectedStudentComputed.portafolioPts}%
                              </td>
                            </tr>
                          )}

                          <tr style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                            <td style={{ padding: '10px 14px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <CalendarCheck size={15} color="#4f46e5" /> Asistencia
                            </td>
                            <td style={{ padding: '10px', textAlign: 'center' }}>{config.rubrics.find(r => r.key === 'asistencia')?.percentage || 5}%</td>
                            <td style={{ padding: '10px', textAlign: 'center', color: 'var(--text-muted)' }}>
                              Faltas equiv: {selectedStudentComputed.unexcusedAbsences + selectedStudentComputed.lessonEscapes + Math.floor(selectedStudentComputed.tardies / 2)} (AI: {selectedStudentComputed.unexcusedAbsences}, ESC: {selectedStudentComputed.lessonEscapes}, T: {selectedStudentComputed.tardies})
                            </td>
                            <td style={{ padding: '10px', textAlign: 'center', fontWeight: 800, fontFamily: 'var(--font-mono)', color: '#4f46e5', fontSize: '0.95rem' }}>
                              {selectedStudentComputed.asistenciaPts}%
                            </td>
                          </tr>
                        </tbody>
                        <tfoot style={{ background: 'var(--bg-main)', borderTop: '2px solid var(--border-subtle)' }}>
                          <tr>
                            <th style={{ padding: '12px 14px', fontWeight: 800, fontSize: '0.95rem' }}>PROMEDIO FINAL PONDERADO</th>
                            <th style={{ padding: '12px', textAlign: 'center', fontWeight: 800 }}>100%</th>
                            <th style={{ padding: '12px', textAlign: 'center' }}>
                              <span className="badge" style={{
                                background: selectedStudentComputed.condicion === 'Aprobado' ? 'var(--badge-present-bg)' : 'var(--badge-absent-bg)',
                                color: selectedStudentComputed.condicion === 'Aprobado' ? 'var(--badge-present-text)' : 'var(--badge-absent-text)',
                                fontWeight: 800
                              }}>
                                Condición: {selectedStudentComputed.condicion}
                              </span>
                            </th>
                            <th style={{ padding: '12px', textAlign: 'center', fontSize: '1.3rem', fontWeight: 900, fontFamily: 'var(--font-mono)', color: selectedStudentComputed.notaFinal >= config.passingGrade ? '#10b981' : '#ef4444' }}>
                              {selectedStudentComputed.notaFinal} / 100
                            </th>
                          </tr>
                        </tfoot>
                      </table>
                    </div>

                    {/* CUADRO COMO EN ASISTENCIA CON LAS CANTIDADES Y TOTALES DEL ESTUDIANTE */}
                    <div style={{ background: 'var(--bg-surface)', padding: '18px 20px', borderRadius: '12px', border: '1px solid var(--border-subtle)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', flexWrap: 'wrap', gap: '8px' }}>
                        <h4 style={{ fontSize: '1rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
                          <CalendarCheck size={18} color="#4f46e5" />
                          Cuadro Resumen de Asistencia (Totales del Estudiante):
                        </h4>
                        <span className="badge" style={{ background: 'rgba(79, 70, 229, 0.12)', color: '#4f46e5', fontWeight: 800 }}>
                          Valor: {config.rubrics.find(r => r.key === 'asistencia')?.percentage || 5}% de la nota final
                        </span>
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '10px' }}>
                        <div style={{ background: 'var(--bg-main)', padding: '12px', borderRadius: '8px', border: '1px solid var(--border-subtle)', textAlign: 'center' }}>
                          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 700 }}>LECCIONES TOTALES</div>
                          <div style={{ fontSize: '1.35rem', fontWeight: 900, marginTop: '2px', fontFamily: 'var(--font-mono)' }}>
                            {selectedStudentComputed.totalLessons}
                          </div>
                          <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>impartidas en periodo</div>
                        </div>

                        <div style={{ background: 'var(--bg-main)', padding: '12px', borderRadius: '8px', border: '1px solid var(--border-subtle)', textAlign: 'center' }}>
                          <div style={{ fontSize: '0.72rem', color: '#16a34a', fontWeight: 700 }}>PRESENTES</div>
                          <div style={{ fontSize: '1.35rem', fontWeight: 900, color: '#16a34a', marginTop: '2px', fontFamily: 'var(--font-mono)' }}>
                            {Math.max(0, selectedStudentComputed.totalLessons - (selectedStudentComputed.unexcusedAbsences + selectedStudentComputed.lessonEscapes))}
                          </div>
                          <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>lecciones asistidas</div>
                        </div>

                        <div style={{ background: 'var(--bg-main)', padding: '12px', borderRadius: '8px', border: '1px solid var(--border-subtle)', textAlign: 'center' }}>
                          <div style={{ fontSize: '0.72rem', color: '#dc2626', fontWeight: 700 }}>INJUSTIFICADAS (AI)</div>
                          <div style={{ fontSize: '1.35rem', fontWeight: 900, color: '#dc2626', marginTop: '2px', fontFamily: 'var(--font-mono)' }}>
                            {selectedStudentComputed.unexcusedAbsences}
                          </div>
                          <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>ausencias sin justificar</div>
                        </div>

                        <div style={{ background: 'var(--bg-main)', padding: '12px', borderRadius: '8px', border: '1px solid var(--border-subtle)', textAlign: 'center' }}>
                          <div style={{ fontSize: '0.72rem', color: '#d97706', fontWeight: 700 }}>ESCAPES (ESC)</div>
                          <div style={{ fontSize: '1.35rem', fontWeight: 900, color: '#d97706', marginTop: '2px', fontFamily: 'var(--font-mono)' }}>
                            {selectedStudentComputed.lessonEscapes}
                          </div>
                          <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>fugas o retiros</div>
                        </div>

                        <div style={{ background: 'var(--bg-main)', padding: '12px', borderRadius: '8px', border: '1px solid var(--border-subtle)', textAlign: 'center' }}>
                          <div style={{ fontSize: '0.72rem', color: '#4f46e5', fontWeight: 700 }}>TARDÍAS (T)</div>
                          <div style={{ fontSize: '1.35rem', fontWeight: 900, color: '#4f46e5', marginTop: '2px', fontFamily: 'var(--font-mono)' }}>
                            {selectedStudentComputed.tardies}
                          </div>
                          <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>2 tardías = 1 falta</div>
                        </div>

                        <div style={{ background: 'var(--bg-main)', padding: '12px', borderRadius: '8px', border: '1px solid var(--border-subtle)', textAlign: 'center' }}>
                          <div style={{ fontSize: '0.72rem', color: '#059669', fontWeight: 700 }}>JUSTIFICADAS (AJ)</div>
                          <div style={{ fontSize: '1.35rem', fontWeight: 900, color: '#059669', marginTop: '2px', fontFamily: 'var(--font-mono)' }}>
                            {selectedStudentComputed.excusedAbsences}
                          </div>
                          <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>con justificación válida</div>
                        </div>

                        <div style={{ background: 'rgba(79, 70, 229, 0.08)', padding: '12px', borderRadius: '8px', border: '1px solid rgba(79, 70, 229, 0.25)', textAlign: 'center' }}>
                          <div style={{ fontSize: '0.72rem', color: '#4f46e5', fontWeight: 800 }}>% ASISTENCIA GANADO</div>
                          <div style={{ fontSize: '1.35rem', fontWeight: 900, color: '#4f46e5', marginTop: '2px', fontFamily: 'var(--font-mono)' }}>
                            {selectedStudentComputed.asistenciaPts}%
                          </div>
                          <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>
                            de {config.rubrics.find(r => r.key === 'asistencia')?.percentage || 5}%
                          </div>
                        </div>
                      </div>

                      <div style={{ marginTop: '12px', fontSize: '0.75rem', color: 'var(--text-muted)', lineHeight: '1.4' }}>
                        * <strong>Reglamento oficial MEP</strong>: Las ausencias justificadas (AJ) no rebajan puntaje. La pérdida de porcentaje se calcula como: Rebajo = {( (config.rubrics.find(r => r.key === 'asistencia')?.percentage || 5) - selectedStudentComputed.asistenciaPts ).toFixed(2)}%.
                      </div>
                    </div>
                  </div>
                )}

                {/* VISTA 2: SOLO ASISTENCIA (DESGLOSE SESIÓN POR SESIÓN) */}
                {dossierMode === 'ASISTENCIA' && (
                  <div>
                    <h4 style={{ fontSize: '0.95rem', fontWeight: 800, marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <CalendarCheck size={16} color="#4f46e5" />
                      Historial Detallado de Asistencias y Ausencias del Estudiante:
                    </h4>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem', textAlign: 'left' }}>
                      <thead style={{ background: 'var(--bg-surface)', borderBottom: '2px solid var(--border-subtle)' }}>
                        <tr>
                          <th style={{ padding: '8px' }}>Fecha</th>
                          <th style={{ padding: '8px' }}>Lecciones</th>
                          <th style={{ padding: '8px' }}>Estado Asistencia</th>
                          <th style={{ padding: '8px' }}>Tema Impartido</th>
                        </tr>
                      </thead>
                      <tbody>
                        {sessions.map(sess => {
                          const det = sessionDetails.find(d => d.sessionId === sess.id && d.studentId === selectedStudentId);
                          const att = det?.attendance || 'PRESENT';

                          return (
                            <tr key={sess.id} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                              <td style={{ padding: '8px', fontWeight: 700 }}>{sess.date}</td>
                              <td style={{ padding: '8px' }}>{sess.lessonsCount} lecciones</td>
                              <td style={{ padding: '8px' }}>
                                <span className="badge" style={{
                                  background: att === 'PRESENT' ? 'var(--badge-present-bg)' : att === 'UNEXCUSED_ABSENCE' ? 'var(--badge-absent-bg)' : att === 'TARDY' ? 'var(--badge-tardy-bg)' : 'var(--badge-excused-bg)',
                                  color: att === 'PRESENT' ? 'var(--badge-present-text)' : att === 'UNEXCUSED_ABSENCE' ? 'var(--badge-absent-text)' : att === 'TARDY' ? 'var(--badge-tardy-text)' : 'var(--badge-excused-text)'
                                }}>
                                  {att === 'PRESENT' ? 'Presente' : att === 'UNEXCUSED_ABSENCE' ? 'Ausencia Injustificada' : att === 'TARDY' ? 'Llegada Tardía' : att === 'LESSON_ESCAPE' ? 'Escape de Lección' : 'Ausencia Justificada'}
                                </span>
                              </td>
                              <td style={{ padding: '8px', color: 'var(--text-muted)' }}>{sess.topic || 'Clase regular'}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}

                {/* VISTA 3: SOLO TRABAJO COTIDIANO (DETALLE POR INDICADOR) */}
                {dossierMode === 'COTIDIANO' && (
                  <div>
                    <h4 style={{ fontSize: '0.95rem', fontWeight: 800, marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Target size={16} color="#06b6d4" />
                      Historial de Desempeño Cotidiano por Indicador:
                    </h4>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem', textAlign: 'left' }}>
                      <thead style={{ background: 'var(--bg-surface)', borderBottom: '2px solid var(--border-subtle)' }}>
                        <tr>
                          <th style={{ padding: '8px' }}>Fecha</th>
                          <th style={{ padding: '8px' }}>Lecciones</th>
                          <th style={{ padding: '8px' }}>Indicador de Planeamiento</th>
                          <th style={{ padding: '8px', textAlign: 'center' }}>Nivel de Desempeño</th>
                          <th style={{ padding: '8px', textAlign: 'center' }}>Puntos Ganados</th>
                        </tr>
                      </thead>
                      <tbody>
                        {sessions.map(sess => {
                          const det = sessionDetails.find(d => d.sessionId === sess.id && d.studentId === selectedStudentId);
                          const lvl = det?.cotidianoLevel !== undefined ? det.cotidianoLevel : 3;
                          const ind = indicators.find(i => i.id === sess.indicatorId);
                          const factor = lvl === 3 ? 1.0 : lvl === 2 ? 0.5 : lvl === 1 ? 0.25 : 0;
                          const ptsGained = (sess.lessonsCount * factor).toFixed(2);

                          return (
                            <tr key={sess.id} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                              <td style={{ padding: '8px', fontWeight: 700 }}>{sess.date}</td>
                              <td style={{ padding: '8px' }}>{sess.lessonsCount} lecciones</td>
                              <td style={{ padding: '8px' }}>
                                {ind ? (
                                  <div>
                                    <span style={{ fontWeight: 700, color: '#4f46e5' }}>{ind.code} ({ind.skillArea}):</span> {ind.description}
                                  </div>
                                ) : (
                                  <span style={{ color: 'var(--text-muted)' }}>Desempeño general de clase</span>
                                )}
                              </td>
                              <td style={{ padding: '8px', textAlign: 'center' }}>
                                <span className="badge" style={{
                                  background: lvl === 3 ? 'rgba(16, 185, 129, 0.15)' : lvl === 2 ? 'rgba(245, 158, 11, 0.15)' : lvl === 1 ? 'rgba(239, 68, 68, 0.15)' : 'var(--bg-surface)',
                                  color: lvl === 3 ? '#10b981' : lvl === 2 ? '#d97706' : lvl === 1 ? '#dc2626' : 'var(--text-muted)'
                                }}>
                                  Nivel {lvl} ({lvl === 3 ? 'Avanzado 100%' : lvl === 2 ? 'Intermedio 50%' : lvl === 1 ? 'Inicial 25%' : '0%'})
                                </span>
                              </td>
                              <td style={{ padding: '8px', textAlign: 'center', fontWeight: 800, fontFamily: 'var(--font-mono)' }}>
                                {ptsGained} pts
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}

                {/* VISTA 4: SOLO TAREAS */}
                {dossierMode === 'TAREAS' && (
                  <div>
                    <h4 style={{ fontSize: '0.95rem', fontWeight: 800, marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <CheckSquare size={16} color="#8b5cf6" />
                      Desglose de Tareas Realizadas:
                    </h4>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem', textAlign: 'left' }}>
                      <thead style={{ background: 'var(--bg-surface)', borderBottom: '2px solid var(--border-subtle)' }}>
                        <tr>
                          <th style={{ padding: '8px' }}>Tarea</th>
                          <th style={{ padding: '8px', textAlign: 'center' }}>Valor Asignado</th>
                          <th style={{ padding: '8px', textAlign: 'center' }}>Nota (Pts)</th>
                          <th style={{ padding: '8px', textAlign: 'center' }}>Porcentaje Obtenido</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(config.taskDefinitions || []).map(t => {
                          const tg = taskGrades.find(g => g.assignmentId === assignment.id && g.studentId === selectedStudentId && (g.taskId === t.id || g.taskNumber === t.number));
                          const pct = tg ? tg.percentageEarned : 0;
                          const totalPts = t.totalPoints || 100;
                          const pts = tg && tg.pointsEarned !== undefined ? tg.pointsEarned : Number(((pct / t.percentage) * totalPts).toFixed(1));

                          return (
                            <tr key={t.id} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                              <td style={{ padding: '8px', fontWeight: 700 }}>{t.title}</td>
                              <td style={{ padding: '8px', textAlign: 'center' }}>{t.percentage}%</td>
                              <td style={{ padding: '8px', textAlign: 'center', fontFamily: 'var(--font-mono)' }}>{pts} / {totalPts}</td>
                              <td style={{ padding: '8px', textAlign: 'center', fontWeight: 800, color: '#4f46e5', fontFamily: 'var(--font-mono)' }}>{pct}%</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}

                {/* VISTA 5: SOLO EVALUACIONES */}
                {dossierMode === 'EVALUACIONES' && (
                  <div>
                    <h4 style={{ fontSize: '0.95rem', fontWeight: 800, marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <FileText size={16} color="#10b981" />
                      Desglose de Evaluaciones / Exámenes:
                    </h4>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem', textAlign: 'left' }}>
                      <thead style={{ background: 'var(--bg-surface)', borderBottom: '2px solid var(--border-subtle)' }}>
                        <tr>
                          <th style={{ padding: '8px' }}>Evaluación</th>
                          <th style={{ padding: '8px', textAlign: 'center' }}>Valor Asignado</th>
                          <th style={{ padding: '8px', textAlign: 'center' }}>Nota (Pts)</th>
                          <th style={{ padding: '8px', textAlign: 'center' }}>Porcentaje Obtenido</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(config.examDefinitions || []).map(e => {
                          const eg = examGrades.find(g => g.assignmentId === assignment.id && g.studentId === selectedStudentId && (g.examId === e.id || g.examNumber === e.number));
                          const pct = eg ? eg.percentageEarned : 0;
                          const totalPts = e.totalPoints || 100;
                          const pts = eg && eg.pointsEarned !== undefined ? eg.pointsEarned : Number(((pct / e.percentage) * totalPts).toFixed(1));

                          return (
                            <tr key={e.id} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                              <td style={{ padding: '8px', fontWeight: 700 }}>{e.title}</td>
                              <td style={{ padding: '8px', textAlign: 'center' }}>{e.percentage}%</td>
                              <td style={{ padding: '8px', textAlign: 'center', fontFamily: 'var(--font-mono)' }}>{pts} / {totalPts}</td>
                              <td style={{ padding: '8px', textAlign: 'center', fontWeight: 800, color: '#4f46e5', fontFamily: 'var(--font-mono)' }}>{pct}%</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}

                {/* VISTA 6: SOLO PROYECTOS */}
                {dossierMode === 'PROYECTOS' && (
                  <div>
                    <h4 style={{ fontSize: '0.95rem', fontWeight: 800, marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <FolderGit2 size={16} color="#f59e0b" />
                      Desglose de Proyectos Técnicos:
                    </h4>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem', textAlign: 'left' }}>
                      <thead style={{ background: 'var(--bg-surface)', borderBottom: '2px solid var(--border-subtle)' }}>
                        <tr>
                          <th style={{ padding: '8px' }}>Proyecto</th>
                          <th style={{ padding: '8px', textAlign: 'center' }}>Valor Asignado</th>
                          <th style={{ padding: '8px', textAlign: 'center' }}>Nota (Pts)</th>
                          <th style={{ padding: '8px', textAlign: 'center' }}>Porcentaje Obtenido</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(config.projectDefinitions || []).map(p => {
                          const pg = projectGrades.find(g => g.assignmentId === assignment.id && g.studentId === selectedStudentId && (g.projectId === p.id || g.projectNumber === p.number));
                          const pct = pg ? pg.percentageEarned : 0;
                          const totalPts = p.totalPoints || 100;
                          const pts = pg && pg.pointsEarned !== undefined ? pg.pointsEarned : Number(((pct / p.percentage) * totalPts).toFixed(1));

                          return (
                            <tr key={p.id} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                              <td style={{ padding: '8px', fontWeight: 700 }}>{p.title}</td>
                              <td style={{ padding: '8px', textAlign: 'center' }}>{p.percentage}%</td>
                              <td style={{ padding: '8px', textAlign: 'center', fontFamily: 'var(--font-mono)' }}>{pts} / {totalPts}</td>
                              <td style={{ padding: '8px', textAlign: 'center', fontWeight: 800, color: '#f59e0b', fontFamily: 'var(--font-mono)' }}>{pct}%</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    )}

      {/* ========================================================
          MODALES DE APOYO
         ======================================================== */}

      {/* Modal para configurar fechas de inicio y finalización de los periodos */}
      {showPeriodDatesModal && (
        <PeriodDatesModal
          periods={periodConfigs}
          onClose={() => setShowPeriodDatesModal(false)}
          onSave={handleSavePeriodDates}
        />
      )}

      {/* MODAL FLOTANTE PERSONALIZADO DE CONFIRMACIÓN (Eliminar Tareas, Exámenes, Indicadores) */}
      {confirmModal && confirmModal.isOpen && (

        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.65)',
          backdropFilter: 'blur(8px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 200,
          padding: '20px'
        }}>
          <div className="glass-panel" style={{
            width: '100%',
            maxWidth: '440px',
            padding: '24px',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px',
            boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{
                width: '42px',
                height: '42px',
                borderRadius: '50%',
                background: 'rgba(239, 68, 68, 0.15)',
                color: '#ef4444',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <AlertTriangle size={24} />
              </div>
              <div>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-main)' }}>
                  {confirmModal.title}
                </h3>
              </div>
            </div>

            <p style={{ fontSize: '0.88rem', color: 'var(--text-muted)', lineHeight: '1.5' }}>
              {confirmModal.message}
            </p>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '8px' }}>
              <button onClick={() => setConfirmModal(null)} className="btn btn-secondary">
                Cancelar
              </button>
              <button onClick={confirmModal.onConfirm} className="btn btn-danger">
                Sí, Eliminar
              </button>
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
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                placeholder="Ej. 2"
                value={newSessionLessonsStr}
                onChange={(e) => {
                  const numOnly = e.target.value.replace(/[^0-9]/g, '');
                  setNewSessionLessonsStr(numOnly);
                }}
                onBlur={() => {
                  if (!newSessionLessonsStr || parseInt(newSessionLessonsStr) < 1) {
                    setNewSessionLessonsStr('2');
                  }
                }}
                style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--border-subtle)', background: 'var(--bg-surface)', color: 'var(--text-main)', fontWeight: 700 }}
              />
              <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '4px', display: 'block' }}>
                Escribe directamente el número de lecciones con el teclado (ej. 2, 3 o 4).
              </span>
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

      {/* Modal para agregar estudiante individual con Hacienda / manual */}
      {showAddStudentModal && (
        <AddStudentModal
          groupId={group.id}
          existingStudents={students}
          onClose={() => setShowAddStudentModal(false)}
          onStudentAdded={() => {
            onDataChanged();
            setShowAddStudentModal(false);
          }}
        />
      )}

      {/* Modal para importar lista completa de estudiantes desde Excel (.xlsx/.xls) */}
      {showImportStudentsModal && (
        <ImportStudentsModal
          groupId={group.id}
          existingStudents={students}
          onClose={() => setShowImportStudentsModal(false)}
          onImportComplete={() => {
            onDataChanged();
            setShowImportStudentsModal(false);
          }}
        />
      )}
    </div>
  );
};
