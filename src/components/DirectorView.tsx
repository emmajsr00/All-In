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
  AlertCircle
} from 'lucide-react';
import type { Group, Subject, TeacherAssignment, User, Student, EvaluationConfig, UserRole } from '../types';
import { db } from '../db';

interface DirectorViewProps {
  institutionId: string;
  institutionName: string;
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
  const [activeTab, setActiveTab] = useState<'SECTIONS' | 'STAFF'>('SECTIONS');
  const [isAddStaffOpen, setIsAddStaffOpen] = useState(false);
  const [staffName, setStaffName] = useState('');
  const [staffEmail, setStaffEmail] = useState('');
  const [staffPassword, setStaffPassword] = useState('123');
  const [staffRole, setStaffRole] = useState<'TEACHER' | 'ADMIN'>('TEACHER');
  const [staffTitle, setStaffTitle] = useState('');
  const [staffError, setStaffError] = useState<string | null>(null);

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
              <Building2 size={12} /> Panel de Dirección y Supervisión Académica
            </div>
            <h1 style={{ fontSize: '1.6rem', fontWeight: 800 }}>
              Supervisión Global: {institutionName}
            </h1>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginTop: '4px' }}>
              Acceso directivo para auditar notas, verificar porcentajes de asistencia y supervisar todas las secciones del centro educativo.
            </p>
          </div>

          <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
            <div style={{ background: 'var(--bg-card)', padding: '10px 18px', borderRadius: '12px', border: '1px solid var(--border-subtle)', textAlign: 'center' }}>
              <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#4f46e5' }}>{groups.length}</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Secciones Totales</div>
            </div>
            <div style={{ background: 'var(--bg-card)', padding: '10px 18px', borderRadius: '12px', border: '1px solid var(--border-subtle)', textAlign: 'center' }}>
              <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#06b6d4' }}>{teachers.length}</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Docentes</div>
            </div>
            <div style={{ background: 'var(--bg-card)', padding: '10px 18px', borderRadius: '12px', border: '1px solid var(--border-subtle)', textAlign: 'center' }}>
              <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#10b981' }}>{students.length}</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Estudiantes</div>
            </div>

            <button
              onClick={() => setIsAddStaffOpen(true)}
              className="btn btn-primary"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '10px 16px',
                borderRadius: '12px',
                fontWeight: 700,
                fontSize: '0.84rem',
                background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)'
              }}
            >
              <UserPlus size={16} />
              <span>+ Registrar Personal</span>
            </button>
          </div>
        </div>
      </div>

      {/* Selector de Pestañas de Dirección */}
      <div style={{ display: 'flex', gap: '8px', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '12px' }}>
        <button
          onClick={() => setActiveTab('SECTIONS')}
          className={`btn ${activeTab === 'SECTIONS' ? 'btn-primary' : 'btn-secondary'} btn-sm`}
          style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 700 }}
        >
          <TrendingUp size={16} />
          <span>Supervisión de Secciones ({assignments.length})</span>
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

      {/* PESTAÑA 1: SECCIONES Y ASIGNATURAS */}
      {activeTab === 'SECTIONS' && (
      <div>
        <h2 style={{ fontSize: '1.2rem', fontWeight: 800, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <TrendingUp size={20} color="#4f46e5" />
          Rendimiento por Sección y Asignatura
        </h2>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '20px' }}>
          {assignments.map(asg => {
            const group = groups.find(g => g.id === asg.groupId);
            const subject = subjects.find(s => s.id === asg.subjectId);
            const teacher = teachers.find(t => t.id === asg.teacherId);
            const sectionStudents = students.filter(s => s.groupId === asg.groupId);
            const config = evaluationConfigs.find(c => c.assignmentId === asg.id);

            // Métricas calculadas para supervisión
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

                {/* Teacher in charge */}
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

                {/* Indicators summary */}
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

                {/* Action button */}
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

      {/* PESTAÑA 2: PERSONAL DE LA INSTITUCIÓN */}
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

      {/* MODAL REGISTRAR PERSONAL (Docente o Admin únicamente) */}
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
