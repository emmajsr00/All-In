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
  Eye
} from 'lucide-react';
import type { Group, Subject, TeacherAssignment, User, Student, EvaluationConfig, UserRole, InstitutionType } from '../types';
import { db } from '../db';

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

  // Modal Registrar Personal (Docente o Admin)
  const [isAddStaffOpen, setIsAddStaffOpen] = useState(false);
  const [staffName, setStaffName] = useState('');
  const [staffEmail, setStaffEmail] = useState('');
  const [staffPassword, setStaffPassword] = useState('123');
  const [staffRole, setStaffRole] = useState<'TEACHER' | 'ADMIN'>('TEACHER');
  const [staffTitle, setStaffTitle] = useState('');
  const [staffError, setStaffError] = useState<string | null>(null);

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
  const handleDeleteAssignment = async (assignmentId: string) => {
    if (window.confirm('¿Deseas desasignar esta materia y profesor de esta sección?')) {
      await db.assignments.delete(assignmentId);
      await db.evaluationConfigs.where('assignmentId').equals(assignmentId).delete();
      if (onDataChanged) onDataChanged();
    }
  };

  // Eliminar Sección
  const handleDeleteGroup = async (groupId: string) => {
    const sectionStudents = students.filter(s => s.groupId === groupId);
    const sectionAssignments = assignments.filter(a => a.groupId === groupId);

    const msg = sectionStudents.length > 0 || sectionAssignments.length > 0
      ? `Esta sección tiene ${sectionStudents.length} estudiantes y ${sectionAssignments.length} materias asignadas. ¿Seguro que deseas eliminarla?`
      : '¿Seguro que deseas eliminar esta sección?';

    if (window.confirm(msg)) {
      await db.groups.delete(groupId);
      for (const asg of sectionAssignments) {
        await db.assignments.delete(asg.id);
        await db.evaluationConfigs.where('assignmentId').equals(asg.id).delete();
      }
      if (onDataChanged) onDataChanged();
    }
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
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: '20px' }}>
              {groups.map(grp => {
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
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span className="badge" style={{ background: isUniversity ? '#a855f7' : '#4f46e5', color: 'white', fontWeight: 800, fontSize: '0.85rem' }}>
                            {grp.groupName ? grp.groupName : `${unitSingular} ${grp.sectionCode}`}
                          </span>
                          <span className="badge" style={{ background: 'var(--bg-surface)', color: 'var(--text-muted)' }}>
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
                      <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                        <button
                          onClick={() => setViewingGroup(grp)}
                          className="btn btn-secondary btn-sm"
                          style={{ padding: '6px 10px', fontSize: '0.78rem', display: 'flex', alignItems: 'center', gap: '4px' }}
                          title="Ver nómina de estudiantes matriculados en este grupo"
                        >
                          <Eye size={14} color="#4f46e5" />
                          <span>{sectionStudents.length} Alumnos</span>
                        </button>
                        <button
                          onClick={() => handleDeleteGroup(grp.id)}
                          className="btn btn-ghost btn-sm"
                          style={{ padding: '6px', color: '#ef4444' }}
                          title="Eliminar Sección"
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
                              padding: '8px 10px',
                              borderRadius: '8px',
                              border: '1px solid var(--border-subtle)',
                              gap: '8px'
                            }}
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
                                onClick={() => onOpenGroupGradebook(asg)}
                                className="btn btn-ghost btn-sm"
                                style={{ padding: '4px 6px', fontSize: '0.75rem', color: '#4f46e5' }}
                                title="Inspeccionar notas"
                              >
                                <FileSpreadsheet size={14} />
                              </button>
                              <button
                                onClick={() => handleDeleteAssignment(asg.id)}
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

              {groups.length === 0 && (
                <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                  No se han registrado {unitPlural.toLowerCase()} en esta institución. Haz clic en <strong>"+ Crear {unitSingular}"</strong> para comenzar.
                </div>
              )}
            </div>
          )}

          {/* VISTA SUB-2: POR DOCENTES */}
          {academicViewMode === 'BY_TEACHER' && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '20px' }}>
              {teachers.map(tch => {
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
                              fontSize: '0.82rem'
                            }}
                          >
                            <div>
                              <strong style={{ color: '#4f46e5' }}>Sección {grp?.sectionCode}</strong> • {sub?.name}
                            </div>
                            <button
                              onClick={() => handleDeleteAssignment(asg.id)}
                              className="btn btn-ghost btn-sm"
                              style={{ padding: '3px', color: '#ef4444' }}
                              title="Desasignar"
                            >
                              <Trash2 size={13} />
                            </button>
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

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '20px' }}>
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
                    padding: '20px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '14px',
                    border: '1px solid var(--border-subtle)'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span className="badge" style={{ background: '#4f46e5', color: 'white' }}>
                          Sección {group?.sectionCode || 'N/A'}
                        </span>
                        {group?.specialty && (
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                            {group.specialty}
                          </span>
                        )}
                      </div>
                      <h3 style={{ fontSize: '1.05rem', fontWeight: 700, marginTop: '8px' }}>
                        {subject?.name}
                      </h3>
                    </div>

                    <span className="badge" style={{
                      background: simulatedPassingRate >= 90 ? 'var(--badge-present-bg)' : 'var(--badge-excused-bg)',
                      color: simulatedPassingRate >= 90 ? 'var(--badge-present-text)' : 'var(--badge-excused-text)'
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
                      fontSize: '0.8rem'
                    }}>
                      {teacher?.name.charAt(0)}
                    </div>
                    <div>
                      <div style={{ fontSize: '0.85rem', fontWeight: 700 }}>
                        {teacher?.name}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        {teacher?.title || 'Docente'}
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
                    onClick={() => onOpenGroupGradebook(asg)}
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

      {/* MODAL 4: VER NÓMINA COMPLETA DE ESTUDIANTES DE UNA SECCIÓN */}
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
            maxWidth: '650px',
            maxHeight: '85vh',
            display: 'flex',
            flexDirection: 'column',
            padding: '24px',
            boxShadow: '0 20px 40px rgba(0,0,0,0.3)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span className="badge" style={{ background: '#4f46e5', color: 'white' }}>
                    {viewingGroup.groupName || `${unitSingular} ${viewingGroup.sectionCode}`}
                  </span>
                  <h3 style={{ fontSize: '1.2rem', fontWeight: 800, margin: 0 }}>
                    Nómina Oficial de Estudiantes
                  </h3>
                </div>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: '4px 0 0 0' }}>
                  Esta lista completa de estudiantes es compartida por todos los docentes que imparten materias en este {unitSingular.toLowerCase()}.
                </p>
              </div>
              <button onClick={() => setViewingGroup(null)} className="btn btn-ghost btn-sm" style={{ padding: '4px' }}>
                <X size={18} />
              </button>
            </div>

            <div style={{ overflowY: 'auto', flex: 1, border: '1px solid var(--border-subtle)', borderRadius: '10px' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
                <thead>
                  <tr style={{ background: 'var(--bg-surface)', borderBottom: '1px solid var(--border-subtle)' }}>
                    <th style={{ padding: '10px 14px', width: '40px' }}>#</th>
                    <th style={{ padding: '10px 14px' }}>Cédula / Identificación</th>
                    <th style={{ padding: '10px 14px' }}>Nombre y Apellidos</th>
                  </tr>
                </thead>
                <tbody>
                  {students.filter(s => s.groupId === viewingGroup.id).map((st, idx) => (
                    <tr key={st.id} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                      <td style={{ padding: '8px 14px', color: 'var(--text-muted)' }}>{idx + 1}</td>
                      <td style={{ padding: '8px 14px', fontFamily: 'monospace' }}>{st.idNumber}</td>
                      <td style={{ padding: '8px 14px', fontWeight: 600 }}>
                        {st.firstLastName} {st.secondLastName} {st.firstName}
                      </td>
                    </tr>
                  ))}
                  {students.filter(s => s.groupId === viewingGroup.id).length === 0 && (
                    <tr>
                      <td colSpan={3} style={{ padding: '32px', textAlign: 'center', color: 'var(--text-muted)' }}>
                        No hay estudiantes registrados aún en la sección {viewingGroup.sectionCode}.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '16px' }}>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                Total matriculados: <strong>{students.filter(s => s.groupId === viewingGroup.id).length}</strong>
              </span>
              <button onClick={() => setViewingGroup(null)} className="btn btn-secondary btn-sm">
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
    </div>
  );
};
