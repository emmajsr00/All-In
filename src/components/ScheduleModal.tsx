import React, { useState } from 'react';
import {
  X,
  Clock,
  Calendar,
  Plus,
  Play,
  MapPin,
  Trash2,
  Sparkles
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
  { id: 1, name: 'Lunes' },
  { id: 2, name: 'Martes' },
  { id: 3, name: 'Miércoles' },
  { id: 4, name: 'Jueves' },
  { id: 5, name: 'Viernes' }
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
  const [selectedDay, setSelectedDay] = useState<number>(1);
  const [showAddForm, setShowAddForm] = useState(false);
  const [selectedAssignmentId, setSelectedAssignmentId] = useState(assignments[0]?.id || '');
  const [startTime, setStartTime] = useState('07:00');
  const [endTime, setEndTime] = useState('08:20');
  const [classroom, setClassroom] = useState('Aula 12');

  const filteredSchedules = schedules.filter(s => s.dayOfWeek === selectedDay);

  const handleAddSchedule = async () => {
    const asg = assignments.find(a => a.id === selectedAssignmentId);
    if (!asg) return;

    const newItem: ScheduleItem = {
      id: `sch-${Date.now()}`,
      teacherId,
      groupId: asg.groupId,
      subjectId: asg.subjectId,
      dayOfWeek: selectedDay as 1 | 2 | 3 | 4 | 5,
      startTime,
      endTime,
      classroom
    };

    await db.schedules.add(newItem);
    onRefreshSchedules();
    setShowAddForm(false);
  };

  const handleDelete = async (id: string) => {
    await db.schedules.delete(id);
    onRefreshSchedules();
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.7)',
      backdropFilter: 'blur(8px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 100,
      padding: '20px'
    }}>
      <div className="glass-panel" style={{
        width: '100%',
        maxWidth: '850px',
        maxHeight: '90vh',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden'
      }}>
        {/* Header */}
        <div style={{
          padding: '20px 24px',
          borderBottom: '1px solid var(--border-subtle)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Clock size={22} color="#4f46e5" />
              <h2 style={{ fontSize: '1.25rem', fontWeight: 800 }}>
                Horario Semanal Inteligente
              </h2>
            </div>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              Al llegar la hora asignada, el sistema activa automáticamente la clase en curso.
            </p>
          </div>
          <button onClick={onClose} className="btn btn-secondary btn-sm" style={{ padding: '6px' }}>
            <X size={18} />
          </button>
        </div>

        {/* Day selection tabs */}
        <div style={{
          display: 'flex',
          background: 'var(--bg-surface)',
          padding: '8px 24px',
          gap: '8px',
          borderBottom: '1px solid var(--border-subtle)',
          overflowX: 'auto'
        }}>
          {DAYS.map(day => (
            <button
              key={day.id}
              onClick={() => setSelectedDay(day.id)}
              className={`btn btn-sm ${selectedDay === day.id ? 'btn-primary' : 'btn-secondary'}`}
              style={{ minWidth: '90px' }}
            >
              {day.name}
            </button>
          ))}
          <div style={{ marginLeft: 'auto' }}>
            <button
              onClick={() => setShowAddForm(!showAddForm)}
              className="btn btn-secondary btn-sm"
            >
              <Plus size={14} />
              Agregar Bloque
            </button>
          </div>
        </div>

        {/* Add Schedule Form */}
        {showAddForm && (
          <div style={{
            padding: '16px 24px',
            background: 'var(--bg-main)',
            borderBottom: '1px solid var(--border-subtle)',
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
            gap: '12px',
            alignItems: 'end'
          }}>
            <div>
              <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)' }}>
                Sección y Materia:
              </label>
              <select
                value={selectedAssignmentId}
                onChange={(e) => setSelectedAssignmentId(e.target.value)}
                style={{ width: '100%', padding: '6px 10px', borderRadius: '8px', border: '1px solid var(--border-subtle)', background: 'var(--bg-card)', color: 'var(--text-main)', fontSize: '0.85rem' }}
              >
                {assignments.map(a => {
                  const grp = groups.find(g => g.id === a.groupId);
                  const sub = subjects.find(s => s.id === a.subjectId);
                  return (
                    <option key={a.id} value={a.id}>
                      {grp?.sectionCode} - {sub?.name}
                    </option>
                  );
                })}
              </select>
            </div>

            <div>
              <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)' }}>
                Hora Inicio:
              </label>
              <input
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                style={{ width: '100%', padding: '6px 10px', borderRadius: '8px', border: '1px solid var(--border-subtle)', background: 'var(--bg-card)', color: 'var(--text-main)', fontSize: '0.85rem' }}
              />
            </div>

            <div>
              <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)' }}>
                Hora Fin:
              </label>
              <input
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                style={{ width: '100%', padding: '6px 10px', borderRadius: '8px', border: '1px solid var(--border-subtle)', background: 'var(--bg-card)', color: 'var(--text-main)', fontSize: '0.85rem' }}
              />
            </div>

            <div>
              <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)' }}>
                Aula / Laboratorio:
              </label>
              <input
                type="text"
                value={classroom}
                onChange={(e) => setClassroom(e.target.value)}
                placeholder="Lab 2, Aula 12..."
                style={{ width: '100%', padding: '6px 10px', borderRadius: '8px', border: '1px solid var(--border-subtle)', background: 'var(--bg-card)', color: 'var(--text-main)', fontSize: '0.85rem' }}
              />
            </div>

            <button onClick={handleAddSchedule} className="btn btn-primary btn-sm" style={{ height: '36px' }}>
              Guardar Bloque
            </button>
          </div>
        )}

        {/* Blocks list */}
        <div style={{ padding: '24px', overflowY: 'auto', flex: 1 }}>
          {filteredSchedules.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
              No hay lecciones programadas para este día. Haz clic en "Agregar Bloque" para crear una.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {filteredSchedules.map(sch => {
                const group = groups.find(g => g.id === sch.groupId);
                const subject = subjects.find(s => s.id === sch.subjectId);
                const asg = assignments.find(a => a.groupId === sch.groupId && a.subjectId === sch.subjectId);

                return (
                  <div
                    key={sch.id}
                    className="glass-panel"
                    style={{
                      padding: '16px 20px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '16px'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                      <div style={{
                        padding: '10px 14px',
                        background: 'var(--bg-surface)',
                        borderRadius: '12px',
                        border: '1px solid var(--border-subtle)',
                        textAlign: 'center',
                        fontFamily: 'var(--font-mono)'
                      }}>
                        <div style={{ fontWeight: 800, fontSize: '0.95rem', color: '#4f46e5' }}>
                          {sch.startTime}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                          {sch.endTime}
                        </div>
                      </div>

                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span className="badge" style={{ background: '#4f46e5', color: 'white' }}>
                            Sección {group?.sectionCode}
                          </span>
                          {sch.classroom && (
                            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                              <MapPin size={12} /> {sch.classroom}
                            </span>
                          )}
                        </div>
                        <div style={{ fontWeight: 700, fontSize: '1rem', marginTop: '4px' }}>
                          {subject?.name}
                        </div>
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      {asg && (
                        <button
                          onClick={() => {
                            onStartEvaluatingClass(asg.id);
                            onClose();
                          }}
                          className="btn btn-primary btn-sm"
                          title="Iniciar evaluación directa de esta clase"
                        >
                          <Play size={13} />
                          Evaluar Clase
                        </button>
                      )}
                      <button
                        onClick={() => handleDelete(sch.id)}
                        className="btn btn-secondary btn-sm"
                        style={{ color: '#ef4444' }}
                        title="Eliminar bloque de horario"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ padding: '16px 24px', borderTop: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'flex-end' }}>
          <button onClick={onClose} className="btn btn-secondary">
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};
