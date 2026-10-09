import React, { useState } from 'react';
import {
  Clock,
  Calendar,
  UserCheck,
  BookOpen,
  Layers,
  Printer,
  Trash2,
  Check,
  AlertCircle,
  GripVertical,
  Plus,
  Sparkles,
  Info,
  Users,
  User as UserIcon,
  Filter,
  Search,
  X
} from 'lucide-react';
import type { User, Group, Subject, TeacherAssignment, ScheduleItem } from '../types';
import { db } from '../db';

interface TeacherScheduleBuilderProps {
  teachers: User[];
  groups: Group[];
  subjects: Subject[];
  assignments: TeacherAssignment[];
  schedules: ScheduleItem[];
  institutionName: string;
  onDataChanged?: () => void;
}

// Bloques oficiales de lecciones estándar MEP Costa Rica
const MEP_TIME_SLOTS = [
  { slotIndex: 1, label: 'Lección 1', startTime: '07:00', endTime: '07:40' },
  { slotIndex: 2, label: 'Lección 2', startTime: '07:40', endTime: '08:20' },
  // Receso 08:20 - 08:35 (se visualiza como separador)
  { slotIndex: 3, label: 'Lección 3', startTime: '08:35', endTime: '09:15' },
  { slotIndex: 4, label: 'Lección 4', startTime: '09:15', endTime: '09:55' },
  // Receso 09:55 - 10:15
  { slotIndex: 5, label: 'Lección 5', startTime: '10:15', endTime: '10:55' },
  { slotIndex: 6, label: 'Lección 6', startTime: '10:55', endTime: '11:35' },
  // Almuerzo 11:35 - 12:15
  { slotIndex: 7, label: 'Lección 7', startTime: '12:15', endTime: '12:55' },
  { slotIndex: 8, label: 'Lección 8', startTime: '12:55', endTime: '13:35' },
  { slotIndex: 9, label: 'Lección 9', startTime: '13:35', endTime: '14:15' },
  { slotIndex: 10, label: 'Lección 10', startTime: '14:15', endTime: '14:55' }
];

const WEEK_DAYS: { dayOfWeek: 1 | 2 | 3 | 4 | 5; label: string; short: string }[] = [
  { dayOfWeek: 1, label: 'Lunes', short: 'LUN' },
  { dayOfWeek: 2, label: 'Martes', short: 'MAR' },
  { dayOfWeek: 3, label: 'Miércoles', short: 'MIÉ' },
  { dayOfWeek: 4, label: 'Jueves', short: 'JUE' },
  { dayOfWeek: 5, label: 'Viernes', short: 'VIE' }
];

export const TeacherScheduleBuilder: React.FC<TeacherScheduleBuilderProps> = ({
  teachers,
  groups,
  subjects,
  assignments,
  schedules,
  institutionName,
  onDataChanged
}) => {
  // Modo general: Por Docente o Por Grupo / Sección
  const [builderMode, setBuilderMode] = useState<'by-teacher' | 'by-group'>('by-teacher');

  // Selecciones principales
  const [selectedTeacherId, setSelectedTeacherId] = useState<string>(teachers[0]?.id || '');
  const [selectedGroupId, setSelectedGroupId] = useState<string>(groups[0]?.id || '');

  // Buscador y filtros de Grupo / Sección interactivos (para instituciones con muchos grupos)
  const [groupSearchQuery, setGroupSearchQuery] = useState('');
  const [groupGradeFilter, setGroupGradeFilter] = useState<'ALL' | number>('ALL');
  const [paletteGroupSearch, setPaletteGroupSearch] = useState('');

  // Niveles y lista filtrada de grupos
  const availableGroupGrades = Array.from(new Set(groups.map(g => g.grade))).sort((a, b) => a - b);

  const getGradeShortLabel = (grade: number) => {
    switch (grade) {
      case 7: return '7°';
      case 8: return '8°';
      case 9: return '9°';
      case 10: return '10°';
      case 11: return '11°';
      case 12: return '12°';
      default: return `${grade}°`;
    }
  };

  const filteredGroups = groups.filter(g => {
    if (groupGradeFilter !== 'ALL' && g.grade !== groupGradeFilter) return false;
    if (groupSearchQuery.trim()) {
      const q = groupSearchQuery.toLowerCase().trim();
      const codeMatch = g.sectionCode.toLowerCase().includes(q);
      const nameMatch = (g.groupName || '').toLowerCase().includes(q);
      const gradeMatch = g.grade.toString() === q;
      return codeMatch || nameMatch || gradeMatch;
    }
    return true;
  });

  // Sub-modo en paleta por docente: por materia o por sección
  const [paletteMode, setPaletteMode] = useState<'by-subject' | 'by-group'>('by-subject');
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>('');
  const [selectedPaletteGroupId, setSelectedPaletteGroupId] = useState<string>('');

  // Item seleccionado para hacer clic y colocar
  const [selectedItemForClick, setSelectedItemForClick] = useState<{
    groupId: string;
    subjectId: string;
    teacherId?: string;
    groupCode: string;
    subjectName: string;
    teacherName?: string;
  } | null>(null);

  // Item arrastrado
  const [draggedItem, setDraggedItem] = useState<{
    groupId: string;
    subjectId: string;
    teacherId?: string;
    groupCode: string;
    subjectName: string;
    teacherName?: string;
  } | null>(null);

  const [classroomInput, setClassroomInput] = useState<string>('');

  const selectedTeacher = teachers.find(t => t.id === selectedTeacherId) || teachers[0];
  const selectedGroup = groups.find(g => g.id === selectedGroupId) || groups[0];

  // ---------------------------------------------------------------------------
  // CASO A: PROGRAMACIÓN POR DOCENTE
  // ---------------------------------------------------------------------------
  const teacherAssignments = selectedTeacher
    ? assignments.filter(a => a.teacherId === selectedTeacher.id)
    : [];

  const teacherSubjectIds = Array.from(new Set(teacherAssignments.map(a => a.subjectId)));
  const teacherDistinctSubjects = subjects.filter(s => teacherSubjectIds.includes(s.id));

  const teacherGroupIds = Array.from(new Set(teacherAssignments.map(a => a.groupId)));
  const teacherDistinctGroups = groups.filter(g => teacherGroupIds.includes(g.id));

  const activeTeacherSubject = teacherDistinctSubjects.find(s => s.id === selectedSubjectId) || teacherDistinctSubjects[0];
  const activeTeacherPaletteGroup = teacherDistinctGroups.find(g => g.id === selectedPaletteGroupId) || teacherDistinctGroups[0];

  // ---------------------------------------------------------------------------
  // CASO B: PROGRAMACIÓN POR GRUPO / SECCIÓN
  // ---------------------------------------------------------------------------
  const groupAssignments = selectedGroup
    ? assignments.filter(a => a.groupId === selectedGroup.id)
    : [];

  // Lecciones actuales según el modo activo
  const activeSchedules = builderMode === 'by-teacher'
    ? (selectedTeacher ? schedules.filter(s => s.teacherId === selectedTeacher.id) : [])
    : (selectedGroup ? schedules.filter(s => s.groupId === selectedGroup.id) : []);

  // Asignar lección a un bloque
  const handleAssignToSlot = async (
    dayOfWeek: 1 | 2 | 3 | 4 | 5,
    startTime: string,
    endTime: string,
    groupId: string,
    subjectId: string,
    slotTeacherId?: string
  ) => {
    const finalTeacherId = slotTeacherId || selectedTeacher?.id;
    if (!finalTeacherId) return;

    if (builderMode === 'by-teacher') {
      // Reemplazar lección del profesor a esa hora si existe
      const existing = activeSchedules.find(
        s => s.dayOfWeek === dayOfWeek && s.startTime === startTime
      );
      if (existing) {
        await db.schedules.delete(existing.id);
      }
    } else {
      // Reemplazar lección de la sección a esa hora si existe
      const existing = activeSchedules.find(
        s => s.dayOfWeek === dayOfWeek && s.startTime === startTime
      );
      if (existing) {
        await db.schedules.delete(existing.id);
      }
    }

    const grp = groups.find(g => g.id === groupId);
    const defaultAula = classroomInput.trim() || (grp ? `Aula ${grp.sectionCode}` : 'Aula Principal');

    const newItem: ScheduleItem = {
      id: `sch-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      teacherId: finalTeacherId,
      groupId,
      subjectId,
      dayOfWeek,
      startTime,
      endTime,
      classroom: defaultAula
    };

    await db.schedules.add(newItem);
    if (onDataChanged) onDataChanged();
  };

  const handleDeleteSlot = async (scheduleId: string) => {
    await db.schedules.delete(scheduleId);
    if (onDataChanged) onDataChanged();
  };

  const handleClearAll = async () => {
    const title = builderMode === 'by-teacher'
      ? `el horario del profesor ${selectedTeacher?.name}`
      : `el horario de la Sección ${selectedGroup?.sectionCode}`;

    if (window.confirm(`¿Estás seguro de vaciar todo ${title}?`)) {
      const toDelete = activeSchedules.map(s => s.id);
      for (const id of toDelete) {
        await db.schedules.delete(id);
      }
      if (onDataChanged) onDataChanged();
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Encabezado y Selector de Modo */}
      <div className="glass-panel no-print" style={{
        padding: '20px 24px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '16px',
        background: 'var(--bg-surface)',
        border: '1px solid var(--border-subtle)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{
            width: '44px',
            height: '44px',
            borderRadius: '12px',
            background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white',
            boxShadow: '0 4px 12px rgba(79, 70, 229, 0.3)'
          }}>
            <Clock size={22} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0 }}>
                Creador de Horarios
              </h2>
              {/* Pill selector de Modo: Por Docente vs Por Grupo */}
              <div style={{
                display: 'flex',
                background: 'var(--bg-main)',
                padding: '3px',
                borderRadius: '8px',
                border: '1px solid var(--border-subtle)',
                gap: '2px'
              }}>
                <button
                  type="button"
                  onClick={() => {
                    setBuilderMode('by-teacher');
                    setSelectedItemForClick(null);
                  }}
                  className={`btn btn-sm ${builderMode === 'by-teacher' ? 'btn-primary' : 'btn-ghost'}`}
                  style={{ fontSize: '0.78rem', padding: '4px 10px', display: 'flex', alignItems: 'center', gap: '5px' }}
                >
                  <UserIcon size={13} />
                  <span>Por Docente</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setBuilderMode('by-group');
                    setSelectedItemForClick(null);
                  }}
                  className={`btn btn-sm ${builderMode === 'by-group' ? 'btn-primary' : 'btn-ghost'}`}
                  style={{ fontSize: '0.78rem', padding: '4px 10px', display: 'flex', alignItems: 'center', gap: '5px' }}
                >
                  <Users size={13} />
                  <span>Por Grupo / Sección</span>
                </button>
              </div>
            </div>
            <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', margin: '4px 0 0 0' }}>
              {builderMode === 'by-teacher'
                ? 'Organiza y visualiza la carga horaria semanal por profesor.'
                : 'Crea o visualiza el horario semanal completo de cada grupo o sección.'}
            </p>
          </div>
        </div>

        {/* Selector de Elemento Activo según el modo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
          {builderMode === 'by-teacher' ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <label style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-main)' }}>
                Docente:
              </label>
              <select
                value={selectedTeacher?.id || ''}
                onChange={(e) => {
                  setSelectedTeacherId(e.target.value);
                  setSelectedItemForClick(null);
                  setSelectedSubjectId('');
                  setSelectedPaletteGroupId('');
                }}
                className="input-field"
                style={{ padding: '8px 14px', minWidth: '240px', fontWeight: 600 }}
              >
                {teachers.map(t => (
                  <option key={t.id} value={t.id}>
                    {t.name} {t.title ? `(${t.title})` : ''}
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                <label style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Users size={15} color="#4f46e5" />
                  <span>Grupo o Sección:</span>
                </label>

                {/* Buscador Interactivo */}
                <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                  <Search size={14} style={{ position: 'absolute', left: '10px', color: 'var(--text-muted)' }} />
                  <input
                    type="text"
                    value={groupSearchQuery}
                    onChange={(e) => {
                      setGroupSearchQuery(e.target.value);
                      const q = e.target.value.toLowerCase().trim();
                      const match = groups.find(g =>
                        g.sectionCode.toLowerCase().includes(q) || (g.groupName || '').toLowerCase().includes(q)
                      );
                      if (match) setSelectedGroupId(match.id);
                    }}
                    placeholder="Buscar sección (ej: 7-1, 10)..."
                    className="input-field"
                    style={{
                      paddingLeft: '30px',
                      paddingRight: groupSearchQuery ? '28px' : '10px',
                      paddingTop: '6px',
                      paddingBottom: '6px',
                      fontSize: '0.8rem',
                      width: '210px',
                      borderRadius: '8px'
                    }}
                  />
                  {groupSearchQuery && (
                    <button
                      type="button"
                      onClick={() => setGroupSearchQuery('')}
                      style={{
                        position: 'absolute',
                        right: '8px',
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        color: 'var(--text-muted)',
                        padding: '2px'
                      }}
                    >
                      <X size={12} />
                    </button>
                  )}
                </div>

                {/* Dropdown de Grupos Filtrados */}
                <select
                  value={selectedGroup?.id || ''}
                  onChange={(e) => {
                    setSelectedGroupId(e.target.value);
                    setSelectedItemForClick(null);
                  }}
                  className="input-field"
                  style={{ padding: '6px 12px', minWidth: '220px', fontWeight: 600, fontSize: '0.82rem' }}
                >
                  {filteredGroups.length === 0 ? (
                    <option value="">Sin secciones encontradas</option>
                  ) : (
                    filteredGroups.map(g => (
                      <option key={g.id} value={g.id}>
                        Sección {g.sectionCode} {g.groupName ? `(${g.groupName})` : ''}
                      </option>
                    ))
                  )}
                </select>
              </div>

              {/* Píldoras de Filtro por Grado / Nivel */}
              {availableGroupGrades.length > 1 && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '5px', flexWrap: 'wrap' }}>
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 600, marginRight: '2px' }}>
                    Nivel:
                  </span>
                  <button
                    type="button"
                    onClick={() => setGroupGradeFilter('ALL')}
                    className={`btn btn-sm ${groupGradeFilter === 'ALL' ? 'btn-primary' : 'btn-secondary'}`}
                    style={{ fontSize: '0.7rem', padding: '2px 8px', borderRadius: '14px' }}
                  >
                    Todos ({groups.length})
                  </button>
                  {availableGroupGrades.map(grd => {
                    const count = groups.filter(g => g.grade === grd).length;
                    const isSelected = groupGradeFilter === grd;
                    return (
                      <button
                        key={grd}
                        type="button"
                        onClick={() => {
                          const newFilter = isSelected ? 'ALL' : grd;
                          setGroupGradeFilter(newFilter);
                          if (newFilter !== 'ALL') {
                            const first = groups.find(g => g.grade === grd);
                            if (first) setSelectedGroupId(first.id);
                          }
                        }}
                        className={`btn btn-sm ${isSelected ? 'btn-primary' : 'btn-secondary'}`}
                        style={{ fontSize: '0.7rem', padding: '2px 8px', borderRadius: '14px' }}
                      >
                        {getGradeShortLabel(grd)} ({count})
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              type="button"
              onClick={() => window.print()}
              className="btn btn-secondary btn-sm"
              style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
              title="Imprimir horario"
            >
              <Printer size={15} />
              <span>Imprimir</span>
            </button>
            {activeSchedules.length > 0 && (
              <button
                type="button"
                onClick={handleClearAll}
                className="btn btn-ghost btn-sm"
                style={{ color: '#ef4444', display: 'flex', alignItems: 'center', gap: '6px' }}
                title="Vaciar horario"
              >
                <Trash2 size={15} />
                <span>Vaciar</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Grid Principal: Paleta de Asignaciones (Izquierda) + Matriz Semanal (Derecha) */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(290px, 340px) 1fr', gap: '20px' }}>
        
        {/* COLUMNA IZQUIERDA: PALETA DE ASIGNACIONES */}
        <div className="glass-panel no-print" style={{
          padding: '20px',
          display: 'flex',
          flexDirection: 'column',
          gap: '16px',
          height: 'fit-content'
        }}>
          {/* Header de la paleta */}
          <div>
            <div style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              {builderMode === 'by-teacher' ? 'Carga del Docente' : 'Plan de Estudio del Grupo'}
            </div>
            <h3 style={{ fontSize: '1.05rem', fontWeight: 800, margin: '4px 0 0 0' }}>
              {builderMode === 'by-teacher' ? selectedTeacher?.name : `Sección ${selectedGroup?.sectionCode} ${selectedGroup?.groupName ? `(${selectedGroup.groupName})` : ''}`}
            </h3>
            <div style={{ fontSize: '0.8rem', color: '#4f46e5', fontWeight: 600, marginTop: '2px' }}>
              {activeSchedules.length} lecciones programadas en la semana
            </div>
          </div>

          {/* MODO A: PALETA POR DOCENTE */}
          {builderMode === 'by-teacher' && (
            <>
              {/* Toggle de Paleta: Por Materia vs Por Sección */}
              <div style={{
                display: 'flex',
                background: 'var(--bg-main)',
                padding: '3px',
                borderRadius: '8px',
                border: '1px solid var(--border-subtle)',
                gap: '2px'
              }}>
                <button
                  type="button"
                  onClick={() => {
                    setPaletteMode('by-subject');
                    setSelectedItemForClick(null);
                  }}
                  className={`btn btn-sm ${paletteMode === 'by-subject' ? 'btn-primary' : 'btn-ghost'}`}
                  style={{ flex: 1, fontSize: '0.75rem', padding: '4px 8px' }}
                >
                  <BookOpen size={12} />
                  <span>Por Materia</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setPaletteMode('by-group');
                    setSelectedItemForClick(null);
                  }}
                  className={`btn btn-sm ${paletteMode === 'by-group' ? 'btn-primary' : 'btn-ghost'}`}
                  style={{ flex: 1, fontSize: '0.75rem', padding: '4px 8px' }}
                >
                  <Users size={12} />
                  <span>Por Sección</span>
                </button>
              </div>

              {/* Sub-caso 1: Por Materia */}
              {paletteMode === 'by-subject' && (
                <div>
                  <label style={{ fontSize: '0.78rem', fontWeight: 700, display: 'block', marginBottom: '6px' }}>
                    1. Selecciona Materia:
                  </label>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '160px', overflowY: 'auto' }}>
                    {teacherDistinctSubjects.map(sub => {
                      const isSubActive = activeTeacherSubject?.id === sub.id;
                      const countForSub = teacherAssignments.filter(a => a.subjectId === sub.id).length;
                      return (
                        <button
                          key={sub.id}
                          type="button"
                          onClick={() => {
                            setSelectedSubjectId(sub.id);
                            setSelectedItemForClick(null);
                          }}
                          style={{
                            padding: '8px 10px',
                            borderRadius: '8px',
                            border: `1px solid ${isSubActive ? sub.color || '#4f46e5' : 'var(--border-subtle)'}`,
                            background: isSubActive ? 'var(--bg-surface)' : 'transparent',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            cursor: 'pointer',
                            textAlign: 'left'
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: sub.color || '#4f46e5' }} />
                            <span style={{ fontWeight: isSubActive ? 800 : 600, fontSize: '0.82rem' }}>
                              {sub.name}
                            </span>
                          </div>
                          <span className="badge" style={{ fontSize: '0.7rem' }}>
                            {countForSub} grupos
                          </span>
                        </button>
                      );
                    })}
                  </div>

                  <div style={{ marginTop: '12px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                      <label style={{ fontSize: '0.78rem', fontWeight: 700 }}>
                        2. Secciones a ubicar:
                      </label>
                      <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                        Arrastra o clic
                      </span>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      {teacherAssignments
                        .filter(a => a.subjectId === activeTeacherSubject?.id)
                        .map(asg => {
                          const grp = groups.find(g => g.id === asg.groupId);
                          const sub = activeTeacherSubject;
                          const groupCode = grp?.groupName || `Sección ${grp?.sectionCode || 'N/A'}`;
                          const subjectName = sub?.name || 'Materia';
                          const countScheduled = activeSchedules.filter(
                            s => s.groupId === asg.groupId && s.subjectId === asg.subjectId
                          ).length;

                          const isSelected = selectedItemForClick?.groupId === asg.groupId &&
                                             selectedItemForClick?.subjectId === asg.subjectId;

                          const payload = {
                            groupId: asg.groupId,
                            subjectId: asg.subjectId,
                            groupCode,
                            subjectName
                          };

                          return (
                            <div
                              key={asg.id}
                              draggable={true}
                              onDragStart={(e) => {
                                setDraggedItem(payload);
                                e.dataTransfer.setData('application/json', JSON.stringify(payload));
                              }}
                              onDragEnd={() => setDraggedItem(null)}
                              onClick={() => {
                                setSelectedItemForClick(isSelected ? null : payload);
                              }}
                              style={{
                                padding: '10px 12px',
                                borderRadius: '10px',
                                border: `2px solid ${isSelected ? '#4f46e5' : 'var(--border-subtle)'}`,
                                background: isSelected ? 'rgba(79, 70, 229, 0.1)' : 'var(--bg-main)',
                                cursor: 'grab',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                transition: 'all 0.15s ease'
                              }}
                            >
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <GripVertical size={14} color="var(--text-muted)" />
                                <div>
                                  <div style={{ fontWeight: 800, fontSize: '0.85rem' }}>
                                    {groupCode}
                                  </div>
                                  <div style={{ fontSize: '0.72rem', color: sub?.color || '#4f46e5', fontWeight: 600 }}>
                                    {subjectName}
                                  </div>
                                </div>
                              </div>
                              <span className="badge" style={{
                                background: countScheduled > 0 ? 'rgba(16, 185, 129, 0.15)' : 'var(--bg-surface)',
                                color: countScheduled > 0 ? '#10b981' : 'var(--text-muted)',
                                fontSize: '0.7rem',
                                fontWeight: 700
                              }}>
                                {countScheduled} lec.
                              </span>
                            </div>
                          );
                        })}
                    </div>
                  </div>
                </div>
              )}

              {/* Sub-caso 2: Por Sección */}
              {paletteMode === 'by-group' && (
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                    <label style={{ fontSize: '0.78rem', fontWeight: 700 }}>
                      1. Selecciona Sección:
                    </label>
                    {teacherDistinctGroups.length > 3 && (
                      <input
                        type="text"
                        value={paletteGroupSearch}
                        onChange={(e) => setPaletteGroupSearch(e.target.value)}
                        placeholder="Filtrar..."
                        style={{
                          fontSize: '0.72rem',
                          padding: '2px 8px',
                          borderRadius: '6px',
                          border: '1px solid var(--border-subtle)',
                          background: 'var(--bg-main)',
                          color: 'var(--text-main)',
                          width: '95px'
                        }}
                      />
                    )}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '160px', overflowY: 'auto' }}>
                    {teacherDistinctGroups
                      .filter(grp => {
                        if (!paletteGroupSearch.trim()) return true;
                        const q = paletteGroupSearch.toLowerCase().trim();
                        return grp.sectionCode.toLowerCase().includes(q) || (grp.groupName || '').toLowerCase().includes(q);
                      })
                      .map(grp => {
                      const isGrpActive = activeTeacherPaletteGroup?.id === grp.id;
                      const countForGrp = teacherAssignments.filter(a => a.groupId === grp.id).length;
                      return (
                        <button
                          key={grp.id}
                          type="button"
                          onClick={() => {
                            setSelectedPaletteGroupId(grp.id);
                            setSelectedItemForClick(null);
                          }}
                          style={{
                            padding: '8px 10px',
                            borderRadius: '8px',
                            border: `1px solid ${isGrpActive ? '#4f46e5' : 'var(--border-subtle)'}`,
                            background: isGrpActive ? 'var(--bg-surface)' : 'transparent',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            cursor: 'pointer',
                            textAlign: 'left'
                          }}
                        >
                          <span style={{ fontWeight: isGrpActive ? 800 : 600, fontSize: '0.82rem' }}>
                            Sección {grp.sectionCode} {grp.groupName ? `(${grp.groupName})` : ''}
                          </span>
                          <span className="badge" style={{ fontSize: '0.7rem' }}>
                            {countForGrp} materias
                          </span>
                        </button>
                      );
                    })}
                  </div>

                  <div style={{ marginTop: '12px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                      <label style={{ fontSize: '0.78rem', fontWeight: 700 }}>
                        2. Materias a ubicar en esta sección:
                      </label>
                      <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                        Arrastra o clic
                      </span>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      {teacherAssignments
                        .filter(a => a.groupId === activeTeacherPaletteGroup?.id)
                        .map(asg => {
                          const sub = subjects.find(s => s.id === asg.subjectId);
                          const grp = activeTeacherPaletteGroup;
                          const groupCode = grp?.groupName || `Sección ${grp?.sectionCode || 'N/A'}`;
                          const subjectName = sub?.name || 'Materia';
                          const countScheduled = activeSchedules.filter(
                            s => s.groupId === asg.groupId && s.subjectId === asg.subjectId
                          ).length;

                          const isSelected = selectedItemForClick?.groupId === asg.groupId &&
                                             selectedItemForClick?.subjectId === asg.subjectId;

                          const payload = {
                            groupId: asg.groupId,
                            subjectId: asg.subjectId,
                            groupCode,
                            subjectName
                          };

                          return (
                            <div
                              key={asg.id}
                              draggable={true}
                              onDragStart={(e) => {
                                setDraggedItem(payload);
                                e.dataTransfer.setData('application/json', JSON.stringify(payload));
                              }}
                              onDragEnd={() => setDraggedItem(null)}
                              onClick={() => {
                                setSelectedItemForClick(isSelected ? null : payload);
                              }}
                              style={{
                                padding: '10px 12px',
                                borderRadius: '10px',
                                border: `2px solid ${isSelected ? '#4f46e5' : 'var(--border-subtle)'}`,
                                background: isSelected ? 'rgba(79, 70, 229, 0.1)' : 'var(--bg-main)',
                                cursor: 'grab',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                transition: 'all 0.15s ease'
                              }}
                            >
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <GripVertical size={14} color="var(--text-muted)" />
                                <div>
                                  <div style={{ fontWeight: 800, fontSize: '0.85rem', color: sub?.color || '#4f46e5' }}>
                                    {subjectName}
                                  </div>
                                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                                    {groupCode}
                                  </div>
                                </div>
                              </div>
                              <span className="badge" style={{
                                background: countScheduled > 0 ? 'rgba(16, 185, 129, 0.15)' : 'var(--bg-surface)',
                                color: countScheduled > 0 ? '#10b981' : 'var(--text-muted)',
                                fontSize: '0.7rem',
                                fontWeight: 700
                              }}>
                                {countScheduled} lec.
                              </span>
                            </div>
                          );
                        })}
                    </div>
                  </div>
                </div>
              )}
            </>
          )}

          {/* MODO B: PALETA POR GRUPO / SECCIÓN */}
          {builderMode === 'by-group' && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <label style={{ fontSize: '0.78rem', fontWeight: 700 }}>
                  Materias y Docentes Asignados:
                </label>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                  Arrastra al bloque
                </span>
              </div>

              {groupAssignments.length === 0 ? (
                <div style={{ padding: '16px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.82rem', background: 'var(--bg-main)', borderRadius: '10px' }}>
                  Esta sección no tiene docentes o materias asignadas aún en Gestión Académica.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '350px', overflowY: 'auto' }}>
                  {groupAssignments.map(asg => {
                    const sub = subjects.find(s => s.id === asg.subjectId);
                    const teacher = teachers.find(t => t.id === asg.teacherId);
                    const groupCode = selectedGroup?.groupName || `Sección ${selectedGroup?.sectionCode}`;
                    const subjectName = sub?.name || 'Materia';
                    const teacherName = teacher?.name || 'Docente';

                    const countScheduled = activeSchedules.filter(
                      s => s.groupId === asg.groupId && s.subjectId === asg.subjectId && s.teacherId === asg.teacherId
                    ).length;

                    const isSelected = selectedItemForClick?.groupId === asg.groupId &&
                                       selectedItemForClick?.subjectId === asg.subjectId &&
                                       selectedItemForClick?.teacherId === asg.teacherId;

                    const payload = {
                      groupId: asg.groupId,
                      subjectId: asg.subjectId,
                      teacherId: asg.teacherId,
                      groupCode,
                      subjectName,
                      teacherName
                    };

                    return (
                      <div
                        key={asg.id}
                        draggable={true}
                        onDragStart={(e) => {
                          setDraggedItem(payload);
                          e.dataTransfer.setData('application/json', JSON.stringify(payload));
                        }}
                        onDragEnd={() => setDraggedItem(null)}
                        onClick={() => {
                          setSelectedItemForClick(isSelected ? null : payload);
                        }}
                        style={{
                          padding: '10px 12px',
                          borderRadius: '10px',
                          border: `2px solid ${isSelected ? '#4f46e5' : 'var(--border-subtle)'}`,
                          background: isSelected ? 'rgba(79, 70, 229, 0.1)' : 'var(--bg-main)',
                          cursor: 'grab',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: '8px'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <GripVertical size={14} color="var(--text-muted)" />
                          <div>
                            <div style={{ fontWeight: 800, fontSize: '0.85rem', color: sub?.color || '#4f46e5' }}>
                              {subjectName}
                            </div>
                            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                              Prof. {teacherName}
                            </div>
                          </div>
                        </div>
                        <span className="badge" style={{
                          background: countScheduled > 0 ? 'rgba(16, 185, 129, 0.15)' : 'var(--bg-surface)',
                          color: countScheduled > 0 ? '#10b981' : 'var(--text-muted)',
                          fontSize: '0.7rem',
                          fontWeight: 700
                        }}>
                          {countScheduled} lec.
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Aula opcional */}
          <div style={{ marginTop: 'auto', paddingTop: '12px', borderTop: '1px solid var(--border-subtle)' }}>
            <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>
              Aula / Espacio por defecto:
            </label>
            <input
              type="text"
              placeholder="Ej. Aula 12, Laboratorio 2..."
              value={classroomInput}
              onChange={(e) => setClassroomInput(e.target.value)}
              className="input-field"
              style={{ width: '100%', padding: '6px 10px', fontSize: '0.8rem' }}
            />
          </div>

          {/* Ayuda interactiva */}
          <div style={{
            background: 'rgba(79, 70, 229, 0.06)',
            padding: '10px 12px',
            borderRadius: '8px',
            border: '1px solid rgba(79, 70, 229, 0.15)',
            fontSize: '0.75rem',
            color: 'var(--text-muted)',
            display: 'flex',
            alignItems: 'flex-start',
            gap: '8px'
          }}>
            <Info size={16} color="#6366f1" style={{ flexShrink: 0, marginTop: '2px' }} />
            <span>
              <strong>Tip:</strong> Puedes arrastrar cada tarjeta a una hora o hacer clic en ella y luego tocar la casilla del horario para fijarla.
            </span>
          </div>
        </div>

        {/* COLUMNA DERECHA: MATRIZ SEMANAL DE HORARIO (LUNES A VIERNES) */}
        <div className="glass-panel" style={{
          padding: '24px',
          overflowX: 'auto',
          display: 'flex',
          flexDirection: 'column',
          gap: '16px'
        }}>
          {/* Encabezado del Horario */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '2px solid var(--border-subtle)', paddingBottom: '12px' }}>
            <div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                {institutionName} • Ciclo Lectivo 2026
              </div>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 900, margin: '2px 0 0 0' }}>
                {builderMode === 'by-teacher'
                  ? `Horario Docente: ${selectedTeacher?.name}`
                  : `Horario de Grupo: Sección ${selectedGroup?.sectionCode} ${selectedGroup?.groupName ? `(${selectedGroup.groupName})` : ''}`}
              </h2>
            </div>
            <div style={{ textAlign: 'right' }}>
              <span className="badge" style={{ background: '#4f46e5', color: 'white', fontWeight: 800 }}>
                {activeSchedules.length} Lecciones Semanales
              </span>
            </div>
          </div>

          {/* Tabla de Horario Semanal */}
          <div style={{ overflowX: 'auto' }}>
            <table style={{
              width: '100%',
              borderCollapse: 'collapse',
              textAlign: 'center',
              fontSize: '0.82rem'
            }}>
              <thead>
                <tr style={{ background: 'var(--bg-surface)', borderBottom: '2px solid var(--border-subtle)' }}>
                  <th style={{ padding: '10px 8px', width: '110px', textAlign: 'center' }}>Hora / Bloque</th>
                  {WEEK_DAYS.map(day => (
                    <th key={day.dayOfWeek} style={{ padding: '10px 8px', width: '18%' }}>
                      <div style={{ fontWeight: 800, fontSize: '0.9rem' }}>{day.label}</div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{day.short}</div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {MEP_TIME_SLOTS.map((slot) => {
                  const isRecesoAfter = slot.slotIndex === 2 || slot.slotIndex === 4 || slot.slotIndex === 6;
                  const recesoName = slot.slotIndex === 2 ? 'Receso (08:20 - 08:35)' : slot.slotIndex === 4 ? 'Receso (09:55 - 10:15)' : 'Almuerzo (11:35 - 12:15)';

                  return (
                    <React.Fragment key={slot.slotIndex}>
                      <tr style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                        {/* Celda de Hora */}
                        <td style={{
                          padding: '10px 8px',
                          background: 'var(--bg-surface)',
                          borderRight: '1px solid var(--border-subtle)',
                          fontFamily: 'var(--font-mono)',
                          fontSize: '0.78rem'
                        }}>
                          <div style={{ fontWeight: 800, color: 'var(--text-main)' }}>{slot.label}</div>
                          <div style={{ color: 'var(--text-muted)', fontSize: '0.72rem' }}>
                            {slot.startTime} - {slot.endTime}
                          </div>
                        </td>

                        {/* Celdas para cada día */}
                        {WEEK_DAYS.map(day => {
                          const existingSlot = activeSchedules.find(
                            s => s.dayOfWeek === day.dayOfWeek && s.startTime === slot.startTime
                          );

                          const slotGroup = existingSlot ? groups.find(g => g.id === existingSlot.groupId) : null;
                          const slotSubject = existingSlot ? subjects.find(s => s.id === existingSlot.subjectId) : null;
                          const slotTeacher = existingSlot ? teachers.find(t => t.id === existingSlot.teacherId) : null;

                          return (
                            <td
                              key={day.dayOfWeek}
                              onDragOver={(e) => e.preventDefault()}
                              onDrop={(e) => {
                                e.preventDefault();
                                const payload = draggedItem || (e.dataTransfer.getData('application/json') ? JSON.parse(e.dataTransfer.getData('application/json')) : null);
                                if (payload) {
                                  handleAssignToSlot(
                                    day.dayOfWeek,
                                    slot.startTime,
                                    slot.endTime,
                                    payload.groupId,
                                    payload.subjectId,
                                    payload.teacherId
                                  );
                                }
                              }}
                              onClick={() => {
                                if (selectedItemForClick && !existingSlot) {
                                  handleAssignToSlot(
                                    day.dayOfWeek,
                                    slot.startTime,
                                    slot.endTime,
                                    selectedItemForClick.groupId,
                                    selectedItemForClick.subjectId,
                                    selectedItemForClick.teacherId
                                  );
                                }
                              }}
                              style={{
                                padding: '6px',
                                borderRight: '1px solid var(--border-subtle)',
                                height: '62px',
                                verticalAlign: 'middle',
                                background: existingSlot
                                  ? 'var(--bg-main)'
                                  : selectedItemForClick
                                  ? 'rgba(79, 70, 229, 0.03)'
                                  : 'transparent',
                                cursor: selectedItemForClick && !existingSlot ? 'pointer' : 'default',
                                transition: 'background 0.15s ease'
                              }}
                            >
                              {existingSlot ? (
                                <div style={{
                                  background: slotSubject?.color ? `${slotSubject.color}15` : 'rgba(79, 70, 229, 0.12)',
                                  border: `1.5px solid ${slotSubject?.color || '#4f46e5'}`,
                                  borderRadius: '8px',
                                  padding: '6px 8px',
                                  position: 'relative',
                                  display: 'flex',
                                  flexDirection: 'column',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  height: '100%'
                                }}>
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleDeleteSlot(existingSlot.id);
                                    }}
                                    className="no-print"
                                    style={{
                                      position: 'absolute',
                                      top: '2px',
                                      right: '2px',
                                      background: 'transparent',
                                      border: 'none',
                                      cursor: 'pointer',
                                      color: '#ef4444',
                                      padding: '2px',
                                      opacity: 0.7
                                    }}
                                    title="Quitar lección"
                                  >
                                    <Trash2 size={12} />
                                  </button>

                                  {/* Si es por docente, muestra el Grupo arriba; si es por grupo, muestra la Materia arriba */}
                                  {builderMode === 'by-teacher' ? (
                                    <>
                                      <div style={{
                                        fontWeight: 800,
                                        fontSize: '0.82rem',
                                        color: 'var(--text-main)',
                                        lineHeight: 1.2
                                      }}>
                                        {slotGroup?.groupName || `Secc. ${slotGroup?.sectionCode || '1'}`}
                                      </div>
                                      <div style={{
                                        fontSize: '0.7rem',
                                        fontWeight: 700,
                                        color: slotSubject?.color || '#4f46e5',
                                        marginTop: '2px',
                                        whiteSpace: 'nowrap',
                                        overflow: 'hidden',
                                        textOverflow: 'ellipsis',
                                        maxWidth: '120px'
                                      }}>
                                        {slotSubject?.name}
                                      </div>
                                    </>
                                  ) : (
                                    <>
                                      <div style={{
                                        fontWeight: 800,
                                        fontSize: '0.82rem',
                                        color: slotSubject?.color || '#4f46e5',
                                        lineHeight: 1.2
                                      }}>
                                        {slotSubject?.name}
                                      </div>
                                      <div style={{
                                        fontSize: '0.7rem',
                                        fontWeight: 600,
                                        color: 'var(--text-muted)',
                                        marginTop: '2px',
                                        whiteSpace: 'nowrap',
                                        overflow: 'hidden',
                                        textOverflow: 'ellipsis',
                                        maxWidth: '120px'
                                      }}>
                                        Prof. {slotTeacher?.name || 'Docente'}
                                      </div>
                                    </>
                                  )}

                                  {existingSlot.classroom && (
                                    <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                                      {existingSlot.classroom}
                                    </div>
                                  )}
                                </div>
                              ) : (
                                <div style={{
                                  border: '1px dashed var(--border-subtle)',
                                  borderRadius: '6px',
                                  height: '100%',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  color: 'var(--text-muted)',
                                  fontSize: '0.7rem'
                                }}>
                                  {selectedItemForClick ? (
                                    <span style={{ color: '#4f46e5', fontWeight: 600 }}>+ Asignar</span>
                                  ) : (
                                    <span style={{ opacity: 0.4 }}>—</span>
                                  )}
                                </div>
                              )}
                            </td>
                          );
                        })}
                      </tr>

                      {/* Receso / Almuerzo */}
                      {isRecesoAfter && (
                        <tr style={{ background: 'var(--bg-surface)' }}>
                          <td
                            colSpan={6}
                            style={{
                              padding: '4px',
                              textAlign: 'center',
                              fontSize: '0.7rem',
                              fontWeight: 700,
                              color: 'var(--text-muted)',
                              borderBottom: '1px solid var(--border-subtle)',
                              letterSpacing: '0.5px'
                            }}
                          >
                            ☕ {recesoName}
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
