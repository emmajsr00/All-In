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
  Info
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
  const [selectedTeacherId, setSelectedTeacherId] = useState<string>(teachers[0]?.id || '');
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>('');
  const [selectedSectionForClick, setSelectedSectionForClick] = useState<{
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

  const selectedTeacher = teachers.find(t => t.id === selectedTeacherId) || teachers[0];

  // Asignaciones del profesor seleccionado
  const teacherAssignments = selectedTeacher
    ? assignments.filter(a => a.teacherId === selectedTeacher.id)
    : [];

  // Materias únicas que imparte este profesor
  const distinctSubjectIds = Array.from(new Set(teacherAssignments.map(a => a.subjectId)));
  const distinctSubjects = subjects.filter(s => distinctSubjectIds.includes(s.id));

  // Determinar si es monomateria (ej. Secundaria / Colegio) o multimateria (ej. Primaria / Escuela)
  const isSingleSubject = distinctSubjects.length <= 1;
  const activeSubject = isSingleSubject
    ? distinctSubjects[0]
    : distinctSubjects.find(s => s.id === selectedSubjectId) || distinctSubjects[0];

  // Secciones asignadas para la materia activa
  const availableAssignments = activeSubject
    ? teacherAssignments.filter(a => a.subjectId === activeSubject.id)
    : teacherAssignments;

  // Horario del docente seleccionado
  const currentTeacherSchedules = selectedTeacher
    ? schedules.filter(s => s.teacherId === selectedTeacher.id)
    : [];

  // Manejar asignación a un bloque
  const handleAssignToSlot = async (
    dayOfWeek: 1 | 2 | 3 | 4 | 5,
    startTime: string,
    endTime: string,
    groupId: string,
    subjectId: string
  ) => {
    if (!selectedTeacher) return;

    // Si ya existe un bloque en ese horario para ese docente, se reemplaza
    const existing = currentTeacherSchedules.find(
      s => s.dayOfWeek === dayOfWeek && s.startTime === startTime
    );
    if (existing) {
      await db.schedules.delete(existing.id);
    }

    const grp = groups.find(g => g.id === groupId);
    const defaultAula = classroomInput.trim() || (grp ? `Aula ${grp.sectionCode}` : 'Aula Principal');

    const newItem: ScheduleItem = {
      id: `sch-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      teacherId: selectedTeacher.id,
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

  // Manejar eliminación de bloque
  const handleDeleteSlot = async (scheduleId: string) => {
    await db.schedules.delete(scheduleId);
    if (onDataChanged) onDataChanged();
  };

  // Vaciar horario del profesor
  const handleClearAll = async () => {
    if (!selectedTeacher) return;
    if (window.confirm(`¿Estás seguro de vaciar todo el horario semanal para ${selectedTeacher.name}?`)) {
      const toDelete = currentTeacherSchedules.map(s => s.id);
      for (const id of toDelete) {
        await db.schedules.delete(id);
      }
      if (onDataChanged) onDataChanged();
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Top Header & Selector de Docente */}
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
            <h2 style={{ fontSize: '1.2rem', fontWeight: 800, margin: 0 }}>
              Creador de Horarios por Docente
            </h2>
            <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', margin: '3px 0 0 0' }}>
              Arrastra o selecciona las secciones para ubicarlas en la matriz semanal de lecciones.
            </p>
          </div>
        </div>

        {/* Selector de Profesor */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <label style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-main)' }}>
              Docente a Programar:
            </label>
            <select
              value={selectedTeacher?.id || ''}
              onChange={(e) => {
                setSelectedTeacherId(e.target.value);
                setSelectedSectionForClick(null);
                setSelectedSubjectId('');
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

          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              type="button"
              onClick={() => window.print()}
              className="btn btn-secondary btn-sm"
              style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
              title="Imprimir horario o guardar en PDF"
            >
              <Printer size={15} />
              <span>Imprimir Horario</span>
            </button>
            {currentTeacherSchedules.length > 0 && (
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

      {/* Panel Principal: Selector de Materia / Secciones + Matriz Semanal */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(280px, 320px) 1fr', gap: '20px' }}>
        
        {/* COLUMNA IZQUIERDA: PALETA DE SECCIONES ASIGNADAS */}
        <div className="glass-panel no-print" style={{
          padding: '20px',
          display: 'flex',
          flexDirection: 'column',
          gap: '16px',
          height: 'fit-content'
        }}>
          <div>
            <div style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Carga del Profesor
            </div>
            <h3 style={{ fontSize: '1.05rem', fontWeight: 800, margin: '4px 0 0 0' }}>
              {selectedTeacher?.name}
            </h3>
            <div style={{ fontSize: '0.8rem', color: '#4f46e5', fontWeight: 600, marginTop: '2px' }}>
              {currentTeacherSchedules.length} lecciones programadas en la semana
            </div>
          </div>

          {/* CASO: Docente Multimateria (Escuela / Primaria) vs Monomateria (Secundaria) */}
          {!isSingleSubject ? (
            <div>
              <label style={{ fontSize: '0.8rem', fontWeight: 700, display: 'block', marginBottom: '8px' }}>
                1. Selecciona la Materia a impartir:
              </label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {distinctSubjects.map(sub => {
                  const isSubActive = activeSubject?.id === sub.id;
                  const countForSub = teacherAssignments.filter(a => a.subjectId === sub.id).length;
                  return (
                    <button
                      key={sub.id}
                      type="button"
                      onClick={() => {
                        setSelectedSubjectId(sub.id);
                        setSelectedSectionForClick(null);
                      }}
                      style={{
                        padding: '10px 12px',
                        borderRadius: '10px',
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
                        <span style={{
                          width: '10px',
                          height: '10px',
                          borderRadius: '50%',
                          background: sub.color || '#4f46e5'
                        }}></span>
                        <span style={{ fontWeight: isSubActive ? 800 : 600, fontSize: '0.85rem' }}>
                          {sub.name}
                        </span>
                      </div>
                      <span className="badge" style={{ fontSize: '0.72rem' }}>
                        {countForSub} {countForSub === 1 ? 'grupo' : 'grupos'}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          ) : (
            <div style={{
              background: 'var(--bg-main)',
              padding: '12px',
              borderRadius: '10px',
              border: '1px solid var(--border-subtle)'
            }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Materia Asignada:</span>
              <div style={{ fontWeight: 800, fontSize: '0.95rem', color: activeSubject?.color || '#4f46e5', marginTop: '2px' }}>
                {activeSubject?.name || 'Sin materia asignada'}
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                Especialidad de materia única
              </div>
            </div>
          )}

          {/* SECCIONES DISPONIBLES PARA ARRASTRAR O CLIC */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <label style={{ fontSize: '0.8rem', fontWeight: 700 }}>
                {!isSingleSubject ? '2. Secciones Asignadas:' : 'Secciones a Programar:'}
              </label>
              <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                Arrastra a la hora
              </span>
            </div>

            {availableAssignments.length === 0 ? (
              <div style={{ padding: '16px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.82rem', background: 'var(--bg-main)', borderRadius: '10px' }}>
                Este docente no tiene secciones asignadas en esta materia. Asigna secciones en la pestaña de Gestión Académica.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {availableAssignments.map(asg => {
                  const grp = groups.find(g => g.id === asg.groupId);
                  const sub = subjects.find(s => s.id === asg.subjectId) || activeSubject;
                  const groupCode = grp?.groupName || `Sección ${grp?.sectionCode || 'N/A'}`;
                  const subjectName = sub?.name || 'Materia';

                  const countScheduled = currentTeacherSchedules.filter(
                    s => s.groupId === asg.groupId && s.subjectId === asg.subjectId
                  ).length;

                  const isSelected = selectedSectionForClick?.groupId === asg.groupId &&
                                     selectedSectionForClick?.subjectId === asg.subjectId;

                  const itemPayload = {
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
                        setDraggedItem(itemPayload);
                        e.dataTransfer.setData('application/json', JSON.stringify(itemPayload));
                      }}
                      onDragEnd={() => setDraggedItem(null)}
                      onClick={() => {
                        if (isSelected) {
                          setSelectedSectionForClick(null);
                        } else {
                          setSelectedSectionForClick(itemPayload);
                        }
                      }}
                      style={{
                        padding: '12px 14px',
                        borderRadius: '12px',
                        border: `2px solid ${isSelected ? '#4f46e5' : 'var(--border-subtle)'}`,
                        background: isSelected ? 'rgba(79, 70, 229, 0.1)' : 'var(--bg-main)',
                        cursor: 'grab',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '10px',
                        transition: 'all 0.15s ease',
                        boxShadow: isSelected ? '0 0 0 2px rgba(79, 70, 229, 0.2)' : 'none'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <GripVertical size={16} color="var(--text-muted)" style={{ cursor: 'grab' }} />
                        <div>
                          <div style={{ fontWeight: 800, fontSize: '0.9rem', color: 'var(--text-main)' }}>
                            {groupCode}
                          </div>
                          <div style={{ fontSize: '0.74rem', color: sub?.color || '#4f46e5', fontWeight: 600 }}>
                            {subjectName}
                          </div>
                        </div>
                      </div>

                      <div style={{ textAlign: 'right' }}>
                        <span className="badge" style={{
                          background: countScheduled > 0 ? 'rgba(16, 185, 129, 0.15)' : 'var(--bg-surface)',
                          color: countScheduled > 0 ? '#10b981' : 'var(--text-muted)',
                          fontSize: '0.72rem',
                          fontWeight: 700
                        }}>
                          {countScheduled} lec.
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

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
              <strong>Tip:</strong> Puedes arrastrar cada sección con el mouse o hacer clic en ella y luego hacer clic en cualquier celda del horario para ubicarla.
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
                Horario Semanal: {selectedTeacher?.name}
              </h2>
            </div>
            <div style={{ textAlign: 'right' }}>
              <span className="badge" style={{ background: '#4f46e5', color: 'white', fontWeight: 800 }}>
                {currentTeacherSchedules.length} Lecciones Semanales
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
                  // Ver si hay receso después de este bloque
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
                          const existingSlot = currentTeacherSchedules.find(
                            s => s.dayOfWeek === day.dayOfWeek && s.startTime === slot.startTime
                          );

                          const slotGroup = existingSlot ? groups.find(g => g.id === existingSlot.groupId) : null;
                          const slotSubject = existingSlot ? subjects.find(s => s.id === existingSlot.subjectId) : null;

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
                                if (selectedSectionForClick && !existingSlot) {
                                  handleAssignToSlot(
                                    day.dayOfWeek,
                                    slot.startTime,
                                    slot.endTime,
                                    selectedSectionForClick.groupId,
                                    selectedSectionForClick.subjectId
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
                                  : selectedSectionForClick
                                  ? 'rgba(79, 70, 229, 0.03)'
                                  : 'transparent',
                                cursor: selectedSectionForClick && !existingSlot ? 'pointer' : 'default',
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
                                  {/* Botón Eliminar lección */}
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
                                  {selectedSectionForClick ? (
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

                      {/* Fila Visual de Receso / Almuerzo */}
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
