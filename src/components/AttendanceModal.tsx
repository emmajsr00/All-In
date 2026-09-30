import React, { useState, useEffect } from 'react';
import {
  X,
  Calendar,
  CheckCircle,
  XCircle,
  Clock,
  FileCheck2,
  Users,
  Save,
  CheckCheck
} from 'lucide-react';
import type { Student, AttendanceRecord, AttendanceStatus } from '../types';
import { db } from '../db';

interface AttendanceModalProps {
  assignmentId: string;
  sectionCode: string;
  subjectName: string;
  students: Student[];
  onClose: () => void;
  onSaved: () => void;
}

export const AttendanceModal: React.FC<AttendanceModalProps> = ({
  assignmentId,
  sectionCode,
  subjectName,
  students,
  onClose,
  onSaved
}) => {
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [attendanceMap, setAttendanceMap] = useState<Record<string, AttendanceStatus>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Cargar asistencias de la fecha seleccionada
  useEffect(() => {
    async function loadAttendance() {
      setLoading(true);
      const records = await db.attendance
        .where('assignmentId')
        .equals(assignmentId)
        .filter(r => r.date === selectedDate)
        .toArray();

      const map: Record<string, AttendanceStatus> = {};
      // Inicializar por defecto en PRESENT si no hay registro previo
      students.forEach(s => {
        const found = records.find(r => r.studentId === s.id);
        map[s.id] = found ? found.status : 'PRESENT';
      });

      setAttendanceMap(map);
      setLoading(false);
    }
    loadAttendance();
  }, [assignmentId, selectedDate, students]);

  const cycleStatus = (studentId: string) => {
    setAttendanceMap(prev => {
      const current = prev[studentId] || 'PRESENT';
      let next: AttendanceStatus = 'PRESENT';
      if (current === 'PRESENT') next = 'UNEXCUSED_ABSENCE';
      else if (current === 'UNEXCUSED_ABSENCE') next = 'EXCUSED_ABSENCE';
      else if (current === 'EXCUSED_ABSENCE') next = 'TARDY';
      else if (current === 'TARDY') next = 'PRESENT';
      return { ...prev, [studentId]: next };
    });
  };

  const setSpecificStatus = (studentId: string, status: AttendanceStatus) => {
    setAttendanceMap(prev => ({ ...prev, [studentId]: status }));
  };

  const handleMarkAllPresent = () => {
    const updated: Record<string, AttendanceStatus> = {};
    students.forEach(s => { updated[s.id] = 'PRESENT'; });
    setAttendanceMap(updated);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      // Eliminar registros previos de este día y asignación
      const existing = await db.attendance
        .where('assignmentId')
        .equals(assignmentId)
        .filter(r => r.date === selectedDate)
        .toArray();
      
      if (existing.length > 0) {
        await db.attendance.bulkDelete(existing.map(e => e.id));
      }

      // Insertar nuevos registros
      const recordsToInsert: AttendanceRecord[] = students.map(s => ({
        id: `att-${assignmentId}-${s.id}-${selectedDate}`,
        assignmentId,
        studentId: s.id,
        date: selectedDate,
        status: attendanceMap[s.id] || 'PRESENT'
      }));

      await db.attendance.bulkAdd(recordsToInsert);
      onSaved();
      onClose();
    } finally {
      setSaving(false);
    }
  };

  // Contadores
  const total = students.length;
  const presentCount = Object.values(attendanceMap).filter(s => s === 'PRESENT').length;
  const unexcusedCount = Object.values(attendanceMap).filter(s => s === 'UNEXCUSED_ABSENCE').length;
  const excusedCount = Object.values(attendanceMap).filter(s => s === 'EXCUSED_ABSENCE').length;
  const tardyCount = Object.values(attendanceMap).filter(s => s === 'TARDY').length;

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.65)',
      backdropFilter: 'blur(6px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 100,
      padding: '20px'
    }}>
      <div className="glass-panel" style={{
        width: '100%',
        maxWidth: '850px',
        maxHeight: '92vh',
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
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '12px'
        }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Users size={20} color="#4f46e5" />
              <h2 style={{ fontSize: '1.25rem', fontWeight: 800 }}>
                Control de Asistencia Rápido
              </h2>
            </div>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              {sectionCode} • {subjectName}
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'var(--bg-surface)', padding: '6px 12px', borderRadius: '10px' }}>
              <Calendar size={16} color="#64748b" />
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                style={{
                  border: 'none',
                  background: 'transparent',
                  fontWeight: 700,
                  fontSize: '0.85rem',
                  color: 'var(--text-main)',
                  outline: 'none',
                  cursor: 'pointer'
                }}
              />
            </div>
            <button onClick={onClose} className="btn btn-secondary btn-sm" style={{ padding: '6px' }}>
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Stats summary banner */}
        <div style={{
          padding: '12px 24px',
          background: 'var(--bg-surface)',
          borderBottom: '1px solid var(--border-subtle)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '10px'
        }}>
          <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#16a34a' }}>
              ● {presentCount} Presentes
            </span>
            <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#dc2626' }}>
              ● {unexcusedCount} Injustificadas
            </span>
            <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#d97706' }}>
              ● {excusedCount} Justificadas
            </span>
            <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#4f46e5' }}>
              ● {tardyCount} Tardías
            </span>
          </div>

          <button onClick={handleMarkAllPresent} className="btn btn-secondary btn-sm">
            <CheckCheck size={14} color="#16a34a" />
            Marcar Todos Presentes
          </button>
        </div>

        {/* Student List */}
        <div style={{ padding: '20px 24px', overflowY: 'auto', flex: 1 }}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
              Cargando estudiantes...
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {students.map((student, idx) => {
                const status = attendanceMap[student.id] || 'PRESENT';

                return (
                  <div
                    key={student.id}
                    style={{
                      padding: '10px 14px',
                      borderRadius: '10px',
                      border: '1px solid var(--border-subtle)',
                      background: 'var(--bg-card)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '12px'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1 }}>
                      <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', width: '22px', fontWeight: 600 }}>
                        {idx + 1}.
                      </span>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>
                          {student.firstLastName} {student.secondLastName} {student.firstName}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                          Céd: {student.idNumber}
                        </div>
                      </div>
                    </div>

                    {/* Status badge and quick selector buttons */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <button
                        onClick={() => setSpecificStatus(student.id, 'PRESENT')}
                        className="btn btn-sm"
                        style={{
                          background: status === 'PRESENT' ? 'var(--badge-present-bg)' : 'transparent',
                          color: status === 'PRESENT' ? 'var(--badge-present-text)' : 'var(--text-muted)',
                          border: status === 'PRESENT' ? '1px solid #16a34a' : '1px solid transparent',
                          padding: '4px 8px'
                        }}
                        title="Presente"
                      >
                        <CheckCircle size={15} />
                        <span style={{ fontSize: '0.75rem', fontWeight: 700 }}>P</span>
                      </button>

                      <button
                        onClick={() => setSpecificStatus(student.id, 'UNEXCUSED_ABSENCE')}
                        className="btn btn-sm"
                        style={{
                          background: status === 'UNEXCUSED_ABSENCE' ? 'var(--badge-absent-bg)' : 'transparent',
                          color: status === 'UNEXCUSED_ABSENCE' ? 'var(--badge-absent-text)' : 'var(--text-muted)',
                          border: status === 'UNEXCUSED_ABSENCE' ? '1px solid #dc2626' : '1px solid transparent',
                          padding: '4px 8px'
                        }}
                        title="Ausencia Injustificada"
                      >
                        <XCircle size={15} />
                        <span style={{ fontSize: '0.75rem', fontWeight: 700 }}>AI</span>
                      </button>

                      <button
                        onClick={() => setSpecificStatus(student.id, 'EXCUSED_ABSENCE')}
                        className="btn btn-sm"
                        style={{
                          background: status === 'EXCUSED_ABSENCE' ? 'var(--badge-excused-bg)' : 'transparent',
                          color: status === 'EXCUSED_ABSENCE' ? 'var(--badge-excused-text)' : 'var(--text-muted)',
                          border: status === 'EXCUSED_ABSENCE' ? '1px solid #d97706' : '1px solid transparent',
                          padding: '4px 8px'
                        }}
                        title="Ausencia Justificada"
                      >
                        <FileCheck2 size={15} />
                        <span style={{ fontSize: '0.75rem', fontWeight: 700 }}>AJ</span>
                      </button>

                      <button
                        onClick={() => setSpecificStatus(student.id, 'TARDY')}
                        className="btn btn-sm"
                        style={{
                          background: status === 'TARDY' ? 'var(--badge-tardy-bg)' : 'transparent',
                          color: status === 'TARDY' ? 'var(--badge-tardy-text)' : 'var(--text-muted)',
                          border: status === 'TARDY' ? '1px solid #4f46e5' : '1px solid transparent',
                          padding: '4px 8px'
                        }}
                        title="Tardía"
                      >
                        <Clock size={15} />
                        <span style={{ fontSize: '0.75rem', fontWeight: 700 }}>T</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{
          padding: '16px 24px',
          borderTop: '1px solid var(--border-subtle)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            Se guarda automáticamente en tu base de datos local (Offline).
          </span>
          <div style={{ display: 'flex', gap: '12px' }}>
            <button onClick={onClose} className="btn btn-secondary">
              Cerrar
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="btn btn-primary"
              style={{ minWidth: '150px' }}
            >
              <Save size={16} />
              {saving ? 'Guardando...' : 'Guardar Asistencia'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
