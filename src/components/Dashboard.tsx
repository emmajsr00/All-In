import React, { useState, useEffect } from 'react';
import {
  Users,
  BookOpen,
  Calendar,
  Clock,
  Sparkles,
  SlidersHorizontal,
  FileSpreadsheet,
  CheckCircle2,
  Play,
  Layers,
  ChevronRight,
  TrendingUp,
  Award,
  ArrowRight,
  Plus,
  PlusCircle,
  FolderPlus,
  BookPlus,
  UserPlus,
  Trash2,
  X,
  AlertCircle,
  Check,
  GraduationCap,
  UserCheck,
  Search,
  Filter
} from 'lucide-react';
import type {
  User,
  Institution,
  Group,
  Subject,
  TeacherAssignment,
  Student,
  EvaluationConfig,
  ScheduleItem
} from '../types';
import { db } from '../db';
import { AddStudentModal } from './AddStudentModal';
import { ImportStudentsModal } from './ImportStudentsModal';
import { ConfirmModal } from './ConfirmModal';

interface DashboardProps {
  currentUser: User;
  currentInstitution: Institution;
  groups: Group[];
  subjects: Subject[];
  assignments: TeacherAssignment[];
  students: Student[];
  evaluationConfigs: EvaluationConfig[];
  schedules: ScheduleItem[];
  onSelectAssignment: (assignment: TeacherAssignment) => void;
  onOpenRubricsConfig: (assignment: TeacherAssignment) => void;
  onOpenSchedule: () => void;
  onDataChanged?: () => void;
}

export const Dashboard: React.FC<DashboardProps> = ({
  currentUser,
  currentInstitution,
  groups,
  subjects,
  assignments,
  students,
  evaluationConfigs,
  schedules,
  onSelectAssignment,
  onOpenRubricsConfig,
  onOpenSchedule,
  onDataChanged
}) => {
  const userAssignments = assignments.filter(a => a.teacherId === currentUser.id);
  const isIndependent = currentInstitution.type === 'INDEPENDENT' || currentUser.institutionId === 'inst-indep-01';

  // Estados para herramientas de Docente Independiente
  const [isAddGroupOpen, setIsAddGroupOpen] = useState(false);
  const [isAddSubjectOpen, setIsAddSubjectOpen] = useState(false);
  const [isAssignSubjectOpen, setIsAssignSubjectOpen] = useState(false);
  const [isManageStudentsOpen, setIsManageStudentsOpen] = useState(false);

  // Formularios de Creación
  const [groupGrade, setGroupGrade] = useState('7');
  const [groupSectionCode, setGroupSectionCode] = useState('');
  const [groupName, setGroupName] = useState('');
  const [groupSpecialty, setGroupSpecialty] = useState('');
  const [groupError, setGroupError] = useState<string | null>(null);

  const [subjectName, setSubjectName] = useState('');
  const [subjectCode, setSubjectCode] = useState('');
  const [subjectColor, setSubjectColor] = useState('#4f46e5');
  const [subjectError, setSubjectError] = useState<string | null>(null);

  const [assignGroupId, setAssignGroupId] = useState('');
  const [assignSubjectId, setAssignSubjectId] = useState('');
  const [isGuiaAssignment, setIsGuiaAssignment] = useState(false);
  const [assignError, setAssignError] = useState<string | null>(null);

  // Gestión de estudiantes de la sección
  const [studentManagingGroupId, setStudentManagingGroupId] = useState<string>('');
  const [studentSearchQuery, setStudentSearchQuery] = useState('');
  const [studentAccommodationFilter, setStudentAccommodationFilter] = useState<'ALL' | 'ACCOMMODATED' | 'NONE'>('ALL');
  const [isAddStudentModalOpen, setIsAddStudentModalOpen] = useState(false);
  const [isImportStudentsModalOpen, setIsImportStudentsModalOpen] = useState(false);

  // Modal de confirmación personalizada
  const [confirmModalConfig, setConfirmModalConfig] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
    type?: 'danger' | 'warning' | 'info' | 'success';
    confirmText?: string;
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {}
  });

  // Smart Schedule detector: Find if there is an active class right now
  const [currentActiveSchedule, setCurrentActiveSchedule] = useState<ScheduleItem | null>(null);

  useEffect(() => {
    const checkSchedule = () => {
      const now = new Date();
      const currentDay = now.getDay();
      const currentTimeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

      const found = schedules.find(s => {
        if (s.teacherId !== currentUser.id) return false;
        if (s.dayOfWeek === currentDay && currentTimeStr >= s.startTime && currentTimeStr <= s.endTime) {
          return true;
        }
        return false;
      });

      if (found) {
        setCurrentActiveSchedule(found);
      } else if (schedules.length > 0) {
        // En demostración mostramos la primera para que el docente pueda ver la experiencia activa
        const teacherSchedules = schedules.filter(s => s.teacherId === currentUser.id);
        setCurrentActiveSchedule(teacherSchedules[0] || null);
      }
    };

    checkSchedule();
    const timer = setInterval(checkSchedule, 60000);
    return () => clearInterval(timer);
  }, [currentUser.id, schedules]);

  const activeAssignment = currentActiveSchedule
    ? userAssignments.find(a => a.groupId === currentActiveSchedule.groupId && a.subjectId === currentActiveSchedule.subjectId)
    : null;

  const activeGroup = activeAssignment ? groups.find(g => g.id === activeAssignment.groupId) : null;
  const activeSubject = activeAssignment ? subjects.find(s => s.id === activeAssignment.subjectId) : null;

  // Crear Sección / Grupo (Docente Independiente)
  const handleCreateGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    setGroupError(null);
    const code = groupSectionCode.trim();
    if (!code) {
      setGroupError('Ingresa el código o número de la sección (ej: 7-1, Grupo A, Décimo).');
      return;
    }

    const exists = groups.some(g => g.sectionCode.toLowerCase() === code.toLowerCase());
    if (exists) {
      setGroupError(`Ya existe una sección con el código "${code}".`);
      return;
    }

    const newGroup: Group = {
      id: `grp-${Date.now()}`,
      institutionId: currentInstitution.id,
      grade: Number(groupGrade) || 7,
      sectionCode: code,
      groupName: groupName.trim() || undefined,
      year: 2026,
      specialty: groupSpecialty.trim() || undefined,
      guideTeacherId: currentUser.id
    };

    await db.groups.add(newGroup);
    setIsAddGroupOpen(false);
    setGroupSectionCode('');
    setGroupName('');
    setGroupSpecialty('');
    setStudentManagingGroupId(newGroup.id);
    if (onDataChanged) onDataChanged();
  };

  // Eliminar Sección (Docente Independiente)
  const handleDeleteGroup = (group: Group) => {
    const groupStudents = students.filter(s => s.groupId === group.id);
    const groupAsgs = assignments.filter(a => a.groupId === group.id);
    setConfirmModalConfig({
      isOpen: true,
      title: 'Eliminar Sección',
      message: `¿Estás seguro de eliminar la sección "${group.groupName || group.sectionCode}"? ${groupStudents.length > 0 ? `Se desmatricularán ${groupStudents.length} estudiantes y se removerán las asignaciones asociadas.` : 'Esta sección no contiene estudiantes.'}`,
      type: 'danger',
      confirmText: 'Sí, eliminar sección',
      onConfirm: async () => {
        await db.groups.delete(group.id);
        if (groupStudents.length > 0) {
          await db.students.where('groupId').equals(group.id).delete();
        }
        if (groupAsgs.length > 0) {
          for (const asg of groupAsgs) {
            await db.assignments.delete(asg.id);
            await db.evaluationConfigs.where('assignmentId').equals(asg.id).delete();
          }
        }
        setConfirmModalConfig(prev => ({ ...prev, isOpen: false }));
        if (studentManagingGroupId === group.id) {
          const remaining = myGroups.filter(g => g.id !== group.id);
          setStudentManagingGroupId(remaining.length > 0 ? remaining[0].id : '');
        }
        if (onDataChanged) onDataChanged();
      }
    });
  };

  // Crear Materia (Docente Independiente)
  const handleCreateSubject = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubjectError(null);
    const name = subjectName.trim();
    if (!name) {
      setSubjectError('Ingresa el nombre de la materia.');
      return;
    }

    const exists = subjects.some(s => s.name.toLowerCase() === name.toLowerCase());
    if (exists) {
      setSubjectError(`Ya existe la materia "${name}".`);
      return;
    }

    const newSubject: Subject = {
      id: `sub-${Date.now()}`,
      institutionId: currentInstitution.id,
      name,
      code: (subjectCode.trim() || name.substring(0, 4)).toUpperCase(),
      color: subjectColor,
      teacherId: currentUser.id
    };

    await db.subjects.add(newSubject);
    setIsAddSubjectOpen(false);
    setSubjectName('');
    setSubjectCode('');
    if (onDataChanged) onDataChanged();
  };

  // Asignar Materia a Grupo
  const handleCreateAssignment = async (e: React.FormEvent) => {
    e.preventDefault();
    setAssignError(null);

    if (!assignGroupId || !assignSubjectId) {
      setAssignError('Debes seleccionar tanto la sección como la materia.');
      return;
    }

    const exists = assignments.some(
      a => a.groupId === assignGroupId && a.subjectId === assignSubjectId && a.teacherId === currentUser.id
    );
    if (exists) {
      setAssignError('Ya tienes asignada esta materia a esa sección.');
      return;
    }

    const newAssignment: TeacherAssignment = {
      id: `asg-${Date.now()}`,
      teacherId: currentUser.id,
      groupId: assignGroupId,
      subjectId: assignSubjectId,
      isGuia: isGuiaAssignment
    };

    await db.assignments.add(newAssignment);

    // Inicializar configuración de evaluación por defecto MEP
    const newConfig: EvaluationConfig = {
      id: `cfg-${newAssignment.id}`,
      assignmentId: newAssignment.id,
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
      projectDefinitions: []
    };
    await db.evaluationConfigs.add(newConfig);

    setIsAssignSubjectOpen(false);
    setAssignGroupId('');
    setAssignSubjectId('');
    setIsGuiaAssignment(false);
    if (onDataChanged) onDataChanged();
  };

  // Eliminar Asignación
  const handleDeleteAssignment = (asg: TeacherAssignment) => {
    const group = groups.find(g => g.id === asg.groupId);
    const subject = subjects.find(s => s.id === asg.subjectId);
    setConfirmModalConfig({
      isOpen: true,
      title: 'Desvincular Materia de la Sección',
      message: `¿Estás seguro de desvincular "${subject?.name || 'Materia'}" de la sección "${group?.groupName || group?.sectionCode || 'Grupo'}"? Los registros de calificaciones asociados a este grupo se removerán pero el grupo seguirá existiendo.`,
      type: 'danger',
      confirmText: 'Sí, desvincular',
      onConfirm: async () => {
        await db.assignments.delete(asg.id);
        await db.evaluationConfigs.where('assignmentId').equals(asg.id).delete();
        setConfirmModalConfig(prev => ({ ...prev, isOpen: false }));
        if (onDataChanged) onDataChanged();
      }
    });
  };

  // Eliminar Estudiante de la sección
  const handleDeleteStudent = (student: Student) => {
    setConfirmModalConfig({
      isOpen: true,
      title: 'Desmatricular Estudiante',
      message: `¿Estás seguro de eliminar a ${student.firstName} ${student.firstLastName} ${student.secondLastName} de esta sección?`,
      type: 'danger',
      confirmText: 'Sí, desmatricular',
      onConfirm: async () => {
        await db.students.delete(student.id);
        setConfirmModalConfig(prev => ({ ...prev, isOpen: false }));
        if (onDataChanged) onDataChanged();
      }
    });
  };

  const todayFormatted = new Intl.DateTimeFormat('es-CR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  }).format(new Date());

  // Grupos y materias filtrados exclusivamente para este docente en modo independiente
  const myGroups = isIndependent
    ? groups.filter(g => g.guideTeacherId === currentUser.id || g.institutionId === currentInstitution.id || userAssignments.some(a => a.groupId === g.id))
    : groups;

  const mySubjects = isIndependent
    ? subjects.filter(s => !s.teacherId || s.teacherId === currentUser.id || s.institutionId === currentInstitution.id || userAssignments.some(a => a.subjectId === s.id))
    : subjects;

  const myGroupIds = new Set(myGroups.map(g => g.id));
  const myStudents = students.filter(s => myGroupIds.has(s.groupId));

  const effectiveManagingGroupId = studentManagingGroupId || (myGroups.length > 0 ? myGroups[0].id : '');
  const managingGroup = myGroups.find(g => g.id === effectiveManagingGroupId) || (myGroups.length > 0 ? myGroups[0] : null);
  const managingGroupStudents = managingGroup ? students.filter(s => s.groupId === managingGroup.id) : [];

  const accommodatedCount = managingGroupStudents.filter(s => s.accommodation && s.accommodation !== 'NONE').length;
  const groupSubjects = managingGroup ? userAssignments.filter(a => a.groupId === managingGroup.id) : [];

  const filteredManagingGroupStudents = managingGroupStudents.filter(st => {
    if (studentAccommodationFilter === 'ACCOMMODATED' && (!st.accommodation || st.accommodation === 'NONE')) return false;
    if (studentAccommodationFilter === 'NONE' && st.accommodation && st.accommodation !== 'NONE') return false;
    if (studentSearchQuery.trim()) {
      const q = studentSearchQuery.toLowerCase().trim();
      const fullName = `${st.firstName} ${st.firstLastName} ${st.secondLastName || ''}`.toLowerCase();
      const idMatch = st.idNumber.toLowerCase().includes(q);
      return fullName.includes(q) || idMatch;
    }
    return true;
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Welcome Banner */}
      <div className="glass-panel" style={{
        padding: '28px',
        background: 'linear-gradient(135deg, rgba(79, 70, 229, 0.12) 0%, rgba(124, 58, 237, 0.08) 100%)',
        border: '1px solid rgba(79, 70, 229, 0.25)',
        position: 'relative',
        overflow: 'hidden'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
              <span className="badge" style={{ background: isIndependent ? '#4f46e5' : 'rgba(79, 70, 229, 0.2)', color: isIndependent ? '#ffffff' : '#4f46e5' }}>
                <Sparkles size={12} /> {isIndependent ? 'Docente Independiente' : (currentUser.title || 'Docente')}
              </span>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                {todayFormatted}
              </span>
            </div>
            <h1 style={{ fontSize: '1.8rem', fontWeight: 800, letterSpacing: '-0.02em' }}>
              ¡Hola, <span className="gradient-text">{currentUser.name}</span>!
            </h1>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', marginTop: '6px', maxWidth: '650px' }}>
              {isIndependent
                ? 'Bienvenido a tu espacio de docente independiente. Aquí puedes crear tus propias secciones, materias que vas a dar, asignar asignaturas y matricular alumnos con total autonomía.'
                : 'Bienvenido a tu panel docente. Abre cualquiera de tus grupos para acceder al registro general de calificaciones, control de asistencia por lecciones y evaluación por rubros individuales.'}
            </p>
          </div>

          <div style={{ display: 'flex', gap: '10px' }}>
            <button onClick={onOpenSchedule} className="btn btn-secondary">
              <Clock size={16} color="#6366f1" />
              Horario Semanal
            </button>
          </div>
        </div>

        {/* Quick Stats Grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: '14px',
          marginTop: '24px'
        }}>
          <div style={{ background: 'var(--bg-card)', padding: '14px 18px', borderRadius: '14px', border: '1px solid var(--border-subtle)' }}>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Users size={14} color="#4f46e5" /> Grupos a Cargo
            </div>
            <div style={{ fontSize: '1.5rem', fontWeight: 800, marginTop: '4px' }}>
              {isIndependent ? myGroups.length : new Set(userAssignments.map(a => a.groupId)).size} Grupos
            </div>
          </div>

          <div style={{ background: 'var(--bg-card)', padding: '14px 18px', borderRadius: '14px', border: '1px solid var(--border-subtle)' }}>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <BookOpen size={14} color="#06b6d4" /> Materias Impartidas
            </div>
            <div style={{ fontSize: '1.5rem', fontWeight: 800, marginTop: '4px' }}>
              {userAssignments.length} Asignaturas
            </div>
          </div>

          <div style={{ background: 'var(--bg-card)', padding: '14px 18px', borderRadius: '14px', border: '1px solid var(--border-subtle)' }}>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Award size={14} color="#10b981" /> Estudiantes Registrados
            </div>
            <div style={{ fontSize: '1.5rem', fontWeight: 800, marginTop: '4px' }}>
              {myStudents.length} Alumnos
            </div>
          </div>

          <div style={{ background: 'var(--bg-card)', padding: '14px 18px', borderRadius: '14px', border: '1px solid var(--border-subtle)' }}>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <TrendingUp size={14} color="#8b5cf6" /> Asistencia Promedio
            </div>
            <div style={{ fontSize: '1.5rem', fontWeight: 800, marginTop: '4px', color: '#16a34a' }}>
              96.4%
            </div>
          </div>
        </div>
      </div>

      {/* Barra de Gestión de Docente Independiente */}
      {isIndependent && (
        <div className="glass-panel" style={{
          padding: '22px 26px',
          background: 'linear-gradient(135deg, rgba(79, 70, 229, 0.09) 0%, rgba(14, 165, 233, 0.07) 100%)',
          border: '1px solid rgba(99, 102, 241, 0.3)',
          borderRadius: '16px'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span className="badge" style={{ background: '#4f46e5', color: 'white', fontWeight: 700 }}>
                  <GraduationCap size={13} /> ESPACIO DOCENTE INDEPENDIENTE
                </span>
                <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                  {myGroups.length} Secciones • {mySubjects.length} Materias • {myStudents.length} Estudiantes Matriculados
                </span>
              </div>
              <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                Gestión profesional y autónoma de grupos a tu cargo, matrícula oficial y asignaturas sin necesidad de administración institucional.
              </p>
            </div>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
              <button
                onClick={() => {
                  if (myGroups.length > 0 && !studentManagingGroupId) {
                    setStudentManagingGroupId(myGroups[0].id);
                  }
                  setIsManageStudentsOpen(true);
                }}
                className="btn btn-primary"
                style={{ fontSize: '0.88rem', background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)', fontWeight: 700, boxShadow: '0 4px 14px rgba(16, 185, 129, 0.3)' }}
              >
                <Users size={16} />
                Alumnos por Sección
              </button>
              <button
                onClick={() => { setGroupError(null); setIsAddGroupOpen(true); }}
                className="btn btn-secondary"
                style={{ fontSize: '0.85rem' }}
              >
                <FolderPlus size={16} color="#6366f1" />
                + Nueva Sección
              </button>
              <button
                onClick={() => { setSubjectError(null); setIsAddSubjectOpen(true); }}
                className="btn btn-secondary"
                style={{ fontSize: '0.85rem' }}
              >
                <BookPlus size={16} color="#06b6d4" />
                + Nueva Materia
              </button>
              <button
                onClick={() => { setAssignError(null); setIsAssignSubjectOpen(true); }}
                className="btn btn-secondary"
                style={{ fontSize: '0.85rem' }}
              >
                <PlusCircle size={16} color="#4f46e5" />
                + Asignar Materia a Grupo
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Sección Pro: Mis Grupos a Cargo (para Docente Independiente) */}
      {isIndependent && myGroups.length > 0 && (
        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px', flexWrap: 'wrap', gap: '10px' }}>
            <div>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Layers size={18} color="#4f46e5" /> Secciones y Grupos a Cargo ({myGroups.length})
              </h2>
              <p style={{ fontSize: '0.84rem', color: 'var(--text-muted)' }}>
                Grupos independientes que administras. Accede rápidamente a la nómina de estudiantes o vincula asignaturas.
              </p>
            </div>
            <button
              onClick={() => { setGroupError(null); setIsAddGroupOpen(true); }}
              className="btn btn-secondary btn-sm"
              style={{ fontWeight: 600 }}
            >
              <FolderPlus size={14} color="#6366f1" /> + Nueva Sección
            </button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '14px' }}>
            {myGroups.map(grp => {
              const grpStudents = students.filter(s => s.groupId === grp.id);
              const grpAsgs = userAssignments.filter(a => a.groupId === grp.id);
              return (
                <div key={grp.id} className="glass-panel" style={{
                  padding: '16px 18px',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: '14px',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  gap: '12px'
                }}>
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div>
                        <span className="badge" style={{ background: '#4f46e5', color: 'white', fontWeight: 700, fontSize: '0.82rem' }}>
                          Sección {grp.sectionCode}
                        </span>
                        <h3 style={{ fontSize: '1.05rem', fontWeight: 700, marginTop: '6px' }}>
                          {grp.groupName || `${grp.grade}° Grado`}
                        </h3>
                        <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                          {grp.specialty || 'General / Académico'} • Año {grp.year}
                        </div>
                      </div>
                      <span className="badge" style={{ background: 'var(--bg-surface)', color: 'var(--text-main)', fontSize: '0.78rem' }}>
                        👥 {grpStudents.length} alumnos
                      </span>
                    </div>

                    {/* Materias asignadas en este grupo */}
                    <div style={{ marginTop: '10px', display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                      {grpAsgs.length === 0 ? (
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                          Sin materias vinculadas
                        </span>
                      ) : (
                        grpAsgs.map(a => {
                          const sub = subjects.find(s => s.id === a.subjectId);
                          return (
                            <span key={a.id} style={{
                              fontSize: '0.72rem',
                              background: 'var(--bg-surface)',
                              border: `1px solid ${sub?.color || '#4f46e5'}50`,
                              color: sub?.color || 'var(--text-main)',
                              padding: '2px 8px',
                              borderRadius: '6px',
                              fontWeight: 600
                            }}>
                              {sub?.name || 'Materia'}
                            </span>
                          );
                        })
                      )}
                    </div>
                  </div>

                  {/* Acciones del grupo */}
                  <div style={{ display: 'flex', gap: '8px', paddingTop: '10px', borderTop: '1px solid var(--border-subtle)' }}>
                    <button
                      onClick={() => {
                        setStudentManagingGroupId(grp.id);
                        setIsManageStudentsOpen(true);
                      }}
                      className="btn btn-secondary btn-sm"
                      style={{ flex: 1, fontSize: '0.8rem', justifyContent: 'center' }}
                    >
                      <Users size={14} color="#10b981" />
                      Alumnos ({grpStudents.length})
                    </button>
                    <button
                      onClick={() => {
                        setAssignGroupId(grp.id);
                        setAssignError(null);
                        setIsAssignSubjectOpen(true);
                      }}
                      className="btn btn-ghost btn-sm"
                      title="Vincular materia a este grupo"
                      style={{ padding: '6px' }}
                    >
                      <PlusCircle size={15} color="#4f46e5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Smart Active Class Card */}
      {currentActiveSchedule && activeAssignment && (
        <div className="glass-panel" style={{
          padding: '20px 24px',
          background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.12) 0%, rgba(5, 150, 105, 0.08) 100%)',
          border: '1px solid rgba(16, 185, 129, 0.3)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '16px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{
              width: '48px',
              height: '48px',
              borderRadius: '14px',
              background: '#10b981',
              color: 'white',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 4px 14px rgba(16, 185, 129, 0.4)'
            }}>
              <Play size={24} />
            </div>

            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span className="badge" style={{ background: '#10b981', color: 'white' }}>
                  ● CLASE EN CURSO AHORA
                </span>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  Bloque: {currentActiveSchedule.startTime} - {currentActiveSchedule.endTime}
                  {currentActiveSchedule.classroom && ` • ${currentActiveSchedule.classroom}`}
                </span>
              </div>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 800, marginTop: '4px' }}>
                {activeGroup?.groupName || `Sección ${activeGroup?.sectionCode}`} — {activeSubject?.name}
              </h2>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <button
              onClick={() => onSelectAssignment(activeAssignment)}
              className="btn btn-primary"
              style={{ background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)' }}
            >
              <Play size={16} />
              Abrir Registro de la Clase
            </button>
          </div>
        </div>
      )}

      {/* Estado vacío si no hay asignaciones aún */}
      {userAssignments.length === 0 && (
        <div className="glass-panel" style={{
          padding: '44px 32px',
          textAlign: 'center',
          border: '2px dashed var(--border-subtle)',
          borderRadius: '18px'
        }}>
          <div style={{
            width: '64px',
            height: '64px',
            borderRadius: '20px',
            background: 'rgba(99, 102, 241, 0.1)',
            color: '#6366f1',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 16px auto'
          }}>
            <BookOpen size={32} />
          </div>
          <h3 style={{ fontSize: '1.4rem', fontWeight: 800, marginBottom: '8px' }}>
            {isIndependent ? 'Comienza a configurar tus clases independientes' : 'Aún no tienes asignaturas asignadas'}
          </h3>
          <p style={{ color: 'var(--text-muted)', maxWidth: '560px', margin: '0 auto 24px auto', fontSize: '0.95rem' }}>
            {isIndependent
              ? 'Como docente independiente puedes crear tus propias secciones (ej: 7-1, 10-A, Tutoría), agregar tus materias (ej: Español, Matemáticas) y vincularlas para comenzar con la asistencia y evaluación.'
              : 'Ponte en contacto con la dirección institucional para que asigne las secciones y materias a tu cuenta.'}
          </p>
          {isIndependent && (
            <div style={{ display: 'flex', justifyContent: 'center', gap: '12px', flexWrap: 'wrap' }}>
              <button onClick={() => { setGroupError(null); setIsAddGroupOpen(true); }} className="btn btn-secondary">
                <FolderPlus size={16} color="#6366f1" />
                1. Crear Sección
              </button>
              <button onClick={() => { setSubjectError(null); setIsAddSubjectOpen(true); }} className="btn btn-secondary">
                <BookPlus size={16} color="#06b6d4" />
                2. Crear Materia
              </button>
              <button onClick={() => { setAssignError(null); setIsAssignSubjectOpen(true); }} className="btn btn-primary">
                <PlusCircle size={16} />
                3. Vincular Materia a Sección
              </button>
            </div>
          )}
        </div>
      )}

      {/* Assigned Groups & Subjects Section */}
      {userAssignments.length > 0 && (
        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
            <div>
              <h2 style={{ fontSize: '1.3rem', fontWeight: 800 }}>
                Mis Grupos y Materias Asignadas
              </h2>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                Cada tarjeta representa una asignatura. Haz clic para abrir el registro completo con sus pestañas de asistencia, cotidiano, tareas y pruebas.
              </p>
            </div>

            <span className="badge" style={{ background: 'var(--bg-surface)', color: 'var(--text-main)' }}>
              {userAssignments.length} Asignaturas activas
            </span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '20px' }}>
            {userAssignments.map(asg => {
              const group = groups.find(g => g.id === asg.groupId);
              const subject = subjects.find(s => s.id === asg.subjectId);
              const config = evaluationConfigs.find(c => c.assignmentId === asg.id) || {
                id: 'tmp',
                assignmentId: asg.id,
                periodId: 'I_PERIODO',
                passingGrade: 70,
                periodWeight: 50,
                rubrics: []
              };

              const sectionStudents = students.filter(s => s.groupId === asg.groupId);
              const enabledRubrics = config.rubrics.filter(r => r.enabled);

              return (
                <div
                  key={asg.id}
                  className="glass-panel hover-lift"
                  style={{
                    padding: '24px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '16px',
                    border: '1px solid var(--border-subtle)',
                    cursor: 'pointer'
                  }}
                  onClick={() => onSelectAssignment(asg)}
                >
                  {/* Card Top: Group & Subject Badge */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                        <span className="badge" style={{ background: subject?.color || '#4f46e5', color: 'white', fontSize: '0.8rem', padding: '4px 10px' }}>
                          {group?.groupName || `Sección ${group?.sectionCode || '12-1'}`}
                        </span>
                        {asg.isGuia && (
                          <span className="badge" style={{ background: 'rgba(124, 58, 237, 0.15)', color: '#7c3aed' }}>
                            Docente Guía
                          </span>
                        )}
                      </div>
                      <h3 style={{ fontSize: '1.2rem', fontWeight: 800, marginTop: '8px' }}>
                        {subject?.name}
                      </h3>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                        Código: {subject?.code} • {group?.specialty || 'General'}
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onOpenRubricsConfig(asg);
                        }}
                        className="btn btn-secondary btn-sm"
                        title="Ajustar y personalizar rubros (Activar/Desactivar Portafolio, etc.)"
                        style={{ padding: '6px 10px' }}
                      >
                        <SlidersHorizontal size={14} color="#6366f1" />
                        Rubros
                      </button>

                      {isIndependent && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteAssignment(asg);
                          }}
                          className="btn btn-danger btn-sm"
                          title="Desvincular materia de la sección"
                          style={{ padding: '6px 8px', borderRadius: '8px' }}
                        >
                          <Trash2 size={13} />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Active Rubrics Pill summary */}
                  <div style={{
                    background: 'var(--bg-surface)',
                    padding: '10px 12px',
                    borderRadius: '10px',
                    fontSize: '0.78rem'
                  }}>
                    <div style={{ fontWeight: 700, color: 'var(--text-muted)', marginBottom: '4px' }}>
                      Rubros Activos ({enabledRubrics.length}):
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                      {enabledRubrics.map(r => (
                        <span key={r.id} style={{
                          background: 'var(--bg-main)',
                          border: '1px solid var(--border-subtle)',
                          borderRadius: '6px',
                          padding: '2px 6px',
                          fontSize: '0.72rem',
                          fontWeight: 600
                        }}>
                          {r.label}: <strong style={{ color: '#4f46e5' }}>{r.percentage}%</strong>
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Section stats */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.85rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ color: 'var(--text-muted)' }}>
                        Matrícula: <strong>{sectionStudents.length} estudiantes</strong>
                      </span>
                      {isIndependent && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setStudentManagingGroupId(asg.groupId);
                            setIsManageStudentsOpen(true);
                          }}
                          className="btn btn-ghost btn-sm"
                          style={{ fontSize: '0.76rem', padding: '2px 8px', color: '#10b981', display: 'flex', alignItems: 'center', gap: '4px' }}
                          title="Ver y gestionar nómina de estudiantes de esta sección"
                        >
                          <Users size={12} /> Nómina
                        </button>
                      )}
                    </div>
                    <span style={{ color: 'var(--text-muted)' }}>
                      Nota aprobación: <strong>{config.passingGrade} pts</strong>
                    </span>
                  </div>

                  {/* Primary Action Button */}
                  <div style={{
                    marginTop: 'auto',
                    paddingTop: '12px',
                    borderTop: '1px solid var(--border-subtle)'
                  }}>
                    <button
                      className="btn btn-primary"
                      style={{ width: '100%', justifyContent: 'space-between' }}
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectAssignment(asg);
                      }}
                    >
                      <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <FileSpreadsheet size={16} />
                        Abrir Registro de Calificaciones
                      </span>
                      <ArrowRight size={16} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* MODAL 1: Crear Sección / Grupo (Docente Independiente) */}
      {isAddGroupOpen && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.65)',
          backdropFilter: 'blur(6px)',
          WebkitBackdropFilter: 'blur(6px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1100,
          padding: '20px'
        }} onClick={() => setIsAddGroupOpen(false)}>
          <div className="glass-panel" style={{
            background: 'var(--bg-main)',
            border: '1px solid var(--border-subtle)',
            borderRadius: '16px',
            width: '100%',
            maxWidth: '520px',
            padding: '24px',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.45)',
            maxHeight: '90vh',
            overflowY: 'auto'
          }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Layers size={20} color="#4f46e5" />
                <h3 style={{ fontSize: '1.2rem', fontWeight: 800 }}>Crear Nueva Sección / Grupo</h3>
              </div>
              <button onClick={() => setIsAddGroupOpen(false)} className="btn btn-ghost btn-sm" style={{ padding: '4px' }}>
                <X size={18} />
              </button>
            </div>

            <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: '16px' }}>
              Crea una sección o grupo para tus clases particulares o tutorías. Luego podrás matricular a tus alumnos y vincular tus materias para evaluar con la normativa MEP.
            </p>

            {groupError && (
              <div style={{
                background: 'rgba(239, 68, 68, 0.1)',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                color: '#ef4444',
                padding: '10px 14px',
                borderRadius: '8px',
                marginBottom: '16px',
                fontSize: '0.84rem'
              }}>
                {groupError}
              </div>
            )}

            <form onSubmit={handleCreateGroup} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, marginBottom: '6px' }}>
                    Nivel / Grado *
                  </label>
                  <select
                    value={groupGrade}
                    onChange={e => setGroupGrade(e.target.value)}
                    className="input-field"
                    style={{ width: '100%', padding: '10px 14px' }}
                  >
                    <optgroup label="Secundaria">
                      <option value="7">7° Séptimo</option>
                      <option value="8">8° Octavo</option>
                      <option value="9">9° Noveno</option>
                      <option value="10">10° Décimo</option>
                      <option value="11">11° Undécimo</option>
                      <option value="12">12° Duodécimo</option>
                    </optgroup>
                    <optgroup label="Primaria">
                      <option value="1">1° Primero</option>
                      <option value="2">2° Segundo</option>
                      <option value="3">3° Tercero</option>
                      <option value="4">4° Cuarto</option>
                      <option value="5">5° Quinto</option>
                      <option value="6">6° Sexto</option>
                    </optgroup>
                    <optgroup label="Otros">
                      <option value="0">Tutoría / Preparatoria / Curso Libre</option>
                    </optgroup>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, marginBottom: '6px' }}>
                    Código de Sección *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ej. 7-1, 10-A, Tutoría-01"
                    value={groupSectionCode}
                    onChange={e => setGroupSectionCode(e.target.value)}
                    className="input-field"
                    style={{ width: '100%', padding: '10px 14px' }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, marginBottom: '6px' }}>
                  Nombre Descriptivo (Opcional)
                </label>
                <input
                  type="text"
                  placeholder="Ej. Grupo Avanzado, Tutoría Sabatina, Bachillerato MEP"
                  value={groupName}
                  onChange={e => setGroupName(e.target.value)}
                  className="input-field"
                  style={{ width: '100%', padding: '10px 14px' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, marginBottom: '6px' }}>
                  Modalidad o Especialidad (Opcional)
                </label>
                <input
                  type="text"
                  placeholder="Ej. Académico, Técnico, Preparación Pruebas Nacionales"
                  value={groupSpecialty}
                  onChange={e => setGroupSpecialty(e.target.value)}
                  className="input-field"
                  style={{ width: '100%', padding: '10px 14px' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, marginBottom: '6px' }}>
                    Año Lectivo
                  </label>
                  <input
                    type="number"
                    value={2026}
                    disabled
                    className="input-field"
                    style={{ width: '100%', padding: '10px 14px', opacity: 0.75 }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, marginBottom: '6px' }}>
                    Docente Responsable
                  </label>
                  <input
                    type="text"
                    value={currentUser.name}
                    disabled
                    className="input-field"
                    style={{ width: '100%', padding: '10px 14px', opacity: 0.75 }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '12px' }}>
                <button type="button" onClick={() => setIsAddGroupOpen(false)} className="btn btn-secondary btn-sm">
                  Cancelar
                </button>
                <button type="submit" className="btn btn-primary btn-sm">
                  Crear Sección
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: Crear Materia (Docente Independiente) */}
      {isAddSubjectOpen && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.65)',
          backdropFilter: 'blur(6px)',
          WebkitBackdropFilter: 'blur(6px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1100,
          padding: '20px'
        }} onClick={() => setIsAddSubjectOpen(false)}>
          <div className="glass-panel" style={{
            background: 'var(--bg-main)',
            border: '1px solid var(--border-subtle)',
            borderRadius: '16px',
            width: '100%',
            maxWidth: '480px',
            padding: '24px',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.45)',
            maxHeight: '90vh',
            overflowY: 'auto'
          }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <BookOpen size={20} color="#0891b2" />
                <h3 style={{ fontSize: '1.2rem', fontWeight: 800 }}>Registrar Asignatura / Materia</h3>
              </div>
              <button onClick={() => setIsAddSubjectOpen(false)} className="btn btn-ghost btn-sm" style={{ padding: '4px' }}>
                <X size={18} />
              </button>
            </div>

            <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: '16px' }}>
              Registra la materia que impartirás. Estará disponible en tus secciones para evaluar y llevar control de asistencia por lecciones.
            </p>

            {subjectError && (
              <div style={{
                background: 'rgba(239, 68, 68, 0.1)',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                color: '#ef4444',
                padding: '10px 14px',
                borderRadius: '8px',
                marginBottom: '16px',
                fontSize: '0.84rem'
              }}>
                {subjectError}
              </div>
            )}

            <form onSubmit={handleCreateSubject} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, marginBottom: '6px' }}>
                  Nombre de la Asignatura *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ej. Español, Matemáticas, Robótica, Francés..."
                  value={subjectName}
                  onChange={e => setSubjectName(e.target.value)}
                  className="input-field"
                  style={{ width: '100%', padding: '10px 14px' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, marginBottom: '6px' }}>
                    Código Abreviado
                  </label>
                  <input
                    type="text"
                    placeholder="Ej. ESP, MAT, ROB"
                    value={subjectCode}
                    onChange={e => setSubjectCode(e.target.value)}
                    className="input-field"
                    style={{ width: '100%', padding: '10px 14px' }}
                    maxLength={6}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, marginBottom: '6px' }}>
                    Color Distintivo
                  </label>
                  <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                    {['#4f46e5', '#0891b2', '#059669', '#d97706', '#dc2626', '#7c3aed'].map(c => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => setSubjectColor(c)}
                        style={{
                          width: '26px',
                          height: '26px',
                          borderRadius: '6px',
                          background: c,
                          border: subjectColor === c ? '2px solid white' : 'none',
                          boxShadow: subjectColor === c ? '0 0 0 2px #4f46e5' : 'none',
                          cursor: 'pointer'
                        }}
                      />
                    ))}
                    <input
                      type="color"
                      value={subjectColor}
                      onChange={e => setSubjectColor(e.target.value)}
                      style={{ width: '32px', height: '32px', borderRadius: '6px', border: 'none', cursor: 'pointer', background: 'transparent' }}
                    />
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '12px' }}>
                <button type="button" onClick={() => setIsAddSubjectOpen(false)} className="btn btn-secondary btn-sm">
                  Cancelar
                </button>
                <button type="submit" className="btn btn-primary btn-sm">
                  Guardar Asignatura
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: Asignar Materia a Sección (Docente Independiente) */}
      {isAssignSubjectOpen && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.65)',
          backdropFilter: 'blur(6px)',
          WebkitBackdropFilter: 'blur(6px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1100,
          padding: '20px'
        }} onClick={() => setIsAssignSubjectOpen(false)}>
          <div className="glass-panel" style={{
            background: 'var(--bg-main)',
            border: '1px solid var(--border-subtle)',
            borderRadius: '16px',
            width: '100%',
            maxWidth: '500px',
            padding: '24px',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.45)',
            maxHeight: '90vh',
            overflowY: 'auto'
          }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <UserCheck size={20} color="#4f46e5" />
                <h3 style={{ fontSize: '1.2rem', fontWeight: 800 }}>Asignar Materia a Sección</h3>
              </div>
              <button onClick={() => setIsAssignSubjectOpen(false)} className="btn btn-ghost btn-sm" style={{ padding: '4px' }}>
                <X size={18} />
              </button>
            </div>

            <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: '16px' }}>
              Vincula una materia con una sección. Habilitarás inmediatamente las tarjetas de evaluación con los rubros oficiales MEP y asistencia por lecciones.
            </p>

            {assignError && (
              <div style={{
                background: 'rgba(239, 68, 68, 0.1)',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                color: '#ef4444',
                padding: '10px 14px',
                borderRadius: '8px',
                marginBottom: '16px',
                fontSize: '0.84rem'
              }}>
                {assignError}
              </div>
            )}

            <form onSubmit={handleCreateAssignment} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, marginBottom: '6px' }}>
                  1. Seleccionar Sección / Grupo *
                </label>
                {myGroups.length === 0 ? (
                  <div style={{ padding: '12px', background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', borderRadius: '8px', fontSize: '0.85rem' }}>
                    No tienes secciones creadas todavía. Primero haz clic en "+ Nueva Sección".
                  </div>
                ) : (
                  <select
                    value={assignGroupId}
                    onChange={e => setAssignGroupId(e.target.value)}
                    className="input-field"
                    style={{ width: '100%', padding: '10px 14px' }}
                    required
                  >
                    <option value="">-- Elige la sección --</option>
                    {myGroups.map(g => (
                      <option key={g.id} value={g.id}>
                        {g.groupName || `Sección ${g.sectionCode}`} ({g.specialty || 'General'})
                      </option>
                    ))}
                  </select>
                )}
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, marginBottom: '6px' }}>
                  2. Seleccionar Materia / Asignatura *
                </label>
                {mySubjects.length === 0 ? (
                  <div style={{ padding: '12px', background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', borderRadius: '8px', fontSize: '0.85rem' }}>
                    No tienes materias creadas todavía. Primero haz clic en "+ Nueva Materia".
                  </div>
                ) : (
                  <select
                    value={assignSubjectId}
                    onChange={e => setAssignSubjectId(e.target.value)}
                    className="input-field"
                    style={{ width: '100%', padding: '10px 14px' }}
                    required
                  >
                    <option value="">-- Elige la materia --</option>
                    {mySubjects.map(s => (
                      <option key={s.id} value={s.id}>
                        {s.name} ({s.code})
                      </option>
                    ))}
                  </select>
                )}
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
                <input
                  type="checkbox"
                  id="isGuiaIndep"
                  checked={isGuiaAssignment}
                  onChange={e => setIsGuiaAssignment(e.target.checked)}
                  style={{ width: '16px', height: '16px', accentColor: '#4f46e5' }}
                />
                <label htmlFor="isGuiaIndep" style={{ fontSize: '0.84rem', cursor: 'pointer' }}>
                  Asignar también como Profesor Guía / Tutor principal de esta sección
                </label>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '12px' }}>
                <button type="button" onClick={() => setIsAssignSubjectOpen(false)} className="btn btn-secondary btn-sm">
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="btn btn-primary btn-sm"
                  disabled={myGroups.length === 0 || mySubjects.length === 0}
                >
                  Confirmar Asignación
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 4: Matrícula y Alumnos por Sección (Docente Independiente) */}
      {isManageStudentsOpen && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.65)',
          backdropFilter: 'blur(6px)',
          WebkitBackdropFilter: 'blur(6px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '20px'
        }} onClick={() => setIsManageStudentsOpen(false)}>
          <div className="glass-panel" style={{
            background: 'var(--bg-main)',
            border: '1px solid var(--border-subtle)',
            borderRadius: '18px',
            width: '100%',
            maxWidth: '1100px',
            maxHeight: '92vh',
            display: 'flex',
            flexDirection: 'column',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.45)',
            overflow: 'hidden'
          }} onClick={e => e.stopPropagation()}>
            {/* Header */}
            <div style={{
              padding: '20px 24px',
              borderBottom: '1px solid var(--border-subtle)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              background: 'var(--bg-surface)'
            }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div style={{
                    width: '38px',
                    height: '38px',
                    borderRadius: '10px',
                    background: 'rgba(16, 185, 129, 0.15)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    <Users size={22} color="#10b981" />
                  </div>
                  <div>
                    <h3 style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0 }}>
                      Alumnos por Sección y Gestión de Matrícula
                    </h3>
                    <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', margin: 0 }}>
                      Administra tus grupos a cargo, matricula alumnos con cédula TSE o listas Excel y visualiza las asignaturas impartidas.
                    </p>
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <button
                  onClick={() => { setGroupError(null); setIsAddGroupOpen(true); }}
                  className="btn btn-secondary btn-sm"
                  style={{ fontWeight: 600 }}
                >
                  <FolderPlus size={15} color="#4f46e5" />
                  + Nueva Sección
                </button>
                <button
                  onClick={() => setIsManageStudentsOpen(false)}
                  className="btn btn-ghost btn-sm"
                  style={{ padding: '6px', borderRadius: '8px' }}
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Modal Body: Scrollable */}
            <div style={{ padding: '24px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '20px', flex: 1 }}>

              {/* Selector de Sección y pestañas rápidas */}
              <div style={{
                background: 'var(--bg-surface)',
                border: '1px solid var(--border-subtle)',
                borderRadius: '14px',
                padding: '16px 20px',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1, minWidth: '260px' }}>
                    <label style={{ fontSize: '0.85rem', fontWeight: 700, whiteSpace: 'nowrap' }}>
                      Seleccionar Sección:
                    </label>
                    <select
                      value={effectiveManagingGroupId}
                      onChange={e => setStudentManagingGroupId(e.target.value)}
                      className="input-field"
                      style={{ flex: 1, padding: '8px 14px', fontWeight: 600 }}
                    >
                      {myGroups.length === 0 ? (
                        <option value="">No hay secciones creadas</option>
                      ) : (
                        myGroups.map(g => {
                          const count = students.filter(s => s.groupId === g.id).length;
                          return (
                            <option key={g.id} value={g.id}>
                              {g.groupName || `Sección ${g.sectionCode}`} ({count} {count === 1 ? 'estudiante' : 'estudiantes'})
                            </option>
                          );
                        })
                      )}
                    </select>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <button
                      onClick={() => { setGroupError(null); setIsAddGroupOpen(true); }}
                      className="btn btn-primary btn-sm"
                      style={{ background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)' }}
                    >
                      <FolderPlus size={15} />
                      Crear Otra Sección
                    </button>
                    {managingGroup && (
                      <button
                        onClick={() => handleDeleteGroup(managingGroup)}
                        className="btn btn-ghost btn-sm"
                        style={{ color: '#ef4444', padding: '6px 10px' }}
                        title="Eliminar esta sección"
                      >
                        <Trash2 size={15} />
                      </button>
                    )}
                  </div>
                </div>

                {/* Chips / Tabs de acceso rápido a cada sección */}
                {myGroups.length > 0 && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', overflowX: 'auto', paddingBottom: '4px' }}>
                    <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                      Acceso rápido:
                    </span>
                    {myGroups.map(g => {
                      const count = students.filter(s => s.groupId === g.id).length;
                      const isSelected = g.id === effectiveManagingGroupId;
                      return (
                        <button
                          key={g.id}
                          onClick={() => setStudentManagingGroupId(g.id)}
                          style={{
                            padding: '6px 12px',
                            borderRadius: '20px',
                            border: isSelected ? '1px solid #4f46e5' : '1px solid var(--border-subtle)',
                            background: isSelected ? 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)' : 'var(--bg-main)',
                            color: isSelected ? '#ffffff' : 'var(--text-main)',
                            fontSize: '0.8rem',
                            fontWeight: isSelected ? 700 : 500,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            transition: 'all 0.15s ease',
                            whiteSpace: 'nowrap'
                          }}
                        >
                          <span>{g.sectionCode}</span>
                          <span style={{
                            fontSize: '0.72rem',
                            opacity: isSelected ? 0.9 : 0.6,
                            background: isSelected ? 'rgba(255,255,255,0.2)' : 'var(--bg-surface)',
                            padding: '1px 6px',
                            borderRadius: '10px'
                          }}>
                            {count}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Si no hay grupos creados en absoluto */}
              {myGroups.length === 0 ? (
                <div style={{
                  textAlign: 'center',
                  padding: '50px 20px',
                  border: '2px dashed var(--border-subtle)',
                  borderRadius: '16px',
                  background: 'var(--bg-surface)'
                }}>
                  <div style={{
                    width: '60px',
                    height: '60px',
                    borderRadius: '16px',
                    background: 'rgba(79, 70, 229, 0.1)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    margin: '0 auto 16px auto'
                  }}>
                    <Layers size={30} color="#4f46e5" />
                  </div>
                  <h4 style={{ fontSize: '1.25rem', fontWeight: 800, marginBottom: '6px' }}>
                    Aún no tienes secciones creadas
                  </h4>
                  <p style={{ color: 'var(--text-muted)', maxWidth: '480px', margin: '0 auto 20px auto', fontSize: '0.9rem' }}>
                    Como docente independiente, crea tu primera sección (ej: 7-1, 10-A o Tutoría) para comenzar a matricular a tus alumnos.
                  </p>
                  <button
                    onClick={() => { setGroupError(null); setIsAddGroupOpen(true); }}
                    className="btn btn-primary"
                    style={{ background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)' }}
                  >
                    <FolderPlus size={16} />
                    + Crear Mi Primera Sección
                  </button>
                </div>
              ) : managingGroup && (
                <>
                  {/* Banner Detallado de la Sección Seleccionada */}
                  <div style={{
                    background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.08) 0%, rgba(79, 70, 229, 0.06) 100%)',
                    border: '1px solid rgba(16, 185, 129, 0.25)',
                    borderRadius: '14px',
                    padding: '18px 22px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    flexWrap: 'wrap',
                    gap: '16px'
                  }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                        <span className="badge" style={{ background: '#10b981', color: 'white', fontWeight: 700, fontSize: '0.85rem' }}>
                          Sección {managingGroup.sectionCode}
                        </span>
                        <h4 style={{ fontSize: '1.15rem', fontWeight: 800, margin: 0 }}>
                          {managingGroup.groupName || `${managingGroup.grade}° Grado`}
                        </h4>
                        <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                          • {managingGroup.specialty || 'General'} • Año {managingGroup.year}
                        </span>
                      </div>

                      {/* Chips de estadísticas del grupo */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '10px', flexWrap: 'wrap' }}>
                        <span style={{
                          fontSize: '0.8rem',
                          background: 'var(--bg-card)',
                          padding: '4px 10px',
                          borderRadius: '8px',
                          border: '1px solid var(--border-subtle)',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px'
                        }}>
                          <Users size={13} color="#10b981" />
                          <strong>{managingGroupStudents.length}</strong> alumnos inscritos
                        </span>

                        <span style={{
                          fontSize: '0.8rem',
                          background: 'var(--bg-card)',
                          padding: '4px 10px',
                          borderRadius: '8px',
                          border: '1px solid var(--border-subtle)',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px'
                        }}>
                          <strong>{accommodatedCount}</strong> con adecuación
                        </span>

                        {/* Materias asignadas en esta sección */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Materias:</span>
                          {groupSubjects.length === 0 ? (
                            <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                              Ninguna vinculada
                            </span>
                          ) : (
                            groupSubjects.map(asg => {
                              const s = subjects.find(sub => sub.id === asg.subjectId);
                              return (
                                <span key={asg.id} style={{
                                  fontSize: '0.72rem',
                                  background: s?.color || '#4f46e5',
                                  color: 'white',
                                  padding: '2px 8px',
                                  borderRadius: '6px',
                                  fontWeight: 600
                                }}>
                                  {s?.name || 'Materia'}
                                </span>
                              );
                            })
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Botones de Acción de Matrícula */}
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                      <button
                        onClick={() => setIsAddStudentModalOpen(true)}
                        className="btn btn-primary btn-sm"
                        style={{ background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)', fontWeight: 600 }}
                      >
                        <UserPlus size={15} />
                        + Agregar Alumno (TSE)
                      </button>
                      <button
                        onClick={() => setIsImportStudentsModalOpen(true)}
                        className="btn btn-secondary btn-sm"
                      >
                        <FileSpreadsheet size={15} color="#10b981" />
                        Importar Excel
                      </button>
                      <button
                        onClick={() => {
                          setAssignGroupId(managingGroup.id);
                          setAssignError(null);
                          setIsAssignSubjectOpen(true);
                        }}
                        className="btn btn-secondary btn-sm"
                        title="Asignar o vincular una materia a esta sección"
                      >
                        <PlusCircle size={15} color="#4f46e5" />
                        Vincular Materia
                      </button>
                    </div>
                  </div>

                  {/* Barra de Búsqueda y Filtros */}
                  {managingGroupStudents.length > 0 && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
                      <div style={{ position: 'relative', flex: 1, minWidth: '260px', maxWidth: '450px' }}>
                        <Search size={16} color="var(--text-muted)" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
                        <input
                          type="text"
                          value={studentSearchQuery}
                          onChange={e => setStudentSearchQuery(e.target.value)}
                          placeholder="Buscar por nombre, apellidos o cédula..."
                          className="input-field"
                          style={{ paddingLeft: '36px', fontSize: '0.85rem' }}
                        />
                        {studentSearchQuery && (
                          <button
                            onClick={() => setStudentSearchQuery('')}
                            style={{
                              position: 'absolute',
                              right: '10px',
                              top: '50%',
                              transform: 'translateY(-50%)',
                              background: 'transparent',
                              border: 'none',
                              color: 'var(--text-muted)',
                              cursor: 'pointer'
                            }}
                          >
                            <X size={14} />
                          </button>
                        )}
                      </div>

                      {/* Filtros de Adecuación */}
                      <div style={{ display: 'flex', gap: '6px' }}>
                        <button
                          onClick={() => setStudentAccommodationFilter('ALL')}
                          className={`btn btn-sm ${studentAccommodationFilter === 'ALL' ? 'btn-primary' : 'btn-secondary'}`}
                          style={{ fontSize: '0.78rem' }}
                        >
                          Todos ({managingGroupStudents.length})
                        </button>
                        <button
                          onClick={() => setStudentAccommodationFilter('ACCOMMODATED')}
                          className={`btn btn-sm ${studentAccommodationFilter === 'ACCOMMODATED' ? 'btn-primary' : 'btn-secondary'}`}
                          style={{ fontSize: '0.78rem' }}
                        >
                          Con Adecuación ({accommodatedCount})
                        </button>
                        <button
                          onClick={() => setStudentAccommodationFilter('NONE')}
                          className={`btn btn-sm ${studentAccommodationFilter === 'NONE' ? 'btn-primary' : 'btn-secondary'}`}
                          style={{ fontSize: '0.78rem' }}
                        >
                          Sin Adecuación ({managingGroupStudents.length - accommodatedCount})
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Tabla de Estudiantes */}
                  {managingGroupStudents.length === 0 ? (
                    <div style={{
                      textAlign: 'center',
                      padding: '44px 20px',
                      border: '1px dashed var(--border-subtle)',
                      borderRadius: '14px',
                      background: 'var(--bg-surface)'
                    }}>
                      <div style={{
                        width: '52px',
                        height: '52px',
                        borderRadius: '14px',
                        background: 'rgba(16, 185, 129, 0.1)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        margin: '0 auto 12px auto'
                      }}>
                        <UserPlus size={26} color="#10b981" />
                      </div>
                      <h5 style={{ fontSize: '1.1rem', fontWeight: 800, marginBottom: '6px' }}>
                        Esta sección aún no tiene estudiantes matriculados
                      </h5>
                      <p style={{ color: 'var(--text-muted)', maxWidth: '460px', margin: '0 auto 18px auto', fontSize: '0.88rem' }}>
                        Puedes agregar alumnos individualmente con su número de cédula costarricense (validación TSE automática) o cargar la lista completa desde un archivo Excel.
                      </p>
                      <div style={{ display: 'flex', justifyContent: 'center', gap: '10px', flexWrap: 'wrap' }}>
                        <button
                          onClick={() => setIsAddStudentModalOpen(true)}
                          className="btn btn-primary btn-sm"
                          style={{ background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)' }}
                        >
                          <UserPlus size={15} /> Registrar Alumno (Cédula TSE)
                        </button>
                        <button
                          onClick={() => setIsImportStudentsModalOpen(true)}
                          className="btn btn-secondary btn-sm"
                        >
                          <FileSpreadsheet size={15} color="#10b981" /> Importar Lista Excel
                        </button>
                      </div>
                    </div>
                  ) : filteredManagingGroupStudents.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)' }}>
                      No se encontraron estudiantes con los filtros seleccionados.
                      <button
                        onClick={() => { setStudentSearchQuery(''); setStudentAccommodationFilter('ALL'); }}
                        className="btn btn-ghost btn-sm"
                        style={{ marginLeft: '8px' }}
                      >
                        Limpiar filtros
                      </button>
                    </div>
                  ) : (
                    <div style={{
                      border: '1px solid var(--border-subtle)',
                      borderRadius: '12px',
                      overflow: 'hidden',
                      maxHeight: '420px',
                      overflowY: 'auto'
                    }}>
                      <table className="table" style={{ width: '100%', fontSize: '0.88rem' }}>
                        <thead style={{ position: 'sticky', top: 0, background: 'var(--bg-surface)', zIndex: 1 }}>
                          <tr>
                            <th style={{ width: '45px' }}>#</th>
                            <th style={{ minWidth: '130px' }}>Cédula / Identificación</th>
                            <th>Primer Apellido</th>
                            <th>Segundo Apellido</th>
                            <th>Nombre Completo</th>
                            <th style={{ minWidth: '140px' }}>Adecuación</th>
                            <th>Contacto Encargado</th>
                            <th style={{ textAlign: 'right', width: '80px' }}>Acción</th>
                          </tr>
                        </thead>
                        <tbody>
                          {filteredManagingGroupStudents.map((st, idx) => (
                            <tr key={st.id}>
                              <td style={{ color: 'var(--text-muted)' }}>{idx + 1}</td>
                              <td style={{ fontWeight: 700, fontFamily: 'monospace', letterSpacing: '0.02em' }}>
                                {st.idNumber}
                              </td>
                              <td style={{ fontWeight: 600 }}>{st.firstLastName}</td>
                              <td>{st.secondLastName || '-'}</td>
                              <td style={{ fontWeight: 600 }}>{st.firstName}</td>
                              <td>
                                {st.accommodation === 'ACCESS' ? (
                                  <span className="badge" style={{ background: 'rgba(59, 130, 246, 0.15)', color: '#2563eb', fontSize: '0.75rem' }}>
                                    Acceso
                                  </span>
                                ) : st.accommodation === 'NON_SIGNIFICANT' ? (
                                  <span className="badge" style={{ background: 'rgba(245, 158, 11, 0.15)', color: '#d97706', fontSize: '0.75rem' }}>
                                    No Significativa
                                  </span>
                                ) : st.accommodation === 'SIGNIFICANT' ? (
                                  <span className="badge" style={{ background: 'rgba(239, 68, 68, 0.15)', color: '#dc2626', fontSize: '0.75rem' }}>
                                    Significativa
                                  </span>
                                ) : (
                                  <span style={{ color: 'var(--text-muted)', fontSize: '0.78rem' }}>Ordinaria</span>
                                )}
                              </td>
                              <td style={{ fontSize: '0.82rem', color: st.parentContact ? 'var(--text-main)' : 'var(--text-muted)' }}>
                                {st.parentContact || 'No especificado'}
                              </td>
                              <td style={{ textAlign: 'right' }}>
                                <button
                                  onClick={() => handleDeleteStudent(st)}
                                  className="btn btn-ghost btn-sm"
                                  title="Desmatricular alumno de esta sección"
                                  style={{ padding: '4px 8px', color: '#ef4444' }}
                                >
                                  <Trash2 size={14} />
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Modal Footer */}
            <div style={{
              padding: '14px 24px',
              borderTop: '1px solid var(--border-subtle)',
              background: 'var(--bg-surface)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                {managingGroup ? `Sección ${managingGroup.sectionCode} • ${managingGroupStudents.length} estudiantes registrados` : ''}
              </span>
              <button
                onClick={() => setIsManageStudentsOpen(false)}
                className="btn btn-secondary btn-sm"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Sub-modal: Agregar Estudiante individual */}
      {isAddStudentModalOpen && managingGroup && (
        <AddStudentModal
          groupId={managingGroup.id}
          existingStudents={managingGroupStudents}
          onClose={() => setIsAddStudentModalOpen(false)}
          onStudentAdded={(newStudent) => {
            setIsAddStudentModalOpen(false);
            if (onDataChanged) onDataChanged();
          }}
        />
      )}

      {/* Sub-modal: Importar Estudiantes desde Excel */}
      {isImportStudentsModalOpen && managingGroup && (
        <ImportStudentsModal
          groupId={managingGroup.id}
          existingStudents={managingGroupStudents}
          onClose={() => setIsImportStudentsModalOpen(false)}
          onImportComplete={(count) => {
            setIsImportStudentsModalOpen(false);
            if (onDataChanged) onDataChanged();
          }}
        />
      )}

      {/* Modal de confirmación genérico */}
      <ConfirmModal
        isOpen={confirmModalConfig.isOpen}
        title={confirmModalConfig.title}
        message={confirmModalConfig.message}
        type={confirmModalConfig.type || 'danger'}
        confirmText={confirmModalConfig.confirmText || 'Confirmar'}
        onConfirm={confirmModalConfig.onConfirm}
        onClose={() => setConfirmModalConfig(prev => ({ ...prev, isOpen: false }))}
      />
    </div>
  );
};

