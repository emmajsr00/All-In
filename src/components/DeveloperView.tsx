import React, { useState } from 'react';
import {
  ShieldCheck,
  Building2,
  Users,
  GraduationCap,
  Plus,
  ArrowRight,
  UserPlus,
  Sparkles,
  BookOpen,
  CheckCircle,
  AlertCircle,
  X,
  Mail,
  Lock,
  Briefcase
} from 'lucide-react';
import type { Institution, User, Group, Student, UserRole } from '../types';
import { db } from '../db';

interface DeveloperViewProps {
  allInstitutions: Institution[];
  allUsers: User[];
  groups: Group[];
  students: Student[];
  onSelectInstitution: (institutionId: string) => void;
  onDataChanged: () => void;
}

export const DeveloperView: React.FC<DeveloperViewProps> = ({
  allInstitutions,
  allUsers,
  groups,
  students,
  onSelectInstitution,
  onDataChanged
}) => {
  const [activeTab, setActiveTab] = useState<'INSTITUTIONS' | 'USERS'>('INSTITUTIONS');

  // Modales
  const [isAddInstitutionOpen, setIsAddInstitutionOpen] = useState(false);
  const [isAddUserOpen, setIsAddUserOpen] = useState(false);

  // Formulario Nueva Institución
  const [instName, setInstName] = useState('');
  const [instCode, setInstCode] = useState('');
  const [instType, setInstType] = useState<'COLLEGE' | 'INDEPENDENT'>('COLLEGE');
  const [instCircuit, setInstCircuit] = useState('');
  const [instRegional, setInstRegional] = useState('');

  // Formulario Nuevo Usuario
  const [userName, setUserName] = useState('');
  const [userEmail, setUserEmail] = useState('');
  const [userPassword, setUserPassword] = useState('123');
  const [userRole, setUserRole] = useState<UserRole>('DIRECTOR');
  const [userInstitutionId, setUserInstitutionId] = useState<string>(allInstitutions[0]?.id || '');
  const [userTitle, setUserTitle] = useState('');
  const [userError, setUserError] = useState<string | null>(null);

  const handleCreateInstitution = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!instName.trim() || !instCode.trim()) return;

    const newInst: Institution = {
      id: `inst-${Date.now()}`,
      name: instName.trim(),
      code: instCode.trim(),
      type: instType,
      circuit: instCircuit.trim() || undefined,
      regionalDirection: instRegional.trim() || undefined,
      createdAt: new Date().toISOString()
    };

    await db.institutions.add(newInst);
    setIsAddInstitutionOpen(false);
    setInstName('');
    setInstCode('');
    setInstCircuit('');
    setInstRegional('');
    onDataChanged();
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setUserError(null);

    const cleanEmail = userEmail.trim().toLowerCase();
    if (!userName.trim() || !cleanEmail) {
      setUserError('Completa todos los campos obligatorios.');
      return;
    }

    // Verificar si el correo ya existe
    const exists = allUsers.some(u => u.email.toLowerCase() === cleanEmail);
    if (exists) {
      setUserError('Ya existe un usuario con este correo electrónico.');
      return;
    }

    const newUser: User = {
      id: `user-${Date.now()}`,
      name: userName.trim(),
      email: cleanEmail,
      password: userPassword.trim() || '123',
      role: userRole,
      institutionId: userInstitutionId,
      title: userTitle.trim() || undefined
    };

    await db.users.add(newUser);
    setIsAddUserOpen(false);
    setUserName('');
    setUserEmail('');
    setUserPassword('123');
    setUserTitle('');
    onDataChanged();
  };

  const directorCount = allUsers.filter(u => u.role === 'DIRECTOR').length;
  const teacherCount = allUsers.filter(u => u.role === 'TEACHER').length;
  const adminCount = allUsers.filter(u => u.role === 'ADMIN').length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Banner Principal del Desarrollador */}
      <div className="glass-panel" style={{
        padding: '24px',
        background: 'linear-gradient(135deg, rgba(124, 58, 237, 0.15) 0%, rgba(79, 70, 229, 0.1) 100%)',
        border: '1px solid rgba(124, 58, 237, 0.3)',
        borderRadius: '18px'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <div className="badge" style={{
              background: 'rgba(124, 58, 237, 0.25)',
              color: '#7c3aed',
              fontWeight: 800,
              marginBottom: '8px',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px'
            }}>
              <Sparkles size={13} />
              <span>Panel Maestro • Modo Desarrollador ALL-IN</span>
            </div>
            <h1 style={{ fontSize: '1.65rem', fontWeight: 900, margin: '2px 0 6px 0', color: 'var(--text-main)' }}>
              Centro de Control Global
            </h1>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem', margin: 0, maxWidth: '650px' }}>
              Desde este perfil tienes visibilidad y administración completa de todas las instituciones, directores, docentes y grupos creados en la plataforma.
            </p>
          </div>

          {/* Botones de Acción Global */}
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            <button
              onClick={() => setIsAddInstitutionOpen(true)}
              className="btn btn-secondary"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '9px 16px',
                borderRadius: '10px',
                fontWeight: 700
              }}
            >
              <Building2 size={16} />
              <span>+ Nueva Institución</span>
            </button>

            <button
              onClick={() => setIsAddUserOpen(true)}
              className="btn btn-primary"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '9px 16px',
                borderRadius: '10px',
                fontWeight: 700,
                background: 'linear-gradient(135deg, #7c3aed 0%, #4f46e5 100%)'
              }}
            >
              <UserPlus size={16} />
              <span>+ Crear Usuario</span>
            </button>
          </div>
        </div>

        {/* Métricas Globales */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: '12px',
          marginTop: '22px'
        }}>
          <div style={{ background: 'var(--bg-card)', padding: '12px 16px', borderRadius: '12px', border: '1px solid var(--border-subtle)' }}>
            <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)' }}>Instituciones</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 900, color: '#7c3aed' }}>{allInstitutions.length}</div>
          </div>
          <div style={{ background: 'var(--bg-card)', padding: '12px 16px', borderRadius: '12px', border: '1px solid var(--border-subtle)' }}>
            <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)' }}>Directores</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 900, color: '#4f46e5' }}>{directorCount}</div>
          </div>
          <div style={{ background: 'var(--bg-card)', padding: '12px 16px', borderRadius: '12px', border: '1px solid var(--border-subtle)' }}>
            <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)' }}>Docentes</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 900, color: '#10b981' }}>{teacherCount}</div>
          </div>
          <div style={{ background: 'var(--bg-card)', padding: '12px 16px', borderRadius: '12px', border: '1px solid var(--border-subtle)' }}>
            <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)' }}>Secciones / Grupos</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 900, color: '#06b6d4' }}>{groups.length}</div>
          </div>
          <div style={{ background: 'var(--bg-card)', padding: '12px 16px', borderRadius: '12px', border: '1px solid var(--border-subtle)' }}>
            <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)' }}>Estudiantes Totales</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 900, color: '#f59e0b' }}>{students.length}</div>
          </div>
        </div>
      </div>

      {/* Selector de Pestañas */}
      <div style={{ display: 'flex', gap: '8px', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '12px' }}>
        <button
          onClick={() => setActiveTab('INSTITUTIONS')}
          className={`btn ${activeTab === 'INSTITUTIONS' ? 'btn-primary' : 'btn-secondary'} btn-sm`}
          style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 700 }}
        >
          <Building2 size={16} />
          <span>Instituciones ({allInstitutions.length})</span>
        </button>
        <button
          onClick={() => setActiveTab('USERS')}
          className={`btn ${activeTab === 'USERS' ? 'btn-primary' : 'btn-secondary'} btn-sm`}
          style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 700 }}
        >
          <Users size={16} />
          <span>Usuarios del Sistema ({allUsers.length})</span>
        </button>
      </div>

      {/* PESTAÑA 1: LISTADO DE INSTITUCIONES */}
      {activeTab === 'INSTITUTIONS' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '16px' }}>
          {allInstitutions.map((inst) => {
            const instGroups = groups.filter(g => g.institutionId === inst.id);
            const instUsers = allUsers.filter(u => u.institutionId === inst.id);
            const instDirector = instUsers.find(u => u.role === 'DIRECTOR');

            return (
              <div
                key={inst.id}
                className="glass-panel"
                style={{
                  padding: '20px',
                  borderRadius: '16px',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  border: '1px solid var(--border-subtle)',
                  background: 'var(--bg-card)'
                }}
              >
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                    <div style={{
                      width: '42px',
                      height: '42px',
                      borderRadius: '12px',
                      background: inst.type === 'COLLEGE' ? 'rgba(79, 70, 229, 0.15)' : 'rgba(16, 185, 129, 0.15)',
                      color: inst.type === 'COLLEGE' ? '#4f46e5' : '#059669',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}>
                      <Building2 size={22} />
                    </div>
                    <span className="badge" style={{
                      background: inst.type === 'COLLEGE' ? 'rgba(79, 70, 229, 0.12)' : 'rgba(16, 185, 129, 0.12)',
                      color: inst.type === 'COLLEGE' ? '#4f46e5' : '#059669',
                      fontSize: '0.72rem'
                    }}>
                      {inst.type === 'COLLEGE' ? 'Colegio / Institución' : 'Independiente'}
                    </span>
                  </div>

                  <h3 style={{ margin: '0 0 4px 0', fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-main)' }}>
                    {inst.name}
                  </h3>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '12px' }}>
                    Código: <strong>{inst.code}</strong> {inst.circuit && `• Circuito ${inst.circuit}`} {inst.regionalDirection && `• ${inst.regionalDirection}`}
                  </div>

                  <div style={{
                    background: 'var(--bg-surface)',
                    padding: '10px 12px',
                    borderRadius: '10px',
                    fontSize: '0.78rem',
                    marginBottom: '16px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '4px'
                  }}>
                    <div>Director: <strong>{instDirector ? instDirector.name : 'Sin director asignado'}</strong></div>
                    <div>Secciones creadas: <strong>{instGroups.length}</strong></div>
                    <div>Personal asignado: <strong>{instUsers.length}</strong></div>
                  </div>
                </div>

                <button
                  onClick={() => onSelectInstitution(inst.id)}
                  className="btn btn-secondary"
                  style={{
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    fontWeight: 700,
                    fontSize: '0.82rem'
                  }}
                >
                  <span>Entrar y Administrar</span>
                  <ArrowRight size={15} />
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* PESTAÑA 2: LISTADO DE USUARIOS */}
      {activeTab === 'USERS' && (
        <div className="glass-panel" style={{
          padding: '20px',
          borderRadius: '16px',
          border: '1px solid var(--border-subtle)',
          background: 'var(--bg-card)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800 }}>
              Todos los Usuarios Registrados ({allUsers.length})
            </h3>
            <button
              onClick={() => setIsAddUserOpen(true)}
              className="btn btn-primary btn-sm"
              style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 700 }}
            >
              <UserPlus size={15} />
              <span>+ Nuevo Usuario</span>
            </button>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid var(--border-subtle)', textAlign: 'left' }}>
                  <th style={{ padding: '10px 12px' }}>Nombre</th>
                  <th style={{ padding: '10px 12px' }}>Correo Electrónico</th>
                  <th style={{ padding: '10px 12px' }}>Rol</th>
                  <th style={{ padding: '10px 12px' }}>Institución</th>
                  <th style={{ padding: '10px 12px' }}>Cargo / Especialidad</th>
                </tr>
              </thead>
              <tbody>
                {allUsers.map((u) => {
                  const inst = allInstitutions.find(i => i.id === u.institutionId);
                  const isDev = u.role === 'DEVELOPER' || u.role === 'SUPERADMIN';
                  const isDir = u.role === 'DIRECTOR';
                  const isAdmin = u.role === 'ADMIN';

                  return (
                    <tr key={u.id} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                      <td style={{ padding: '10px 12px', fontWeight: 700 }}>{u.name}</td>
                      <td style={{ padding: '10px 12px', fontFamily: 'monospace', color: 'var(--text-muted)' }}>{u.email}</td>
                      <td style={{ padding: '10px 12px' }}>
                        <span className="badge" style={{
                          background: isDev ? 'rgba(124, 58, 237, 0.15)' : isDir ? 'rgba(79, 70, 229, 0.15)' : isAdmin ? 'rgba(6, 182, 212, 0.15)' : 'rgba(16, 185, 129, 0.15)',
                          color: isDev ? '#7c3aed' : isDir ? '#4f46e5' : isAdmin ? '#0891b2' : '#059669',
                          fontWeight: 700,
                          fontSize: '0.72rem'
                        }}>
                          {isDev ? '👑 Desarrollador' : isDir ? '🏫 Director' : isAdmin ? '📋 Administrativo' : '👩‍🏫 Docente'}
                        </span>
                      </td>
                      <td style={{ padding: '10px 12px' }}>{inst ? inst.name : 'Global'}</td>
                      <td style={{ padding: '10px 12px', color: 'var(--text-muted)' }}>{u.title || '—'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MODAL: NUEVA INSTITUCIÓN */}
      {isAddInstitutionOpen && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.7)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 300,
          padding: '16px'
        }}>
          <div className="glass-panel" style={{
            width: '100%',
            maxWidth: '480px',
            padding: '24px',
            borderRadius: '16px',
            background: 'var(--bg-card)',
            border: '1px solid var(--border-subtle)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800 }}>Registrar Nueva Institución</h3>
              <button onClick={() => setIsAddInstitutionOpen(false)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleCreateInstitution} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, marginBottom: '4px' }}>Nombre de la Institución *</label>
                <input
                  type="text"
                  value={instName}
                  onChange={(e) => setInstName(e.target.value)}
                  placeholder="Ej. CTP Puriscal"
                  required
                  style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid var(--border-subtle)', background: 'var(--bg-surface)', color: 'var(--text-main)', boxSizing: 'border-box' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, marginBottom: '4px' }}>Código MEP / Identificador *</label>
                  <input
                    type="text"
                    value={instCode}
                    onChange={(e) => setInstCode(e.target.value)}
                    placeholder="Ej. 4520"
                    required
                    style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid var(--border-subtle)', background: 'var(--bg-surface)', color: 'var(--text-main)', boxSizing: 'border-box' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, marginBottom: '4px' }}>Tipo de Espacio</label>
                  <select
                    value={instType}
                    onChange={(e) => setInstType(e.target.value as any)}
                    style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid var(--border-subtle)', background: 'var(--bg-surface)', color: 'var(--text-main)', boxSizing: 'border-box' }}
                  >
                    <option value="COLLEGE">Colegio / Institucional</option>
                    <option value="INDEPENDENT">Docente Independiente</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, marginBottom: '4px' }}>Circuito Escolar</label>
                  <input
                    type="text"
                    value={instCircuit}
                    onChange={(e) => setInstCircuit(e.target.value)}
                    placeholder="Ej. 04"
                    style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid var(--border-subtle)', background: 'var(--bg-surface)', color: 'var(--text-main)', boxSizing: 'border-box' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, marginBottom: '4px' }}>Dirección Regional</label>
                  <input
                    type="text"
                    value={instRegional}
                    onChange={(e) => setInstRegional(e.target.value)}
                    placeholder="Ej. Puriscal"
                    style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid var(--border-subtle)', background: 'var(--bg-surface)', color: 'var(--text-main)', boxSizing: 'border-box' }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
                <button type="button" onClick={() => setIsAddInstitutionOpen(false)} className="btn btn-secondary">Cancelar</button>
                <button type="submit" className="btn btn-primary" style={{ background: 'linear-gradient(135deg, #7c3aed 0%, #4f46e5 100%)' }}>Guardar Institución</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: NUEVO USUARIO (MODO DESARROLLADOR - TODOS LOS ROLES) */}
      {isAddUserOpen && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.7)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 300,
          padding: '16px'
        }}>
          <div className="glass-panel" style={{
            width: '100%',
            maxWidth: '500px',
            padding: '24px',
            borderRadius: '16px',
            background: 'var(--bg-card)',
            border: '1px solid var(--border-subtle)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800 }}>Crear Nuevo Usuario</h3>
                <p style={{ margin: 0, fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                  Como Desarrollador, puedes asignar cualquier rol (Director, Admin, Docente o Desarrollador).
                </p>
              </div>
              <button onClick={() => setIsAddUserOpen(false)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
                <X size={20} />
              </button>
            </div>

            {userError && (
              <div style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#dc2626', padding: '8px 12px', borderRadius: '8px', fontSize: '0.8rem', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <AlertCircle size={16} />
                <span>{userError}</span>
              </div>
            )}

            <form onSubmit={handleCreateUser} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, marginBottom: '4px' }}>Nombre Completo *</label>
                <input
                  type="text"
                  value={userName}
                  onChange={(e) => setUserName(e.target.value)}
                  placeholder="Ej. Lic. Ana Vargas Solís"
                  required
                  style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid var(--border-subtle)', background: 'var(--bg-surface)', color: 'var(--text-main)', boxSizing: 'border-box' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, marginBottom: '4px' }}>Correo Electrónico *</label>
                  <input
                    type="email"
                    value={userEmail}
                    onChange={(e) => setUserEmail(e.target.value)}
                    placeholder="correo@mep.go.cr"
                    required
                    style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid var(--border-subtle)', background: 'var(--bg-surface)', color: 'var(--text-main)', boxSizing: 'border-box' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, marginBottom: '4px' }}>Contraseña *</label>
                  <input
                    type="text"
                    value={userPassword}
                    onChange={(e) => setUserPassword(e.target.value)}
                    placeholder="123"
                    required
                    style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid var(--border-subtle)', background: 'var(--bg-surface)', color: 'var(--text-main)', boxSizing: 'border-box' }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, marginBottom: '4px' }}>Rol Asignado *</label>
                  <select
                    value={userRole}
                    onChange={(e) => setUserRole(e.target.value as any)}
                    style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid var(--border-subtle)', background: 'var(--bg-surface)', color: 'var(--text-main)', boxSizing: 'border-box', fontWeight: 700 }}
                  >
                    <option value="DIRECTOR">🏫 Director Institucional</option>
                    <option value="ADMIN">📋 Administrativo</option>
                    <option value="TEACHER">👩‍🏫 Docente</option>
                    <option value="DEVELOPER">👑 Desarrollador / SuperAdmin</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, marginBottom: '4px' }}>Institución Asignada *</label>
                  <select
                    value={userInstitutionId}
                    onChange={(e) => setUserInstitutionId(e.target.value)}
                    style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid var(--border-subtle)', background: 'var(--bg-surface)', color: 'var(--text-main)', boxSizing: 'border-box' }}
                  >
                    {allInstitutions.map(inst => (
                      <option key={inst.id} value={inst.id}>{inst.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, marginBottom: '4px' }}>Título o Especialidad</label>
                <input
                  type="text"
                  value={userTitle}
                  onChange={(e) => setUserTitle(e.target.value)}
                  placeholder="Ej. Director / Docente Especialidad Matemáticas"
                  style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid var(--border-subtle)', background: 'var(--bg-surface)', color: 'var(--text-main)', boxSizing: 'border-box' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
                <button type="button" onClick={() => setIsAddUserOpen(false)} className="btn btn-secondary">Cancelar</button>
                <button type="submit" className="btn btn-primary" style={{ background: 'linear-gradient(135deg, #7c3aed 0%, #4f46e5 100%)' }}>Crear Usuario</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
