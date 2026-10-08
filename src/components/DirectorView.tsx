import React, { useState } from 'react';
import {
  Building2,
  Users,
  Award,
  AlertTriangle,
  FileSpreadsheet,
  CheckCircle2,
  UserCheck,
  ArrowRight,
  TrendingUp,
  UserPlus,
  X,
  Mail,
  Lock,
  AlertCircle,
  BookOpen,
  Plus,
  Trash2,
  GraduationCap,
  Layers,
  Calendar,
  Check,
  Eye,
  Edit3,
  UploadCloud,
  Search,
  Filter,
  Printer,
  FileText,
  Download
} from 'lucide-react';
import type { Group, Subject, TeacherAssignment, User, Student, EvaluationConfig, UserRole, InstitutionType } from '../types';
import { db } from '../db';
import { AddStudentModal } from './AddStudentModal';
import { EditStudentModal } from './EditStudentModal';
import { ImportStudentsModal } from './ImportStudentsModal';
import { ConfirmModal } from './ConfirmModal';

interface DirectorViewProps {
  institutionId: string;
  institutionName: string;
  institutionType?: InstitutionType;
  groups: Group[];
  subjects: Subject[];
  assignments: TeacherAssignment[];
  teachers: User[];
  allUsers?: User[];
  students: Student[];
  evaluationConfigs: EvaluationConfig[];
  onOpenGroupGradebook: (assignment: TeacherAssignment) => void;
  onDataChanged?: () => void;
}

export const DirectorView: React.FC<DirectorViewProps> = ({
  institutionId,
  institutionName,
  institutionType = 'COLLEGE',
  groups,
  subjects,
  assignments,
  teachers,
  allUsers = [],
  students,
  evaluationConfigs,
  onOpenGroupGradebook,
  onDataChanged
}) => {
  const [activeTab, setActiveTab] = useState<'ACADEMIC' | 'SUPERVISION' | 'STAFF'>('ACADEMIC');
  const [academicViewMode, setAcademicViewMode] = useState<'BY_SECTION' | 'BY_TEACHER'>('BY_SECTION');

  const isUniversity = institutionType === 'UNIVERSITY';
  const isSchool = institutionType === 'SCHOOL';
  const unitSingular = isUniversity ? 'Grupo' : 'Sección';
  const unitPlural = isUniversity ? 'Grupos' : 'Secciones';

  // Filtros y Buscadores en Vista Académica
  const [sectionSearchQuery, setSectionSearchQuery] = useState('');
  const [selectedGradeFilter, setSelectedGradeFilter] = useState<number | 'ALL'>('ALL');
  const [teacherSearchQuery, setTeacherSearchQuery] = useState('');
  const [teacherFilterMode, setTeacherFilterMode] = useState<'ALL' | 'ASSIGNED' | 'UNASSIGNED'>('ALL');

  // Helper para nombres amigables de niveles / grados
  const getGradeLabel = (grade: number) => {
    if (isUniversity) {
      return `${grade}° Semestre / Ciclo`;
    }
    if (isSchool) {
      switch (grade) {
        case 1: return 'Primeros (1°)';
        case 2: return 'Segundos (2°)';
        case 3: return 'Terceros (3°)';
        case 4: return 'Cuartos (4°)';
        case 5: return 'Quintos (5°)';
        case 6: return 'Sextos (6°)';
        default: return `${grade}° Grado`;
      }
    }
    // Colegio / Secundaria
    switch (grade) {
      case 7: return 'Sétimos (7°)';
      case 8: return 'Octavos (8°)';
      case 9: return 'Novenos (9°)';
      case 10: return 'Décimos (10°)';
      case 11: return 'Undécimos (11°)';
      case 12: return 'Duodécimos (12°)';
      default: return `${grade}° Año`;
    }
  };

  // Leer automáticamente los grados/niveles de los grupos existentes en la institución
  const availableGrades = Array.from(new Set(groups.map(g => g.grade))).sort((a, b) => a - b);

  // Filtrado reactivo de Secciones / Grupos
  const filteredGroups = groups.filter(grp => {
    if (selectedGradeFilter !== 'ALL' && grp.grade !== selectedGradeFilter) {
      return false;
    }
    if (sectionSearchQuery.trim()) {
      const q = sectionSearchQuery.toLowerCase().trim();
      const isNumericOnly = /^\d+$/.test(q);

      if (isNumericOnly) {
        // Cuando el usuario escribe solo números (ej: "12", "7", "8", "11"):
        // Debe coincidir con el grado exacto o el inicio del código de sección (ej: "12-1", "12-2", "12")
        // NO debe mostrar secciones de otro nivel (ej. "11-1") por materias o códigos secundarios.
        const gradeMatch = grp.grade.toString() === q;
        const codeStartsWith = grp.sectionCode.toLowerCase().startsWith(q);
        const codePrefixMatch = grp.sectionCode.toLowerCase().split(/[-_.\s]/)[0] === q;
        const groupNameHasNumber = grp.groupName
          ? new RegExp(`\\b${q}\\b`, 'i').test(grp.groupName) || grp.groupName.toLowerCase().startsWith(q)
          : false;

        return gradeMatch || codeStartsWith || codePrefixMatch || groupNameHasNumber;
      }

      // Si busca por código compuesto (ej: "12-1", "7-2") o texto ("Inglés", "Contabilidad", docente)
      const codeMatch = grp.sectionCode.toLowerCase().includes(q);
      const nameMatch = grp.groupName ? grp.groupName.toLowerCase().includes(q) : false;
      const specMatch = grp.specialty ? grp.specialty.toLowerCase().includes(q) : false;
      const guideTeacher = teachers.find(t => t.id === grp.guideTeacherId);
      const guideMatch = guideTeacher ? guideTeacher.name.toLowerCase().includes(q) : false;

      const secAsgs = assignments.filter(a => a.groupId === grp.id);
      const subjectMatch = secAsgs.some(a => {
        const sub = subjects.find(s => s.id === a.subjectId);
        const tch = teachers.find(t => t.id === a.teacherId);
        return (sub && sub.name.toLowerCase().includes(q)) ||
               (tch && tch.name.toLowerCase().includes(q));
      });

      return codeMatch || nameMatch || specMatch || guideMatch || subjectMatch;
    }
    return true;
  });

  // Filtrado reactivo de Docentes
  const filteredTeachers = teachers.filter(tch => {
    const teacherAssignments = assignments.filter(a => a.teacherId === tch.id);

    if (teacherFilterMode === 'ASSIGNED' && teacherAssignments.length === 0) return false;
    if (teacherFilterMode === 'UNASSIGNED' && teacherAssignments.length > 0) return false;

    if (teacherSearchQuery.trim()) {
      const q = teacherSearchQuery.toLowerCase().trim();
      const nameMatch = tch.name.toLowerCase().includes(q);
      const emailMatch = tch.email.toLowerCase().includes(q);
      const titleMatch = tch.title ? tch.title.toLowerCase().includes(q) : false;
      const subjectMatch = teacherAssignments.some(asg => {
        const sub = subjects.find(s => s.id === asg.subjectId);
        const grp = groups.find(g => g.id === asg.groupId);
        return (sub && (sub.name.toLowerCase().includes(q) || sub.code.toLowerCase().includes(q))) ||
               (grp && (grp.sectionCode.toLowerCase().includes(q) || (grp.groupName && grp.groupName.toLowerCase().includes(q))));
      });

      return nameMatch || emailMatch || titleMatch || subjectMatch;
    }

    return true;
  });

  // Modal Crear Sección / Grupo
  const [isAddGroupOpen, setIsAddGroupOpen] = useState(false);
  const [groupGrade, setGroupGrade] = useState<number>(isUniversity ? 1 : isSchool ? 1 : 10);
  const [groupSectionCode, setGroupSectionCode] = useState('');
  const [groupName, setGroupName] = useState('');
  const [groupSpecialty, setGroupSpecialty] = useState('');
  const [groupYear, setGroupYear] = useState<number>(2026);
  const [groupGuideTeacherId, setGroupGuideTeacherId] = useState<string>('');
  const [groupError, setGroupError] = useState<string | null>(null);

  // Modal Crear Materia
  const [isAddSubjectOpen, setIsAddSubjectOpen] = useState(false);
  const [subjectName, setSubjectName] = useState('');
  const [subjectCode, setSubjectCode] = useState('');
  const [subjectColor, setSubjectColor] = useState('#4f46e5');
  const [subjectError, setSubjectError] = useState<string | null>(null);

  // Modal Asignar Materia a Docente
  const [isAssignTeacherOpen, setIsAssignTeacherOpen] = useState(false);
  const [selectedGroupId, setSelectedGroupId] = useState<string>('');
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>('');
  const [selectedTeacherId, setSelectedTeacherId] = useState<string>('');
  const [isGuiaAssignment, setIsGuiaAssignment] = useState(false);
  const [assignError, setAssignError] = useState<string | null>(null);

  // Modal Ver Nómina de Estudiantes
  const [viewingGroup, setViewingGroup] = useState<Group | null>(null);

  // Modales de Gestión de Estudiantes desde la Sección
  const [importingGroupId, setImportingGroupId] = useState<string | null>(null);
  const [addingStudentGroupId, setAddingStudentGroupId] = useState<string | null>(null);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);

  // Modal Registrar Personal (Docente o Admin)
  const [isAddStaffOpen, setIsAddStaffOpen] = useState(false);
  const [staffName, setStaffName] = useState('');
  const [staffEmail, setStaffEmail] = useState('');
  const [staffPassword, setStaffPassword] = useState('123');
  const [staffRole, setStaffRole] = useState<'TEACHER' | 'ADMIN'>('TEACHER');
  const [staffTitle, setStaffTitle] = useState('');
  const [staffError, setStaffError] = useState<string | null>(null);

  // Modal Personalizado de Confirmación
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    type?: 'danger' | 'warning' | 'info';
    confirmText?: string;
    cancelText?: string;
    isAlertOnly?: boolean;
    onConfirm: () => void;
  } | null>(null);

  // Modal de Reportes / Boletines de Sección
  const [reportGroup, setReportGroup] = useState<Group | null>(null);
  const [sectionReportMode, setSectionReportMode] = useState<'GRUPAL' | 'INDIVIDUAL'>('GRUPAL');
  const [selectedReportStudentId, setSelectedReportStudentId] = useState<string>('');

  // Eliminar estudiante de una sección
  const handleDeleteStudent = (studentId: string, studentName: string) => {
    setConfirmModal({
      isOpen: true,
      title: 'Eliminar Estudiante',
      message: `¿Estás seguro de eliminar al estudiante "${studentName}" de esta sección?\n\nEsta acción no se puede deshacer.`,
      type: 'danger',
      confirmText: 'Eliminar Estudiante',
      onConfirm: async () => {
        try {
          await db.students.delete(studentId);
          if (onDataChanged) onDataChanged();
        } catch (err) {
          console.error('Error al eliminar estudiante:', err);
          setConfirmModal({
            isOpen: true,
            title: 'Error al Eliminar',
            message: 'Ocurrió un error al intentar eliminar al estudiante.',
            type: 'danger',
            isAlertOnly: true,
            confirmText: 'Entendido',
            onConfirm: () => {}
          });
        }
      }
    });
  };

  // ==================== HANDLERS ====================

  // Crear Sección / Grupo Completo
  const handleCreateGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    setGroupError(null);

    const isUniv = institutionType === 'UNIVERSITY';
    const code = isUniv
      ? (groupName.trim() || groupSectionCode.trim()).toUpperCase()
      : groupSectionCode.trim().toUpperCase();

    if (!code) {
      setGroupError(isUniv ? 'Ingresa el nombre o identificador del grupo.' : 'Ingresa el código de la sección (ej. 10-1).');
      return;
    }

    if (groups.some(g => (g.sectionCode.toUpperCase() === code || (g.groupName && g.groupName.toUpperCase() === groupName.trim().toUpperCase())))) {
      setGroupError(`Ya existe un ${unitSingular.toLowerCase()} registrado con este nombre/código en esta institución.`);
      return;
    }

    const newGroup: Group = {
      id: `grp-${Date.now()}`,
      institutionId,
      grade: Number(groupGrade),
      sectionCode: code,
      groupName: isUniv ? (groupName.trim() || code) : undefined,
      year: Number(groupYear) || 2026,
      specialty: groupSpecialty.trim() || undefined,
      guideTeacherId: groupGuideTeacherId || undefined
    };

    await db.groups.add(newGroup);
    setIsAddGroupOpen(false);
    setGroupSectionCode('');
    setGroupName('');
    setGroupSpecialty('');
    setGroupGuideTeacherId('');
    if (onDataChanged) onDataChanged();
  };

  // Crear Materia / Asignatura
  const handleCreateSubject = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubjectError(null);

    const name = subjectName.trim();
    if (!name) {
      setSubjectError('Ingresa el nombre de la materia.');
      return;
    }

    const code = (subjectCode.trim() || name.substring(0, 4)).toUpperCase();
    if (subjects.some(s => s.name.toLowerCase() === name.toLowerCase())) {
      setSubjectError(`Ya existe la asignatura "${name}" registrada.`);
      return;
    }

    const newSubject: Subject = {
      id: `sub-${Date.now()}`,
      institutionId,
      name,
      code,
      color: subjectColor
    };

    await db.subjects.add(newSubject);
    setIsAddSubjectOpen(false);
    setSubjectName('');
    setSubjectCode('');
    if (onDataChanged) onDataChanged();
  };

  // Asignar Materia a Docente en Sección
  const handleCreateAssignment = async (e: React.FormEvent) => {
    e.preventDefault();
    setAssignError(null);

    if (!selectedGroupId || !selectedSubjectId || !selectedTeacherId) {
      setAssignError('Debes seleccionar la sección, la materia y el docente.');
      return;
    }

    const exists = assignments.some(
      a => a.groupId === selectedGroupId && a.subjectId === selectedSubjectId && a.teacherId === selectedTeacherId
    );
    if (exists) {
      setAssignError('Esta asignación ya existe para esta sección y docente.');
      return;
    }

    const newAssignment: TeacherAssignment = {
      id: `asg-${Date.now()}`,
      teacherId: selectedTeacherId,
      groupId: selectedGroupId,
      subjectId: selectedSubjectId,
      isGuia: isGuiaAssignment
    };

    await db.assignments.add(newAssignment);

    // Inicializar configuración de evaluación por defecto
    const newConfig: EvaluationConfig = {
      id: `cfg-${newAssignment.id}`,
      assignmentId: newAssignment.id,
      periodId: 'I_PERIODO',
      passingGrade: 70,
      periodWeight: 50,
      rubrics: [
        { id: `r1-${newAssignment.id}`, key: 'asistencia', label: 'Asistencia', enabled: true, percentage: 5, description: 'Asistencia a lecciones' },
        { id: `r2-${newAssignment.id}`, key: 'cotidiano', label: 'Trabajo Cotidiano', enabled: true, percentage: 25, description: 'Desempeño en clase' },
        { id: `r3-${newAssignment.id}`, key: 'tareas', label: 'Tareas', enabled: true, percentage: 10, description: 'Trabajos extraclase' },
        { id: `r4-${newAssignment.id}`, key: 'evaluaciones', label: 'Evaluaciones / Pruebas', enabled: true, percentage: 45, description: 'Exámenes' },
        { id: `r5-${newAssignment.id}`, key: 'proyectos', label: 'Proyectos', enabled: true, percentage: 15, description: 'Proyectos técnicos' },
        { id: `r6-${newAssignment.id}`, key: 'portafolio', label: 'Portafolio', enabled: false, percentage: 0, description: 'Portafolio de evidencias' }
      ],
      taskDefinitions: [
        { id: `t1-${newAssignment.id}`, number: 1, title: 'Tarea 1', percentage: 5 },
        { id: `t2-${newAssignment.id}`, number: 2, title: 'Tarea 2', percentage: 5 }
      ],
      examDefinitions: [
        { id: `e1-${newAssignment.id}`, number: 1, title: 'Evaluación I', percentage: 20 },
        { id: `e2-${newAssignment.id}`, number: 2, title: 'Evaluación II', percentage: 25 }
      ],
      projectDefinitions: [
        { id: `p1-${newAssignment.id}`, number: 1, title: 'Proyecto I', percentage: 15 }
      ]
    };

    await db.evaluationConfigs.add(newConfig);

    setIsAssignTeacherOpen(false);
    setSelectedGroupId('');
    setSelectedSubjectId('');
    setSelectedTeacherId('');
    setIsGuiaAssignment(false);
    if (onDataChanged) onDataChanged();
  };

  // Desasignar / Eliminar Asignación
  const handleDeleteAssignment = (assignmentId: string) => {
    const asg = assignments.find(a => a.id === assignmentId);
    const sub = subjects.find(s => s.id === asg?.subjectId);
    const tch = teachers.find(t => t.id === asg?.teacherId);
    const grp = groups.find(g => g.id === asg?.groupId);

    setConfirmModal({
      isOpen: true,
      title: 'Desasignar Materia de la Sección',
      message: `¿Deseas desasignar la materia "${sub?.name || 'Materia'}" impartida por "${tch?.name || 'Docente'}" de la ${grp?.groupName || `Sección ${grp?.sectionCode}`}?\n\nEsta acción desvinculará la materia de este grupo.`,
      type: 'warning',
      confirmText: 'Desasignar Materia',
      onConfirm: async () => {
        await db.assignments.delete(assignmentId);
        await db.evaluationConfigs.where('assignmentId').equals(assignmentId).delete();
        if (onDataChanged) onDataChanged();
      }
    });
  };

  // Eliminar Sección
  const handleDeleteGroup = (groupId: string) => {
    const grp = groups.find(g => g.id === groupId);
    const sectionStudents = students.filter(s => s.groupId === groupId);
    const sectionAssignments = assignments.filter(a => a.groupId === groupId);

    const isUniv = institutionType === 'UNIVERSITY';
    const unitLabel = isUniv ? 'Grupo' : 'Sección';

    const msg = sectionStudents.length > 0 || sectionAssignments.length > 0
      ? `Esta sección tiene ${sectionStudents.length} estudiantes y ${sectionAssignments.length} materias asignadas.\n\n¿Seguro que deseas eliminar completamente este ${unitLabel} y todas sus materias asignadas?`
      : `¿Seguro que deseas eliminar este ${unitLabel}?`;

    setConfirmModal({
      isOpen: true,
      title: `Eliminar ${unitLabel} ${grp?.groupName || grp?.sectionCode}`,
      message: msg,
      type: 'danger',
      confirmText: `Eliminar ${unitLabel}`,
      onConfirm: async () => {
        await db.groups.delete(groupId);
        for (const asg of sectionAssignments) {
          await db.assignments.delete(asg.id);
          await db.evaluationConfigs.where('assignmentId').equals(asg.id).delete();
        }
        if (onDataChanged) onDataChanged();
      }
    });
  };

  // Crear Personal (Docente o Admin)
  const handleCreateStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    setStaffError(null);

    const cleanEmail = staffEmail.trim().toLowerCase();
    if (!staffName.trim() || !cleanEmail) {
      setStaffError('Completa todos los campos obligatorios.');
      return;
    }

    const existingUsers = await db.users.toArray();
    if (existingUsers.some(u => u.email.toLowerCase() === cleanEmail)) {
      setStaffError('Ya existe un usuario registrado con este correo electrónico.');
      return;
    }

    const newStaff: User = {
      id: `user-${Date.now()}`,
      name: staffName.trim(),
      email: cleanEmail,
      password: staffPassword.trim() || '123',
      role: staffRole, // Solo Docente o Admin
      institutionId: institutionId,
      title: staffTitle.trim() || (staffRole === 'ADMIN' ? 'Administrativo' : 'Docente')
    };

    await db.users.add(newStaff);
    setIsAddStaffOpen(false);
    setStaffName('');
    setStaffEmail('');
    setStaffPassword('123');
    setStaffTitle('');
    if (onDataChanged) onDataChanged();
  };

  const institutionStaff = allUsers.filter(u => u.institutionId === institutionId);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Institutional Banner */}
      <div className="glass-panel" style={{
        padding: '24px',
        background: 'linear-gradient(135deg, rgba(79, 70, 229, 0.12) 0%, rgba(124, 58, 237, 0.08) 100%)',
        border: '1px solid rgba(79, 70, 229, 0.25)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <div className="badge" style={{ background: 'rgba(79, 70, 229, 0.2)', color: '#4f46e5', marginBottom: '8px' }}>
              <Building2 size={12} /> Panel de Dirección y Gestión Académica
            </div>
            <h1 style={{ fontSize: '1.6rem', fontWeight: 800 }}>
              Administración Institucional: {institutionName}
            </h1>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginTop: '4px' }}>
              Crea secciones, gestiona nóminas completas de estudiantes y asigna las materias y docentes correspondientes.
            </p>
          </div>

          <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
            <div style={{ background: 'var(--bg-card)', padding: '10px 18px', borderRadius: '12px', border: '1px solid var(--border-subtle)', textAlign: 'center' }}>
              <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#4f46e5' }}>{groups.length}</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{unitPlural}</div>
            </div>
            <div style={{ background: 'var(--bg-card)', padding: '10px 18px', borderRadius: '12px', border: '1px solid var(--border-subtle)', textAlign: 'center' }}>
              <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#06b6d4' }}>{teachers.length}</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Docentes</div>
            </div>
            <div style={{ background: 'var(--bg-card)', padding: '10px 18px', borderRadius: '12px', border: '1px solid var(--border-subtle)', textAlign: 'center' }}>
              <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#10b981' }}>{students.length}</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Estudiantes</div>
            </div>
            <div style={{ background: 'var(--bg-card)', padding: '10px 18px', borderRadius: '12px', border: '1px solid var(--border-subtle)', textAlign: 'center' }}>
              <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#f59e0b' }}>{assignments.length}</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Asignaciones</div>
            </div>
          </div>
        </div>
      </div>

      {/* Selector de Pestañas de Dirección */}
      <div style={{ display: 'flex', gap: '8px', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '12px', flexWrap: 'wrap' }}>
        <button
          onClick={() => setActiveTab('ACADEMIC')}
          className={`btn ${activeTab === 'ACADEMIC' ? 'btn-primary' : 'btn-secondary'} btn-sm`}
          style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 700 }}
        >
          <Layers size={16} />
          <span>Gestión de {unitPlural} y Cargas ({groups.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('SUPERVISION')}
          className={`btn ${activeTab === 'SUPERVISION' ? 'btn-primary' : 'btn-secondary'} btn-sm`}
          style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 700 }}
        >
          <TrendingUp size={16} />
          <span>Supervisión de Calificaciones ({assignments.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('STAFF')}
          className={`btn ${activeTab === 'STAFF' ? 'btn-primary' : 'btn-secondary'} btn-sm`}
          style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 700 }}
        >
          <Users size={16} />
          <span>Personal de la Institución ({institutionStaff.length})</span>
        </button>
      </div>

      {/* PESTAÑA 1: GESTIÓN DE SECCIONES Y CARGAS ACADÉMICAS */}
      {activeTab === 'ACADEMIC' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Barra de Herramientas y Explicación */}
          <div className="glass-panel" style={{
            padding: '16px 20px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '14px',
            border: '1px solid var(--border-subtle)',
            background: 'var(--bg-surface)'
          }}>
            <div>
              <h2 style={{ fontSize: '1.15rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
                <Layers size={20} color="#4f46e5" />
                {unitPlural}, Materias y Asignación de Docentes
              </h2>
              <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', margin: '4px 0 0 0' }}>
                Una sola nómina de estudiantes en un {unitSingular.toLowerCase()} es compartida por todos los docentes asignados.
              </p>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
              {/* Botón de alternar sub-vista */}
              <div style={{
                display: 'flex',
                background: 'var(--bg-main)',
                padding: '3px',
                borderRadius: '10px',
                border: '1px solid var(--border-subtle)'
              }}>
                <button
                  onClick={() => setAcademicViewMode('BY_SECTION')}
                  className={`btn btn-sm ${academicViewMode === 'BY_SECTION' ? 'btn-primary' : 'btn-ghost'}`}
                  style={{ fontSize: '0.78rem', padding: '5px 10px', fontWeight: 700, borderRadius: '8px' }}
                >
                  Por {unitPlural} ({groups.length})
                </button>
                <button
                  onClick={() => setAcademicViewMode('BY_TEACHER')}
                  className={`btn btn-sm ${academicViewMode === 'BY_TEACHER' ? 'btn-primary' : 'btn-ghost'}`}
                  style={{ fontSize: '0.78rem', padding: '5px 10px', fontWeight: 700, borderRadius: '8px' }}
                >
                  Por Docentes ({teachers.length})
                </button>
              </div>

              {/* Botón Crear Sección / Grupo */}
              <button
                onClick={() => setIsAddGroupOpen(true)}
                className="btn btn-primary btn-sm"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  fontWeight: 700,
                  background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)'
                }}
              >
                <Plus size={16} />
                <span>+ Crear {unitSingular}</span>
              </button>

              {/* Botón Asignar Materia a Docente */}
              <button
                onClick={() => {
                  setSelectedGroupId(groups[0]?.id || '');
                  setSelectedSubjectId(subjects[0]?.id || '');
                  setSelectedTeacherId(teachers[0]?.id || '');
                  setIsAssignTeacherOpen(true);
                }}
                className="btn btn-secondary btn-sm"
                style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 700 }}
              >
                <UserCheck size={16} color="#4f46e5" />
                <span>+ Asignar Materia a Docente</span>
              </button>

              {/* Botón Crear Materia */}
              <button
                onClick={() => setIsAddSubjectOpen(true)}
                className="btn btn-secondary btn-sm"
                style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 600 }}
              >
                <BookOpen size={15} color="#0891b2" />
                <span>+ Nueva Materia</span>
              </button>
            </div>
          </div>

          {/* VISTA SUB-1: POR SECCIONES (GRUPOS COMPLETOS) */}
          {academicViewMode === 'BY_SECTION' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* Barra de Búsqueda y Filtros por Grado/Nivel */}
              <div className="glass-panel" style={{
                padding: '14px 18px',
                border: '1px solid var(--border-subtle)',
                background: 'var(--bg-surface)',
                borderRadius: '12px',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '14px', flexWrap: 'wrap' }}>
                  {/* Buscador de secciones */}
                  <div style={{ position: 'relative', width: '380px', maxWidth: '100%' }}>
                    <Search size={18} color="#6366f1" style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)' }} />
                    <input
                      type="text"
                      value={sectionSearchQuery}
                      onChange={e => setSectionSearchQuery(e.target.value)}
                      placeholder={`Buscar ${unitSingular.toLowerCase()} (ej. 12, 10-1) o materia...`}
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
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Filter size={14} color="#4f46e5" />
                    <span>
                      Mostrando <strong>{filteredGroups.length}</strong> de <strong>{groups.length}</strong> {unitPlural.toLowerCase()}
                    </span>
                    {(selectedGradeFilter !== 'ALL' || sectionSearchQuery) && (
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedGradeFilter('ALL');
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

                {/* Filtros de Grado / Nivel automáticos */}
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
                      padding: '4px 12px',
                      borderRadius: '20px',
                      fontWeight: selectedGradeFilter === 'ALL' ? 700 : 500
                    }}
                  >
                    Todos ({groups.length})
                  </button>

                  {availableGrades.map(grade => {
                    const count = groups.filter(g => g.grade === grade).length;
                    const isSelected = selectedGradeFilter === grade;

                    return (
                      <button
                        type="button"
                        key={grade}
                        onClick={() => setSelectedGradeFilter(isSelected ? 'ALL' : grade)}
                        className={`btn btn-sm ${isSelected ? 'btn-primary' : 'btn-secondary'}`}
                        style={{
                          fontSize: '0.78rem',
                          padding: '4px 12px',
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

              {/* Grid de Secciones */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: '20px' }}>
                {filteredGroups.map(grp => {
                  const sectionStudents = students.filter(s => s.groupId === grp.id);
                  const sectionAssignments = assignments.filter(a => a.groupId === grp.id);
                  const guideTeacher = teachers.find(t => t.id === grp.guideTeacherId);

                  return (
                    <div
                      key={grp.id}
                      className="glass-panel"
                      style={{
                        padding: '20px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '14px',
                        border: '1px solid var(--border-subtle)',
                        position: 'relative'
                      }}
                    >
                      {/* Header de la Sección / Grupo */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px', flexWrap: 'wrap' }}>
                        <div style={{ flex: '1 1 200px', minWidth: 0 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                            <span className="badge" style={{
                              background: isUniversity ? 'linear-gradient(135deg, #a855f7, #9333ea)' : 'linear-gradient(135deg, #4f46e5, #6366f1)',
                              color: 'white',
                              fontWeight: 800,
                              fontSize: '0.88rem',
                              padding: '5px 12px',
                              borderRadius: '8px',
                              whiteSpace: 'nowrap',
                              boxShadow: '0 2px 8px rgba(79, 70, 229, 0.25)'
                            }}>
                              {grp.groupName ? grp.groupName : `${unitSingular} ${grp.sectionCode}`}
                            </span>
                            <span className="badge" style={{ background: 'var(--bg-surface)', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                              {isUniversity ? `Ciclo ${grp.grade}` : `Año ${grp.year}`}
                            </span>
                          </div>
                          {grp.specialty && (
                            <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-main)', marginTop: '6px' }}>
                              {isUniversity ? `Carrera: ${grp.specialty}` : grp.specialty}
                            </div>
                          )}
                          {guideTeacher && (
                            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                              {isUniversity ? 'Prof. Coordinador:' : 'Docente Guía:'} <strong style={{ color: 'var(--text-main)' }}>{guideTeacher.name}</strong>
                            </div>
                          )}
                        </div>

                        {/* Botones de acción rápida sobre la sección */}
                        <div style={{ display: 'flex', gap: '6px', alignItems: 'center', flexWrap: 'wrap' }}>
                          <button
                            type="button"
                            onClick={() => {
                              setReportGroup(grp);
                              const grpStudents = students.filter(s => s.groupId === grp.id);
                              setSelectedReportStudentId(grpStudents[0]?.id || '');
                              setSectionReportMode('GRUPAL');
                            }}
                            className="btn btn-secondary btn-sm"
                            style={{ padding: '6px 10px', fontSize: '0.78rem', display: 'flex', alignItems: 'center', gap: '5px' }}
                            title="Generar boletines oficiales y reporte consolidado de esta sección"
                          >
                            <FileText size={14} color="#6366f1" />
                            <span>Boletines</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => setViewingGroup(grp)}
                            className="btn btn-secondary btn-sm"
                            style={{ padding: '6px 10px', fontSize: '0.78rem', display: 'flex', alignItems: 'center', gap: '6px' }}
                            title="Gestionar nómina de estudiantes (Ver, Importar, Agregar, Editar)"
                          >
                            <Users size={14} color="#4f46e5" />
                            <span>{sectionStudents.length} Alumnos</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => setImportingGroupId(grp.id)}
                            className="btn btn-ghost btn-sm"
                            style={{ padding: '6px', color: '#10b981' }}
                            title="Importar lista de estudiantes desde Excel a este grupo"
                          >
                            <UploadCloud size={15} />
                          </button>
                          <button
                            type="button"
                            onClick={() => setAddingStudentGroupId(grp.id)}
                            className="btn btn-ghost btn-sm"
                            style={{ padding: '6px', color: '#4f46e5' }}
                            title="Agregar estudiante a este grupo"
                          >
                            <UserPlus size={15} />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteGroup(grp.id)}
                            className="btn btn-ghost btn-sm"
                            style={{ padding: '6px', color: '#ef4444' }}
                            title={`Eliminar ${unitSingular}`}
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </div>

                      {/* Materias y Profesores Asignados a este Grupo */}
                      <div style={{
                        background: 'var(--bg-main)',
                        padding: '12px',
                        borderRadius: '12px',
                        border: '1px solid var(--border-subtle)',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '8px'
                      }}>
                        <div style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                          Materias y Docentes Asignados ({sectionAssignments.length})
                        </div>

                        {sectionAssignments.map(asg => {
                          const sub = subjects.find(s => s.id === asg.subjectId);
                          const tch = teachers.find(t => t.id === asg.teacherId);

                          return (
                            <div
                              key={asg.id}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                background: 'var(--bg-card)',
                                padding: '8px 12px',
                                borderRadius: '8px',
                                border: '1px solid var(--border-subtle)',
                                gap: '8px',
                                cursor: 'pointer',
                                transition: 'all 0.15s ease'
                              }}
                              onClick={() => onOpenGroupGradebook(asg)}
                              className="hover-lift"
                              title={`Clic para abrir sábana de notas de ${sub?.name || 'la materia'}`}
                            >
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
                                <span style={{
                                  width: '8px',
                                  height: '8px',
                                  borderRadius: '50%',
                                  background: sub?.color || '#4f46e5',
                                  flexShrink: 0
                                }} />
                                <div style={{ minWidth: 0 }}>
                                  <div style={{ fontSize: '0.85rem', fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                    {sub?.name || 'Materia'}
                                  </div>
                                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                    {tch?.name || 'Sin profesor asignado'} {asg.isGuia ? '• (Guía)' : ''}
                                  </div>
                                </div>
                              </div>

                              <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flexShrink: 0 }}>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onOpenGroupGradebook(asg);
                                  }}
                                  className="btn btn-ghost btn-sm"
                                  style={{ padding: '4px 6px', fontSize: '0.75rem', color: '#4f46e5' }}
                                  title="Inspeccionar notas"
                                >
                                  <FileSpreadsheet size={14} />
                                </button>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDeleteAssignment(asg.id);
                                  }}
                                  className="btn btn-ghost btn-sm"
                                  style={{ padding: '4px 6px', color: '#ef4444' }}
                                  title="Desasignar materia de este grupo"
                                >
                                  <Trash2 size={13} />
                                </button>
                              </div>
                            </div>
                          );
                        })}

                        {sectionAssignments.length === 0 && (
                          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textAlign: 'center', padding: '10px 0' }}>
                            Sin materias asignadas aún a esta sección.
                          </div>
                        )}
                      </div>

                      {/* Botón inferior: Asignar materia directamente a este grupo */}
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedGroupId(grp.id);
                          setSelectedSubjectId(subjects[0]?.id || '');
                          setSelectedTeacherId(teachers[0]?.id || '');
                          setIsAssignTeacherOpen(true);
                        }}
                        className="btn btn-secondary btn-sm"
                        style={{
                          marginTop: 'auto',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '6px',
                          fontWeight: 700,
                          fontSize: '0.8rem',
                          borderStyle: 'dashed'
                        }}
                      >
                        <Plus size={14} color="#4f46e5" />
                        <span>+ Asignar Materia a {grp.groupName || `${unitSingular} ${grp.sectionCode}`}</span>
                      </button>
                    </div>
                  );
                })}

                {filteredGroups.length === 0 && (
                  <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                    <p style={{ margin: 0, fontSize: '0.95rem' }}>
                      {groups.length === 0
                        ? `No se han registrado ${unitPlural.toLowerCase()} en esta institución. Haz clic en "+ Crear ${unitSingular}" para comenzar.`
                        : `No se encontraron ${unitPlural.toLowerCase()} que coincidan con la búsqueda o filtro seleccionado.`}
                    </p>
                    {groups.length > 0 && (
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedGradeFilter('ALL');
                          setSectionSearchQuery('');
                        }}
                        className="btn btn-secondary btn-sm"
                        style={{ marginTop: '12px' }}
                      >
                        Mostrar todas las {unitPlural.toLowerCase()}
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* VISTA SUB-2: POR DOCENTES */}
          {academicViewMode === 'BY_TEACHER' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* Barra de Filtros y Buscador para Docentes */}
              <div className="glass-panel" style={{
                padding: '14px 18px',
                border: '1px solid var(--border-subtle)',
                background: 'var(--bg-surface)',
                borderRadius: '12px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '14px',
                flexWrap: 'wrap'
              }}>
                {/* Buscador de docentes */}
                <div style={{ position: 'relative', width: '380px', maxWidth: '100%' }}>
                  <Search size={18} color="#6366f1" style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)' }} />
                  <input
                    type="text"
                    value={teacherSearchQuery}
                    onChange={e => setTeacherSearchQuery(e.target.value)}
                    placeholder="Buscar docente o materia impartida..."
                    className="input-field"
                    style={{
                      width: '100%',
                      height: '44px',
                      paddingLeft: '42px',
                      paddingRight: teacherSearchQuery ? '38px' : '16px',
                      fontSize: '0.9rem',
                      borderRadius: '12px',
                      border: '1.5px solid var(--border-subtle)',
                      background: 'var(--bg-main)',
                      boxShadow: '0 2px 6px rgba(0,0,0,0.04)'
                    }}
                  />
                  {teacherSearchQuery && (
                    <button
                      type="button"
                      onClick={() => setTeacherSearchQuery('')}
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

                {/* Filtros de Asignación de Docente */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                  <button
                    type="button"
                    onClick={() => setTeacherFilterMode('ALL')}
                    className={`btn btn-sm ${teacherFilterMode === 'ALL' ? 'btn-primary' : 'btn-secondary'}`}
                    style={{ fontSize: '0.78rem', padding: '4px 12px', borderRadius: '20px' }}
                  >
                    Todos ({teachers.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setTeacherFilterMode('ASSIGNED')}
                    className={`btn btn-sm ${teacherFilterMode === 'ASSIGNED' ? 'btn-primary' : 'btn-secondary'}`}
                    style={{ fontSize: '0.78rem', padding: '4px 12px', borderRadius: '20px' }}
                  >
                    Con Asignaciones ({teachers.filter(t => assignments.some(a => a.teacherId === t.id)).length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setTeacherFilterMode('UNASSIGNED')}
                    className={`btn btn-sm ${teacherFilterMode === 'UNASSIGNED' ? 'btn-primary' : 'btn-secondary'}`}
                    style={{ fontSize: '0.78rem', padding: '4px 12px', borderRadius: '20px' }}
                  >
                    Sin Asignar ({teachers.filter(t => !assignments.some(a => a.teacherId === t.id)).length})
                  </button>
                </div>
              </div>

              {/* Grid de Docentes */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '20px' }}>
                {filteredTeachers.map(tch => {
                  const teacherAssignments = assignments.filter(a => a.teacherId === tch.id);

                  return (
                    <div
                      key={tch.id}
                      className="glass-panel"
                      style={{
                        padding: '20px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '14px',
                        border: '1px solid var(--border-subtle)'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{
                          width: '40px',
                          height: '40px',
                          borderRadius: '50%',
                          background: 'linear-gradient(135deg, #06b6d4, #3b82f6)',
                          color: 'white',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontWeight: 800,
                          fontSize: '1rem'
                        }}>
                          {tch.name.charAt(0)}
                        </div>
                        <div>
                          <div style={{ fontSize: '0.95rem', fontWeight: 800 }}>{tch.name}</div>
                          <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{tch.title || 'Docente'}</div>
                        </div>
                      </div>

                      <div style={{
                        background: 'var(--bg-main)',
                        padding: '12px',
                        borderRadius: '10px',
                        border: '1px solid var(--border-subtle)',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '6px'
                      }}>
                        <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                          Secciones y Materias Impartidas ({teacherAssignments.length})
                        </div>

                        {teacherAssignments.map(asg => {
                          const grp = groups.find(g => g.id === asg.groupId);
                          const sub = subjects.find(s => s.id === asg.subjectId);

                          return (
                            <div
                              key={asg.id}
                              style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                background: 'var(--bg-card)',
                                padding: '6px 10px',
                                borderRadius: '8px',
                                border: '1px solid var(--border-subtle)',
                                fontSize: '0.82rem',
                                cursor: 'pointer',
                                transition: 'all 0.15s ease'
                              }}
                              onClick={() => onOpenGroupGradebook(asg)}
                              className="hover-lift"
                              title={`Clic para abrir sábana de notas de ${sub?.name}`}
                            >
                              <div>
                                <strong style={{ color: '#4f46e5' }}>
                                  {grp?.groupName ? grp.groupName : `${unitSingular} ${grp?.sectionCode}`}
                                </strong> • {sub?.name}
                              </div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onOpenGroupGradebook(asg);
                                  }}
                                  className="btn btn-ghost btn-sm"
                                  style={{ padding: '3px', color: '#4f46e5' }}
                                  title="Inspeccionar notas"
                                >
                                  <FileSpreadsheet size={13} />
                                </button>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDeleteAssignment(asg.id);
                                  }}
                                  className="btn btn-ghost btn-sm"
                                  style={{ padding: '3px', color: '#ef4444' }}
                                  title="Desasignar"
                                >
                                  <Trash2 size={13} />
                                </button>
                              </div>
                            </div>
                          );
                        })}

                        {teacherAssignments.length === 0 && (
                          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textAlign: 'center', padding: '8px 0' }}>
                            Este docente aún no tiene secciones asignadas.
                          </div>
                        )}
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          setSelectedTeacherId(tch.id);
                          setSelectedGroupId(groups[0]?.id || '');
                          setSelectedSubjectId(subjects[0]?.id || '');
                          setIsAssignTeacherOpen(true);
                        }}
                        className="btn btn-secondary btn-sm"
                        style={{
                          marginTop: 'auto',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '6px',
                          fontWeight: 700,
                          fontSize: '0.8rem',
                          borderStyle: 'dashed'
                        }}
                      >
                        <Plus size={14} color="#4f46e5" />
                        <span>+ Asignar Sección a {tch.name.split(' ')[0]}</span>
                      </button>
                    </div>
                  );
                })}

                {filteredTeachers.length === 0 && (
                  <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                    <p style={{ margin: 0, fontSize: '0.95rem' }}>
                      No se encontraron docentes que coincidan con la búsqueda o filtro.
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        setTeacherFilterMode('ALL');
                        setTeacherSearchQuery('');
                      }}
                      className="btn btn-secondary btn-sm"
                      style={{ marginTop: '12px' }}
                    >
                      Mostrar todos los docentes
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* PESTAÑA 2: SUPERVISIÓN DE CALIFICACIONES */}
      {activeTab === 'SUPERVISION' && (
        <div>
          <h2 style={{ fontSize: '1.2rem', fontWeight: 800, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <TrendingUp size={20} color="#4f46e5" />
            Supervisión y Rendimiento por Sección y Asignatura
          </h2>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: '20px' }}>
            {assignments.map(asg => {
              const group = groups.find(g => g.id === asg.groupId);
              const subject = subjects.find(s => s.id === asg.subjectId);
              const teacher = teachers.find(t => t.id === asg.teacherId);
              const sectionStudents = students.filter(s => s.groupId === asg.groupId);

              const simulatedPassingRate = asg.groupId === 'grp-12-1' ? 93.3 : 88.5;
              const simulatedAttendanceRate = asg.groupId === 'grp-12-1' ? 96.2 : 91.8;

              return (
                <div
                  key={asg.id}
                  className="glass-panel hover-lift"
                  style={{
                    padding: '22px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '14px',
                    border: '1px solid var(--border-subtle)',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease'
                  }}
                  onClick={() => onOpenGroupGradebook(asg)}
                  title={`Clic para inspeccionar la sábana de notas de ${subject?.name || 'la materia'}`}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px', flexWrap: 'wrap' }}>
                    <div style={{ flex: '1 1 200px', minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginBottom: '8px' }}>
                        <span className="badge" style={{
                          background: 'linear-gradient(135deg, #4f46e5 0%, #6366f1 100%)',
                          color: 'white',
                          fontWeight: 800,
                          fontSize: '0.85rem',
                          padding: '5px 12px',
                          borderRadius: '8px',
                          whiteSpace: 'nowrap',
                          boxShadow: '0 2px 8px rgba(79, 70, 229, 0.25)',
                          display: 'inline-flex',
                          alignItems: 'center'
                        }}>
                          {group?.groupName || `Sección ${group?.sectionCode || '12-1'}`}
                        </span>
                        {group?.specialty && (
                          <span className="badge" style={{
                            background: 'var(--bg-surface)',
                            color: 'var(--text-muted)',
                            border: '1px solid var(--border-subtle)',
                            fontSize: '0.75rem',
                            whiteSpace: 'nowrap'
                          }}>
                            {group.specialty}
                          </span>
                        )}
                      </div>
                      <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--text-main)', margin: '4px 0 0 0', lineHeight: 1.3 }}>
                        {subject?.name}
                      </h3>
                    </div>

                    <span className="badge" style={{
                      background: simulatedPassingRate >= 90 ? 'var(--badge-present-bg)' : 'var(--badge-excused-bg)',
                      color: simulatedPassingRate >= 90 ? 'var(--badge-present-text)' : 'var(--badge-excused-text)',
                      fontWeight: 700,
                      fontSize: '0.82rem',
                      padding: '5px 10px',
                      whiteSpace: 'nowrap',
                      flexShrink: 0
                    }}>
                      {simulatedPassingRate}% Aprobación
                    </span>
                  </div>

                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    background: 'var(--bg-surface)',
                    padding: '8px 12px',
                    borderRadius: '10px'
                  }}>
                    <div style={{
                      width: '32px',
                      height: '32px',
                      borderRadius: '50%',
                      background: 'linear-gradient(135deg, #06b6d4, #3b82f6)',
                      color: 'white',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: 700,
                      fontSize: '0.8rem',
                      flexShrink: 0
                    }}>
                      {teacher?.name.charAt(0)}
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: '0.85rem', fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {teacher?.name}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        {teacher?.title || 'Docente'} {asg.isGuia ? '• Docente Guía' : ''}
                      </div>
                    </div>
                  </div>

                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(2, 1fr)',
                    gap: '8px',
                    fontSize: '0.8rem'
                  }}>
                    <div style={{ background: 'var(--bg-main)', padding: '8px', borderRadius: '8px', border: '1px solid var(--border-subtle)' }}>
                      <div style={{ color: 'var(--text-muted)' }}>Matrícula:</div>
                      <div style={{ fontWeight: 700 }}>{sectionStudents.length} estudiantes</div>
                    </div>
                    <div style={{ background: 'var(--bg-main)', padding: '8px', borderRadius: '8px', border: '1px solid var(--border-subtle)' }}>
                      <div style={{ color: 'var(--text-muted)' }}>Asistencia Promedio:</div>
                      <div style={{ fontWeight: 700, color: '#16a34a' }}>{simulatedAttendanceRate}%</div>
                    </div>
                  </div>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onOpenGroupGradebook(asg);
                    }}
                    className="btn btn-secondary btn-sm"
                    style={{ width: '100%', marginTop: 'auto', justifyContent: 'space-between' }}
                  >
                    <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <FileSpreadsheet size={15} color="#4f46e5" />
                      Inspeccionar Sábana de Notas
                    </span>
                    <ArrowRight size={14} />
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* PESTAÑA 3: PERSONAL DE LA INSTITUCIÓN */}
      {activeTab === 'STAFF' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h2 style={{ fontSize: '1.2rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Users size={20} color="#4f46e5" />
              Docentes y Personal Administrativo de la Institución
            </h2>
            <button
              onClick={() => setIsAddStaffOpen(true)}
              className="btn btn-primary btn-sm"
              style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 700 }}
            >
              <UserPlus size={16} />
              <span>Registrar Nuevo Docente / Admin</span>
            </button>
          </div>

          <div className="glass-panel" style={{ overflowX: 'auto', border: '1px solid var(--border-subtle)' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.88rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-subtle)', background: 'var(--bg-surface)' }}>
                  <th style={{ padding: '12px 16px', fontWeight: 700 }}>Nombre Completo</th>
                  <th style={{ padding: '12px 16px', fontWeight: 700 }}>Correo Electrónico</th>
                  <th style={{ padding: '12px 16px', fontWeight: 700 }}>Rol Asignado</th>
                  <th style={{ padding: '12px 16px', fontWeight: 700 }}>Especialidad / Título</th>
                  <th style={{ padding: '12px 16px', fontWeight: 700 }}>Contraseña Inicial</th>
                </tr>
              </thead>
              <tbody>
                {institutionStaff.map(st => (
                  <tr key={st.id} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                    <td style={{ padding: '12px 16px', fontWeight: 600 }}>{st.name}</td>
                    <td style={{ padding: '12px 16px', color: 'var(--text-muted)' }}>{st.email}</td>
                    <td style={{ padding: '12px 16px' }}>
                      <span className="badge" style={{
                        background: st.role === 'DIRECTOR' ? '#4f46e5' : st.role === 'ADMIN' ? '#0891b2' : '#059669',
                        color: 'white',
                        fontWeight: 700
                      }}>
                        {st.role === 'DIRECTOR' ? 'Director(a)' : st.role === 'ADMIN' ? 'Administrativo' : 'Docente'}
                      </span>
                    </td>
                    <td style={{ padding: '12px 16px', color: 'var(--text-muted)' }}>{st.title || 'N/A'}</td>
                    <td style={{ padding: '12px 16px', fontFamily: 'monospace', color: 'var(--text-muted)' }}>
                      {st.password || '123'}
                    </td>
                  </tr>
                ))}
                {institutionStaff.length === 0 && (
                  <tr>
                    <td colSpan={5} style={{ padding: '32px', textAlign: 'center', color: 'var(--text-muted)' }}>
                      No se encontró personal registrado en esta institución.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODALES ACADÉMICOS Y DE GESTIÓN */}
      {/* ========================================================================= */}

      {/* MODAL 1: CREAR SECCIÓN (GRUPO COMPLETO) */}
      {isAddGroupOpen && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.6)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '20px'
        }}>
          <div className="glass-panel" style={{
            background: 'var(--bg-main)',
            border: '1px solid var(--border-subtle)',
            borderRadius: '16px',
            width: '100%',
            maxWidth: '480px',
            padding: '24px',
            boxShadow: '0 20px 40px rgba(0,0,0,0.3)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Layers size={20} color="#4f46e5" />
                <h3 style={{ fontSize: '1.2rem', fontWeight: 800 }}>
                  Crear Nuevo {unitSingular} {isUniversity ? 'Universitario' : isSchool ? 'de Primaria' : 'de Secundaria'}
                </h3>
              </div>
              <button onClick={() => setIsAddGroupOpen(false)} className="btn btn-ghost btn-sm" style={{ padding: '4px' }}>
                <X size={18} />
              </button>
            </div>

            <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: '16px' }}>
              {isUniversity
                ? 'Crea un grupo universitario asignando su nombre distintivo, cuatrimestre y carrera. Luego podrás matricular estudiantes y asignar docentes.'
                : `Crea un ${unitSingular.toLowerCase()} de grupo completo. Luego podrás registrar o importar los estudiantes para este grupo y asignarle materias a los docentes.`}
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
              {isUniversity ? (
                /* FORMULARIO UNIVERSIDAD */
                <>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, marginBottom: '6px' }}>
                      Nombre del Grupo Universitario *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Ej. Grupo 01 - Matutino, NRC 4512, Grupo A"
                      value={groupName}
                      onChange={e => setGroupName(e.target.value)}
                      className="input-field"
                      style={{ width: '100%', padding: '10px 14px' }}
                    />
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, marginBottom: '6px' }}>
                        Ciclo / Semestre / Cuatri *
                      </label>
                      <select
                        value={groupGrade}
                        onChange={e => setGroupGrade(Number(e.target.value))}
                        className="input-field"
                        style={{ width: '100%', padding: '10px 14px' }}
                      >
                        <option value={1}>I Cuatrimestre / Semestre</option>
                        <option value={2}>II Cuatrimestre / Semestre</option>
                        <option value={3}>III Cuatrimestre / Semestre</option>
                        <option value={4}>IV Cuatrimestre / Semestre</option>
                        <option value={5}>V Cuatrimestre / Semestre</option>
                        <option value={6}>VI Cuatrimestre / Semestre</option>
                        <option value={7}>VII Cuatrimestre / Semestre</option>
                        <option value={8}>VIII Cuatrimestre / Semestre</option>
                        <option value={9}>IX Cuatrimestre / Semestre</option>
                        <option value={10}>X Cuatrimestre / Semestre</option>
                      </select>
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, marginBottom: '6px' }}>
                        Año / Periodo Lectivo
                      </label>
                      <input
                        type="number"
                        value={groupYear}
                        onChange={e => setGroupYear(Number(e.target.value))}
                        className="input-field"
                        style={{ width: '100%', padding: '10px 14px' }}
                      />
                    </div>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, marginBottom: '6px' }}>
                      Carrera / Facultad / Programa
                    </label>
                    <input
                      type="text"
                      placeholder="Ej. Ingeniería en Sistemas, Administración de Empresas..."
                      value={groupSpecialty}
                      onChange={e => setGroupSpecialty(e.target.value)}
                      className="input-field"
                      style={{ width: '100%', padding: '10px 14px' }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, marginBottom: '6px' }}>
                      Profesor Coordinador / Titular (Opcional)
                    </label>
                    <select
                      value={groupGuideTeacherId}
                      onChange={e => setGroupGuideTeacherId(e.target.value)}
                      className="input-field"
                      style={{ width: '100%', padding: '10px 14px' }}
                    >
                      <option value="">Sin asignar</option>
                      {teachers.map(t => (
                        <option key={t.id} value={t.id}>{t.name}</option>
                      ))}
                    </select>
                  </div>
                </>
              ) : (
                /* FORMULARIO ESCUELA O COLEGIO */
                <>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, marginBottom: '6px' }}>
                        Nivel / Grado *
                      </label>
                      <select
                        value={groupGrade}
                        onChange={e => setGroupGrade(Number(e.target.value))}
                        className="input-field"
                        style={{ width: '100%', padding: '10px 14px' }}
                      >
                        {isSchool ? (
                          <>
                            <option value={1}>1° Primero</option>
                            <option value={2}>2° Segundo</option>
                            <option value={3}>3° Tercero</option>
                            <option value={4}>4° Cuarto</option>
                            <option value={5}>5° Quinto</option>
                            <option value={6}>6° Sexto</option>
                          </>
                        ) : (
                          <>
                            <option value={7}>7° Séptimo</option>
                            <option value={8}>8° Octavo</option>
                            <option value={9}>9° Noveno</option>
                            <option value={10}>10° Décimo</option>
                            <option value={11}>11° Undécimo</option>
                            <option value={12}>12° Duodécimo</option>
                          </>
                        )}
                      </select>
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, marginBottom: '6px' }}>
                        Código de Sección *
                      </label>
                      <input
                        type="text"
                        required
                        placeholder={isSchool ? "Ej. 1-1, 2-2, 6-1" : "Ej. 10-1, 11-2, 12-1"}
                        value={groupSectionCode}
                        onChange={e => setGroupSectionCode(e.target.value)}
                        className="input-field"
                        style={{ width: '100%', padding: '10px 14px' }}
                      />
                    </div>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, marginBottom: '6px' }}>
                      {isSchool ? 'Modalidad / Énfasis' : 'Especialidad Técnica o Modalidad'}
                    </label>
                    <input
                      type="text"
                      placeholder={isSchool ? "Ej. General, Bilingüe..." : "Ej. Informática en Desarrollo de Software, Contabilidad..."}
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
                        value={groupYear}
                        onChange={e => setGroupYear(Number(e.target.value))}
                        className="input-field"
                        style={{ width: '100%', padding: '10px 14px' }}
                      />
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, marginBottom: '6px' }}>
                        Docente Guía (Opcional)
                      </label>
                      <select
                        value={groupGuideTeacherId}
                        onChange={e => setGroupGuideTeacherId(e.target.value)}
                        className="input-field"
                        style={{ width: '100%', padding: '10px 14px' }}
                      >
                        <option value="">Sin asignar</option>
                        {teachers.map(t => (
                          <option key={t.id} value={t.id}>{t.name}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </>
              )}

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '12px' }}>
                <button type="button" onClick={() => setIsAddGroupOpen(false)} className="btn btn-secondary btn-sm">
                  Cancelar
                </button>
                <button type="submit" className="btn btn-primary btn-sm">
                  Crear {unitSingular}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: ASIGNAR MATERIA A DOCENTE */}
      {isAssignTeacherOpen && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.6)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '20px'
        }}>
          <div className="glass-panel" style={{
            background: 'var(--bg-main)',
            border: '1px solid var(--border-subtle)',
            borderRadius: '16px',
            width: '100%',
            maxWidth: '500px',
            padding: '24px',
            boxShadow: '0 20px 40px rgba(0,0,0,0.3)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <UserCheck size={20} color="#4f46e5" />
                <h3 style={{ fontSize: '1.2rem', fontWeight: 800 }}>Asignar Materia a Docente</h3>
              </div>
              <button onClick={() => setIsAssignTeacherOpen(false)} className="btn btn-ghost btn-sm" style={{ padding: '4px' }}>
                <X size={18} />
              </button>
            </div>

            <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: '16px' }}>
              Vincula una materia de una sección con el profesor que la impartirá. El docente verá inmediatamente a todos los alumnos de la sección en su calificador.
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
                  1. Seleccionar {unitSingular} (Grupo Completo) *
                </label>
                <select
                  required
                  value={selectedGroupId}
                  onChange={e => setSelectedGroupId(e.target.value)}
                  className="input-field"
                  style={{ width: '100%', padding: '10px 14px' }}
                >
                  <option value="">-- Elige el {unitSingular} --</option>
                  {groups.map(g => (
                    <option key={g.id} value={g.id}>
                      {g.groupName ? `${g.groupName} (${g.specialty || 'General'})` : `${unitSingular} ${g.sectionCode} ${g.specialty ? `(${g.specialty})` : ''}`}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, marginBottom: '6px' }}>
                  2. Asignatura / Materia *
                </label>
                <select
                  required
                  value={selectedSubjectId}
                  onChange={e => setSelectedSubjectId(e.target.value)}
                  className="input-field"
                  style={{ width: '100%', padding: '10px 14px' }}
                >
                  <option value="">-- Elige la Asignatura --</option>
                  {subjects.map(s => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.code})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, marginBottom: '6px' }}>
                  3. Docente a Cargo *
                </label>
                <select
                  required
                  value={selectedTeacherId}
                  onChange={e => setSelectedTeacherId(e.target.value)}
                  className="input-field"
                  style={{ width: '100%', padding: '10px 14px' }}
                >
                  <option value="">-- Elige el Profesor --</option>
                  {teachers.map(t => (
                    <option key={t.id} value={t.id}>
                      {t.name} ({t.title || 'Docente'})
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
                <input
                  type="checkbox"
                  id="isGuia"
                  checked={isGuiaAssignment}
                  onChange={e => setIsGuiaAssignment(e.target.checked)}
                  style={{ width: '16px', height: '16px', accentColor: '#4f46e5' }}
                />
                <label htmlFor="isGuia" style={{ fontSize: '0.84rem', cursor: 'pointer' }}>
                  Asignar también como Profesor Guía de esta sección
                </label>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '12px' }}>
                <button type="button" onClick={() => setIsAssignTeacherOpen(false)} className="btn btn-secondary btn-sm">
                  Cancelar
                </button>
                <button type="submit" className="btn btn-primary btn-sm">
                  Confirmar Asignación
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: REGISTRAR MATERIA */}
      {isAddSubjectOpen && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.6)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '20px'
        }}>
          <div className="glass-panel" style={{
            background: 'var(--bg-main)',
            border: '1px solid var(--border-subtle)',
            borderRadius: '16px',
            width: '100%',
            maxWidth: '440px',
            padding: '24px',
            boxShadow: '0 20px 40px rgba(0,0,0,0.3)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <BookOpen size={20} color="#0891b2" />
                <h3 style={{ fontSize: '1.2rem', fontWeight: 800 }}>Registrar Asignatura</h3>
              </div>
              <button onClick={() => setIsAddSubjectOpen(false)} className="btn btn-ghost btn-sm" style={{ padding: '4px' }}>
                <X size={18} />
              </button>
            </div>

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
                  placeholder="Ej. Matemáticas, Programación Web..."
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
                    placeholder="Ej. MAT, PROG"
                    value={subjectCode}
                    onChange={e => setSubjectCode(e.target.value)}
                    className="input-field"
                    style={{ width: '100%', padding: '10px 14px' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, marginBottom: '6px' }}>
                    Color Distintivo
                  </label>
                  <input
                    type="color"
                    value={subjectColor}
                    onChange={e => setSubjectColor(e.target.value)}
                    style={{ width: '100%', height: '42px', borderRadius: '8px', cursor: 'pointer', border: 'none', background: 'transparent' }}
                  />
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

      {/* MODAL 4: VER Y GESTIONAR NÓMINA OFICIAL DE ESTUDIANTES */}
      {viewingGroup && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.6)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '20px'
        }}>
          <div className="glass-panel" style={{
            background: 'var(--bg-main)',
            border: '1px solid var(--border-subtle)',
            borderRadius: '16px',
            width: '100%',
            maxWidth: '850px',
            maxHeight: '88vh',
            display: 'flex',
            flexDirection: 'column',
            padding: '24px',
            boxShadow: '0 20px 40px rgba(0,0,0,0.3)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '14px' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                  <span className="badge" style={{ background: '#4f46e5', color: 'white', fontWeight: 700 }}>
                    {viewingGroup.groupName || `${unitSingular} ${viewingGroup.sectionCode}`}
                  </span>
                  {viewingGroup.specialty && (
                    <span className="badge" style={{ background: 'var(--bg-surface)', color: 'var(--text-muted)' }}>
                      {viewingGroup.specialty}
                    </span>
                  )}
                  <h3 style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0 }}>
                    Nómina Oficial de Estudiantes
                  </h3>
                </div>
                <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', margin: '6px 0 0 0', lineHeight: 1.4 }}>
                  Los estudiantes de esta sección <strong>se reflejan automáticamente en todas las materias</strong> asignadas a este grupo. Los docentes no necesitan registrarlos por separado.
                </p>
              </div>
              <button onClick={() => setViewingGroup(null)} className="btn btn-ghost btn-sm" style={{ padding: '4px' }}>
                <X size={18} />
              </button>
            </div>

            {/* Barra de Acciones de la Nómina */}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '10px 14px',
              background: 'var(--bg-surface)',
              borderRadius: '10px',
              border: '1px solid var(--border-subtle)',
              marginBottom: '14px',
              flexWrap: 'wrap',
              gap: '10px'
            }}>
              <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Users size={16} color="#4f46e5" />
                <span>Matrícula oficial: <strong style={{ color: '#4f46e5' }}>{students.filter(s => s.groupId === viewingGroup.id).length} estudiantes</strong></span>
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  type="button"
                  onClick={() => setImportingGroupId(viewingGroup.id)}
                  className="btn btn-secondary btn-sm"
                  style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', padding: '6px 12px' }}
                >
                  <UploadCloud size={15} color="#10b981" />
                  <span>Importar Lista (Excel)</span>
                </button>
                <button
                  type="button"
                  onClick={() => setAddingStudentGroupId(viewingGroup.id)}
                  className="btn btn-primary btn-sm"
                  style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', padding: '6px 12px' }}
                >
                  <UserPlus size={15} />
                  <span>Agregar Estudiante</span>
                </button>
              </div>
            </div>

            {/* Tabla de Nómina */}
            <div style={{ overflowY: 'auto', flex: 1, border: '1px solid var(--border-subtle)', borderRadius: '10px' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
                <thead>
                  <tr style={{ background: 'var(--bg-surface)', borderBottom: '1px solid var(--border-subtle)', position: 'sticky', top: 0, zIndex: 1 }}>
                    <th style={{ padding: '10px 14px', width: '40px' }}>#</th>
                    <th style={{ padding: '10px 14px', width: '140px' }}>Cédula</th>
                    <th style={{ padding: '10px 14px' }}>Nombre y Apellidos</th>
                    <th style={{ padding: '10px 14px', width: '140px' }}>Adecuación</th>
                    <th style={{ padding: '10px 14px', width: '90px', textAlign: 'right' }}>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {students.filter(s => s.groupId === viewingGroup.id).map((st, idx) => {
                    const getAccomBadge = (type?: string) => {
                      if (!type || type === 'NONE') return null;
                      if (type === 'NON_SIGNIFICANT') return <span className="badge" style={{ background: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6', fontSize: '0.7rem' }}>No Significativa</span>;
                      if (type === 'SIGNIFICANT') return <span className="badge" style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', fontSize: '0.7rem' }}>Significativa</span>;
                      if (type === 'ACCESS') return <span className="badge" style={{ background: 'rgba(245, 158, 11, 0.1)', color: '#f59e0b', fontSize: '0.7rem' }}>Acceso</span>;
                      return null;
                    };

                    return (
                      <tr key={st.id} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                        <td style={{ padding: '8px 14px', color: 'var(--text-muted)' }}>{idx + 1}</td>
                        <td style={{ padding: '8px 14px', fontFamily: 'monospace', fontWeight: 600 }}>{st.idNumber}</td>
                        <td style={{ padding: '8px 14px', fontWeight: 600 }}>
                          {st.firstLastName} {st.secondLastName} {st.firstName}
                        </td>
                        <td style={{ padding: '8px 14px' }}>
                          {getAccomBadge(st.accommodation) || <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>Ninguna</span>}
                        </td>
                        <td style={{ padding: '8px 14px', textAlign: 'right' }}>
                          <div style={{ display: 'inline-flex', gap: '4px' }}>
                            <button
                              type="button"
                              onClick={() => setEditingStudent(st)}
                              className="btn btn-ghost btn-sm"
                              style={{ padding: '4px 6px', color: '#4f46e5' }}
                              title="Editar estudiante"
                            >
                              <Edit3 size={14} />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteStudent(st.id, `${st.firstLastName} ${st.secondLastName} ${st.firstName}`)}
                              className="btn btn-ghost btn-sm"
                              style={{ padding: '4px 6px', color: '#ef4444' }}
                              title="Eliminar estudiante de esta sección"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {students.filter(s => s.groupId === viewingGroup.id).length === 0 && (
                    <tr>
                      <td colSpan={5} style={{ padding: '40px 20px', textAlign: 'center' }}>
                        <div style={{ color: 'var(--text-muted)', marginBottom: '14px', fontSize: '0.9rem' }}>
                          Aún no hay estudiantes registrados en {viewingGroup.groupName || `${unitSingular} ${viewingGroup.sectionCode}`}.
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'center', gap: '10px' }}>
                          <button
                            type="button"
                            onClick={() => setImportingGroupId(viewingGroup.id)}
                            className="btn btn-secondary btn-sm"
                            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                          >
                            <UploadCloud size={15} color="#10b981" />
                            Importar Nómina desde Excel
                          </button>
                          <button
                            type="button"
                            onClick={() => setAddingStudentGroupId(viewingGroup.id)}
                            className="btn btn-primary btn-sm"
                            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                          >
                            <UserPlus size={15} />
                            Agregar Estudiante
                          </button>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '16px' }}>
              <button type="button" onClick={() => setViewingGroup(null)} className="btn btn-secondary btn-sm">
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 5: REGISTRAR PERSONAL (Docente o Admin) */}
      {isAddStaffOpen && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.6)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '20px'
        }}>
          <div className="glass-panel" style={{
            background: 'var(--bg-main)',
            border: '1px solid var(--border-subtle)',
            borderRadius: '16px',
            width: '100%',
            maxWidth: '480px',
            padding: '24px',
            boxShadow: '0 20px 40px rgba(0,0,0,0.3)',
            animation: 'fadeIn 0.2s ease-out'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <UserPlus size={20} color="#4f46e5" />
                <h3 style={{ fontSize: '1.2rem', fontWeight: 800 }}>Registrar Personal</h3>
              </div>
              <button onClick={() => setIsAddStaffOpen(false)} className="btn btn-ghost btn-sm" style={{ padding: '4px' }}>
                <X size={18} />
              </button>
            </div>

            <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: '16px' }}>
              Como director(a) o administrativo, puedes habilitar el acceso a nuevos docentes o administrativos para este centro educativo.
            </p>

            {staffError && (
              <div style={{
                background: 'rgba(239, 68, 68, 0.1)',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                color: '#ef4444',
                padding: '10px 14px',
                borderRadius: '8px',
                marginBottom: '16px',
                fontSize: '0.84rem',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                <AlertCircle size={16} />
                <span>{staffError}</span>
              </div>
            )}

            <form onSubmit={handleCreateStaff} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, marginBottom: '6px' }}>
                  Nombre Completo *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ej. Prof. Carlos Alvarado"
                  value={staffName}
                  onChange={e => setStaffName(e.target.value)}
                  className="input-field"
                  style={{ width: '100%', padding: '10px 14px' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, marginBottom: '6px' }}>
                  Correo Institucional *
                </label>
                <input
                  type="email"
                  required
                  placeholder="ejemplo@mep.go.cr"
                  value={staffEmail}
                  onChange={e => setStaffEmail(e.target.value)}
                  className="input-field"
                  style={{ width: '100%', padding: '10px 14px' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, marginBottom: '6px' }}>
                    Rol Asignado *
                  </label>
                  <select
                    value={staffRole}
                    onChange={e => setStaffRole(e.target.value as 'TEACHER' | 'ADMIN')}
                    className="input-field"
                    style={{ width: '100%', padding: '10px 14px' }}
                  >
                    <option value="TEACHER">Docente</option>
                    <option value="ADMIN">Administrativo</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, marginBottom: '6px' }}>
                    Contraseña Inicial *
                  </label>
                  <input
                    type="text"
                    required
                    value={staffPassword}
                    onChange={e => setStaffPassword(e.target.value)}
                    className="input-field"
                    style={{ width: '100%', padding: '10px 14px' }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, marginBottom: '6px' }}>
                  Especialidad / Cargo
                </label>
                <input
                  type="text"
                  placeholder="Ej. Informática en Redes, Matemáticas..."
                  value={staffTitle}
                  onChange={e => setStaffTitle(e.target.value)}
                  className="input-field"
                  style={{ width: '100%', padding: '10px 14px' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '12px' }}>
                <button
                  type="button"
                  onClick={() => setIsAddStaffOpen(false)}
                  className="btn btn-secondary btn-sm"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="btn btn-primary btn-sm"
                  style={{ background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)' }}
                >
                  Crear Usuario
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODALES DE GESTIÓN DE ESTUDIANTES DIRECTOS */}
      {importingGroupId && (
        <ImportStudentsModal
          groupId={importingGroupId}
          existingStudents={students.filter(s => s.groupId === importingGroupId)}
          onClose={() => setImportingGroupId(null)}
          onImportComplete={(_count) => {
            setImportingGroupId(null);
            if (onDataChanged) onDataChanged();
          }}
        />
      )}

      {addingStudentGroupId && (
        <AddStudentModal
          groupId={addingStudentGroupId}
          existingStudents={students.filter(s => s.groupId === addingStudentGroupId)}
          onClose={() => setAddingStudentGroupId(null)}
          onStudentAdded={(_newSt) => {
            setAddingStudentGroupId(null);
            if (onDataChanged) onDataChanged();
          }}
        />
      )}

      {editingStudent && (
        <EditStudentModal
          student={editingStudent}
          onClose={() => setEditingStudent(null)}
          onStudentUpdated={() => {
            setEditingStudent(null);
            if (onDataChanged) onDataChanged();
          }}
        />
      )}

      {/* MODAL DE BOLETINES Y REPORTES OFICIALES POR SECCIÓN (GRUPAL E INDIVIDUAL) */}
      {reportGroup && (
        <div style={{
          position: 'fixed',
          inset: 0,
          zIndex: 9999,
          background: 'rgba(15, 23, 42, 0.75)',
          backdropFilter: 'blur(8px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '16px'
        }}>
          <div className="glass-panel" style={{
            width: '100%',
            maxWidth: '960px',
            maxHeight: '90vh',
            display: 'flex',
            flexDirection: 'column',
            borderRadius: '16px',
            overflow: 'hidden',
            background: 'var(--bg-main)',
            border: '1px solid var(--border-subtle)',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)'
          }}>
            {/* Modal Header */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '18px 24px',
              borderBottom: '1px solid var(--border-subtle)',
              background: 'var(--bg-surface)'
            }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span className="badge" style={{ background: '#4f46e5', color: 'white' }}>
                    {reportGroup.groupName || `Sección ${reportGroup.sectionCode}`}
                  </span>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                    {institutionName} • Ciclo Lectivo 2026
                  </span>
                </div>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 800, margin: '6px 0 0 0' }}>
                  Boletín y Reporte Consolidado por Sección
                </h3>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="btn btn-secondary btn-sm"
                  style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
                >
                  <Printer size={15} />
                  <span>Imprimir / PDF</span>
                </button>
                <button
                  type="button"
                  onClick={() => setReportGroup(null)}
                  className="btn btn-ghost btn-sm"
                  style={{ padding: '6px' }}
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Mode Switch Tabs */}
            <div style={{
              display: 'flex',
              gap: '8px',
              padding: '12px 24px',
              borderBottom: '1px solid var(--border-subtle)',
              background: 'var(--bg-main)'
            }}>
              <button
                type="button"
                onClick={() => setSectionReportMode('GRUPAL')}
                className={`btn btn-sm ${sectionReportMode === 'GRUPAL' ? 'btn-primary' : 'btn-secondary'}`}
                style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 700 }}
              >
                <FileSpreadsheet size={15} />
                <span>Reporte Grupal (Sábana de la Sección)</span>
              </button>
              <button
                type="button"
                onClick={() => setSectionReportMode('INDIVIDUAL')}
                className={`btn btn-sm ${sectionReportMode === 'INDIVIDUAL' ? 'btn-primary' : 'btn-secondary'}`}
                style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 700 }}
              >
                <FileText size={15} />
                <span>Boletín Individual por Estudiante (Multi-Materia)</span>
              </button>
            </div>

            {/* Content Body */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '24px' }}>
              {(() => {
                const repStudents = students.filter(s => s.groupId === reportGroup.id);
                const repAssignments = assignments.filter(a => a.groupId === reportGroup.id);
                const repGuide = teachers.find(t => t.id === reportGroup.guideTeacherId);

                if (sectionReportMode === 'GRUPAL') {
                  return (
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                        <div>
                          <h4 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800 }}>
                            Sábana General de Rendimiento Académico
                          </h4>
                          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                            Matrícula total: {repStudents.length} estudiantes • {repAssignments.length} asignaturas impartidas
                          </div>
                        </div>
                      </div>

                      <div className="glass-panel" style={{ overflowX: 'auto', border: '1px solid var(--border-subtle)' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
                          <thead>
                            <tr style={{ background: 'var(--bg-surface)', borderBottom: '1px solid var(--border-subtle)' }}>
                              <th style={{ padding: '10px 12px', width: '40px' }}>#</th>
                              <th style={{ padding: '10px 12px' }}>Cédula</th>
                              <th style={{ padding: '10px 12px' }}>Estudiante</th>
                              {repAssignments.map(asg => {
                                const sub = subjects.find(s => s.id === asg.subjectId);
                                return (
                                  <th key={asg.id} style={{ padding: '10px 12px', textAlign: 'center' }}>
                                    {sub?.name || 'Materia'}
                                  </th>
                                );
                              })}
                              <th style={{ padding: '10px 12px', textAlign: 'center', fontWeight: 800 }}>Promedio</th>
                              <th style={{ padding: '10px 12px', textAlign: 'center' }}>Condición</th>
                            </tr>
                          </thead>
                          <tbody>
                            {repStudents.map((st, idx) => {
                              // Promedio simulado para vista de dirección
                              const mockAverage = 75 + ((idx * 7) % 25);
                              const isPassing = mockAverage >= 70;

                              return (
                                <tr key={st.id} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                                  <td style={{ padding: '8px 12px', color: 'var(--text-muted)' }}>{idx + 1}</td>
                                  <td style={{ padding: '8px 12px', fontFamily: 'monospace' }}>{st.idNumber}</td>
                                  <td style={{ padding: '8px 12px', fontWeight: 700 }}>
                                    {st.firstLastName} {st.secondLastName} {st.firstName}
                                  </td>
                                  {repAssignments.map((asg, asgIdx) => {
                                    const gradeVal = Math.min(100, Math.max(60, mockAverage + ((asgIdx * 3) % 10) - 4));
                                    return (
                                      <td key={asg.id} style={{ padding: '8px 12px', textAlign: 'center', fontWeight: 600 }}>
                                        {gradeVal}
                                      </td>
                                    );
                                  })}
                                  <td style={{ padding: '8px 12px', textAlign: 'center', fontWeight: 800, color: isPassing ? '#10b981' : '#ef4444' }}>
                                    {mockAverage}
                                  </td>
                                  <td style={{ padding: '8px 12px', textAlign: 'center' }}>
                                    <span className="badge" style={{
                                      background: isPassing ? 'var(--badge-present-bg)' : 'var(--badge-unexcused-bg)',
                                      color: isPassing ? 'var(--badge-present-text)' : 'var(--badge-unexcused-text)',
                                      fontSize: '0.72rem'
                                    }}>
                                      {isPassing ? 'Aprobado' : 'Convocatoria'}
                                    </span>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  );
                }

                // Modo INDIVIDUAL
                const selectedStudent = repStudents.find(s => s.id === selectedReportStudentId) || repStudents[0];

                return (
                  <div>
                    {/* Selector de estudiante */}
                    <div style={{ marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <label style={{ fontSize: '0.85rem', fontWeight: 700 }}>
                        Seleccionar Estudiante:
                      </label>
                      <select
                        value={selectedStudent?.id || ''}
                        onChange={e => setSelectedReportStudentId(e.target.value)}
                        className="input-field"
                        style={{ padding: '8px 12px', minWidth: '280px' }}
                      >
                        {repStudents.map((st, i) => (
                          <option key={st.id} value={st.id}>
                            {i + 1}. {st.firstLastName} {st.secondLastName} {st.firstName} ({st.idNumber})
                          </option>
                        ))}
                      </select>
                    </div>

                    {selectedStudent ? (
                      <div className="glass-panel" style={{
                        padding: '30px',
                        background: 'var(--bg-surface)',
                        border: '1px solid var(--border-subtle)',
                        borderRadius: '12px'
                      }}>
                        {/* Membrete Oficial */}
                        <div style={{ textAlign: 'center', borderBottom: '2px solid var(--border-subtle)', paddingBottom: '16px', marginBottom: '20px' }}>
                          <h2 style={{ fontSize: '1.3rem', fontWeight: 900, textTransform: 'uppercase', margin: 0, letterSpacing: '0.5px' }}>
                            {institutionName}
                          </h2>
                          <div style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                            Boletín Oficial de Calificaciones • Ciclo Lectivo 2026
                          </div>
                        </div>

                        {/* Ficha del Alumno */}
                        <div style={{
                          display: 'grid',
                          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                          gap: '12px',
                          background: 'var(--bg-main)',
                          padding: '16px',
                          borderRadius: '10px',
                          marginBottom: '20px',
                          fontSize: '0.88rem'
                        }}>
                          <div>
                            <span style={{ color: 'var(--text-muted)' }}>Estudiante: </span>
                            <strong>{selectedStudent.firstLastName} {selectedStudent.secondLastName} {selectedStudent.firstName}</strong>
                          </div>
                          <div>
                            <span style={{ color: 'var(--text-muted)' }}>Identificación: </span>
                            <strong>{selectedStudent.idNumber}</strong>
                          </div>
                          <div>
                            <span style={{ color: 'var(--text-muted)' }}>Sección / Grupo: </span>
                            <strong>{reportGroup.groupName || `Sección ${reportGroup.sectionCode}`}</strong>
                          </div>
                          <div>
                            <span style={{ color: 'var(--text-muted)' }}>Docente Guía: </span>
                            <strong>{repGuide?.name || 'N/A'}</strong>
                          </div>
                        </div>

                        {/* Tabla Multi-Materia */}
                        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.88rem', marginBottom: '30px' }}>
                          <thead>
                            <tr style={{ background: 'var(--bg-main)', borderBottom: '2px solid var(--border-subtle)' }}>
                              <th style={{ padding: '10px 12px' }}>Asignatura</th>
                              <th style={{ padding: '10px 12px' }}>Docente</th>
                              <th style={{ padding: '10px 12px', textAlign: 'center' }}>Nota Mínima</th>
                              <th style={{ padding: '10px 12px', textAlign: 'center' }}>Nota Obtenida</th>
                              <th style={{ padding: '10px 12px', textAlign: 'center' }}>Condición</th>
                            </tr>
                          </thead>
                          <tbody>
                            {repAssignments.map((asg, i) => {
                              const sub = subjects.find(s => s.id === asg.subjectId);
                              const tch = teachers.find(t => t.id === asg.teacherId);
                              const simulatedGrade = 78 + ((i * 6) % 20);
                              const pass = simulatedGrade >= 70;

                              return (
                                <tr key={asg.id} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                                  <td style={{ padding: '10px 12px', fontWeight: 700 }}>{sub?.name || 'Materia'}</td>
                                  <td style={{ padding: '10px 12px', color: 'var(--text-muted)' }}>{tch?.name || 'Docente'}</td>
                                  <td style={{ padding: '10px 12px', textAlign: 'center' }}>70</td>
                                  <td style={{ padding: '10px 12px', textAlign: 'center', fontWeight: 800, color: pass ? '#10b981' : '#ef4444' }}>
                                    {simulatedGrade}
                                  </td>
                                  <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                                    <span className="badge" style={{
                                      background: pass ? 'var(--badge-present-bg)' : 'var(--badge-unexcused-bg)',
                                      color: pass ? 'var(--badge-present-text)' : 'var(--badge-unexcused-text)'
                                    }}>
                                      {pass ? 'Aprobado' : 'Convocatoria'}
                                    </span>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>

                        {/* Firmas */}
                        <div style={{
                          display: 'grid',
                          gridTemplateColumns: 'repeat(3, 1fr)',
                          gap: '20px',
                          textAlign: 'center',
                          marginTop: '40px',
                          fontSize: '0.8rem',
                          color: 'var(--text-muted)'
                        }}>
                          <div>
                            <div style={{ borderTop: '1px solid var(--text-muted)', paddingTop: '6px', fontWeight: 700 }}>
                              Dirección Institucional
                            </div>
                          </div>
                          <div>
                            <div style={{ borderTop: '1px solid var(--text-muted)', paddingTop: '6px', fontWeight: 700 }}>
                              Docente Guía / Coordinador
                            </div>
                          </div>
                          <div>
                            <div style={{ borderTop: '1px solid var(--text-muted)', paddingTop: '6px', fontWeight: 700 }}>
                              Sello Institucional
                            </div>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)' }}>
                        Esta sección no tiene estudiantes registrados aún.
                      </div>
                    )}
                  </div>
                );
              })()}
            </div>
          </div>
        </div>
      )}

      {/* Modal Personalizado de Confirmación */}
      {confirmModal && confirmModal.isOpen && (
        <ConfirmModal
          isOpen={confirmModal.isOpen}
          title={confirmModal.title}
          message={confirmModal.message}
          type={confirmModal.type || 'danger'}
          confirmText={confirmModal.confirmText || 'Confirmar'}
          cancelText={confirmModal.cancelText || 'Cancelar'}
          isAlertOnly={confirmModal.isAlertOnly}
          onConfirm={() => {
            confirmModal.onConfirm();
            setConfirmModal(null);
          }}
          onClose={() => setConfirmModal(null)}
        />
      )}
    </div>
  );
};
