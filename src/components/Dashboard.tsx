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
  Filter,
  UploadCloud,
  FileText,
  Building2
} from 'lucide-react';
import type {
  User,
  Institution,
  Group,
  Subject,
  TeacherAssignment,
  Student,
  EvaluationConfig,
  ScheduleItem,
  InstitutionType
} from '../types';
import { db } from '../db';
import { AddStudentModal } from './AddStudentModal';
import { ImportStudentsModal } from './ImportStudentsModal';
import { ConfirmModal } from './ConfirmModal';
import { SectionReportModal } from './SectionReportModal';

interface DashboardProps {
  currentUser: User;
  currentInstitution: Institution;
  allInstitutions?: Institution[];
  groups: Group[];
  subjects: Subject[];
  assignments: TeacherAssignment[];
  students: Student[];
  evaluationConfigs: EvaluationConfig[];
  schedules: ScheduleItem[];
  activeTab?: 'overview' | 'sections' | 'schedule' | 'independent';
  onSelectTab?: (tab: 'overview' | 'sections' | 'schedule' | 'independent') => void;
  onSelectAssignment: (assignment: TeacherAssignment) => void;
  onOpenRubricsConfig: (assignment: TeacherAssignment) => void;
  onOpenSchedule: () => void;
  onSwitchInstitution?: (institutionId: string) => void;
  onDataChanged?: () => void;
}

export const Dashboard: React.FC<DashboardProps> = ({
  currentUser,
  currentInstitution,
  allInstitutions = [],
  groups,
  subjects,
  assignments,
  students,
  evaluationConfigs,
  schedules,
  activeTab = 'overview',
  onSelectTab,
  onSelectAssignment,
  onOpenRubricsConfig,
  onOpenSchedule,
  onSwitchInstitution,
  onDataChanged
}) => {
  const userAssignments = assignments.filter(a => a.teacherId === currentUser.id);
  const isIndependent = currentInstitution.type === 'INDEPENDENT' || currentUser.institutionId === 'inst-indep-01';

  // Instituciones a las que está vinculado el docente (para permitir cambiar sólo entre sus sedes autorizadas)
  const teacherLinkedInstitutions = React.useMemo(() => {
    if (currentUser.role === 'DEVELOPER') {
      return allInstitutions;
    }
    const ids = new Set<string>();
    if (currentUser.institutionId) ids.add(currentUser.institutionId);
    if (currentUser.institutionIds && Array.isArray(currentUser.institutionIds)) {
      currentUser.institutionIds.forEach(id => {
        if (id) ids.add(id);
      });
    }
    // Añadir instituciones donde el docente tenga asignaciones de clases o sea guía
    assignments.filter(a => a.teacherId === currentUser.id).forEach(a => {
      const grp = groups.find(g => g.id === a.groupId);
      if (grp?.institutionId) ids.add(grp.institutionId);
    });
    groups.filter(g => g.guideTeacherId === currentUser.id).forEach(g => {
      if (g.institutionId) ids.add(g.institutionId);
    });
    const list = allInstitutions.filter(inst => ids.has(inst.id));
    return list.length > 0 ? list : (currentInstitution ? [currentInstitution] : []);
  }, [currentUser, allInstitutions, assignments, groups, currentInstitution]);

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
  const [groupInstitutionId, setGroupInstitutionId] = useState<string>(currentInstitution.id);
  const [groupInstitutionName, setGroupInstitutionName] = useState<string>(currentInstitution.name);
  const [groupError, setGroupError] = useState<string | null>(null);

  // Modal para registrar nueva institución (para independientes con múltiples centros educativos)
  const [isAddNewInstModalOpen, setIsAddNewInstModalOpen] = useState(false);
  const [newInstName, setNewInstName] = useState('');
  const [newInstCode, setNewInstCode] = useState('');
  const [newInstType, setNewInstType] = useState<InstitutionType>('COLLEGE');
  const [selectedInstFilter, setSelectedInstFilter] = useState<'ALL' | string>('ALL');

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
  const [sectionModalForGrading, setSectionModalForGrading] = useState<Group | null>(null);

  // Filtros de Secciones a Cargo en el Dashboard (idéntico a DirectorView)
  const [sectionSearchQuery, setSectionSearchQuery] = useState('');
  const [selectedGradeFilter, setSelectedGradeFilter] = useState<number | 'ALL'>('ALL');

  const getGradeLabel = (grade: number) => {
    switch (grade) {
      case 1: return 'Primeros (1°)';
      case 2: return 'Segundos (2°)';
      case 3: return 'Terceros (3°)';
      case 4: return 'Cuartos (4°)';
      case 5: return 'Quintos (5°)';
      case 6: return 'Sextos (6°)';
      case 7: return 'Sétimos (7°)';
      case 8: return 'Octavos (8°)';
      case 9: return 'Novenos (9°)';
      case 10: return 'Décimos (10°)';
      case 11: return 'Undécimos (11°)';
      case 12: return 'Duodécimos (12°)';
      default: return `${grade}° Año`;
    }
  };

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

  // Modal de Reportes / Boletines Oficiales de Sección
  const [reportSectionGroup, setReportSectionGroup] = useState<Group | null>(null);

  // Transición y Vinculación a Institución Formal
  const [isLinkToInstOpen, setIsLinkToInstOpen] = useState(false);
  const [targetInstId, setTargetInstId] = useState('');
  const [availableInstitutions, setAvailableInstitutions] = useState<Institution[]>([]);
  const [linkInstSuccess, setLinkInstSuccess] = useState<string | null>(null);
  const [linkInstError, setLinkInstError] = useState<string | null>(null);

  useEffect(() => {
    if (isIndependent) {
      db.institutions.toArray().then(insts => {
        const formal = insts.filter(i => i.id !== currentInstitution.id && i.type !== 'INDEPENDENT');
        setAvailableInstitutions(formal);
        if (formal.length > 0) {
          setTargetInstId(formal[0].id);
        }
      });
    }
  }, [isIndependent, currentInstitution.id]);

  const handleLinkToInstitution = async (e: React.FormEvent) => {
    e.preventDefault();
    setLinkInstError(null);
    if (!targetInstId) {
      setLinkInstError('Selecciona una institución de destino.');
      return;
    }
    const target = availableInstitutions.find(i => i.id === targetInstId);
    if (!target) {
      setLinkInstError('Institución no encontrada.');
      return;
    }

    try {
      for (const g of allTeacherSections) {
        await db.groups.update(g.id, { institutionId: target.id });
      }
      const mySubjects = subjects.filter(s => s.teacherId === currentUser.id);
      for (const s of mySubjects) {
        await db.subjects.update(s.id, { institutionId: target.id });
      }
      await db.users.update(currentUser.id, { institutionId: target.id });

      setLinkInstSuccess(`¡Secciones y materias vinculadas con éxito a "${target.name}"!`);
      setTimeout(() => {
        setIsLinkToInstOpen(false);
        if (onDataChanged) onDataChanged();
        window.location.reload();
      }, 1200);
    } catch (err) {
      console.error(err);
      setLinkInstError('Error al transferir las secciones.');
    }
  };

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
      } else {
        setCurrentActiveSchedule(null);
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

  // Clases programadas para el día de hoy
  const now = new Date();
  const currentDayOfWeek = now.getDay();
  const daysNames = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
  const todayDayName = daysNames[currentDayOfWeek];
  const currentTimeFormatted = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

  const todaySchedules = schedules
    .filter(s => s.teacherId === currentUser.id && s.dayOfWeek === currentDayOfWeek)
    .sort((a, b) => a.startTime.localeCompare(b.startTime));

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
      institutionId: groupInstitutionId || currentInstitution.id,
      institutionName: groupInstitutionName || currentInstitution.name,
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

  // Registrar nueva institución desde el panel independiente
  const handleAddNewInstitution = async (e: React.FormEvent) => {
    e.preventDefault();
    const name = newInstName.trim();
    if (!name) return;

    const newInst: Institution = {
      id: `inst-cust-${Date.now()}`,
      name,
      code: (newInstCode.trim() || name.substring(0, 4)).toUpperCase(),
      type: newInstType,
      createdAt: new Date().toISOString()
    };

    await db.institutions.add(newInst);
    setGroupInstitutionId(newInst.id);
    setGroupInstitutionName(newInst.name);
    setIsAddNewInstModalOpen(false);
    setNewInstName('');
    setNewInstCode('');
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

  // Secciones base del docente
  const allTeacherSections = isIndependent
    ? myGroups
    : groups.filter(g => userAssignments.some(a => a.groupId === g.id));

  // Instituciones únicas presentes en las secciones del docente
  const availableInstitutionsInSections = Array.from(
    new Set(allTeacherSections.map(g => g.institutionId))
  ).map(instId => {
    const inst = allInstitutions.find(i => i.id === instId);
    const customName = allTeacherSections.find(g => g.institutionId === instId)?.institutionName;
    return {
      id: instId,
      name: inst?.name || customName || 'Institución'
    };
  });

  const availableGrades = Array.from(new Set(allTeacherSections.map(g => g.grade))).sort((a, b) => a - b);

  // Filtrado reactivo de Secciones / Grupos (idéntico a DirectorView)
  const sectionsToDisplay = allTeacherSections.filter(grp => {
    if (selectedGradeFilter !== 'ALL' && grp.grade !== selectedGradeFilter) {
      return false;
    }

    if (selectedInstFilter !== 'ALL' && grp.institutionId !== selectedInstFilter) {
      return false;
    }

    if (sectionSearchQuery.trim()) {
      const q = sectionSearchQuery.toLowerCase().trim();
      const isNumericOnly = /^\d+$/.test(q);

      if (isNumericOnly) {
        const gradeMatch = grp.grade.toString() === q;
        const codeStartsWith = grp.sectionCode.toLowerCase().startsWith(q);
        const codePrefixMatch = grp.sectionCode.toLowerCase().split(/[-_.\s]/)[0] === q;
        const groupNameHasNumber = grp.groupName
          ? new RegExp(`\\b${q}\\b`, 'i').test(grp.groupName) || grp.groupName.toLowerCase().startsWith(q)
          : false;

        return gradeMatch || codeStartsWith || codePrefixMatch || groupNameHasNumber;
      }

      const codeMatch = grp.sectionCode.toLowerCase().includes(q);
      const nameMatch = grp.groupName ? grp.groupName.toLowerCase().includes(q) : false;
      const specMatch = grp.specialty ? grp.specialty.toLowerCase().includes(q) : false;

      const secAsgs = userAssignments.filter(a => a.groupId === grp.id);
      const subjectMatch = secAsgs.some(a => {
        const sub = subjects.find(s => s.id === a.subjectId);
        return sub && sub.name.toLowerCase().includes(q);
      });

      return codeMatch || nameMatch || specMatch || subjectMatch;
    }

    return true;
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
      {/* Welcome Banner (Solo en pantalla de Inicio / Resumen) */}
      {activeTab === 'overview' && (
        <div className="glass-panel" style={{
          padding: '32px 36px',
          background: 'linear-gradient(135deg, rgba(79, 70, 229, 0.1) 0%, rgba(124, 58, 237, 0.05) 100%)',
          border: '1px solid rgba(79, 70, 229, 0.2)',
          borderRadius: '24px',
          position: 'relative',
          overflow: 'hidden'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '20px' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px', flexWrap: 'wrap' }}>
                <span className="badge" style={{ background: isIndependent ? '#4f46e5' : 'rgba(79, 70, 229, 0.18)', color: isIndependent ? '#ffffff' : '#4f46e5', fontWeight: 800 }}>
                  <Sparkles size={12} /> {isIndependent ? 'Docente Independiente' : (currentUser.title || 'Docente')}
                </span>
                <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                  {todayFormatted}
                </span>
                <span className="badge" style={{
                  background: 'var(--bg-card)',
                  color: 'var(--primary-600)',
                  border: '1px solid var(--border-subtle)',
                  fontWeight: 700,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px'
                }}>
                  <Building2 size={13} /> {currentInstitution.name}
                </span>
              </div>
              <h1 style={{ fontSize: '2rem', fontWeight: 900, letterSpacing: '-0.03em', lineHeight: 1.2 }}>
                ¡Hola, <span className="gradient-text">{currentUser.name}</span>!
              </h1>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.96rem', marginTop: '8px', maxWidth: '680px', lineHeight: 1.5 }}>
                {isIndependent
                  ? 'Bienvenido a tu espacio de docente independiente. Administra tus secciones, materias, matrícula y registro de notas con total autonomía.'
                  : 'Bienvenido a tu panel docente. Accede rápidamente a tus lecciones de hoy o navega en tus grupos a cargo para pasar asistencia y calificar.'}
              </p>
            </div>

            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
              <button
                onClick={() => onSelectTab ? onSelectTab('sections') : undefined}
                className="btn btn-primary"
                style={{ padding: '10px 18px', borderRadius: '12px', fontWeight: 700, gap: '8px' }}
              >
                <Layers size={16} />
                <span>Mis Secciones ({sectionsToDisplay.length})</span>
              </button>
              <button
                onClick={onOpenSchedule}
                className="btn btn-secondary"
                style={{ padding: '10px 16px', borderRadius: '12px', gap: '8px' }}
              >
                <Clock size={16} color="#6366f1" />
                <span>Horario Semanal</span>
              </button>
            </div>
          </div>

          {/* Quick Stats Grid */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '16px',
            marginTop: '28px'
          }}>
            <div
              onClick={() => onSelectTab?.('sections')}
              style={{
                background: 'var(--bg-card)',
                padding: '18px 22px',
                borderRadius: '16px',
                border: '1px solid var(--border-subtle)',
                boxShadow: 'var(--shadow-sm)',
                cursor: 'pointer',
                transition: 'all 0.2s ease'
              }}
              className="hover-lift"
              title="Ver mis grupos a cargo"
            >
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Users size={15} color="#4f46e5" /> Grupos a Cargo
              </div>
              <div style={{ fontSize: '1.6rem', fontWeight: 900, marginTop: '4px' }}>
                {sectionsToDisplay.length} Grupos
              </div>
            </div>

            <div
              onClick={() => onSelectTab?.('sections')}
              style={{
                background: 'var(--bg-card)',
                padding: '18px 22px',
                borderRadius: '16px',
                border: '1px solid var(--border-subtle)',
                boxShadow: 'var(--shadow-sm)',
                cursor: 'pointer',
                transition: 'all 0.2s ease'
              }}
              className="hover-lift"
              title="Ver mis materias impartidas"
            >
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <BookOpen size={15} color="#06b6d4" /> Materias Impartidas
              </div>
              <div style={{ fontSize: '1.6rem', fontWeight: 900, marginTop: '4px' }}>
                {userAssignments.length} Asignaturas
              </div>
            </div>

            <div style={{
              background: 'var(--bg-card)',
              padding: '18px 22px',
              borderRadius: '16px',
              border: '1px solid var(--border-subtle)',
              boxShadow: 'var(--shadow-sm)'
            }}>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Award size={15} color="#10b981" /> Estudiantes Registrados
              </div>
              <div style={{ fontSize: '1.6rem', fontWeight: 900, marginTop: '4px' }}>
                {myStudents.length} Alumnos
              </div>
            </div>

            <div style={{
              background: 'var(--bg-card)',
              padding: '18px 22px',
              borderRadius: '16px',
              border: '1px solid var(--border-subtle)',
              boxShadow: 'var(--shadow-sm)'
            }}>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <TrendingUp size={15} color="#8b5cf6" /> Asistencia Promedio
              </div>
              <div style={{ fontSize: '1.6rem', fontWeight: 900, marginTop: '4px', color: '#16a34a' }}>
                96.4%
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Barra de Gestión de Docente Independiente */}
      {isIndependent && (activeTab === 'independent' || activeTab === 'overview') && (
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

      {/* Smart Active Class Card */}
      {currentActiveSchedule && activeAssignment && (activeTab === 'overview' || activeTab === 'schedule') && (
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

      {/* Mini-Widget: Clases de Hoy / Horario Rápido del Día */}
      {(activeTab === 'overview' || activeTab === 'schedule') && (
        <div className="glass-panel" style={{
        padding: '20px 24px',
        borderRadius: '16px',
        border: '1px solid var(--border-subtle)',
        background: 'var(--bg-card)'
      }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '12px',
          marginBottom: todaySchedules.length > 0 ? '16px' : '0'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: '36px',
              height: '36px',
              borderRadius: '10px',
              background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)',
              color: 'white',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 4px 10px rgba(99, 102, 241, 0.3)'
            }}>
              <Calendar size={18} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <h3 style={{ fontSize: '1.05rem', fontWeight: 800, margin: 0 }}>
                  Clases de Hoy — {todayDayName}
                </h3>
                <span className="badge" style={{
                  background: todaySchedules.length > 0 ? 'rgba(79, 70, 229, 0.12)' : 'rgba(100, 116, 139, 0.12)',
                  color: todaySchedules.length > 0 ? '#4f46e5' : 'var(--text-muted)',
                  fontSize: '0.72rem',
                  fontWeight: 700
                }}>
                  {todaySchedules.length} {todaySchedules.length === 1 ? 'lección' : 'lecciones'} programadas
                </span>
              </div>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: '2px 0 0 0' }}>
                Acceso directo para calificar o pasar asistencia en tus lecciones del día
              </p>
            </div>
          </div>

          <button
            onClick={onOpenSchedule}
            className="btn btn-sm btn-secondary"
            style={{ fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <Clock size={14} color="#6366f1" />
            <span>Ver Horario Semanal</span>
          </button>
        </div>

        {todaySchedules.length > 0 ? (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
            gap: '12px'
          }}>
            {todaySchedules.map(sch => {
              const grp = groups.find(g => g.id === sch.groupId);
              const sub = subjects.find(s => s.id === sch.subjectId);
              const asg = userAssignments.find(a => a.groupId === sch.groupId && a.subjectId === sch.subjectId);

              const isPast = currentTimeFormatted > sch.endTime;
              const isCurrent = currentTimeFormatted >= sch.startTime && currentTimeFormatted <= sch.endTime;
              const isUpcoming = currentTimeFormatted < sch.startTime;

              return (
                <div
                  key={sch.id}
                  style={{
                    background: isCurrent
                      ? 'linear-gradient(135deg, rgba(16, 185, 129, 0.08) 0%, rgba(5, 150, 105, 0.04) 100%)'
                      : 'var(--bg-main)',
                    border: isCurrent
                      ? '2px solid #10b981'
                      : '1px solid var(--border-subtle)',
                    borderRadius: '12px',
                    padding: '14px',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    gap: '10px',
                    transition: 'transform 0.15s ease'
                  }}
                >
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        fontSize: '0.78rem',
                        fontWeight: 700,
                        color: isCurrent ? '#059669' : 'var(--text-main)',
                        fontFamily: 'var(--font-mono)'
                      }}>
                        <Clock size={13} color={isCurrent ? '#10b981' : '#6366f1'} />
                        {sch.startTime} - {sch.endTime}
                      </div>

                      {isCurrent && (
                        <span className="badge" style={{ background: '#10b981', color: '#ffffff', fontSize: '0.68rem', fontWeight: 800 }}>
                          ● EN CURSO
                        </span>
                      )}
                      {isUpcoming && (
                        <span className="badge" style={{ background: 'rgba(79, 70, 229, 0.12)', color: '#4f46e5', fontSize: '0.68rem', fontWeight: 700 }}>
                          Próxima
                        </span>
                      )}
                      {isPast && (
                        <span className="badge" style={{ background: 'var(--bg-surface)', color: 'var(--text-muted)', fontSize: '0.68rem', fontWeight: 600 }}>
                          ✓ Concluida
                        </span>
                      )}
                    </div>

                    <div style={{ fontWeight: 800, fontSize: '0.95rem', color: 'var(--text-main)' }}>
                      {grp?.groupName || `Sección ${grp?.sectionCode || 'Sin sección'}`}
                    </div>

                    <div style={{ fontSize: '0.82rem', color: '#6366f1', fontWeight: 600, marginTop: '2px' }}>
                      {sub?.name || 'Materia'}
                    </div>

                    {sch.classroom && (
                      <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                        📍 {sch.classroom}
                      </div>
                    )}
                  </div>

                  {asg ? (
                    <button
                      onClick={() => onSelectAssignment(asg)}
                      className="btn btn-sm btn-primary"
                      style={{
                        width: '100%',
                        fontSize: '0.78rem',
                        padding: '6px 10px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px',
                        borderRadius: '8px',
                        background: isCurrent ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)' : undefined
                      }}
                    >
                      <Play size={13} />
                      <span>Abrir Registro y Calificar</span>
                    </button>
                  ) : (
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textAlign: 'center' }}>
                      Sin asignación vinculada
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '16px',
            flexWrap: 'wrap',
            paddingTop: '6px'
          }}>
            <p style={{ fontSize: '0.86rem', color: 'var(--text-muted)', margin: 0 }}>
              Hoy {todayDayName.toLowerCase()} no tienes lecciones fijadas en tu horario. Puedes usar este tiempo para calificar actividades pendientes o planificar.
            </p>
            <button
              onClick={onOpenSchedule}
              className="btn btn-sm btn-secondary"
              style={{ fontSize: '0.78rem' }}
            >
              Configurar Horario
            </button>
          </div>
        )}
      </div>
      )}

      {/* Estado vacío si no hay secciones aún */}
      {sectionsToDisplay.length === 0 && (
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
            {isIndependent ? 'Comienza a configurar tus secciones independientes' : 'Aún no tienes secciones asignadas'}
          </h3>
          <p style={{ color: 'var(--text-muted)', maxWidth: '560px', margin: '0 auto 24px auto', fontSize: '0.95rem' }}>
            {isIndependent
              ? 'Como docente independiente puedes crear tus propias secciones (ej: 7-1, 10-A, Tutoría), agregar tus materias y vincularlas para comenzar con la asistencia y evaluación.'
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

      {/* SECCIÓN PRINCIPAL: Mis Secciones a Cargo (1 Card por Sección) */}
      {(activeTab === 'overview' || activeTab === 'sections') && allTeacherSections.length > 0 && (
        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
            <div>
              <h2 style={{ fontSize: '1.3rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Layers size={20} color="#4f46e5" /> Mis Secciones a Cargo ({sectionsToDisplay.length}{sectionsToDisplay.length !== allTeacherSections.length ? ` de ${allTeacherSections.length}` : ''})
              </h2>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                Haz clic en la tarjeta de una sección para ver sus materias asignadas y seleccionar la materia que deseas calificar.
              </p>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span className="badge" style={{ background: 'var(--bg-surface)', color: 'var(--text-main)', fontSize: '0.8rem' }}>
                {userAssignments.length} Asignaturas en total
              </span>
              {isIndependent && (
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  <button
                    onClick={() => { setGroupError(null); setIsAddGroupOpen(true); }}
                    className="btn btn-secondary btn-sm"
                    style={{ fontWeight: 600 }}
                  >
                    <FolderPlus size={15} color="#4f46e5" /> + Nueva Sección
                  </button>
                  <button
                    onClick={() => setIsAddNewInstModalOpen(true)}
                    className="btn btn-secondary btn-sm"
                    style={{ fontWeight: 600, color: '#06b6d4' }}
                    title="Registrar otra institución educativa donde impartes clases"
                  >
                    <Building2 size={15} color="#06b6d4" /> + Registrar Institución
                  </button>
                  {currentUser.role === 'DEVELOPER' && (
                    <button
                      onClick={() => {
                        setLinkInstError(null);
                        setLinkInstSuccess(null);
                        setIsLinkToInstOpen(true);
                      }}
                      className="btn btn-secondary btn-sm"
                      style={{ fontWeight: 600, color: '#6366f1' }}
                      title="Herramienta exclusiva de Desarrollador: Vincular o transferir secciones a una institución registrada"
                    >
                      <Building2 size={15} color="#6366f1" /> Vincular a Institución (Dev)
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Barra de Filtros de Secciones */}
          {/* Barra de Búsqueda y Filtros por Grado/Nivel idéntica a Director */}
          <div className="glass-panel" style={{
            padding: '16px 20px',
            border: '1px solid var(--border-subtle)',
            background: 'var(--bg-surface)',
            borderRadius: '14px',
            display: 'flex',
            flexDirection: 'column',
            gap: '14px',
            marginBottom: '20px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '14px', flexWrap: 'wrap' }}>
              {/* Buscador de secciones */}
              <div style={{ position: 'relative', width: '380px', maxWidth: '100%' }}>
                <Search size={18} color="#6366f1" style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)' }} />
                <input
                  type="text"
                  value={sectionSearchQuery}
                  onChange={e => setSectionSearchQuery(e.target.value)}
                  placeholder="Buscar sección (ej. 12, 10-1) o materia..."
                  className="input-field"
                  style={{
                    width: '100%',
                    height: '44px',
                    paddingLeft: '42px',
                    paddingRight: sectionSearchQuery ? '38px' : '16px',
                    fontSize: '0.9rem',
                    borderRadius: '12px',
                    border: '1.5px solid var(--border-subtle)',
                    background: 'var(--bg-main)',
                    boxShadow: '0 2px 6px rgba(0,0,0,0.04)'
                  }}
                />
                {sectionSearchQuery && (
                  <button
                    type="button"
                    onClick={() => setSectionSearchQuery('')}
                    style={{
                      position: 'absolute',
                      right: '12px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      background: 'transparent',
                      border: 'none',
                      cursor: 'pointer',
                      color: 'var(--text-muted)',
                      padding: '4px'
                    }}
                    title="Borrar búsqueda"
                  >
                    <X size={15} />
                  </button>
                )}
              </div>

              {/* Contador y Limpiar Filtros */}
              <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Filter size={14} color="#4f46e5" />
                <span>
                  Mostrando <strong>{sectionsToDisplay.length}</strong> de <strong>{allTeacherSections.length}</strong> secciones
                </span>
                {(selectedGradeFilter !== 'ALL' || selectedInstFilter !== 'ALL' || sectionSearchQuery) && (
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedGradeFilter('ALL');
                      setSelectedInstFilter('ALL');
                      setSectionSearchQuery('');
                    }}
                    className="btn btn-ghost btn-sm"
                    style={{ fontSize: '0.75rem', padding: '2px 8px', color: '#ef4444' }}
                  >
                    Limpiar filtros
                  </button>
                )}
              </div>
            </div>

            {/* Filtros por Institución si el docente imparte en más de una institución */}
            {availableInstitutionsInSections.length > 1 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', paddingBottom: '10px', borderBottom: '1px solid var(--border-subtle)' }}>
                <span style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <Building2 size={13} /> Institución:
                </span>
                <button
                  type="button"
                  onClick={() => setSelectedInstFilter('ALL')}
                  className={`btn btn-sm ${selectedInstFilter === 'ALL' ? 'btn-primary' : 'btn-secondary'}`}
                  style={{ fontSize: '0.75rem', padding: '3px 12px', borderRadius: '16px' }}
                >
                  Todas ({allTeacherSections.length})
                </button>
                {availableInstitutionsInSections.map(inst => {
                  const count = allTeacherSections.filter(g => g.institutionId === inst.id).length;
                  const isSel = selectedInstFilter === inst.id;
                  return (
                    <button
                      key={inst.id}
                      type="button"
                      onClick={() => setSelectedInstFilter(isSel ? 'ALL' : inst.id)}
                      className={`btn btn-sm ${isSel ? 'btn-primary' : 'btn-secondary'}`}
                      style={{ fontSize: '0.75rem', padding: '3px 12px', borderRadius: '16px' }}
                    >
                      {inst.name} ({count})
                    </button>
                  );
                })}
              </div>
            )}

            {/* Filtros de Grado / Nivel automáticos estilo Director */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-muted)', marginRight: '4px' }}>
                Filtrar por nivel:
              </span>
              <button
                type="button"
                onClick={() => setSelectedGradeFilter('ALL')}
                className={`btn btn-sm ${selectedGradeFilter === 'ALL' ? 'btn-primary' : 'btn-secondary'}`}
                style={{
                  fontSize: '0.78rem',
                  padding: '4px 14px',
                  borderRadius: '20px',
                  fontWeight: selectedGradeFilter === 'ALL' ? 700 : 500,
                  background: selectedGradeFilter === 'ALL' ? 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)' : undefined
                }}
              >
                Todos ({allTeacherSections.length})
              </button>

              {availableGrades.map(grade => {
                const count = allTeacherSections.filter(g => g.grade === grade).length;
                const isSelected = selectedGradeFilter === grade;

                return (
                  <button
                    type="button"
                    key={grade}
                    onClick={() => setSelectedGradeFilter(isSelected ? 'ALL' : grade)}
                    className={`btn btn-sm ${isSelected ? 'btn-primary' : 'btn-secondary'}`}
                    style={{
                      fontSize: '0.78rem',
                      padding: '4px 14px',
                      borderRadius: '20px',
                      fontWeight: isSelected ? 700 : 500,
                      background: isSelected ? 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)' : undefined
                    }}
                  >
                    {getGradeLabel(grade)} ({count})
                  </button>
                );
              })}
            </div>
          </div>

          {/* Grid de Secciones o Estado Vacío de Filtro */}
          {sectionsToDisplay.length === 0 ? (
            <div className="glass-panel" style={{
              padding: '36px',
              textAlign: 'center',
              borderRadius: '16px',
              border: '1px dashed var(--border-subtle)',
              background: 'var(--bg-surface)'
            }}>
              <Search size={36} color="var(--text-muted)" style={{ margin: '0 auto 12px auto' }} />
              <h4 style={{ fontSize: '1.05rem', fontWeight: 800, margin: '0 0 6px 0' }}>
                No se encontraron secciones con los filtros actuales
              </h4>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: '0 0 16px 0' }}>
                Prueba con otro término de búsqueda o restablece los filtros para ver todas tus secciones.
              </p>
              <button
                onClick={() => {
                  setSectionSearchQuery('');
                  setSelectedGradeFilter('ALL');
                }}
                className="btn btn-secondary btn-sm"
              >
                Restablecer Filtros
              </button>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '18px' }}>
            {sectionsToDisplay.map(grp => {
              const grpStudents = students.filter(s => s.groupId === grp.id);
              const grpAsgs = userAssignments.filter(a => a.groupId === grp.id);
              const isGuia = grp.guideTeacherId === currentUser.id || grpAsgs.some(a => a.isGuia);

              return (
                <div
                  key={grp.id}
                  className="glass-panel hover-lift"
                  style={{
                    padding: '22px',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: '16px',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    gap: '16px',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease'
                  }}
                  onClick={() => {
                    if (grpAsgs.length === 1) {
                      onSelectAssignment(grpAsgs[0]);
                    } else {
                      setSectionModalForGrading(grp);
                    }
                  }}
                >
                  <div>
                    {/* Top: Badges & Botones de acción rápida sobre la sección */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px', flexWrap: 'wrap' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                        <span className="badge" style={{
                          background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)',
                          color: 'white',
                          fontWeight: 800,
                          fontSize: '0.88rem',
                          padding: '4px 12px'
                        }}>
                          Sección {grp.sectionCode}
                        </span>
                        {/* Badge de Institución si pertenece a un colegio/institución específico */}
                        {(grp.institutionName || allInstitutions.find(i => i.id === grp.institutionId)?.name) && (
                          <span className="badge" style={{ background: 'rgba(99, 102, 241, 0.12)', color: '#6366f1', fontSize: '0.74rem', display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <Building2 size={12} />
                            {grp.institutionName || allInstitutions.find(i => i.id === grp.institutionId)?.name}
                          </span>
                        )}
                        <span className="badge" style={{ background: 'var(--bg-surface)', color: 'var(--text-muted)' }}>
                          Año {grp.year}
                        </span>
                        {isGuia && (
                          <span className="badge" style={{ background: 'rgba(124, 58, 237, 0.15)', color: '#7c3aed', fontSize: '0.75rem' }}>
                            Docente Guía
                          </span>
                        )}
                      </div>

                      {/* Botones de acción rápida estilo Director */}
                      <div style={{ display: 'flex', gap: '6px', alignItems: 'center', flexWrap: 'wrap' }}>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setReportSectionGroup(grp);
                          }}
                          className="btn btn-secondary btn-sm"
                          style={{ padding: '5px 10px', fontSize: '0.78rem', display: 'flex', alignItems: 'center', gap: '5px' }}
                          title="Generar boletines oficiales y reporte consolidado de esta sección"
                        >
                          <FileText size={14} color="#6366f1" />
                          <span>Boletines</span>
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setStudentManagingGroupId(grp.id);
                            setIsManageStudentsOpen(true);
                          }}
                          className="btn btn-secondary btn-sm"
                          style={{ padding: '5px 10px', fontSize: '0.78rem', display: 'flex', alignItems: 'center', gap: '5px' }}
                          title="Gestionar nómina de estudiantes"
                        >
                          <Users size={14} color="#4f46e5" />
                          <span>{grpStudents.length} Alumnos</span>
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setStudentManagingGroupId(grp.id);
                            setIsImportStudentsModalOpen(true);
                          }}
                          className="btn btn-ghost btn-sm"
                          style={{ padding: '5px', color: '#10b981' }}
                          title="Importar lista de estudiantes desde Excel a esta sección"
                        >
                          <UploadCloud size={15} />
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setStudentManagingGroupId(grp.id);
                            setIsAddStudentModalOpen(true);
                          }}
                          className="btn btn-ghost btn-sm"
                          style={{ padding: '5px', color: '#4f46e5' }}
                          title="Agregar estudiante a esta sección"
                        >
                          <UserPlus size={15} />
                        </button>
                        {isIndependent && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteGroup(grp);
                            }}
                            className="btn btn-ghost btn-sm"
                            style={{ padding: '5px', color: '#ef4444' }}
                            title="Eliminar sección"
                          >
                            <Trash2 size={14} />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Section Name & Level */}
                    <h3 style={{ fontSize: '1.2rem', fontWeight: 800, marginTop: '12px' }}>
                      {grp.groupName || `${grp.grade}° Grado`}
                    </h3>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                      {grp.specialty || 'General / Académico'} • Año {grp.year}
                    </div>

                    {/* Chips de Materias en esta Sección */}
                    <div style={{ marginTop: '14px' }}>
                      <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                        Materias que impartes ({grpAsgs.length}):
                      </div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                        {grpAsgs.length === 0 ? (
                          <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                            Sin materias vinculadas aún
                          </span>
                        ) : (
                          grpAsgs.map(a => {
                            const sub = subjects.find(s => s.id === a.subjectId);
                            return (
                              <button
                                key={a.id}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onSelectAssignment(a);
                                }}
                                style={{
                                  fontSize: '0.78rem',
                                  background: 'var(--bg-surface)',
                                  border: `1px solid ${sub?.color || '#4f46e5'}60`,
                                  color: sub?.color || 'var(--text-main)',
                                  padding: '4px 10px',
                                  borderRadius: '8px',
                                  fontWeight: 700,
                                  cursor: 'pointer',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '4px',
                                  transition: 'transform 0.15s ease'
                                }}
                                title={`Abrir registro de ${sub?.name}`}
                              >
                                <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: sub?.color || '#4f46e5' }} />
                                {sub?.name || 'Materia'}
                              </button>
                            );
                          })
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Botones de Acción al pie de la Card */}
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    paddingTop: '12px',
                    borderTop: '1px solid var(--border-subtle)',
                    marginTop: 'auto'
                  }}>
                    {grpAsgs.length === 1 ? (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectAssignment(grpAsgs[0]);
                        }}
                        className="btn btn-primary"
                        style={{ flex: 1, fontSize: '0.85rem', justifyContent: 'space-between' }}
                      >
                        <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <FileSpreadsheet size={15} />
                          Calificar {subjects.find(s => s.id === grpAsgs[0].subjectId)?.name || 'Materia'}
                        </span>
                        <ArrowRight size={15} />
                      </button>
                    ) : grpAsgs.length > 1 ? (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSectionModalForGrading(grp);
                        }}
                        className="btn btn-primary"
                        style={{ flex: 1, fontSize: '0.85rem', justifyContent: 'space-between' }}
                      >
                        <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <BookOpen size={15} />
                          Abrir Materias a Calificar ({grpAsgs.length})
                        </span>
                        <ChevronRight size={15} />
                      </button>
                    ) : (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setAssignGroupId(grp.id);
                          setAssignError(null);
                          setIsAssignSubjectOpen(true);
                        }}
                        className="btn btn-secondary"
                        style={{ flex: 1, fontSize: '0.85rem', justifyContent: 'center' }}
                      >
                        <PlusCircle size={15} color="#4f46e5" />
                        + Asignar Materia
                      </button>
                    )}

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setStudentManagingGroupId(grp.id);
                        setIsManageStudentsOpen(true);
                      }}
                      className="btn btn-secondary btn-sm"
                      title="Ver y administrar estudiantes de esta sección"
                      style={{ padding: '8px 10px' }}
                    >
                      <Users size={15} color="#10b981" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    )}

      {/* MODAL: Seleccionar Materia de la Sección para Calificar */}
      {sectionModalForGrading && (
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
        }} onClick={() => setSectionModalForGrading(null)}>
          <div className="glass-panel" style={{
            background: 'var(--bg-main)',
            border: '1px solid var(--border-subtle)',
            borderRadius: '18px',
            width: '100%',
            maxWidth: '680px',
            maxHeight: '90vh',
            display: 'flex',
            flexDirection: 'column',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.45)',
            overflow: 'hidden'
          }} onClick={e => e.stopPropagation()}>
            
            {/* Modal Header */}
            <div style={{
              padding: '20px 24px',
              borderBottom: '1px solid var(--border-subtle)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              background: 'var(--bg-surface)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{
                  width: '38px',
                  height: '38px',
                  borderRadius: '10px',
                  background: 'rgba(79, 70, 229, 0.15)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <Layers size={22} color="#4f46e5" />
                </div>
                <div>
                  <h3 style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0 }}>
                    Sección {sectionModalForGrading.sectionCode} {sectionModalForGrading.groupName ? `— ${sectionModalForGrading.groupName}` : ''}
                  </h3>
                  <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', margin: 0 }}>
                    Selecciona la materia que deseas calificar para abrir el registro de notas, asistencia y reportes.
                  </p>
                </div>
              </div>
              <button onClick={() => setSectionModalForGrading(null)} className="btn btn-ghost btn-sm" style={{ padding: '6px' }}>
                <X size={18} />
              </button>
            </div>

            {/* Modal Body: Cards de Materias de esta Sección */}
            <div style={{ padding: '24px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '14px', flex: 1 }}>
              {(() => {
                const sectionAssignments = userAssignments.filter(a => a.groupId === sectionModalForGrading.id);

                if (sectionAssignments.length === 0) {
                  return (
                    <div style={{ textAlign: 'center', padding: '36px 20px', border: '1px dashed var(--border-subtle)', borderRadius: '12px' }}>
                      <p style={{ color: 'var(--text-muted)', marginBottom: '14px' }}>
                        No tienes materias asignadas a esta sección todavía.
                      </p>
                      {isIndependent && (
                        <button
                          onClick={() => {
                            setAssignGroupId(sectionModalForGrading.id);
                            setAssignError(null);
                            setSectionModalForGrading(null);
                            setIsAssignSubjectOpen(true);
                          }}
                          className="btn btn-primary btn-sm"
                        >
                          <PlusCircle size={15} /> + Vincular Materia a esta Sección
                        </button>
                      )}
                    </div>
                  );
                }

                return sectionAssignments.map(asg => {
                  const subject = subjects.find(s => s.id === asg.subjectId);
                  const config = evaluationConfigs.find(c => c.assignmentId === asg.id) || {
                    id: 'tmp',
                    assignmentId: asg.id,
                    periodId: 'I_PERIODO',
                    passingGrade: 70,
                    periodWeight: 50,
                    rubrics: []
                  };
                  const enabledRubrics = config.rubrics.filter(r => r.enabled);

                  return (
                    <div
                      key={asg.id}
                      className="glass-panel hover-lift"
                      style={{
                        padding: '18px 20px',
                        borderRadius: '14px',
                        border: '1px solid var(--border-subtle)',
                        background: 'var(--bg-surface)',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '12px'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '10px' }}>
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{
                              width: '12px',
                              height: '12px',
                              borderRadius: '4px',
                              background: subject?.color || '#4f46e5'
                            }} />
                            <h4 style={{ fontSize: '1.15rem', fontWeight: 800, margin: 0 }}>
                              {subject?.name}
                            </h4>
                            {asg.isGuia && (
                              <span className="badge" style={{ background: 'rgba(124, 58, 237, 0.15)', color: '#7c3aed', fontSize: '0.72rem' }}>
                                Docente Guía
                              </span>
                            )}
                          </div>
                          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                            Código: {subject?.code} • Nota Mínima: <strong>{config.passingGrade} pts</strong>
                          </div>
                        </div>

                        <div style={{ display: 'flex', gap: '8px' }}>
                          <button
                            onClick={() => {
                              setSectionModalForGrading(null);
                              onOpenRubricsConfig(asg);
                            }}
                            className="btn btn-secondary btn-sm"
                            title="Personalizar rubros y porcentajes"
                          >
                            <SlidersHorizontal size={14} color="#6366f1" />
                            Rubros
                          </button>
                          {isIndependent && (
                            <button
                              onClick={() => handleDeleteAssignment(asg)}
                              className="btn btn-ghost btn-sm"
                              style={{ color: '#ef4444' }}
                              title="Desvincular materia"
                            >
                              <Trash2 size={14} />
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Rubros activos resumen */}
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                        {enabledRubrics.map(r => (
                          <span key={r.id} style={{
                            fontSize: '0.72rem',
                            background: 'var(--bg-main)',
                            border: '1px solid var(--border-subtle)',
                            padding: '2px 8px',
                            borderRadius: '6px',
                            fontWeight: 600
                          }}>
                            {r.label}: <strong style={{ color: '#4f46e5' }}>{r.percentage}%</strong>
                          </span>
                        ))}
                      </div>

                      {/* Botón Principal para Entrar a Calificar */}
                      <div style={{ paddingTop: '8px', borderTop: '1px solid var(--border-subtle)' }}>
                        <button
                          onClick={() => {
                            setSectionModalForGrading(null);
                            onSelectAssignment(asg);
                          }}
                          className="btn btn-primary btn-sm"
                          style={{
                            width: '100%',
                            justifyContent: 'space-between',
                            background: `linear-gradient(135deg, ${subject?.color || '#4f46e5'} 0%, #4338ca 100%)`,
                            padding: '10px 16px',
                            fontWeight: 700
                          }}
                        >
                          <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <FileSpreadsheet size={16} />
                            Abrir Registro de Calificaciones y Reportes
                          </span>
                          <ArrowRight size={16} />
                        </button>
                      </div>
                    </div>
                  );
                });
              })()}
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
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  onClick={() => {
                    setStudentManagingGroupId(sectionModalForGrading.id);
                    setSectionModalForGrading(null);
                    setIsManageStudentsOpen(true);
                  }}
                  className="btn btn-secondary btn-sm"
                >
                  <Users size={14} color="#10b981" />
                  Nómina de Estudiantes
                </button>
                {isIndependent && (
                  <button
                    onClick={() => {
                      setAssignGroupId(sectionModalForGrading.id);
                      setAssignError(null);
                      setSectionModalForGrading(null);
                      setIsAssignSubjectOpen(true);
                    }}
                    className="btn btn-secondary btn-sm"
                  >
                    <PlusCircle size={14} color="#4f46e5" />
                    + Vincular Otra Materia
                  </button>
                )}
              </div>

              <button
                onClick={() => setSectionModalForGrading(null)}
                className="btn btn-secondary btn-sm"
              >
                Cerrar
              </button>
            </div>
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

              {/* Selector de Institución para la Sección */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                  <label style={{ fontSize: '0.8rem', fontWeight: 700 }}>
                    Institución a la que pertenece esta sección *
                  </label>
                  <button
                    type="button"
                    onClick={() => setIsAddNewInstModalOpen(true)}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      color: '#6366f1',
                      fontSize: '0.75rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}
                  >
                    <Plus size={13} /> + Registrar otra institución
                  </button>
                </div>
                <select
                  value={groupInstitutionId}
                  onChange={e => {
                    const id = e.target.value;
                    setGroupInstitutionId(id);
                    const found = allInstitutions.find(i => i.id === id);
                    if (found) setGroupInstitutionName(found.name);
                  }}
                  className="input-field"
                  style={{ width: '100%', padding: '10px 14px' }}
                >
                  {allInstitutions.map(inst => (
                    <option key={inst.id} value={inst.id}>
                      {inst.name} {inst.code ? `(${inst.code})` : ''}
                    </option>
                  ))}
                </select>
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

      {/* Modal de Reportes Oficiales / Boletines de Sección */}
      {reportSectionGroup && (
        <SectionReportModal
          reportGroup={reportSectionGroup}
          institutionName={currentInstitution?.name || 'Docente Independiente'}
          currentUser={currentUser}
          students={students}
          subjects={subjects}
          assignments={assignments}
          evaluationConfigs={evaluationConfigs}
          onClose={() => setReportSectionGroup(null)}
        />
      )}

      {/* Modal: Registrar Nueva Institución (para Docentes con múltiples centros) */}
      {isAddNewInstModalOpen && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.65)',
          backdropFilter: 'blur(6px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1200,
          padding: '20px'
        }} onClick={() => setIsAddNewInstModalOpen(false)}>
          <div className="glass-panel" style={{
            background: 'var(--bg-main)',
            border: '1px solid var(--border-subtle)',
            borderRadius: '16px',
            width: '100%',
            maxWidth: '460px',
            padding: '24px',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.45)'
          }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Building2 size={20} color="#6366f1" />
                <h3 style={{ fontSize: '1.15rem', fontWeight: 800, margin: 0 }}>
                  Registrar Institución
                </h3>
              </div>
              <button onClick={() => setIsAddNewInstModalOpen(false)} className="btn btn-ghost btn-sm" style={{ padding: '4px' }}>
                <X size={18} />
              </button>
            </div>

            <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: '16px' }}>
              Agrega el nombre del colegio, escuela o centro educativo donde también impartes lecciones para asociar tus secciones.
            </p>

            <form onSubmit={handleAddNewInstitution} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, marginBottom: '6px' }}>
                  Nombre de la Institución *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ej. CTP Sabanilla, Liceo Los Ángeles, Tutorías Centro"
                  value={newInstName}
                  onChange={e => setNewInstName(e.target.value)}
                  className="input-field"
                  style={{ width: '100%', padding: '10px 14px' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, marginBottom: '6px' }}>
                    Código (Opcional)
                  </label>
                  <input
                    type="text"
                    placeholder="Ej. CTP-SAB"
                    value={newInstCode}
                    onChange={e => setNewInstCode(e.target.value)}
                    className="input-field"
                    style={{ width: '100%', padding: '10px 14px' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, marginBottom: '6px' }}>
                    Tipo de Centro
                  </label>
                  <select
                    value={newInstType}
                    onChange={e => setNewInstType(e.target.value as any)}
                    className="input-field"
                    style={{ width: '100%', padding: '10px 14px' }}
                  >
                    <option value="COLLEGE">Colegio / Liceo</option>
                    <option value="SCHOOL">Escuela</option>
                    <option value="UNIVERSITY">Universidad</option>
                    <option value="INDEPENDENT">Independiente / Tutoría</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '8px' }}>
                <button type="button" onClick={() => setIsAddNewInstModalOpen(false)} className="btn btn-secondary btn-sm">
                  Cancelar
                </button>
                <button type="submit" className="btn btn-primary btn-sm">
                  Guardar Institución
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Vincular Secciones a Institución Formal (Transición) */}
      {isLinkToInstOpen && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(15, 23, 42, 0.75)',
          backdropFilter: 'blur(8px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          padding: '20px'
        }}>
          <div className="glass-panel" style={{
            width: '100%',
            maxWidth: '560px',
            borderRadius: '16px',
            overflow: 'hidden',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.4)',
            border: '1px solid var(--border-subtle)',
            background: 'var(--bg-main)'
          }}>
            <div style={{
              padding: '20px 24px',
              borderBottom: '1px solid var(--border-subtle)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              background: 'var(--bg-surface)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{
                  width: '38px',
                  height: '38px',
                  borderRadius: '10px',
                  background: 'rgba(99, 102, 241, 0.15)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#6366f1'
                }}>
                  <Building2 size={20} />
                </div>
                <div>
                  <h3 style={{ fontSize: '1.15rem', fontWeight: 800, margin: 0 }}>
                    Vincular a Institución Educativa
                  </h3>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                    Transición de Espacio Independiente a Institución Oficial
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsLinkToInstOpen(false)}
                className="btn btn-ghost btn-sm"
                style={{ padding: '6px' }}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleLinkToInstitution} style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '18px' }}>
              <div style={{
                background: 'rgba(99, 102, 241, 0.08)',
                padding: '14px 16px',
                borderRadius: '10px',
                border: '1px solid rgba(99, 102, 241, 0.2)',
                fontSize: '0.85rem',
                lineHeight: '1.5'
              }}>
                <strong>¿En qué consiste?</strong> Tus <strong>{allTeacherSections.length} secciones</strong>, materias registradas, estudiantes, calificaciones y asistencias se integrarán al colegio seleccionado. Podrás seguir impartiéndolas de manera oficial bajo supervisión de la dirección institucional.
              </div>

              {linkInstSuccess && (
                <div style={{
                  background: 'rgba(16, 185, 129, 0.12)',
                  color: '#10b981',
                  border: '1px solid rgba(16, 185, 129, 0.3)',
                  padding: '12px',
                  borderRadius: '10px',
                  fontSize: '0.88rem',
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}>
                  <CheckCircle2 size={18} /> {linkInstSuccess}
                </div>
              )}

              {linkInstError && (
                <div style={{
                  background: 'rgba(239, 68, 68, 0.12)',
                  color: '#ef4444',
                  border: '1px solid rgba(239, 68, 68, 0.3)',
                  padding: '12px',
                  borderRadius: '10px',
                  fontSize: '0.88rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}>
                  <AlertCircle size={18} /> {linkInstError}
                </div>
              )}

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, marginBottom: '8px' }}>
                  Selecciona la Institución Oficial:
                </label>
                {availableInstitutions.length === 0 ? (
                  <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', padding: '12px', background: 'var(--bg-surface)', borderRadius: '8px' }}>
                    No hay otras instituciones oficiales disponibles en este momento.
                  </div>
                ) : (
                  <select
                    value={targetInstId}
                    onChange={(e) => setTargetInstId(e.target.value)}
                    className="input-field"
                    style={{ width: '100%', padding: '10px 14px', borderRadius: '10px', fontSize: '0.9rem' }}
                  >
                    {availableInstitutions.map(inst => (
                      <option key={inst.id} value={inst.id}>
                        {inst.name} ({inst.code})
                      </option>
                    ))}
                  </select>
                )}
              </div>

              <div style={{
                background: 'var(--bg-surface)',
                padding: '12px 16px',
                borderRadius: '10px',
                border: '1px solid var(--border-subtle)',
                fontSize: '0.8rem',
                color: 'var(--text-muted)',
                display: 'flex',
                flexDirection: 'column',
                gap: '4px'
              }}>
                <div>• Se transferirán: <strong>{allTeacherSections.length} secciones</strong></div>
                <div>• Total de asignaturas vinculadas: <strong>{userAssignments.length}</strong></div>
                <div>• Todos los registros históricos se conservarán íntegros.</div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '6px' }}>
                <button
                  type="button"
                  onClick={() => setIsLinkToInstOpen(false)}
                  className="btn btn-secondary"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={availableInstitutions.length === 0 || !!linkInstSuccess}
                  className="btn btn-primary"
                  style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
                >
                  <Building2 size={16} /> Confirmar Vinculación
                </button>
              </div>
            </form>
          </div>
        </div>
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

