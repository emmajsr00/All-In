import React, { useState } from 'react';
import {
  X,
  Clock,
  Calendar,
  Plus,
  Play,
  MapPin,
  Trash2,
  Filter,
  Users,
  BookOpen,
  Printer,
  Layers,
  GripVertical,
  Info,
  Check,
  AlertCircle,
  Search
} from 'lucide-react';
import type { ScheduleItem, Group, Subject, TeacherAssignment } from '../types';
import { db } from '../db';

interface ScheduleModalProps {
  schedules: ScheduleItem[];
  groups: Group[];
  subjects: Subject[];
  assignments: TeacherAssignment[];
  teacherId: string;
  onClose: () => void;
  onStartEvaluatingClass: (assignmentId: string) => void;
  onRefreshSchedules: () => void;
}

// Bloques estándar de lecciones MEP Costa Rica
const MEP_TIME_SLOTS = [
  { slotIndex: 1, label: 'Lección 1', startTime: '07:00', endTime: '07:40' },
  { slotIndex: 2, label: 'Lección 2', startTime: '07:40', endTime: '08:20' },
  // Receso 08:20 - 08:35
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

export const ScheduleModal: React.FC<ScheduleModalProps> = ({
  schedules,
  groups,
  subjects,
  assignments,
  teacherId,
  onClose,
  onStartEvaluatingClass,
  onRefreshSchedules
}) => {
  // Paleta izquierda: organizar por Materia o por Sección
  const [paletteMode, setPaletteMode] = useState<'by-group' | 'by-subject'>('by-group');
  const [selectedPaletteGroupId, setSelectedPaletteGroupId] = useState<string>('');
  const [selectedPaletteSubjectId, setSelectedPaletteSubjectId] = useState<string>('');

  // Item seleccionado para arrastrar o hacer clic
  const [selectedItemForClick, setSelectedItemForClick] = useState<{
    groupId: string;
    subjectId: string;
    groupCode: string;
    subjectName: string;
  } | null>(null);

  const [draggedItem, setDraggedItem] = useState<{
    groupId: string;
    subjectId: string;
    groupCode: string;
    subjectName: string;
  } | null>(null);

  const [classroomInput, setClassroomInput] = useState<string>('');

  // Filtros de visualización en la matriz semanal
  const [highlightGroupId, setHighlightGroupId] = useState<string>('ALL');
  const [highlightSubjectId, setHighlightSubjectId] = useState<string>('ALL');
  const [filterMode, setFilterMode] = useState<'ISOLATE' | 'DIM'>('ISOLATE');

  // Solo horarios de este docente
  const mySchedules = schedules.filter(s => s.teacherId === teacherId);

  // Secciones y materias únicas de este docente
  const myGroupIds = Array.from(new Set(assignments.map(a => a.groupId)));
  const myGroups = groups.filter(g => myGroupIds.includes(g.id));

  // Buscador y filtros de Grupo / Sección interactivos en el Horario
  const [sectionSearchQuery, setSectionSearchQuery] = useState('');
  const [sectionGradeFilter, setSectionGradeFilter] = useState<'ALL' | number>('ALL');
  const [paletteSectionSearch, setPaletteSectionSearch] = useState('');

  const availableScheduleGrades = Array.from(new Set(myGroups.map(g => g.grade))).sort((a, b) => a - b);

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

  const filteredMyGroups = myGroups.filter(g => {
    if (sectionGradeFilter !== 'ALL' && g.grade !== sectionGradeFilter) return false;
    if (sectionSearchQuery.trim()) {
      const q = sectionSearchQuery.toLowerCase().trim();
      const codeMatch = g.sectionCode.toLowerCase().includes(q);
      const nameMatch = (g.groupName || '').toLowerCase().includes(q);
      const gradeMatch = g.grade.toString() === q;
      return codeMatch || nameMatch || gradeMatch;
    }
    return true;
  });

  const mySubjectIds = Array.from(new Set(assignments.map(a => a.subjectId)));
  const mySubjects = subjects.filter(s => mySubjectIds.includes(s.id));

  const activePaletteGroup = myGroups.find(g => g.id === selectedPaletteGroupId) || myGroups[0];
  const activePaletteSubject = mySubjects.find(s => s.id === selectedPaletteSubjectId) || mySubjects[0];

  // Asignar bloque al soltar o hacer clic en una casilla
  const handleAssignToSlot = async (
    dayOfWeek: 1 | 2 | 3 | 4 | 5,
    startTime: string,
    endTime: string,
    groupId: string,
    subjectId: string
  ) => {
    // Si ya existe una lección a esa hora para el docente, se actualiza
    const existing = mySchedules.find(
      s => s.dayOfWeek === dayOfWeek && s.startTime === startTime
    );
    if (existing) {
      await db.schedules.delete(existing.id);
    }

    const grp = groups.find(g => g.id === groupId);
    const defaultAula = classroomInput.trim() || (grp ? `Aula ${grp.sectionCode}` : 'Aula Principal');

    const newItem: ScheduleItem = {
      id: `sch-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      teacherId,
      groupId,
      subjectId,
      dayOfWeek,
      startTime,
      endTime,
      classroom: defaultAula
    };

    await db.schedules.add(newItem);
    onRefreshSchedules();
  };

  const handleDeleteSlot = async (scheduleId: string) => {
    await db.schedules.delete(scheduleId);
    onRefreshSchedules();
  };

  const handleClearAll = async () => {
    if (window.confirm('¿Estás seguro de vaciar todo tu horario semanal?')) {
      for (const sch of mySchedules) {
        await db.schedules.delete(sch.id);
      }
      onRefreshSchedules();
    }
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.8)',
      backdropFilter: 'blur(8px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 100,
      padding: '16px'
    }}>
      <div className="glass-panel" style={{
        width: '100%',
        maxWidth: '1240px',
        maxHeight: '94vh',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.6)',
        border: '1px solid var(--border-subtle)'
      }}>
        {/* Encabezado Superior */}
        <div style={{
          padding: '16px 24px',
          borderBottom: '1px solid var(--border-subtle)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: 'var(--bg-surface)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div style={{
              width: '42px',
              height: '42px',
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
                  Horario Semanal Interactivo
                </h2>
                <span className="badge" style={{ background: '#4f46e5', color: 'white', fontWeight: 800 }}>
                  {mySchedules.length} lecciones programadas
                </span>
              </div>
              <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', margin: '3px 0 0 0' }}>
                Arrastra o haz clic en tus secciones y materias hacia cualquier hora de la matriz para armar tu horario.
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              onClick={() => window.print()}
              className="btn btn-secondary btn-sm"
              title="Imprimir horario"
            >
              <Printer size={15} />
              <span>Imprimir</span>
            </button>
            {mySchedules.length > 0 && (
              <button
                onClick={handleClearAll}
                className="btn btn-ghost btn-sm"
                style={{ color: '#ef4444' }}
                title="Vaciar todo el horario"
              >
                <Trash2 size={15} />
                <span>Vaciar</span>
              </button>
            )}
            <button onClick={onClose} className="btn btn-secondary btn-sm" style={{ padding: '6px' }}>
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Barra de Filtros de Sección y Materia */}
        <div style={{
          padding: '12px 24px',
          background: 'var(--bg-main)',
          borderBottom: '1px solid var(--border-subtle)',
          display: 'flex',
          flexDirection: 'column',
          gap: '10px'
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '12px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                Filtrar Horario:
              </span>

              {/* Selector de Sección con Buscador Interactivo */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Users size={14} color="#4f46e5" />
                  <span style={{ fontSize: '0.8rem', fontWeight: 700 }}>Sección:</span>
                </div>

                <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                  <Search size={13} style={{ position: 'absolute', left: '8px', color: 'var(--text-muted)' }} />
                  <input
                    type="text"
                    value={sectionSearchQuery}
                    onChange={(e) => {
                      setSectionSearchQuery(e.target.value);
                      const q = e.target.value.toLowerCase().trim();
                      const match = myGroups.find(g =>
                        g.sectionCode.toLowerCase().includes(q) || (g.groupName || '').toLowerCase().includes(q)
                      );
                      if (match) setHighlightGroupId(match.id);
                    }}
                    placeholder="Buscar sección (ej: 7-1)..."
                    style={{
                      paddingLeft: '26px',
                      paddingRight: sectionSearchQuery ? '24px' : '8px',
                      paddingTop: '5px',
                      paddingBottom: '5px',
                      fontSize: '0.78rem',
                      width: '160px',
                      borderRadius: '8px',
                      border: '1px solid var(--border-subtle)',
                      background: 'var(--bg-card)',
                      color: 'var(--text-main)',
                      fontWeight: 600
                    }}
                  />
                  {sectionSearchQuery && (
                    <button
                      type="button"
                      onClick={() => setSectionSearchQuery('')}
                      style={{
                        position: 'absolute',
                        right: '6px',
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

                <select
                  value={highlightGroupId}
                  onChange={(e) => setHighlightGroupId(e.target.value)}
                  style={{
                    padding: '5px 10px',
                    borderRadius: '8px',
                    border: '1px solid var(--border-subtle)',
                    background: 'var(--bg-card)',
                    color: 'var(--text-main)',
                    fontSize: '0.8rem',
                    fontWeight: 600
                  }}
                >
                  <option value="ALL">Todas las Secciones ({myGroups.length})</option>
                  {filteredMyGroups.map(g => (
                    <option key={g.id} value={g.id}>
                      Sección {g.sectionCode} {g.groupName ? `(${g.groupName})` : ''}
                    </option>
                  ))}
                </select>
              </div>

              {/* Selector de Materia */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <BookOpen size={14} color="#10b981" />
                <select
                  value={highlightSubjectId}
                  onChange={(e) => setHighlightSubjectId(e.target.value)}
                  style={{
                    padding: '5px 10px',
                    borderRadius: '8px',
                    border: '1px solid var(--border-subtle)',
                    background: 'var(--bg-card)',
                    color: 'var(--text-main)',
                    fontSize: '0.8rem',
                    fontWeight: 600
                  }}
                >
                  <option value="ALL">Todas las Materias ({mySubjects.length})</option>
                  {mySubjects.map(s => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Toggle de Modo: Solo Mostrar vs Atenuar */}
              <div style={{
                display: 'flex',
                background: 'var(--bg-surface)',
                padding: '2px',
                borderRadius: '8px',
                border: '1px solid var(--border-subtle)',
                gap: '2px'
              }}>
                <button
                  type="button"
                  onClick={() => setFilterMode('ISOLATE')}
                  className={`btn btn-sm ${filterMode === 'ISOLATE' ? 'btn-primary' : 'btn-ghost'}`}
                  style={{ fontSize: '0.72rem', padding: '3px 8px' }}
                  title="Oculta las lecciones que no coinciden con la sección o materia seleccionada"
                >
                  Solo Selección
                </button>
                <button
                  type="button"
                  onClick={() => setFilterMode('DIM')}
                  className={`btn btn-sm ${filterMode === 'DIM' ? 'btn-primary' : 'btn-ghost'}`}
                  style={{ fontSize: '0.72rem', padding: '3px 8px' }}
                  title="Mantiene todas las lecciones pero resalta la sección o materia seleccionada"
                >
                  Atenuar Resto
                </button>
              </div>

              {(highlightGroupId !== 'ALL' || highlightSubjectId !== 'ALL') && (
                <button
                  onClick={() => {
                    setHighlightGroupId('ALL');
                    setHighlightSubjectId('ALL');
                  }}
                  className="btn btn-ghost btn-sm"
                  style={{ fontSize: '0.74rem', padding: '3px 8px', color: '#ef4444' }}
                >
                  Restablecer
                </button>
              )}
            </div>

            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              💡 Clic en cualquier lección colocada para evaluarla de inmediato.
            </div>
          </div>

          {/* Píldoras rápidas de acceso a secciones y filtro por nivel en el Horario */}
          {myGroups.length > 1 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', overflowX: 'auto', paddingTop: '6px', borderTop: '1px solid var(--border-subtle)', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', whiteSpace: 'nowrap', marginRight: '4px' }}>
                Filtro rápido:
              </span>
              <button
                type="button"
                onClick={() => {
                  setSectionGradeFilter('ALL');
                  setHighlightGroupId('ALL');
                }}
                className={`btn btn-sm ${sectionGradeFilter === 'ALL' && highlightGroupId === 'ALL' ? 'btn-primary' : 'btn-secondary'}`}
                style={{ fontSize: '0.72rem', padding: '2px 8px', borderRadius: '999px', whiteSpace: 'nowrap' }}
              >
                Todas ({myGroups.length})
              </button>

              {availableScheduleGrades.length > 1 && availableScheduleGrades.map(grd => {
                const count = myGroups.filter(g => g.grade === grd).length;
                const isSelected = sectionGradeFilter === grd;
                return (
                  <button
                    key={`grd-${grd}`}
                    type="button"
                    onClick={() => {
                      const next = isSelected ? 'ALL' : grd;
                      setSectionGradeFilter(next);
                      if (next !== 'ALL') {
                        const first = myGroups.find(g => g.grade === grd);
                        if (first) setHighlightGroupId(first.id);
                      }
                    }}
                    className={`btn btn-sm ${isSelected ? 'btn-primary' : 'btn-secondary'}`}
                    style={{ fontSize: '0.72rem', padding: '2px 8px', borderRadius: '999px', whiteSpace: 'nowrap' }}
                  >
                    Nivel {getGradeShortLabel(grd)} ({count})
                  </button>
                );
              })}

              <div style={{ width: '1px', height: '14px', background: 'var(--border-subtle)', margin: '0 4px' }} />

              {filteredMyGroups.map(g => (
                <button
                  key={g.id}
                  type="button"
                  onClick={() => setHighlightGroupId(highlightGroupId === g.id ? 'ALL' : g.id)}
                  className={`btn btn-sm ${highlightGroupId === g.id ? 'btn-primary' : 'btn-secondary'}`}
                  style={{ fontSize: '0.72rem', padding: '2px 8px', borderRadius: '999px', whiteSpace: 'nowrap' }}
                >
                  Secc. {g.sectionCode}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Cuerpo Principal: Paleta Drag & Drop a la izquierda + Matriz Semanal a la derecha */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(280px, 320px) 1fr',
          gap: '18px',
          padding: '18px 24px',
          overflowY: 'auto',
          flex: 1
        }}>
          
          {/* PALETA IZQUIERDA: SECCIONES Y MATERIAS ARRASTRABLES */}
          <div className="glass-panel" style={{
            padding: '16px',
            display: 'flex',
            flexDirection: 'column',
            gap: '14px',
            height: 'fit-content',
            background: 'var(--bg-surface)'
          }}>
            <div>
              <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Organizar Paleta por:
              </div>
              <div style={{
                display: 'flex',
                background: 'var(--bg-main)',
                padding: '3px',
                borderRadius: '8px',
                border: '1px solid var(--border-subtle)',
                marginTop: '6px',
                gap: '2px'
              }}>
                <button
                  type="button"
                  onClick={() => {
                    setPaletteMode('by-group');
                    setSelectedItemForClick(null);
                  }}
                  className={`btn btn-sm ${paletteMode === 'by-group' ? 'btn-primary' : 'btn-ghost'}`}
                  style={{ flex: 1, fontSize: '0.75rem', padding: '4px 6px' }}
                >
                  <Users size={13} />
                  <span>Por Sección</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setPaletteMode('by-subject');
                    setSelectedItemForClick(null);
                  }}
                  className={`btn btn-sm ${paletteMode === 'by-subject' ? 'btn-primary' : 'btn-ghost'}`}
                  style={{ flex: 1, fontSize: '0.75rem', padding: '4px 6px' }}
                >
                  <BookOpen size={13} />
                  <span>Por Materia</span>
                </button>
              </div>
            </div>

            {/* CASO 1: ORGANIZAR POR SECCIÓN (Eliges Sección -> Arrastras Materias) */}
            {paletteMode === 'by-group' && (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                  <label style={{ fontSize: '0.78rem', fontWeight: 700 }}>
                    1. Selecciona Sección a Programar:
                  </label>
                  {myGroups.length > 3 && (
                    <input
                      type="text"
                      value={paletteSectionSearch}
                      onChange={(e) => setPaletteSectionSearch(e.target.value)}
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
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '150px', overflowY: 'auto' }}>
                  {myGroups
                    .filter(grp => {
                      if (!paletteSectionSearch.trim()) return true;
                      const q = paletteSectionSearch.toLowerCase().trim();
                      return grp.sectionCode.toLowerCase().includes(q) || (grp.groupName || '').toLowerCase().includes(q);
                    })
                    .map(grp => {
                    const isGrpActive = activePaletteGroup?.id === grp.id;
                    const countForGrp = assignments.filter(a => a.groupId === grp.id && a.teacherId === teacherId).length;
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
                          border: `1.5px solid ${isGrpActive ? '#4f46e5' : 'var(--border-subtle)'}`,
                          background: isGrpActive ? 'rgba(79, 70, 229, 0.1)' : 'var(--bg-main)',
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
                        <span className="badge" style={{ fontSize: '0.68rem' }}>
                          {countForGrp} materias
                        </span>
                      </button>
                    );
                  })}
                </div>

                <div style={{ marginTop: '12px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                    <label style={{ fontSize: '0.78rem', fontWeight: 700 }}>
                      2. Materias a impartir:
                    </label>
                    <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>
                      Arrastra al horario
                    </span>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    {assignments
                      .filter(a => a.groupId === activePaletteGroup?.id && a.teacherId === teacherId)
                      .map(asg => {
                        const sub = subjects.find(s => s.id === asg.subjectId);
                        const grp = activePaletteGroup;
                        const groupCode = grp?.groupName || `Sección ${grp?.sectionCode || 'N/A'}`;
                        const subjectName = sub?.name || 'Materia';
                        const countScheduled = mySchedules.filter(
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
                              background: isSelected ? 'rgba(79, 70, 229, 0.12)' : 'var(--bg-main)',
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
                                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
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

            {/* CASO 2: ORGANIZAR POR MATERIA (Eliges Materia -> Arrastras Secciones) */}
            {paletteMode === 'by-subject' && (
              <div>
                <label style={{ fontSize: '0.78rem', fontWeight: 700, display: 'block', marginBottom: '6px' }}>
                  1. Selecciona Materia a Programar:
                </label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '150px', overflowY: 'auto' }}>
                  {mySubjects.map(sub => {
                    const isSubActive = activePaletteSubject?.id === sub.id;
                    const countForSub = assignments.filter(a => a.subjectId === sub.id && a.teacherId === teacherId).length;
                    return (
                      <button
                        key={sub.id}
                        type="button"
                        onClick={() => {
                          setSelectedPaletteSubjectId(sub.id);
                          setSelectedItemForClick(null);
                        }}
                        style={{
                          padding: '8px 10px',
                          borderRadius: '8px',
                          border: `1.5px solid ${isSubActive ? sub.color || '#4f46e5' : 'var(--border-subtle)'}`,
                          background: isSubActive ? 'rgba(79, 70, 229, 0.1)' : 'var(--bg-main)',
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
                        <span className="badge" style={{ fontSize: '0.68rem' }}>
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
                    <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>
                      Arrastra al horario
                    </span>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    {assignments
                      .filter(a => a.subjectId === activePaletteSubject?.id && a.teacherId === teacherId)
                      .map(asg => {
                        const grp = groups.find(g => g.id === asg.groupId);
                        const sub = activePaletteSubject;
                        const groupCode = grp?.groupName || `Sección ${grp?.sectionCode || 'N/A'}`;
                        const subjectName = sub?.name || 'Materia';
                        const countScheduled = mySchedules.filter(
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
                              background: isSelected ? 'rgba(79, 70, 229, 0.12)' : 'var(--bg-main)',
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
                                <div style={{ fontSize: '0.7rem', color: sub?.color || '#4f46e5', fontWeight: 600 }}>
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

            {/* Aula sugerida por defecto */}
            <div style={{ marginTop: 'auto', paddingTop: '10px', borderTop: '1px solid var(--border-subtle)' }}>
              <label style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>
                Aula / Laboratorio por defecto:
              </label>
              <input
                type="text"
                placeholder="Ej. Aula 10-1, Lab 2..."
                value={classroomInput}
                onChange={(e) => setClassroomInput(e.target.value)}
                style={{
                  width: '100%',
                  padding: '6px 10px',
                  borderRadius: '6px',
                  border: '1px solid var(--border-subtle)',
                  background: 'var(--bg-card)',
                  color: 'var(--text-main)',
                  fontSize: '0.8rem'
                }}
              />
            </div>

            {/* Tip interactivo */}
            <div style={{
              background: 'rgba(79, 70, 229, 0.06)',
              padding: '10px',
              borderRadius: '8px',
              border: '1px solid rgba(79, 70, 229, 0.15)',
              fontSize: '0.72rem',
              color: 'var(--text-muted)',
              display: 'flex',
              alignItems: 'flex-start',
              gap: '6px'
            }}>
              <Info size={14} color="#6366f1" style={{ flexShrink: 0, marginTop: '2px' }} />
              <span>
                <strong>Atajo:</strong> Puedes arrastrar cada tarjeta a una celda del horario o hacer clic en ella y luego tocar la casilla para fijarla.
              </span>
            </div>
          </div>

          {/* MATRIZ SEMANAL INTERACTIVA (LUNES A VIERNES) */}
          <div className="glass-panel" style={{
            padding: '20px',
            overflowX: 'auto',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '2px solid var(--border-subtle)', paddingBottom: '10px' }}>
              <div>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 900, margin: 0 }}>
                  Matriz Semanal de Lecciones
                </h3>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  Ciclo Lectivo Costa Rica • Horarios Oficiales MEP
                </span>
              </div>
              <span className="badge" style={{ background: '#4f46e5', color: 'white', fontWeight: 800 }}>
                {mySchedules.length} Lecciones Semanales
              </span>
            </div>

            <div style={{ overflowX: 'auto' }}>
              <table style={{
                width: '100%',
                borderCollapse: 'collapse',
                textAlign: 'center',
                fontSize: '0.8rem'
              }}>
                <thead>
                  <tr style={{ background: 'var(--bg-surface)', borderBottom: '2px solid var(--border-subtle)' }}>
                    <th style={{ padding: '8px 6px', width: '105px', textAlign: 'center' }}>Hora / Bloque</th>
                    {WEEK_DAYS.map(day => (
                      <th key={day.dayOfWeek} style={{ padding: '8px 6px', width: '18%' }}>
                        <div style={{ fontWeight: 800, fontSize: '0.88rem' }}>{day.label}</div>
                        <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>{day.short}</div>
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
                          {/* Columna de Hora */}
                          <td style={{
                            padding: '8px 6px',
                            background: 'var(--bg-surface)',
                            borderRight: '1px solid var(--border-subtle)',
                            fontFamily: 'var(--font-mono)',
                            fontSize: '0.75rem'
                          }}>
                            <div style={{ fontWeight: 800, color: 'var(--text-main)' }}>{slot.label}</div>
                            <div style={{ color: 'var(--text-muted)', fontSize: '0.7rem' }}>
                              {slot.startTime} - {slot.endTime}
                            </div>
                          </td>

                          {/* Columnas para cada día Lunes - Viernes */}
                          {WEEK_DAYS.map(day => {
                            const existingSlot = mySchedules.find(
                              s => s.dayOfWeek === day.dayOfWeek && s.startTime === slot.startTime
                            );

                            const slotGroup = existingSlot ? groups.find(g => g.id === existingSlot.groupId) : null;
                            const slotSubject = existingSlot ? subjects.find(s => s.id === existingSlot.subjectId) : null;
                            const asg = existingSlot ? assignments.find(a => a.groupId === existingSlot.groupId && a.subjectId === existingSlot.subjectId) : null;

                            // Comprobar si coincide con el filtro
                            const isGroupMatch = highlightGroupId === 'ALL' || existingSlot?.groupId === highlightGroupId;
                            const isSubjectMatch = highlightSubjectId === 'ALL' || existingSlot?.subjectId === highlightSubjectId;
                            const isHighlighted = isGroupMatch && isSubjectMatch;
                            const isFilteredOut = (highlightGroupId !== 'ALL' || highlightSubjectId !== 'ALL') && !isHighlighted;
                            const isHiddenByFilter = isFilteredOut && filterMode === 'ISOLATE';

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
                                      payload.subjectId
                                    );
                                  }
                                }}
                                onClick={() => {
                                  if (selectedItemForClick && (!existingSlot || isHiddenByFilter)) {
                                    handleAssignToSlot(
                                      day.dayOfWeek,
                                      slot.startTime,
                                      slot.endTime,
                                      selectedItemForClick.groupId,
                                      selectedItemForClick.subjectId
                                    );
                                  }
                                }}
                                style={{
                                  padding: '5px',
                                  borderRight: '1px solid var(--border-subtle)',
                                  height: '62px',
                                  verticalAlign: 'middle',
                                  background: (existingSlot && !isHiddenByFilter)
                                    ? (isHighlighted ? 'var(--bg-main)' : 'rgba(0,0,0,0.05)')
                                    : selectedItemForClick
                                    ? 'rgba(79, 70, 229, 0.04)'
                                    : 'transparent',
                                  opacity: (existingSlot && !isHiddenByFilter && isFilteredOut) ? 0.3 : 1,
                                  cursor: selectedItemForClick && (!existingSlot || isHiddenByFilter) ? 'pointer' : 'default',
                                  transition: 'background 0.15s ease, opacity 0.2s ease'
                                }}
                              >
                                {existingSlot && !isHiddenByFilter ? (
                                  <div style={{
                                    background: slotSubject?.color ? `${slotSubject.color}15` : 'rgba(79, 70, 229, 0.12)',
                                    border: `1.5px solid ${slotSubject?.color || '#4f46e5'}`,
                                    borderRadius: '8px',
                                    padding: '5px 6px',
                                    position: 'relative',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    height: '100%'
                                  }}>
                                    {/* Quitar lección */}
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
                                      <Trash2 size={11} />
                                    </button>

                                    {/* Botón Evaluar Rápido */}
                                    {asg && (
                                      <button
                                        type="button"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          onStartEvaluatingClass(asg.id);
                                          onClose();
                                        }}
                                        className="no-print"
                                        style={{
                                          position: 'absolute',
                                          top: '2px',
                                          left: '2px',
                                          background: 'rgba(79, 70, 229, 0.9)',
                                          border: 'none',
                                          borderRadius: '4px',
                                          cursor: 'pointer',
                                          color: 'white',
                                          padding: '2px 4px',
                                          display: 'flex',
                                          alignItems: 'center',
                                          gap: '2px',
                                          fontSize: '0.62rem',
                                          fontWeight: 700
                                        }}
                                        title="Evaluar esta clase ahora"
                                      >
                                        <Play size={8} /> Eval
                                      </button>
                                    )}

                                    <div style={{
                                      fontWeight: 800,
                                      fontSize: '0.8rem',
                                      color: 'var(--text-main)',
                                      lineHeight: 1.1,
                                      marginTop: '6px'
                                    }}>
                                      {slotGroup?.groupName || `Secc. ${slotGroup?.sectionCode || '1'}`}
                                    </div>

                                    <div style={{
                                      fontSize: '0.68rem',
                                      fontWeight: 700,
                                      color: slotSubject?.color || '#4f46e5',
                                      marginTop: '2px',
                                      whiteSpace: 'nowrap',
                                      overflow: 'hidden',
                                      textOverflow: 'ellipsis',
                                      maxWidth: '110px'
                                    }}>
                                      {slotSubject?.name}
                                    </div>

                                    {existingSlot.classroom && (
                                      <div style={{ fontSize: '0.62rem', color: 'var(--text-muted)', marginTop: '1px' }}>
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
                                    fontSize: '0.68rem'
                                  }}>
                                    {selectedItemForClick ? (
                                      <span style={{ color: '#4f46e5', fontWeight: 600 }}>+ Asignar</span>
                                    ) : (
                                      <span style={{ opacity: 0.35 }}>—</span>
                                    )}
                                  </div>
                                )}
                              </td>
                            );
                          })}
                        </tr>

                        {/* Recesos */}
                        {isRecesoAfter && (
                          <tr style={{ background: 'var(--bg-surface)' }}>
                            <td
                              colSpan={6}
                              style={{
                                padding: '3px',
                                textAlign: 'center',
                                fontSize: '0.68rem',
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

        {/* Footer */}
        <div style={{
          padding: '12px 24px',
          borderTop: '1px solid var(--border-subtle)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          background: 'var(--bg-surface)'
        }}>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            Total de <strong>{mySchedules.length}</strong> lecciones en tu horario semanal
          </div>
          <button onClick={onClose} className="btn btn-secondary">
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};
