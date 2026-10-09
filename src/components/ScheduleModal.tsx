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
  ChevronRight,
  CheckCircle2
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

const DAYS = [
  { id: 1, name: 'Lunes', short: 'LUN' },
  { id: 2, name: 'Martes', short: 'MAR' },
  { id: 3, name: 'Miércoles', short: 'MIÉ' },
  { id: 4, name: 'Jueves', short: 'JUE' },
  { id: 5, name: 'Viernes', short: 'VIE' }
];

// Presets de bloques MEP estándar Costa Rica
const MEP_PRESETS = [
  { label: 'L1', time: '07:00 - 07:40', start: '07:00', end: '07:40' },
  { label: 'L2', time: '07:40 - 08:20', start: '07:40', end: '08:20' },
  { label: 'L3', time: '08:35 - 09:15', start: '08:35', end: '09:15' },
  { label: 'L4', time: '09:15 - 09:55', start: '09:15', end: '09:55' },
  { label: 'L5', time: '10:15 - 10:55', start: '10:15', end: '10:55' },
  { label: 'L6', time: '10:55 - 11:35', start: '10:55', end: '11:35' },
  { label: 'L7', time: '12:15 - 12:55', start: '12:15', end: '12:55' },
  { label: 'L8', time: '12:55 - 13:35', start: '12:55', end: '13:35' },
  { label: 'L9', time: '13:35 - 14:15', start: '13:35', end: '14:15' },
  { label: 'L10', time: '14:15 - 14:55', start: '14:15', end: '14:55' }
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
  // Filtros principales
  const [selectedDay, setSelectedDay] = useState<number | 0>(1); // 0 = Toda la semana
  const [filterGroupId, setFilterGroupId] = useState<string>('ALL');
  const [filterSubjectId, setFilterSubjectId] = useState<string>('ALL');
  const [viewMode, setViewMode] = useState<'timeline' | 'by-group' | 'by-subject'>('timeline');

  // Formulario para agregar bloque
  const [showAddForm, setShowAddForm] = useState(false);
  const [addFormGroupId, setAddFormGroupId] = useState<string>(assignments[0]?.groupId || groups[0]?.id || '');
  const [addFormSubjectId, setAddFormSubjectId] = useState<string>(assignments[0]?.subjectId || subjects[0]?.id || '');
  const [addFormDay, setAddFormDay] = useState<number>(selectedDay === 0 ? 1 : selectedDay);
  const [startTime, setStartTime] = useState('07:00');
  const [endTime, setEndTime] = useState('08:20');
  const [classroom, setClassroom] = useState('Aula 12');

  // Filtrar horarios solo para este docente
  const mySchedules = schedules.filter(s => s.teacherId === teacherId);

  // Obtener secciones y materias únicas que imparte el docente
  const myGroupIds = Array.from(new Set(assignments.map(a => a.groupId)));
  const myGroups = groups.filter(g => myGroupIds.includes(g.id));

  const mySubjectIds = Array.from(new Set(assignments.map(a => a.subjectId)));
  const mySubjects = subjects.filter(s => mySubjectIds.includes(s.id));

  // Al cambiar el grupo en el formulario de creación, ajustar materias correspondientes
  const availableSubjectsForSelectedGroup = mySubjects.filter(sub =>
    assignments.some(a => a.groupId === addFormGroupId && a.subjectId === sub.id)
  );

  const handleGroupChangeInAdd = (groupId: string) => {
    setAddFormGroupId(groupId);
    const validSubs = mySubjects.filter(sub =>
      assignments.some(a => a.groupId === groupId && a.subjectId === sub.id)
    );
    if (validSubs.length > 0 && !validSubs.some(s => s.id === addFormSubjectId)) {
      setAddFormSubjectId(validSubs[0].id);
    }
    const grp = groups.find(g => g.id === groupId);
    if (grp) {
      setClassroom(`Aula ${grp.sectionCode}`);
    }
  };

  // Filtrar lecciones según los filtros activos
  const filteredSchedules = mySchedules.filter(sch => {
    if (selectedDay !== 0 && sch.dayOfWeek !== selectedDay) return false;
    if (filterGroupId !== 'ALL' && sch.groupId !== filterGroupId) return false;
    if (filterSubjectId !== 'ALL' && sch.subjectId !== filterSubjectId) return false;
    return true;
  }).sort((a, b) => {
    if (a.dayOfWeek !== b.dayOfWeek) return a.dayOfWeek - b.dayOfWeek;
    return a.startTime.localeCompare(b.startTime);
  });

  const handleAddSchedule = async () => {
    if (!addFormGroupId || !addFormSubjectId) {
      alert('Por favor selecciona una sección y materia válidas.');
      return;
    }

    const newItem: ScheduleItem = {
      id: `sch-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      teacherId,
      groupId: addFormGroupId,
      subjectId: addFormSubjectId,
      dayOfWeek: addFormDay as 1 | 2 | 3 | 4 | 5,
      startTime,
      endTime,
      classroom: classroom.trim() || undefined
    };

    await db.schedules.add(newItem);
    onRefreshSchedules();
    setShowAddForm(false);
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('¿Deseas eliminar este bloque del horario?')) {
      await db.schedules.delete(id);
      onRefreshSchedules();
    }
  };

  const applyPreset = (start: string, end: string) => {
    setStartTime(start);
    setEndTime(end);
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.75)',
      backdropFilter: 'blur(8px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 100,
      padding: '20px'
    }}>
      <div className="glass-panel" style={{
        width: '100%',
        maxWidth: '960px',
        maxHeight: '92vh',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
        border: '1px solid var(--border-subtle)'
      }}>
        {/* Header Superior */}
        <div style={{
          padding: '18px 24px',
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
                  Horario de Clases
                </h2>
                <span className="badge" style={{ background: '#4f46e5', color: 'white', fontSize: '0.75rem', fontWeight: 700 }}>
                  {mySchedules.length} lecciones programadas
                </span>
              </div>
              <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', margin: '3px 0 0 0' }}>
                Organiza y consulta tu horario por sección, por materia o cronológicamente.
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
            <button
              onClick={() => setShowAddForm(!showAddForm)}
              className="btn btn-primary btn-sm"
              style={{ fontWeight: 700 }}
            >
              <Plus size={16} />
              <span>Agregar Bloque</span>
            </button>
            <button onClick={onClose} className="btn btn-secondary btn-sm" style={{ padding: '6px' }}>
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Barra de Filtros: Por Grupo/Sección, Por Materia y Modo de Vista */}
        <div style={{
          padding: '12px 24px',
          background: 'var(--bg-main)',
          borderBottom: '1px solid var(--border-subtle)',
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '12px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
            {/* Filtro por Sección */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Users size={16} color="#6366f1" />
              <label style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-main)' }}>
                Sección:
              </label>
              <select
                value={filterGroupId}
                onChange={(e) => setFilterGroupId(e.target.value)}
                style={{
                  padding: '5px 10px',
                  borderRadius: '8px',
                  border: '1px solid var(--border-subtle)',
                  background: 'var(--bg-card)',
                  color: 'var(--text-main)',
                  fontSize: '0.82rem',
                  fontWeight: 600
                }}
              >
                <option value="ALL">Todas las Secciones ({myGroups.length})</option>
                {myGroups.map(g => (
                  <option key={g.id} value={g.id}>
                    Sección {g.sectionCode} {g.groupName ? `(${g.groupName})` : ''}
                  </option>
                ))}
              </select>
            </div>

            {/* Filtro por Materia */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <BookOpen size={16} color="#10b981" />
              <label style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-main)' }}>
                Materia:
              </label>
              <select
                value={filterSubjectId}
                onChange={(e) => setFilterSubjectId(e.target.value)}
                style={{
                  padding: '5px 10px',
                  borderRadius: '8px',
                  border: '1px solid var(--border-subtle)',
                  background: 'var(--bg-card)',
                  color: 'var(--text-main)',
                  fontSize: '0.82rem',
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

            {/* Resetear filtros */}
            {(filterGroupId !== 'ALL' || filterSubjectId !== 'ALL' || selectedDay === 0) && (
              <button
                onClick={() => {
                  setFilterGroupId('ALL');
                  setFilterSubjectId('ALL');
                  setSelectedDay(1);
                }}
                className="btn btn-ghost btn-sm"
                style={{ fontSize: '0.75rem', padding: '4px 8px' }}
              >
                Limpiar Filtros
              </button>
            )}
          </div>

          {/* Selector de Modo de Vista */}
          <div style={{
            display: 'flex',
            background: 'var(--bg-surface)',
            padding: '3px',
            borderRadius: '8px',
            border: '1px solid var(--border-subtle)',
            gap: '3px'
          }}>
            <button
              onClick={() => setViewMode('timeline')}
              className={`btn btn-sm ${viewMode === 'timeline' ? 'btn-primary' : 'btn-ghost'}`}
              style={{ fontSize: '0.75rem', padding: '4px 10px' }}
            >
              <Calendar size={13} />
              <span>Cronológico</span>
            </button>
            <button
              onClick={() => setViewMode('by-group')}
              className={`btn btn-sm ${viewMode === 'by-group' ? 'btn-primary' : 'btn-ghost'}`}
              style={{ fontSize: '0.75rem', padding: '4px 10px' }}
            >
              <Users size={13} />
              <span>Por Sección</span>
            </button>
            <button
              onClick={() => setViewMode('by-subject')}
              className={`btn btn-sm ${viewMode === 'by-subject' ? 'btn-primary' : 'btn-ghost'}`}
              style={{ fontSize: '0.75rem', padding: '4px 10px' }}
            >
              <BookOpen size={13} />
              <span>Por Materia</span>
            </button>
          </div>
        </div>

        {/* Tabs de Días (si estamos en vista cronológica o se desea filtrar por día) */}
        <div style={{
          display: 'flex',
          background: 'var(--bg-surface)',
          padding: '8px 24px',
          gap: '8px',
          borderBottom: '1px solid var(--border-subtle)',
          overflowX: 'auto',
          alignItems: 'center'
        }}>
          <button
            onClick={() => setSelectedDay(0)}
            className={`btn btn-sm ${selectedDay === 0 ? 'btn-primary' : 'btn-secondary'}`}
            style={{ minWidth: '120px', fontWeight: selectedDay === 0 ? 800 : 500 }}
          >
            Toda la Semana
          </button>
          {DAYS.map(day => {
            const countThisDay = mySchedules.filter(s => s.dayOfWeek === day.id).length;
            return (
              <button
                key={day.id}
                onClick={() => setSelectedDay(day.id)}
                className={`btn btn-sm ${selectedDay === day.id ? 'btn-primary' : 'btn-secondary'}`}
                style={{ minWidth: '95px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
              >
                <span>{day.name}</span>
                {countThisDay > 0 && (
                  <span style={{
                    fontSize: '0.7rem',
                    padding: '1px 5px',
                    borderRadius: '999px',
                    background: selectedDay === day.id ? 'rgba(255,255,255,0.25)' : 'rgba(79, 70, 229, 0.15)',
                    color: selectedDay === day.id ? '#fff' : '#4f46e5'
                  }}>
                    {countThisDay}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Formulario Desplegable para Agregar Bloque */}
        {showAddForm && (
          <div style={{
            padding: '20px 24px',
            background: 'var(--bg-surface)',
            borderBottom: '2px solid #4f46e5',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Plus size={18} color="#4f46e5" />
                <h4 style={{ fontSize: '0.95rem', fontWeight: 800, margin: 0 }}>
                  Nuevo Bloque de Lección
                </h4>
              </div>
              <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                Completa los datos para asignar el horario
              </span>
            </div>

            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: '14px',
              alignItems: 'start'
            }}>
              {/* 1. Selector de Sección */}
              <div>
                <label style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-main)', display: 'block', marginBottom: '6px' }}>
                  1. Grupo o Sección:
                </label>
                <select
                  value={addFormGroupId}
                  onChange={(e) => handleGroupChangeInAdd(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: '8px',
                    border: '1px solid var(--border-subtle)',
                    background: 'var(--bg-card)',
                    color: 'var(--text-main)',
                    fontSize: '0.85rem',
                    fontWeight: 600
                  }}
                >
                  {myGroups.map(grp => (
                    <option key={grp.id} value={grp.id}>
                      Sección {grp.sectionCode} {grp.groupName ? `(${grp.groupName})` : ''}
                    </option>
                  ))}
                </select>
              </div>

              {/* 2. Selector de Materia */}
              <div>
                <label style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-main)', display: 'block', marginBottom: '6px' }}>
                  2. Materia a Impartir:
                </label>
                <select
                  value={addFormSubjectId}
                  onChange={(e) => setAddFormSubjectId(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: '8px',
                    border: '1px solid var(--border-subtle)',
                    background: 'var(--bg-card)',
                    color: 'var(--text-main)',
                    fontSize: '0.85rem',
                    fontWeight: 600
                  }}
                >
                  {(availableSubjectsForSelectedGroup.length > 0 ? availableSubjectsForSelectedGroup : mySubjects).map(sub => (
                    <option key={sub.id} value={sub.id}>
                      {sub.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* 3. Día de la Semana */}
              <div>
                <label style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-main)', display: 'block', marginBottom: '6px' }}>
                  3. Día de la Semana:
                </label>
                <select
                  value={addFormDay}
                  onChange={(e) => setAddFormDay(Number(e.target.value))}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: '8px',
                    border: '1px solid var(--border-subtle)',
                    background: 'var(--bg-card)',
                    color: 'var(--text-main)',
                    fontSize: '0.85rem',
                    fontWeight: 600
                  }}
                >
                  {DAYS.map(d => (
                    <option key={d.id} value={d.id}>
                      {d.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* 4. Aula / Espacio */}
              <div>
                <label style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-main)', display: 'block', marginBottom: '6px' }}>
                  4. Aula / Laboratorio:
                </label>
                <input
                  type="text"
                  value={classroom}
                  onChange={(e) => setClassroom(e.target.value)}
                  placeholder="Ej. Aula 12, Laboratorio 2..."
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: '8px',
                    border: '1px solid var(--border-subtle)',
                    background: 'var(--bg-card)',
                    color: 'var(--text-main)',
                    fontSize: '0.85rem'
                  }}
                />
              </div>
            </div>

            {/* Horario & Presets de Lecciones MEP */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                <label style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-main)' }}>
                  Horario de la Lección:
                </label>
                <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                  Atajos de lecciones oficiales MEP:
                </span>
              </div>

              {/* Presets rápidos */}
              <div style={{ display: 'flex', gap: '6px', overflowX: 'auto', paddingBottom: '6px', marginBottom: '8px' }}>
                {MEP_PRESETS.map(p => (
                  <button
                    key={p.label}
                    type="button"
                    onClick={() => applyPreset(p.start, p.end)}
                    className="btn btn-secondary btn-sm"
                    style={{
                      fontSize: '0.72rem',
                      padding: '3px 8px',
                      background: startTime === p.start && endTime === p.end ? '#4f46e5' : undefined,
                      color: startTime === p.start && endTime === p.end ? 'white' : undefined
                    }}
                    title={p.time}
                  >
                    {p.label} ({p.start})
                  </button>
                ))}
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Desde:</span>
                  <input
                    type="time"
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    style={{
                      padding: '6px 10px',
                      borderRadius: '8px',
                      border: '1px solid var(--border-subtle)',
                      background: 'var(--bg-card)',
                      color: 'var(--text-main)',
                      fontSize: '0.85rem',
                      fontFamily: 'var(--font-mono)'
                    }}
                  />
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Hasta:</span>
                  <input
                    type="time"
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                    style={{
                      padding: '6px 10px',
                      borderRadius: '8px',
                      border: '1px solid var(--border-subtle)',
                      background: 'var(--bg-card)',
                      color: 'var(--text-main)',
                      fontSize: '0.85rem',
                      fontFamily: 'var(--font-mono)'
                    }}
                  />
                </div>

                <div style={{ marginLeft: 'auto', display: 'flex', gap: '8px' }}>
                  <button
                    type="button"
                    onClick={() => setShowAddForm(false)}
                    className="btn btn-secondary btn-sm"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    onClick={handleAddSchedule}
                    className="btn btn-primary btn-sm"
                    style={{ fontWeight: 800, padding: '8px 16px' }}
                  >
                    Guardar Bloque
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Contenido Principal de Lecciones según el Modo de Vista */}
        <div style={{ padding: '24px', overflowY: 'auto', flex: 1 }}>
          {filteredSchedules.length === 0 ? (
            <div style={{
              textAlign: 'center',
              padding: '48px 20px',
              color: 'var(--text-muted)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '12px'
            }}>
              <Calendar size={40} strokeWidth={1.5} color="var(--text-muted)" />
              <div>
                <h4 style={{ fontSize: '1rem', fontWeight: 700, margin: '0 0 4px 0', color: 'var(--text-main)' }}>
                  No hay lecciones que coincidan con los filtros
                </h4>
                <p style={{ fontSize: '0.82rem', margin: 0 }}>
                  Intenta cambiar el día, seleccionar otra sección o haz clic en "Agregar Bloque" para crear una nueva clase.
                </p>
              </div>
              <button
                onClick={() => setShowAddForm(true)}
                className="btn btn-primary btn-sm"
                style={{ marginTop: '8px' }}
              >
                <Plus size={15} />
                Agregar Lección Ahora
              </button>
            </div>
          ) : (
            <>
              {/* VISTA 1: CRONOLÓGICA (Día / Semana) */}
              {viewMode === 'timeline' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {filteredSchedules.map(sch => {
                    const group = groups.find(g => g.id === sch.groupId);
                    const subject = subjects.find(s => s.id === sch.subjectId);
                    const asg = assignments.find(a => a.groupId === sch.groupId && a.subjectId === sch.subjectId);
                    const dayObj = DAYS.find(d => d.id === sch.dayOfWeek);

                    return (
                      <div
                        key={sch.id}
                        className="glass-panel"
                        style={{
                          padding: '16px 20px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: '16px',
                          borderLeft: `4px solid ${subject?.color || '#4f46e5'}`,
                          transition: 'transform 0.15s ease'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                          {/* Hora y Día */}
                          <div style={{
                            padding: '10px 14px',
                            background: 'var(--bg-surface)',
                            borderRadius: '12px',
                            border: '1px solid var(--border-subtle)',
                            textAlign: 'center',
                            minWidth: '95px'
                          }}>
                            {selectedDay === 0 && (
                              <div style={{ fontSize: '0.7rem', fontWeight: 800, color: '#4f46e5', textTransform: 'uppercase' }}>
                                {dayObj?.name}
                              </div>
                            )}
                            <div style={{ fontWeight: 800, fontSize: '0.95rem', color: 'var(--text-main)', fontFamily: 'var(--font-mono)' }}>
                              {sch.startTime}
                            </div>
                            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                              {sch.endTime}
                            </div>
                          </div>

                          {/* Info Grupo y Materia */}
                          <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                              <span className="badge" style={{ background: '#4f46e5', color: 'white', fontWeight: 800 }}>
                                Sección {group?.sectionCode || 'N/A'}
                              </span>
                              {group?.groupName && (
                                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                  ({group.groupName})
                                </span>
                              )}
                              {sch.classroom && (
                                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                  <MapPin size={12} /> {sch.classroom}
                                </span>
                              )}
                            </div>
                            <div style={{ fontWeight: 800, fontSize: '1.05rem', marginTop: '4px', color: 'var(--text-main)' }}>
                              {subject?.name || 'Materia'}
                            </div>
                          </div>
                        </div>

                        {/* Botones de acción */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          {asg && (
                            <button
                              onClick={() => {
                                onStartEvaluatingClass(asg.id);
                                onClose();
                              }}
                              className="btn btn-primary btn-sm"
                              title="Evaluar asistencia y notas directamente"
                              style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 700 }}
                            >
                              <Play size={13} />
                              <span>Evaluar Clase</span>
                            </button>
                          )}
                          <button
                            onClick={() => handleDelete(sch.id)}
                            className="btn btn-ghost btn-sm"
                            style={{ color: '#ef4444', padding: '6px' }}
                            title="Eliminar bloque de horario"
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* VISTA 2: ORGANIZADO POR GRUPO / SECCIÓN */}
              {viewMode === 'by-group' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  {myGroups
                    .filter(g => filterGroupId === 'ALL' || g.id === filterGroupId)
                    .map(group => {
                      const groupSchedules = filteredSchedules.filter(s => s.groupId === group.id);
                      if (groupSchedules.length === 0) return null;

                      return (
                        <div
                          key={group.id}
                          className="glass-panel"
                          style={{
                            padding: '18px 20px',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '12px',
                            background: 'var(--bg-surface)'
                          }}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '10px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                              <span className="badge" style={{ background: '#4f46e5', color: 'white', fontWeight: 800, fontSize: '0.85rem' }}>
                                Sección {group.sectionCode}
                              </span>
                              <span style={{ fontWeight: 700, fontSize: '0.95rem' }}>
                                {group.groupName || `Grupo ${group.grade}° año`}
                              </span>
                            </div>
                            <span className="badge" style={{ background: 'rgba(79, 70, 229, 0.1)', color: '#4f46e5', fontWeight: 700 }}>
                              {groupSchedules.length} {groupSchedules.length === 1 ? 'lección' : 'lecciones'}
                            </span>
                          </div>

                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '10px' }}>
                            {groupSchedules.map(sch => {
                              const sub = subjects.find(s => s.id === sch.subjectId);
                              const asg = assignments.find(a => a.groupId === sch.groupId && a.subjectId === sch.subjectId);
                              const dayObj = DAYS.find(d => d.id === sch.dayOfWeek);

                              return (
                                <div
                                  key={sch.id}
                                  style={{
                                    padding: '12px 14px',
                                    borderRadius: '10px',
                                    background: 'var(--bg-main)',
                                    border: `1px solid ${sub?.color || 'var(--border-subtle)'}`,
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: '8px'
                                  }}
                                >
                                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                    <div>
                                      <div style={{ fontWeight: 800, fontSize: '0.9rem', color: 'var(--text-main)' }}>
                                        {sub?.name}
                                      </div>
                                      <div style={{ fontSize: '0.75rem', color: '#4f46e5', fontWeight: 700, marginTop: '2px' }}>
                                        {dayObj?.name} • {sch.startTime} - {sch.endTime}
                                      </div>
                                    </div>
                                    <button
                                      onClick={() => handleDelete(sch.id)}
                                      className="btn btn-ghost btn-sm"
                                      style={{ color: '#ef4444', padding: '2px' }}
                                    >
                                      <Trash2 size={13} />
                                    </button>
                                  </div>

                                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '4px' }}>
                                    {sch.classroom ? (
                                      <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                                        <MapPin size={11} style={{ display: 'inline', marginRight: '3px' }} />
                                        {sch.classroom}
                                      </span>
                                    ) : <span />}

                                    {asg && (
                                      <button
                                        onClick={() => {
                                          onStartEvaluatingClass(asg.id);
                                          onClose();
                                        }}
                                        className="btn btn-primary btn-sm"
                                        style={{ fontSize: '0.72rem', padding: '4px 8px' }}
                                      >
                                        <Play size={11} /> Evaluar
                                      </button>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                </div>
              )}

              {/* VISTA 3: ORGANIZADO POR MATERIA */}
              {viewMode === 'by-subject' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  {mySubjects
                    .filter(s => filterSubjectId === 'ALL' || s.id === filterSubjectId)
                    .map(subject => {
                      const subjectSchedules = filteredSchedules.filter(s => s.subjectId === subject.id);
                      if (subjectSchedules.length === 0) return null;

                      return (
                        <div
                          key={subject.id}
                          className="glass-panel"
                          style={{
                            padding: '18px 20px',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '12px',
                            background: 'var(--bg-surface)',
                            borderLeft: `4px solid ${subject.color || '#10b981'}`
                          }}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '10px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                              <span style={{
                                width: '12px',
                                height: '12px',
                                borderRadius: '50%',
                                background: subject.color || '#10b981'
                              }} />
                              <h3 style={{ margin: 0, fontWeight: 800, fontSize: '1.05rem' }}>
                                {subject.name}
                              </h3>
                            </div>
                            <span className="badge" style={{ background: 'rgba(16, 185, 129, 0.1)', color: '#10b981', fontWeight: 700 }}>
                              {subjectSchedules.length} {subjectSchedules.length === 1 ? 'lección' : 'lecciones'}
                            </span>
                          </div>

                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '10px' }}>
                            {subjectSchedules.map(sch => {
                              const group = groups.find(g => g.id === sch.groupId);
                              const asg = assignments.find(a => a.groupId === sch.groupId && a.subjectId === sch.subjectId);
                              const dayObj = DAYS.find(d => d.id === sch.dayOfWeek);

                              return (
                                <div
                                  key={sch.id}
                                  style={{
                                    padding: '12px 14px',
                                    borderRadius: '10px',
                                    background: 'var(--bg-main)',
                                    border: '1px solid var(--border-subtle)',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: '8px'
                                  }}
                                >
                                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                    <div>
                                      <span className="badge" style={{ background: '#4f46e5', color: 'white', fontWeight: 800, fontSize: '0.75rem' }}>
                                        Sección {group?.sectionCode}
                                      </span>
                                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600, marginTop: '4px' }}>
                                        {dayObj?.name} • {sch.startTime} - {sch.endTime}
                                      </div>
                                    </div>
                                    <button
                                      onClick={() => handleDelete(sch.id)}
                                      className="btn btn-ghost btn-sm"
                                      style={{ color: '#ef4444', padding: '2px' }}
                                    >
                                      <Trash2 size={13} />
                                    </button>
                                  </div>

                                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '4px' }}>
                                    {sch.classroom ? (
                                      <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                                        <MapPin size={11} style={{ display: 'inline', marginRight: '3px' }} />
                                        {sch.classroom}
                                      </span>
                                    ) : <span />}

                                    {asg && (
                                      <button
                                        onClick={() => {
                                          onStartEvaluatingClass(asg.id);
                                          onClose();
                                        }}
                                        className="btn btn-primary btn-sm"
                                        style={{ fontSize: '0.72rem', padding: '4px 8px' }}
                                      >
                                        <Play size={11} /> Evaluar
                                      </button>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div style={{
          padding: '14px 24px',
          borderTop: '1px solid var(--border-subtle)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          background: 'var(--bg-surface)'
        }}>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            Mostrando <strong>{filteredSchedules.length}</strong> de <strong>{mySchedules.length}</strong> lecciones programadas
          </div>
          <button onClick={onClose} className="btn btn-secondary">
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};
