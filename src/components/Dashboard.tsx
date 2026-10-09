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
  GraduationCap
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
    if (onDataChanged) onDataChanged();
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
    ? groups.filter(g => g.guideTeacherId === currentUser.id || userAssignments.some(a => a.groupId === g.id))
    : groups;

  const mySubjects = isIndependent
    ? subjects.filter(s => !s.teacherId || s.teacherId === currentUser.id || userAssignments.some(a => a.subjectId === s.id))
    : subjects;

  const myGroupIds = new Set(myGroups.map(g => g.id));
  const myStudents = students.filter(s => myGroupIds.has(s.groupId));

  const managingGroup = myGroups.find(g => g.id === studentManagingGroupId) || (myGroups.length > 0 ? myGroups[0] : null);
  const managingGroupStudents = managingGroup ? students.filter(s => s.groupId === managingGroup.id) : [];

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
              {new Set(userAssignments.map(a => a.groupId)).size} Grupos
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
          padding: '20px 24px',
          background: 'linear-gradient(135deg, rgba(79, 70, 229, 0.08) 0%, rgba(14, 165, 233, 0.08) 100%)',
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
                  Gestión Autónoma de Secciones, Materias y Matrícula
                </span>
              </div>
              <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                Crea tus propias secciones, las materias que impartirás, vincúlalas y administra a tus estudiantes sin necesidad de un director.
              </p>
            </div>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
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
                className="btn btn-primary"
                style={{ fontSize: '0.85rem', background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)' }}
              >
                <PlusCircle size={16} />
                + Asignar Materia a Grupo
              </button>
              <button
                onClick={() => {
                  if (myGroups.length > 0 && !studentManagingGroupId) {
                    setStudentManagingGroupId(myGroups[0].id);
                  }
                  setIsManageStudentsOpen(true);
                }}
                className="btn btn-secondary"
                style={{ fontSize: '0.85rem' }}
              >
                <Users size={16} color="#10b981" />
                Alumnos por Sección
              </button>
            </div>
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
                    <span style={{ color: 'var(--text-muted)' }}>
                      Matrícula: <strong>{sectionStudents.length} estudiantes</strong>
                    </span>
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
        <div className="modal-overlay" onClick={() => setIsAddGroupOpen(false)}>
          <div className="modal-content glass-panel" style={{ maxWidth: '480px' }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ width: '38px', height: '38px', borderRadius: '10px', background: 'rgba(99, 102, 241, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#6366f1' }}>
                  <FolderPlus size={20} />
                </div>
                <div>
                  <h3 style={{ fontSize: '1.2rem', fontWeight: 800 }}>Nueva Sección / Grupo</h3>
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Crea un grupo para tus clases particulares</p>
                </div>
              </div>
              <button onClick={() => setIsAddGroupOpen(false)} className="btn btn-icon">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateGroup} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ fontSize: '0.85rem', fontWeight: 600, display: 'block', marginBottom: '6px' }}>
                  Nivel / Grado
                </label>
                <select
                  value={groupGrade}
                  onChange={e => setGroupGrade(e.target.value)}
                  className="input-field"
                  style={{ width: '100%' }}
                >
                  <optgroup label="Secundaria">
                    <option value="7">7° Año (Sétimo)</option>
                    <option value="8">8° Año (Octavo)</option>
                    <option value="9">9° Año (Noveno)</option>
                    <option value="10">10° Año (Décimo)</option>
                    <option value="11">11° Año (Undécimo)</option>
                    <option value="12">12° Año (Duodécimo / Técnico)</option>
                  </optgroup>
                  <optgroup label="Primaria">
                    <option value="1">1° Grado (Primer Grado)</option>
                    <option value="2">2° Grado (Segundo Grado)</option>
                    <option value="3">3° Grado (Tercer Grado)</option>
                    <option value="4">4° Grado (Cuarto Grado)</option>
                    <option value="5">5° Grado (Quinto Grado)</option>
                    <option value="6">6° Grado (Sexto Grado)</option>
                  </optgroup>
                  <optgroup label="Otros">
                    <option value="0">Tutoría / Curso Libre / Particular</option>
                  </optgroup>
                </select>
              </div>

              <div>
                <label style={{ fontSize: '0.85rem', fontWeight: 600, display: 'block', marginBottom: '6px' }}>
                  Código o Número de Sección <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <input
                  type="text"
                  placeholder="Ej: 7-1, 10-A, Tutoría-01, Grupo B"
                  value={groupSectionCode}
                  onChange={e => setGroupSectionCode(e.target.value)}
                  className="input-field"
                  style={{ width: '100%' }}
                  required
                />
              </div>

              <div>
                <label style={{ fontSize: '0.85rem', fontWeight: 600, display: 'block', marginBottom: '6px' }}>
                  Nombre Descriptivo (Opcional)
                </label>
                <input
                  type="text"
                  placeholder="Ej: Grupo Avanzado, Taller Sabatino"
                  value={groupName}
                  onChange={e => setGroupName(e.target.value)}
                  className="input-field"
                  style={{ width: '100%' }}
                />
              </div>

              <div>
                <label style={{ fontSize: '0.85rem', fontWeight: 600, display: 'block', marginBottom: '6px' }}>
                  Especialidad / Modalidad (Opcional)
                </label>
                <input
                  type="text"
                  placeholder="Ej: Académico, Técnico, Libre"
                  value={groupSpecialty}
                  onChange={e => setGroupSpecialty(e.target.value)}
                  className="input-field"
                  style={{ width: '100%' }}
                />
              </div>

              {groupError && (
                <div style={{ color: '#ef4444', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <AlertCircle size={14} /> {groupError}
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '8px' }}>
                <button type="button" onClick={() => setIsAddGroupOpen(false)} className="btn btn-secondary">
                  Cancelar
                </button>
                <button type="submit" className="btn btn-primary">
                  <Check size={16} /> Crear Sección
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: Crear Materia (Docente Independiente) */}
      {isAddSubjectOpen && (
        <div className="modal-overlay" onClick={() => setIsAddSubjectOpen(false)}>
          <div className="modal-content glass-panel" style={{ maxWidth: '480px' }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ width: '38px', height: '38px', borderRadius: '10px', background: 'rgba(6, 182, 212, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#06b6d4' }}>
                  <BookPlus size={20} />
                </div>
                <div>
                  <h3 style={{ fontSize: '1.2rem', fontWeight: 800 }}>Nueva Materia / Asignatura</h3>
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Materia que impartirás</p>
                </div>
              </div>
              <button onClick={() => setIsAddSubjectOpen(false)} className="btn btn-icon">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateSubject} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ fontSize: '0.85rem', fontWeight: 600, display: 'block', marginBottom: '6px' }}>
                  Nombre de la Materia <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <input
                  type="text"
                  placeholder="Ej: Español, Matemáticas, Robótica, Francés"
                  value={subjectName}
                  onChange={e => setSubjectName(e.target.value)}
                  className="input-field"
                  style={{ width: '100%' }}
                  required
                />
              </div>

              <div>
                <label style={{ fontSize: '0.85rem', fontWeight: 600, display: 'block', marginBottom: '6px' }}>
                  Código Corto (Opcional)
                </label>
                <input
                  type="text"
                  placeholder="Ej: ESP, MAT, ROB, FRA"
                  value={subjectCode}
                  onChange={e => setSubjectCode(e.target.value)}
                  className="input-field"
                  style={{ width: '100%' }}
                  maxLength={6}
                />
              </div>

              <div>
                <label style={{ fontSize: '0.85rem', fontWeight: 600, display: 'block', marginBottom: '6px' }}>
                  Color Distintivo
                </label>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  {['#4f46e5', '#06b6d4', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'].map(c => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setSubjectColor(c)}
                      style={{
                        width: '32px',
                        height: '32px',
                        borderRadius: '8px',
                        background: c,
                        border: subjectColor === c ? '3px solid white' : 'none',
                        boxShadow: subjectColor === c ? '0 0 0 2px #4f46e5' : 'none',
                        cursor: 'pointer'
                      }}
                    />
                  ))}
                  <input
                    type="color"
                    value={subjectColor}
                    onChange={e => setSubjectColor(e.target.value)}
                    style={{ width: '36px', height: '36px', borderRadius: '8px', border: 'none', cursor: 'pointer' }}
                  />
                </div>
              </div>

              {subjectError && (
                <div style={{ color: '#ef4444', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <AlertCircle size={14} /> {subjectError}
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '8px' }}>
                <button type="button" onClick={() => setIsAddSubjectOpen(false)} className="btn btn-secondary">
                  Cancelar
                </button>
                <button type="submit" className="btn btn-primary">
                  <Check size={16} /> Crear Materia
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: Asignar Materia a Sección (Docente Independiente) */}
      {isAssignSubjectOpen && (
        <div className="modal-overlay" onClick={() => setIsAssignSubjectOpen(false)}>
          <div className="modal-content glass-panel" style={{ maxWidth: '480px' }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ width: '38px', height: '38px', borderRadius: '10px', background: 'rgba(124, 58, 237, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#7c3aed' }}>
                  <PlusCircle size={20} />
                </div>
                <div>
                  <h3 style={{ fontSize: '1.2rem', fontWeight: 800 }}>Vincular Materia a Sección</h3>
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Habilita la evaluación y registro para este grupo</p>
                </div>
              </div>
              <button onClick={() => setIsAssignSubjectOpen(false)} className="btn btn-icon">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateAssignment} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ fontSize: '0.85rem', fontWeight: 600, display: 'block', marginBottom: '6px' }}>
                  Selecciona la Sección / Grupo <span style={{ color: '#ef4444' }}>*</span>
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
                    style={{ width: '100%' }}
                    required
                  >
                    <option value="">-- Elige una sección --</option>
                    {myGroups.map(g => (
                      <option key={g.id} value={g.id}>
                        {g.groupName || `Sección ${g.sectionCode}`} ({g.specialty || 'General'})
                      </option>
                    ))}
                  </select>
                )}
              </div>

              <div>
                <label style={{ fontSize: '0.85rem', fontWeight: 600, display: 'block', marginBottom: '6px' }}>
                  Selecciona la Materia <span style={{ color: '#ef4444' }}>*</span>
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
                    style={{ width: '100%' }}
                    required
                  >
                    <option value="">-- Elige una materia --</option>
                    {mySubjects.map(s => (
                      <option key={s.id} value={s.id}>
                        {s.name} ({s.code})
                      </option>
                    ))}
                  </select>
                )}
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 0' }}>
                <input
                  type="checkbox"
                  id="isGuiaIndep"
                  checked={isGuiaAssignment}
                  onChange={e => setIsGuiaAssignment(e.target.checked)}
                  style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                />
                <label htmlFor="isGuiaIndep" style={{ fontSize: '0.88rem', cursor: 'pointer' }}>
                  Soy el docente guía / tutor principal de esta sección
                </label>
              </div>

              {assignError && (
                <div style={{ color: '#ef4444', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <AlertCircle size={14} /> {assignError}
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '8px' }}>
                <button type="button" onClick={() => setIsAssignSubjectOpen(false)} className="btn btn-secondary">
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={myGroups.length === 0 || mySubjects.length === 0}
                >
                  <Check size={16} /> Vincular y Habilitar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 4: Matrícula y Alumnos por Sección (Docente Independiente) */}
      {isManageStudentsOpen && (
        <div className="modal-overlay" onClick={() => setIsManageStudentsOpen(false)}>
          <div className="modal-content glass-panel" style={{ maxWidth: '820px', width: '95%' }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ width: '42px', height: '42px', borderRadius: '12px', background: 'rgba(16, 185, 129, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#10b981' }}>
                  <Users size={22} />
                </div>
                <div>
                  <h3 style={{ fontSize: '1.3rem', fontWeight: 800 }}>Matrícula y Alumnos por Sección</h3>
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Agrega estudiantes o importa tu lista desde Excel para tus grupos</p>
                </div>
              </div>
              <button onClick={() => setIsManageStudentsOpen(false)} className="btn btn-icon">
                <X size={20} />
              </button>
            </div>

            {/* Selector de Grupo */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '14px', background: 'var(--bg-surface)', padding: '14px 18px', borderRadius: '12px', marginBottom: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1, minWidth: '220px' }}>
                <span style={{ fontSize: '0.85rem', fontWeight: 700 }}>Sección activa:</span>
                <select
                  value={studentManagingGroupId}
                  onChange={e => setStudentManagingGroupId(e.target.value)}
                  className="input-field"
                  style={{ flex: 1 }}
                >
                  {myGroups.map(g => (
                    <option key={g.id} value={g.id}>
                      {g.groupName || `Sección ${g.sectionCode}`} ({students.filter(s => s.groupId === g.id).length} estudiantes)
                    </option>
                  ))}
                </select>
              </div>

              {managingGroup && (
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    onClick={() => setIsAddStudentModalOpen(true)}
                    className="btn btn-secondary btn-sm"
                  >
                    <UserPlus size={15} color="#4f46e5" />
                    + Agregar Alumno
                  </button>
                  <button
                    onClick={() => setIsImportStudentsModalOpen(true)}
                    className="btn btn-secondary btn-sm"
                  >
                    <FileSpreadsheet size={15} color="#10b981" />
                    Importar Excel
                  </button>
                </div>
              )}
            </div>

            {/* Lista de Alumnos */}
            {!managingGroup ? (
              <div style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)' }}>
                No tienes secciones creadas todavía. Crea una sección primero.
              </div>
            ) : managingGroupStudents.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px 20px', border: '1px dashed var(--border-subtle)', borderRadius: '12px' }}>
                <p style={{ color: 'var(--text-muted)', marginBottom: '14px' }}>
                  Esta sección aún no tiene estudiantes matriculados.
                </p>
                <div style={{ display: 'flex', justifyContent: 'center', gap: '10px' }}>
                  <button onClick={() => setIsAddStudentModalOpen(true)} className="btn btn-primary btn-sm">
                    <UserPlus size={15} /> Registrar Alumno Individual (con Cédula TSE)
                  </button>
                  <button onClick={() => setIsImportStudentsModalOpen(true)} className="btn btn-secondary btn-sm">
                    <FileSpreadsheet size={15} /> Importar Lista Excel
                  </button>
                </div>
              </div>
            ) : (
              <div style={{ maxHeight: '380px', overflowY: 'auto' }}>
                <table className="table" style={{ width: '100%', fontSize: '0.88rem' }}>
                  <thead>
                    <tr>
                      <th style={{ width: '40px' }}>#</th>
                      <th>Cédula / Identificación</th>
                      <th>Apellidos</th>
                      <th>Nombre</th>
                      <th>Adecuación</th>
                      <th style={{ textAlign: 'right' }}>Acción</th>
                    </tr>
                  </thead>
                  <tbody>
                    {managingGroupStudents.map((st, idx) => (
                      <tr key={st.id}>
                        <td style={{ color: 'var(--text-muted)' }}>{idx + 1}</td>
                        <td style={{ fontWeight: 600 }}>{st.idNumber}</td>
                        <td>{st.firstLastName} {st.secondLastName}</td>
                        <td style={{ fontWeight: 600 }}>{st.firstName}</td>
                        <td>
                          {st.accommodation !== 'NONE' ? (
                            <span className="badge" style={{ background: 'rgba(245, 158, 11, 0.15)', color: '#d97706', fontSize: '0.75rem' }}>
                              {st.accommodation}
                            </span>
                          ) : (
                            <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>Ninguna</span>
                          )}
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <button
                            onClick={() => handleDeleteStudent(st)}
                            className="btn btn-danger btn-sm"
                            title="Desmatricular de la sección"
                            style={{ padding: '4px 8px' }}
                          >
                            <Trash2 size={13} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '20px' }}>
              <button onClick={() => setIsManageStudentsOpen(false)} className="btn btn-secondary">
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

