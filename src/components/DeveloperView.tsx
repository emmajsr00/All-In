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
  Briefcase,
  Search,
  Trash2,
  Edit3,
  Calendar,
  Loader2,
  Phone,
  Clock,
  Layers,
  Filter,
  UploadCloud,
  CreditCard,
  ExternalLink
} from 'lucide-react';
import type { Institution, User, Group, Student, UserRole, InstitutionType, MembershipPlan, MembershipStatus } from '../types';
import { db } from '../db';
import { queryCostaRicaId } from '../utils/crIdentification';

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
  const [activeTab, setActiveTab] = useState<'INSTITUTIONS' | 'USERS' | 'MEMBERSHIPS'>('INSTITUTIONS');
  const [directInstitutionId, setDirectInstitutionId] = useState<string>(allInstitutions[0]?.id || '');

  // Helper para leer archivos de imagen a Base64
  const handleImageFileRead = (e: React.ChangeEvent<HTMLInputElement>, onResult: (base64: string) => void) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      alert('La imagen no debe superar los 2MB.');
      return;
    }
    const reader = new FileReader();
    reader.onload = (event) => {
      if (typeof event.target?.result === 'string') {
        onResult(event.target.result);
      }
    };
    reader.readAsDataURL(file);
  };

  // Modales
  const [isAddInstitutionOpen, setIsAddInstitutionOpen] = useState(false);
  const [isAddUserOpen, setIsAddUserOpen] = useState(false);

  // Formulario Nueva Institución
  const [instName, setInstName] = useState('');
  const [instCode, setInstCode] = useState('');
  const [instType, setInstType] = useState<InstitutionType>('COLLEGE');
  const [instCircuit, setInstCircuit] = useState('');
  const [instRegional, setInstRegional] = useState('');
  const [instLogoUrl, setInstLogoUrl] = useState('');

  // Formulario Nuevo Usuario
  const [userName, setUserName] = useState('');
  const [userEmail, setUserEmail] = useState('');
  const [userPassword, setUserPassword] = useState('123');
  const [userRole, setUserRole] = useState<UserRole>('DIRECTOR');
  const [userInstitutionId, setUserInstitutionId] = useState<string>(allInstitutions[0]?.id || '');
  const [userTitle, setUserTitle] = useState('');
  const [userIdNumber, setUserIdNumber] = useState('');
  const [userPhone, setUserPhone] = useState('');
  const [userAvatarUrl, setUserAvatarUrl] = useState('');
  const [isQueryingAddCedula, setIsQueryingAddCedula] = useState(false);
  const [userError, setUserError] = useState<string | null>(null);

  // Filtros de Usuarios en Desarrollador
  const [selectedInstFilter, setSelectedInstFilter] = useState<string>('ALL'); // 'ALL' | 'INDEPENDENT' | institutionId
  const [selectedRoleFilter, setSelectedRoleFilter] = useState<string>('ALL');
  const [userSearchQuery, setUserSearchQuery] = useState('');

  // Modal Gestión de Membresías
  const [membershipModalUser, setMembershipModalUser] = useState<User | null>(null);
  const [mPlan, setMPlan] = useState<MembershipPlan>('ANNUAL');
  const [mStatus, setMStatus] = useState<MembershipStatus>('ACTIVE');
  const [mExpiresAt, setMExpiresAt] = useState<string>('');

  // Modal Edición de Usuario
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [isQueryingEditCedula, setIsQueryingEditCedula] = useState(false);

  // Modal Edición de Institución
  const [editingInstitution, setEditingInstitution] = useState<Institution | null>(null);

  const handleCreateInstitution = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!instName.trim() || !instCode.trim()) return;

    const newInst: Institution = {
      id: `inst-${Date.now()}`,
      name: instName.trim(),
      code: instCode.trim(),
      type: instType,
      logoUrl: instLogoUrl.trim() || undefined,
      circuit: instCircuit.trim() || undefined,
      regionalDirection: instRegional.trim() || undefined,
      createdAt: new Date().toISOString()
    };

    await db.institutions.add(newInst);
    setIsAddInstitutionOpen(false);
    setInstName('');
    setInstCode('');
    setInstLogoUrl('');
    setInstCircuit('');
    setInstRegional('');
    onDataChanged();
  };

  const handleUpdateInstitution = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingInstitution || !editingInstitution.name.trim() || !editingInstitution.code.trim()) return;

    await db.institutions.update(editingInstitution.id, {
      name: editingInstitution.name.trim(),
      code: editingInstitution.code.trim(),
      type: editingInstitution.type,
      logoUrl: editingInstitution.logoUrl?.trim() || undefined,
      circuit: editingInstitution.circuit?.trim() || undefined,
      regionalDirection: editingInstitution.regionalDirection?.trim() || undefined,
      phone: editingInstitution.phone?.trim() || undefined,
      email: editingInstitution.email?.trim() || undefined,
      address: editingInstitution.address?.trim() || undefined
    });

    setEditingInstitution(null);
    onDataChanged();
  };

  const handleQueryCedulaForAdd = async (cedula: string) => {
    const clean = cedula.replace(/[^0-9]/g, '');
    if (clean.length < 9) return;
    setIsQueryingAddCedula(true);
    const res = await queryCostaRicaId(clean);
    setIsQueryingAddCedula(false);
    if (res.success && res.fullName) {
      setUserName(res.fullName);
    }
  };

  const handleQueryCedulaForEdit = async (cedula: string) => {
    const clean = cedula.replace(/[^0-9]/g, '');
    if (clean.length < 9 || !editingUser) return;
    setIsQueryingEditCedula(true);
    const res = await queryCostaRicaId(clean);
    setIsQueryingEditCedula(false);
    if (res.success && res.fullName) {
      setEditingUser({ ...editingUser, name: res.fullName });
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setUserError(null);

    const cleanEmail = userEmail.trim().toLowerCase();
    if (!userName.trim() || !cleanEmail) {
      setUserError('Completa todos los campos obligatorios.');
      return;
    }

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
      title: userTitle.trim() || undefined,
      idNumber: userIdNumber.trim() || undefined,
      phone: userPhone.trim() || undefined,
      avatarUrl: userAvatarUrl.trim() || undefined,
      membershipStatus: 'ACTIVE',
      membershipPlan: 'ANNUAL',
      membershipExpiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    };

    await db.users.add(newUser);
    setIsAddUserOpen(false);
    setUserName('');
    setUserEmail('');
    setUserPassword('123');
    setUserTitle('');
    setUserIdNumber('');
    setUserPhone('');
    setUserAvatarUrl('');
    onDataChanged();
  };

  const handleUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;

    const cleanEmail = editingUser.email.trim().toLowerCase();
    if (!editingUser.name.trim() || !cleanEmail) {
      alert('Nombre y correo son obligatorios.');
      return;
    }

    const exists = allUsers.some(u => u.id !== editingUser.id && u.email.toLowerCase() === cleanEmail);
    if (exists) {
      alert('Ya existe otro usuario con este correo electrónico.');
      return;
    }

    await db.users.update(editingUser.id, {
      name: editingUser.name.trim(),
      email: cleanEmail,
      role: editingUser.role,
      institutionId: editingUser.institutionId,
      title: editingUser.title?.trim() || undefined,
      password: editingUser.password || '123',
      idNumber: editingUser.idNumber?.trim() || undefined,
      phone: editingUser.phone?.trim() || undefined,
      avatarUrl: editingUser.avatarUrl?.trim() || undefined
    });

    setEditingUser(null);
    onDataChanged();
  };

  const handleDeleteUser = async (userToDelete: User) => {
    if (confirm(`¿Estás seguro de que deseas eliminar permanentemente al usuario ${userToDelete.name} (${userToDelete.email})?`)) {
      await db.users.delete(userToDelete.id);
      onDataChanged();
    }
  };

  const handleOpenMembershipModal = (u: User) => {
    setMembershipModalUser(u);
    setMPlan(u.membershipPlan || 'ANNUAL');
    setMStatus(u.membershipStatus || 'ACTIVE');
    setMExpiresAt(u.membershipExpiresAt || new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]);
  };

  const handleSaveMembership = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!membershipModalUser) return;

    await db.users.update(membershipModalUser.id, {
      membershipPlan: mPlan,
      membershipStatus: mStatus,
      membershipExpiresAt: mPlan === 'LIFETIME' ? undefined : (mExpiresAt || undefined)
    });

    setMembershipModalUser(null);
    onDataChanged();
  };

  const handleSetQuickDuration = (days: number) => {
    const d = new Date();
    d.setDate(d.getDate() + days);
    setMExpiresAt(d.toISOString().split('T')[0]);
  };

  // Estados para la pestaña de Control de Membresías
  const [membershipStatusFilter, setMembershipStatusFilter] = useState<'ALL' | 'ACTIVE' | 'TRIAL' | 'EXPIRED' | 'INACTIVE'>('ALL');
  const [membershipSearch, setMembershipSearch] = useState('');

  const handleQuickRenew = async (user: User, days: number) => {
    const currentExp = user.membershipExpiresAt ? new Date(user.membershipExpiresAt) : new Date();
    const baseDate = currentExp > new Date() ? currentExp : new Date();
    baseDate.setDate(baseDate.getDate() + days);
    const newExpDate = baseDate.toISOString().split('T')[0];

    await db.users.update(user.id, {
      membershipStatus: 'ACTIVE',
      membershipExpiresAt: newExpDate
    });
    onDataChanged();
  };

  // Filtrado reactivo de usuarios
  const filteredUsers = allUsers.filter(u => {
    // Filtro por Institución o Independiente
    if (selectedInstFilter === 'INDEPENDENT') {
      const isIndep = u.institutionId === 'inst-indep-01' || (!u.institutionId && u.role === 'TEACHER');
      if (!isIndep) return false;
    } else if (selectedInstFilter !== 'ALL') {
      const matchInst = u.institutionId === selectedInstFilter || (u.institutionIds && u.institutionIds.includes(selectedInstFilter));
      if (!matchInst) return false;
    }

    // Filtro por Rol
    if (selectedRoleFilter !== 'ALL' && u.role !== selectedRoleFilter) {
      return false;
    }

    // Buscador
    if (userSearchQuery.trim()) {
      const q = userSearchQuery.toLowerCase().trim();
      const nameMatch = u.name.toLowerCase().includes(q);
      const emailMatch = u.email.toLowerCase().includes(q);
      const idMatch = u.idNumber ? u.idNumber.toLowerCase().includes(q) : false;
      const titleMatch = u.title ? u.title.toLowerCase().includes(q) : false;
      return nameMatch || emailMatch || idMatch || titleMatch;
    }

    return true;
  });

  const directorCount = allUsers.filter(u => u.role === 'DIRECTOR').length;
  const teacherCount = allUsers.filter(u => u.role === 'TEACHER').length;
  const adminCount = allUsers.filter(u => u.role === 'ADMIN').length;
  const indepCount = allUsers.filter(u => u.institutionId === 'inst-indep-01' || (!u.institutionId && u.role === 'TEACHER')).length;

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
              Centro de Control Global y Membresías
            </h1>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem', margin: 0, maxWidth: '650px' }}>
              Administra instituciones educativas, profesores independientes, licenciamiento de membresías y acceso global.
            </p>
          </div>

          <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
            <div style={{ background: 'var(--bg-card)', padding: '8px 14px', borderRadius: '12px', border: '1px solid var(--border-subtle)', textAlign: 'center' }}>
              <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#7c3aed' }}>{allInstitutions.length}</div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Instituciones</div>
            </div>
            <div style={{ background: 'var(--bg-card)', padding: '8px 14px', borderRadius: '12px', border: '1px solid var(--border-subtle)', textAlign: 'center' }}>
              <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#059669' }}>{indepCount}</div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Independientes</div>
            </div>
            <div style={{ background: 'var(--bg-card)', padding: '8px 14px', borderRadius: '12px', border: '1px solid var(--border-subtle)', textAlign: 'center' }}>
              <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#4f46e5' }}>{directorCount}</div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Directores</div>
            </div>
            <div style={{ background: 'var(--bg-card)', padding: '8px 14px', borderRadius: '12px', border: '1px solid var(--border-subtle)', textAlign: 'center' }}>
              <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#06b6d4' }}>{teacherCount}</div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Docentes</div>
            </div>
          </div>
        </div>
      </div>

      {/* Submenú de Navegación del Desarrollador */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '12px',
        borderBottom: '1px solid var(--border-subtle)',
        paddingBottom: '14px'
      }}>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <button
            onClick={() => setActiveTab('INSTITUTIONS')}
            className={`btn ${activeTab === 'INSTITUTIONS' ? 'btn-primary' : 'btn-secondary'} btn-sm`}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              fontWeight: 800,
              padding: '8px 14px',
              borderRadius: '10px'
            }}
          >
            <Building2 size={16} />
            <span>Instituciones Educativas</span>
            <span style={{
              background: activeTab === 'INSTITUTIONS' ? 'rgba(255,255,255,0.25)' : 'var(--bg-surface)',
              padding: '2px 7px',
              borderRadius: '12px',
              fontSize: '0.72rem'
            }}>
              {allInstitutions.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('USERS')}
            className={`btn ${activeTab === 'USERS' ? 'btn-primary' : 'btn-secondary'} btn-sm`}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              fontWeight: 800,
              padding: '8px 14px',
              borderRadius: '10px'
            }}
          >
            <Users size={16} />
            <span>Personal & Usuarios</span>
            <span style={{
              background: activeTab === 'USERS' ? 'rgba(255,255,255,0.25)' : 'var(--bg-surface)',
              padding: '2px 7px',
              borderRadius: '12px',
              fontSize: '0.72rem'
            }}>
              {allUsers.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('MEMBERSHIPS')}
            className={`btn ${activeTab === 'MEMBERSHIPS' ? 'btn-primary' : 'btn-secondary'} btn-sm`}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              fontWeight: 800,
              padding: '8px 14px',
              borderRadius: '10px'
            }}
          >
            <ShieldCheck size={16} />
            <span>Control de Membresías</span>
            <span style={{
              background: activeTab === 'MEMBERSHIPS' ? 'rgba(255,255,255,0.25)' : 'rgba(16, 185, 129, 0.15)',
              color: activeTab === 'MEMBERSHIPS' ? 'white' : '#059669',
              padding: '2px 7px',
              borderRadius: '12px',
              fontSize: '0.72rem',
              fontWeight: 800
            }}>
              {allUsers.filter(u => u.membershipStatus === 'ACTIVE' || !u.membershipStatus).length} Activas
            </span>
          </button>
        </div>

        {/* Acceso Rápido para Administrar Institución en Vivo */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          background: 'var(--bg-surface)',
          padding: '4px 8px 4px 12px',
          borderRadius: '12px',
          border: '1px solid var(--border-subtle)'
        }}>
          <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)' }}>
            Administrar Institución:
          </span>
          <select
            value={directInstitutionId}
            onChange={e => setDirectInstitutionId(e.target.value)}
            className="input-field"
            style={{ padding: '6px 10px', fontSize: '0.78rem', fontWeight: 600, minWidth: '170px' }}
          >
            {allInstitutions.map(inst => (
              <option key={inst.id} value={inst.id}>{inst.name}</option>
            ))}
          </select>
          <button
            type="button"
            onClick={() => onSelectInstitution(directInstitutionId)}
            className="btn btn-primary btn-sm"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '0.78rem',
              padding: '6px 12px',
              background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)'
            }}
            title="Entrar a administrar esta institución en vivo"
          >
            <span>Acceder</span>
            <ExternalLink size={13} />
          </button>
        </div>
      </div>

      {/* PESTAÑA 1: INSTITUCIONES */}
      {activeTab === 'INSTITUTIONS' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '18px' }}>
          {/* Card Crear Institución */}
          <div
            onClick={() => setIsAddInstitutionOpen(true)}
            className="glass-panel hover-lift"
            style={{
              padding: '24px',
              borderRadius: '16px',
              border: '2px dashed rgba(124, 58, 237, 0.4)',
              background: 'rgba(124, 58, 237, 0.04)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              minHeight: '220px',
              cursor: 'pointer',
              textAlign: 'center',
              gap: '12px'
            }}
          >
            <div style={{
              width: '54px',
              height: '54px',
              borderRadius: '50%',
              background: 'rgba(124, 58, 237, 0.15)',
              color: '#7c3aed',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <Plus size={28} />
            </div>
            <div>
              <h3 style={{ margin: '0 0 4px 0', fontSize: '1.15rem', fontWeight: 800 }}>Registrar Nueva Institución</h3>
              <p style={{ margin: 0, fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                Colegio, escuela o universidad con su propio ecosistema.
              </p>
            </div>
          </div>

          {/* Listado de Instituciones */}
          {allInstitutions.map((inst) => {
            const instUsers = allUsers.filter(u => u.institutionId === inst.id);
            const instDirector = instUsers.find(u => u.role === 'DIRECTOR');
            const instGroups = groups.filter(g => g.institutionId === inst.id);

            return (
              <div
                key={inst.id}
                className="glass-panel"
                style={{
                  padding: '20px',
                  borderRadius: '16px',
                  border: '1px solid var(--border-subtle)',
                  background: 'var(--bg-card)',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  gap: '14px'
                }}
              >
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div style={{
                        width: '42px',
                        height: '42px',
                        borderRadius: '12px',
                        background: 'rgba(79, 70, 229, 0.1)',
                        overflow: 'hidden',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        border: '1px solid var(--border-subtle)'
                      }}>
                        {inst.logoUrl ? (
                          <img src={inst.logoUrl} alt={inst.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        ) : (
                          <Building2 size={22} color="#4f46e5" />
                        )}
                      </div>
                      <span className="badge" style={{ background: 'rgba(79, 70, 229, 0.15)', color: '#4f46e5', fontSize: '0.72rem', fontWeight: 700 }}>
                        {inst.type === 'UNIVERSITY' ? 'Universidad' : inst.type === 'SCHOOL' ? 'Escuela' : inst.type === 'INDEPENDENT' ? 'Independiente' : 'Colegio'}
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => setEditingInstitution(inst)}
                      className="btn btn-ghost btn-sm"
                      style={{ padding: '4px 6px', color: '#4f46e5' }}
                      title="Editar información de la institución"
                    >
                      <Edit3 size={15} />
                    </button>
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

      {/* PESTAÑA 2: LISTADO DE USUARIOS Y GESTIÓN DE MEMBRESÍAS */}
      {activeTab === 'USERS' && (
        <div className="glass-panel" style={{
          padding: '20px',
          borderRadius: '16px',
          border: '1px solid var(--border-subtle)',
          background: 'var(--bg-card)',
          display: 'flex',
          flexDirection: 'column',
          gap: '16px'
        }}>
          {/* Cabecera y Botón Nuevo Usuario */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800 }}>
                Control de Usuarios y Membresías ({filteredUsers.length})
              </h3>
              <p style={{ margin: '2px 0 0 0', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                Filtra por institución o docentes independientes, gestiona planes de licencia y estado de suscripciones.
              </p>
            </div>
            <button
              onClick={() => setIsAddUserOpen(true)}
              className="btn btn-primary btn-sm"
              style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 700 }}
            >
              <UserPlus size={15} />
              <span>+ Nuevo Usuario</span>
            </button>
          </div>

          {/* Barra de Filtros interactivos */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '12px',
            background: 'var(--bg-surface)',
            padding: '12px 16px',
            borderRadius: '12px',
            border: '1px solid var(--border-subtle)'
          }}>
            {/* Buscador de Usuarios */}
            <div style={{ position: 'relative', width: '320px', maxWidth: '100%' }}>
              <Search size={16} color="#6366f1" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
              <input
                type="text"
                placeholder="Buscar por nombre, correo o cédula..."
                value={userSearchQuery}
                onChange={e => setUserSearchQuery(e.target.value)}
                className="input-field"
                style={{ width: '100%', padding: '8px 12px 8px 36px', fontSize: '0.85rem' }}
              />
              {userSearchQuery && (
                <button
                  type="button"
                  onClick={() => setUserSearchQuery('')}
                  style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}
                >
                  <X size={14} />
                </button>
              )}
            </div>

            {/* Selector por Institución o Independientes */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-muted)' }}>Filtrar:</span>
              <select
                value={selectedInstFilter}
                onChange={e => setSelectedInstFilter(e.target.value)}
                className="input-field"
                style={{ padding: '8px 12px', fontSize: '0.82rem', fontWeight: 600, minWidth: '220px' }}
              >
                <option value="ALL">🏢 Todas las Instituciones ({allUsers.length})</option>
                <option value="INDEPENDENT">👨‍🏫 Docentes Independientes ({indepCount})</option>
                {allInstitutions.map(inst => {
                  const count = allUsers.filter(u => u.institutionId === inst.id).length;
                  return (
                    <option key={inst.id} value={inst.id}>
                      {inst.name} ({count})
                    </option>
                  );
                })}
              </select>

              {/* Selector por Rol */}
              <select
                value={selectedRoleFilter}
                onChange={e => setSelectedRoleFilter(e.target.value)}
                className="input-field"
                style={{ padding: '8px 12px', fontSize: '0.82rem', fontWeight: 600 }}
              >
                <option value="ALL">Todos los Roles</option>
                <option value="DIRECTOR">Directores</option>
                <option value="ADMIN">Administrativos</option>
                <option value="TEACHER">Docentes</option>
                <option value="DEVELOPER">Desarrolladores</option>
              </select>
            </div>
          </div>

          {/* Tabla de Usuarios */}
          <div style={{ overflowX: 'auto', border: '1px solid var(--border-subtle)', borderRadius: '12px' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid var(--border-subtle)', background: 'var(--bg-surface)', textAlign: 'left' }}>
                  <th style={{ padding: '12px 14px' }}>Usuario</th>
                  <th style={{ padding: '12px 14px' }}>Cédula / Teléfono</th>
                  <th style={{ padding: '12px 14px' }}>Correo Electrónico</th>
                  <th style={{ padding: '12px 14px' }}>Rol</th>
                  <th style={{ padding: '12px 14px' }}>Institución</th>
                  <th style={{ padding: '12px 14px' }}>Membresía & Estado</th>
                  <th style={{ padding: '12px 14px', textAlign: 'right' }}>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map((u) => {
                  const inst = allInstitutions.find(i => i.id === u.institutionId);
                  const isDev = u.role === 'DEVELOPER' || u.role === 'SUPERADMIN';
                  const isDir = u.role === 'DIRECTOR';
                  const isAdmin = u.role === 'ADMIN';

                  const plan = u.membershipPlan || 'ANNUAL';
                  const status = u.membershipStatus || 'ACTIVE';

                  const getStatusBadge = (st: MembershipStatus) => {
                    switch (st) {
                      case 'ACTIVE':
                        return { bg: 'rgba(16, 185, 129, 0.15)', text: '#059669', label: 'Activa' };
                      case 'TRIAL':
                        return { bg: 'rgba(59, 130, 246, 0.15)', text: '#2563eb', label: 'En Prueba' };
                      case 'EXPIRED':
                        return { bg: 'rgba(239, 68, 68, 0.15)', text: '#dc2626', label: 'Vencida' };
                      case 'INACTIVE':
                      default:
                        return { bg: 'rgba(156, 163, 175, 0.2)', text: '#4b5563', label: 'Inactiva' };
                    }
                  };
                  const sBadge = getStatusBadge(status);

                  return (
                    <tr key={u.id} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                      <td style={{ padding: '12px 14px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <div style={{
                            width: '36px',
                            height: '36px',
                            borderRadius: '50%',
                            background: 'linear-gradient(135deg, #7c3aed, #4f46e5)',
                            color: 'white',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontWeight: 800,
                            fontSize: '0.85rem',
                            overflow: 'hidden',
                            border: '2px solid rgba(124, 58, 237, 0.25)',
                            flexShrink: 0
                          }}>
                            {u.avatarUrl ? (
                              <img src={u.avatarUrl} alt={u.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            ) : (
                              u.name.charAt(0).toUpperCase()
                            )}
                          </div>
                          <div>
                            <div style={{ fontWeight: 700, color: 'var(--text-main)' }}>{u.name}</div>
                            <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>{u.title || 'Funcionario'}</div>
                          </div>
                        </div>
                      </td>
                      <td style={{ padding: '12px 14px', fontFamily: 'monospace', color: 'var(--text-muted)' }}>
                        <div>{u.idNumber || '—'}</div>
                        {u.phone && <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>📞 {u.phone}</div>}
                      </td>
                      <td style={{ padding: '12px 14px', fontFamily: 'monospace', color: 'var(--text-muted)' }}>{u.email}</td>
                      <td style={{ padding: '12px 14px' }}>
                        <span className="badge" style={{
                          background: isDev ? 'rgba(124, 58, 237, 0.15)' : isDir ? 'rgba(79, 70, 229, 0.15)' : isAdmin ? 'rgba(6, 182, 212, 0.15)' : 'rgba(16, 185, 129, 0.15)',
                          color: isDev ? '#7c3aed' : isDir ? '#4f46e5' : isAdmin ? '#0891b2' : '#059669',
                          fontWeight: 700,
                          fontSize: '0.72rem'
                        }}>
                          {isDev ? '👑 Desarrollador' : isDir ? '🏫 Director' : isAdmin ? '📋 Administrativo' : '👩‍🏫 Docente'}
                        </span>
                      </td>
                      <td style={{ padding: '12px 14px' }}>
                        {u.institutionId === 'inst-indep-01' ? (
                          <span className="badge" style={{ background: 'rgba(16, 185, 129, 0.12)', color: '#059669' }}>
                            Independiente
                          </span>
                        ) : inst ? inst.name : 'Global'}
                      </td>
                      <td style={{ padding: '12px 14px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                          <span className="badge" style={{ background: sBadge.bg, color: sBadge.text, fontWeight: 700, fontSize: '0.72rem' }}>
                            ● {sBadge.label}
                          </span>
                          <span className="badge" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)', color: 'var(--text-main)', fontSize: '0.7rem' }}>
                            {plan === 'LIFETIME' ? 'Vitalicia' : plan === 'ANNUAL' ? 'Anual' : plan === 'MONTHLY' ? 'Mensual' : 'Gratis'}
                          </span>
                        </div>
                        {u.membershipExpiresAt && plan !== 'LIFETIME' && (
                          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                            Vence: {u.membershipExpiresAt}
                          </div>
                        )}
                      </td>
                      <td style={{ padding: '12px 14px', textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', gap: '6px' }}>
                          <button
                            type="button"
                            onClick={() => handleOpenMembershipModal(u)}
                            className="btn btn-secondary btn-sm"
                            style={{ padding: '5px 8px', fontSize: '0.75rem', fontWeight: 700 }}
                            title="Gestionar membresía y licencia"
                          >
                            <Sparkles size={13} color="#7c3aed" />
                            <span>Membresía</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditingUser(u)}
                            className="btn btn-ghost btn-sm"
                            style={{ padding: '5px 8px', color: '#4f46e5' }}
                            title="Editar usuario"
                          >
                            <Edit3 size={14} />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteUser(u)}
                            className="btn btn-ghost btn-sm"
                            style={{ padding: '5px 8px', color: '#ef4444' }}
                            title="Eliminar usuario"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}

                {filteredUsers.length === 0 && (
                  <tr>
                    <td colSpan={7} style={{ padding: '36px', textAlign: 'center', color: 'var(--text-muted)' }}>
                      No se encontraron usuarios que coincidan con los filtros seleccionados.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* PESTAÑA 3: CONTROL DE MEMBRESÍAS Y LICENCIAS */}
      {activeTab === 'MEMBERSHIPS' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Tarjetas KPI de Membresías */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px' }}>
            <div className="glass-panel" style={{ padding: '16px 20px', borderRadius: '14px', background: 'var(--bg-card)', border: '1px solid var(--border-subtle)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)' }}>Licencias Activas</span>
                <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#10b981' }}></span>
              </div>
              <div style={{ fontSize: '1.8rem', fontWeight: 900, color: '#059669', marginTop: '6px' }}>
                {allUsers.filter(u => u.membershipStatus === 'ACTIVE' || !u.membershipStatus).length}
              </div>
              <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', marginTop: '2px' }}>Acceso total habilitado</div>
            </div>

            <div className="glass-panel" style={{ padding: '16px 20px', borderRadius: '14px', background: 'var(--bg-card)', border: '1px solid var(--border-subtle)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)' }}>En Prueba (Trial)</span>
                <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#3b82f6' }}></span>
              </div>
              <div style={{ fontSize: '1.8rem', fontWeight: 900, color: '#2563eb', marginTop: '6px' }}>
                {allUsers.filter(u => u.membershipStatus === 'TRIAL').length}
              </div>
              <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', marginTop: '2px' }}>Período promocional</div>
            </div>

            <div className="glass-panel" style={{ padding: '16px 20px', borderRadius: '14px', background: 'var(--bg-card)', border: '1px solid var(--border-subtle)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)' }}>Licencias Vencidas</span>
                <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#ef4444' }}></span>
              </div>
              <div style={{ fontSize: '1.8rem', fontWeight: 900, color: '#dc2626', marginTop: '6px' }}>
                {allUsers.filter(u => u.membershipStatus === 'EXPIRED').length}
              </div>
              <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', marginTop: '2px' }}>Requieren renovación de pago</div>
            </div>

            <div className="glass-panel" style={{ padding: '16px 20px', borderRadius: '14px', background: 'var(--bg-card)', border: '1px solid var(--border-subtle)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)' }}>Planes Vitalicios</span>
                <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#7c3aed' }}></span>
              </div>
              <div style={{ fontSize: '1.8rem', fontWeight: 900, color: '#7c3aed', marginTop: '6px' }}>
                {allUsers.filter(u => u.membershipPlan === 'LIFETIME').length}
              </div>
              <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', marginTop: '2px' }}>Sin fecha de vencimiento</div>
            </div>
          </div>

          {/* Filtros de la Tabla de Membresías */}
          <div className="glass-panel" style={{
            padding: '20px',
            borderRadius: '16px',
            border: '1px solid var(--border-subtle)',
            background: 'var(--bg-card)',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800 }}>
                  Gestión y Renovación de Licencias
                </h3>
                <p style={{ margin: '2px 0 0 0', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  Monitorea las membresías de los docentes independientes y centros educativos; extiende fechas en 1 clic.
                </p>
              </div>

              {/* Botones de Filtro Rápido por Estado */}
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                {(['ALL', 'ACTIVE', 'TRIAL', 'EXPIRED'] as const).map(st => (
                  <button
                    key={st}
                    onClick={() => setMembershipStatusFilter(st)}
                    className={`btn ${membershipStatusFilter === st ? 'btn-primary' : 'btn-secondary'} btn-sm`}
                    style={{ fontSize: '0.76rem', fontWeight: 700, padding: '5px 12px' }}
                  >
                    {st === 'ALL' ? 'Todos los Estados' : st === 'ACTIVE' ? '🟢 Activas' : st === 'TRIAL' ? '🔵 En Prueba' : '🔴 Vencidas'}
                  </button>
                ))}
              </div>
            </div>

            {/* Buscador de Membresías */}
            <div style={{ position: 'relative', width: '320px', maxWidth: '100%' }}>
              <Search size={16} color="#7c3aed" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
              <input
                type="text"
                placeholder="Filtrar por usuario, cédula o correo..."
                value={membershipSearch}
                onChange={e => setMembershipSearch(e.target.value)}
                className="input-field"
                style={{ width: '100%', padding: '8px 12px 8px 36px', fontSize: '0.82rem' }}
              />
              {membershipSearch && (
                <button
                  type="button"
                  onClick={() => setMembershipSearch('')}
                  style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}
                >
                  <X size={14} />
                </button>
              )}
            </div>

            {/* Tabla de Membresías */}
            <div style={{ overflowX: 'auto', border: '1px solid var(--border-subtle)', borderRadius: '12px' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid var(--border-subtle)', background: 'var(--bg-surface)', textAlign: 'left' }}>
                    <th style={{ padding: '12px 14px' }}>Usuario</th>
                    <th style={{ padding: '12px 14px' }}>Institución / Tipo</th>
                    <th style={{ padding: '12px 14px' }}>Plan</th>
                    <th style={{ padding: '12px 14px' }}>Estado</th>
                    <th style={{ padding: '12px 14px' }}>Fecha de Vencimiento</th>
                    <th style={{ padding: '12px 14px', textAlign: 'right' }}>Renovación Rápida & Gestión</th>
                  </tr>
                </thead>
                <tbody>
                  {allUsers
                    .filter(u => {
                      const st = u.membershipStatus || 'ACTIVE';
                      if (membershipStatusFilter !== 'ALL' && st !== membershipStatusFilter) return false;
                      if (membershipSearch.trim()) {
                        const q = membershipSearch.toLowerCase().trim();
                        return u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q) || (u.idNumber && u.idNumber.toLowerCase().includes(q));
                      }
                      return true;
                    })
                    .map(u => {
                      const inst = allInstitutions.find(i => i.id === u.institutionId);
                      const plan = u.membershipPlan || 'ANNUAL';
                      const st = u.membershipStatus || 'ACTIVE';
                      const isExpired = st === 'EXPIRED';

                      return (
                        <tr key={u.id} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                          <td style={{ padding: '12px 14px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                              <div style={{
                                width: '36px',
                                height: '36px',
                                borderRadius: '50%',
                                background: 'linear-gradient(135deg, #7c3aed, #4f46e5)',
                                color: 'white',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontWeight: 800,
                                fontSize: '0.85rem',
                                overflow: 'hidden',
                                border: '2px solid rgba(124, 58, 237, 0.25)',
                                flexShrink: 0
                              }}>
                                {u.avatarUrl ? (
                                  <img src={u.avatarUrl} alt={u.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                ) : (
                                  u.name.charAt(0).toUpperCase()
                                )}
                              </div>
                              <div>
                                <div style={{ fontWeight: 700, color: 'var(--text-main)' }}>{u.name}</div>
                                <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>{u.email}</div>
                              </div>
                            </div>
                          </td>
                          <td style={{ padding: '12px 14px' }}>
                            {u.institutionId === 'inst-indep-01' ? (
                              <span className="badge" style={{ background: 'rgba(16, 185, 129, 0.12)', color: '#059669', fontWeight: 700 }}>
                                Docente Independiente
                              </span>
                            ) : inst ? (
                              <span>{inst.name}</span>
                            ) : (
                              <span style={{ color: 'var(--text-muted)' }}>Global</span>
                            )}
                          </td>
                          <td style={{ padding: '12px 14px' }}>
                            <span className="badge" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)', fontWeight: 700 }}>
                              {plan === 'LIFETIME' ? '👑 Vitalicia' : plan === 'ANNUAL' ? '📅 Anual' : plan === 'MONTHLY' ? '🗓️ Mensual' : '🎁 Gratuita'}
                            </span>
                          </td>
                          <td style={{ padding: '12px 14px' }}>
                            <span className="badge" style={{
                              background: st === 'ACTIVE' ? 'rgba(16, 185, 129, 0.15)' : st === 'TRIAL' ? 'rgba(59, 130, 246, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                              color: st === 'ACTIVE' ? '#059669' : st === 'TRIAL' ? '#2563eb' : '#dc2626',
                              fontWeight: 800
                            }}>
                              ● {st === 'ACTIVE' ? 'Activa' : st === 'TRIAL' ? 'En Prueba' : st === 'EXPIRED' ? 'Vencida' : 'Inactiva'}
                            </span>
                          </td>
                          <td style={{ padding: '12px 14px' }}>
                            {plan === 'LIFETIME' ? (
                              <span style={{ color: '#7c3aed', fontWeight: 700, fontSize: '0.8rem' }}>Ilimitada (Sin Vencimiento)</span>
                            ) : (
                              <span style={{ fontFamily: 'monospace', fontWeight: 700, color: isExpired ? '#dc2626' : 'var(--text-main)' }}>
                                {u.membershipExpiresAt || 'No definida'}
                              </span>
                            )}
                          </td>
                          <td style={{ padding: '12px 14px', textAlign: 'right' }}>
                            <div style={{ display: 'inline-flex', gap: '6px', alignItems: 'center' }}>
                              {plan !== 'LIFETIME' && (
                                <>
                                  <button
                                    type="button"
                                    onClick={() => handleQuickRenew(u, 30)}
                                    className="btn btn-secondary btn-sm"
                                    style={{ fontSize: '0.72rem', padding: '4px 8px' }}
                                    title="Extender 30 días a partir de hoy o fecha actual"
                                  >
                                    +30d
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleQuickRenew(u, 365)}
                                    className="btn btn-secondary btn-sm"
                                    style={{ fontSize: '0.72rem', padding: '4px 8px' }}
                                    title="Extender 1 año"
                                  >
                                    +1 año
                                  </button>
                                </>
                              )}
                              <button
                                type="button"
                                onClick={() => handleOpenMembershipModal(u)}
                                className="btn btn-primary btn-sm"
                                style={{
                                  fontSize: '0.74rem',
                                  padding: '4px 10px',
                                  fontWeight: 700,
                                  background: 'linear-gradient(135deg, #7c3aed 0%, #4f46e5 100%)'
                                }}
                              >
                                <Sparkles size={12} />
                                <span>Gestionar</span>
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: GESTIONAR MEMBRESÍA Y LICENCIA */}
      {membershipModalUser && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.7)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 400,
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
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Sparkles size={20} color="#7c3aed" />
                <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800 }}>Gestionar Membresía</h3>
              </div>
              <button onClick={() => setMembershipModalUser(null)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
                <X size={20} />
              </button>
            </div>

            <div style={{ background: 'var(--bg-surface)', padding: '10px 14px', borderRadius: '10px', marginBottom: '16px', fontSize: '0.84rem' }}>
              <div>Usuario: <strong>{membershipModalUser.name}</strong></div>
              <div style={{ color: 'var(--text-muted)' }}>{membershipModalUser.email}</div>
            </div>

            <form onSubmit={handleSaveMembership} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, marginBottom: '6px' }}>
                  Plan de Membresía:
                </label>
                <select
                  value={mPlan}
                  onChange={e => setMPlan(e.target.value as MembershipPlan)}
                  className="input-field"
                  style={{ width: '100%', padding: '9px 12px', fontWeight: 600 }}
                >
                  <option value="MONTHLY">📅 Plan Mensual</option>
                  <option value="ANNUAL">🌟 Plan Anual (Recomendado)</option>
                  <option value="LIFETIME">👑 Licencia Vitalicia (Permanente)</option>
                  <option value="FREE">🆓 Plan Gratuito / Período Básico</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, marginBottom: '6px' }}>
                  Estado de la Suscripción:
                </label>
                <select
                  value={mStatus}
                  onChange={e => setMStatus(e.target.value as MembershipStatus)}
                  className="input-field"
                  style={{ width: '100%', padding: '9px 12px', fontWeight: 600 }}
                >
                  <option value="ACTIVE">🟢 Activa (Acceso Total)</option>
                  <option value="TRIAL">🔵 En Período de Prueba</option>
                  <option value="EXPIRED">🔴 Vencida (Pago Pendiente)</option>
                  <option value="INACTIVE">⚪ Inactiva / Pausada</option>
                </select>
              </div>

              {mPlan !== 'LIFETIME' && (
                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, marginBottom: '6px' }}>
                    Fecha de Vencimiento:
                  </label>
                  <input
                    type="date"
                    value={mExpiresAt}
                    onChange={e => setMExpiresAt(e.target.value)}
                    className="input-field"
                    style={{ width: '100%', padding: '9px 12px', fontWeight: 600 }}
                  />

                  {/* Botones de duración rápida */}
                  <div style={{ display: 'flex', gap: '6px', marginTop: '8px' }}>
                    <button
                      type="button"
                      onClick={() => handleSetQuickDuration(30)}
                      className="btn btn-ghost btn-sm"
                      style={{ fontSize: '0.72rem', padding: '4px 8px' }}
                    >
                      +30 días
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSetQuickDuration(365)}
                      className="btn btn-ghost btn-sm"
                      style={{ fontSize: '0.72rem', padding: '4px 8px' }}
                    >
                      +1 año
                    </button>
                    <button
                      type="button"
                      onClick={() => setMPlan('LIFETIME')}
                      className="btn btn-ghost btn-sm"
                      style={{ fontSize: '0.72rem', padding: '4px 8px', color: '#7c3aed' }}
                    >
                      Vitalicia
                    </button>
                  </div>
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '12px' }}>
                <button type="button" onClick={() => setMembershipModalUser(null)} className="btn btn-secondary">
                  Cancelar
                </button>
                <button type="submit" className="btn btn-primary" style={{ background: 'linear-gradient(135deg, #7c3aed 0%, #4f46e5 100%)' }}>
                  Guardar Membresía
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: EDITAR USUARIO (MODO DESARROLLADOR) */}
      {editingUser && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.7)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 400,
          padding: '16px'
        }}>
          <div className="glass-panel" style={{
            width: '100%',
            maxWidth: '520px',
            maxHeight: '90vh',
            overflowY: 'auto',
            padding: '24px',
            borderRadius: '16px',
            background: 'var(--bg-card)',
            border: '1px solid var(--border-subtle)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Edit3 size={20} color="#7c3aed" />
                <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800 }}>Editar Usuario</h3>
              </div>
              <button onClick={() => setEditingUser(null)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleUpdateUser} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {/* Cédula con Botón de Búsqueda (Solo Lupa) */}
              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, marginBottom: '4px' }}>
                  Cédula / Identificación:
                </label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <input
                    type="text"
                    value={editingUser.idNumber || ''}
                    onChange={e => setEditingUser({ ...editingUser, idNumber: e.target.value })}
                    className="input-field"
                    style={{ flex: 1, padding: '9px 12px', fontFamily: 'monospace', fontWeight: 600 }}
                  />
                  <button
                    type="button"
                    onClick={() => handleQueryCedulaForEdit(editingUser.idNumber || '')}
                    disabled={isQueryingEditCedula || !editingUser.idNumber?.trim()}
                    className="btn btn-primary"
                    style={{ padding: '0 16px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                    title="Consultar identificación"
                  >
                    {isQueryingEditCedula ? <Loader2 size={16} className="animate-spin" /> : <Search size={16} />}
                  </button>
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, marginBottom: '4px' }}>Nombre Completo *</label>
                <input
                  type="text"
                  value={editingUser.name}
                  onChange={e => setEditingUser({ ...editingUser, name: e.target.value })}
                  required
                  className="input-field"
                  style={{ width: '100%', padding: '9px 12px' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, marginBottom: '4px' }}>Correo Electrónico *</label>
                  <input
                    type="email"
                    value={editingUser.email}
                    onChange={e => setEditingUser({ ...editingUser, email: e.target.value })}
                    required
                    className="input-field"
                    style={{ width: '100%', padding: '9px 12px' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, marginBottom: '4px' }}>Contraseña *</label>
                  <input
                    type="text"
                    value={editingUser.password || '123'}
                    onChange={e => setEditingUser({ ...editingUser, password: e.target.value })}
                    required
                    className="input-field"
                    style={{ width: '100%', padding: '9px 12px' }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, marginBottom: '4px' }}>Rol Asignado *</label>
                  <select
                    value={editingUser.role}
                    onChange={e => setEditingUser({ ...editingUser, role: e.target.value as any })}
                    className="input-field"
                    style={{ width: '100%', padding: '9px 12px', fontWeight: 700 }}
                  >
                    <option value="DIRECTOR">🏫 Director Institucional</option>
                    <option value="ADMIN">📋 Administrativo</option>
                    <option value="TEACHER">👩‍🏫 Docente</option>
                    <option value="DEVELOPER">👑 Desarrollador</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, marginBottom: '4px' }}>Institución *</label>
                  <select
                    value={editingUser.institutionId}
                    onChange={e => setEditingUser({ ...editingUser, institutionId: e.target.value })}
                    className="input-field"
                    style={{ width: '100%', padding: '9px 12px' }}
                  >
                    {allInstitutions.map(inst => (
                      <option key={inst.id} value={inst.id}>{inst.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, marginBottom: '4px' }}>Teléfono</label>
                  <input
                    type="text"
                    value={editingUser.phone || ''}
                    onChange={e => setEditingUser({ ...editingUser, phone: e.target.value })}
                    placeholder="8888-8888"
                    className="input-field"
                    style={{ width: '100%', padding: '9px 12px' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, marginBottom: '4px' }}>Cargo / Especialidad</label>
                  <input
                    type="text"
                    value={editingUser.title || ''}
                    onChange={e => setEditingUser({ ...editingUser, title: e.target.value })}
                    className="input-field"
                    style={{ width: '100%', padding: '9px 12px' }}
                  />
                </div>
              </div>

              {/* Foto de Perfil / Avatar */}
              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, marginBottom: '4px' }}>Foto de Perfil (Opcional)</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', background: 'var(--bg-surface)', padding: '10px 12px', borderRadius: '10px', border: '1px solid var(--border-subtle)' }}>
                  <div style={{
                    width: '46px',
                    height: '46px',
                    borderRadius: '50%',
                    background: 'linear-gradient(135deg, #7c3aed, #4f46e5)',
                    color: 'white',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 800,
                    fontSize: '1rem',
                    overflow: 'hidden',
                    border: '2px solid rgba(124, 58, 237, 0.3)',
                    flexShrink: 0
                  }}>
                    {editingUser.avatarUrl ? (
                      <img src={editingUser.avatarUrl} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                      editingUser.name ? editingUser.name.charAt(0).toUpperCase() : <Users size={18} />
                    )}
                  </div>
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '5px' }}>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <input
                        type="text"
                        placeholder="URL de foto o subir archivo..."
                        value={editingUser.avatarUrl || ''}
                        onChange={e => setEditingUser({ ...editingUser, avatarUrl: e.target.value })}
                        className="input-field"
                        style={{ flex: 1, padding: '7px 10px', fontSize: '0.8rem' }}
                      />
                      <label className="btn btn-secondary btn-sm" style={{ padding: '0 10px', display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer', fontSize: '0.76rem' }}>
                        <UploadCloud size={14} color="#7c3aed" />
                        <span>Subir</span>
                        <input
                          type="file"
                          accept="image/*"
                          style={{ display: 'none' }}
                          onChange={e => handleImageFileRead(e, (url) => setEditingUser({ ...editingUser, avatarUrl: url }))}
                        />
                      </label>
                    </div>
                    {editingUser.avatarUrl && (
                      <button
                        type="button"
                        onClick={() => setEditingUser({ ...editingUser, avatarUrl: undefined })}
                        style={{ background: 'transparent', border: 'none', color: '#ef4444', fontSize: '0.72rem', cursor: 'pointer', textAlign: 'left', padding: 0 }}
                      >
                        Quitar foto
                      </button>
                    )}
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '12px' }}>
                <button type="button" onClick={() => setEditingUser(null)} className="btn btn-secondary">
                  Cancelar
                </button>
                <button type="submit" className="btn btn-primary" style={{ background: 'linear-gradient(135deg, #7c3aed 0%, #4f46e5 100%)' }}>
                  Guardar Cambios
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: EDITAR INSTITUCIÓN */}
      {editingInstitution && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.7)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 400,
          padding: '16px'
        }}>
          <div className="glass-panel" style={{
            width: '100%',
            maxWidth: '520px',
            maxHeight: '90vh',
            overflowY: 'auto',
            padding: '24px',
            borderRadius: '16px',
            background: 'var(--bg-card)',
            border: '1px solid var(--border-subtle)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Building2 size={20} color="#7c3aed" />
                <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800 }}>Editar Institución</h3>
              </div>
              <button onClick={() => setEditingInstitution(null)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleUpdateInstitution} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {/* Logo / Foto URL con preview */}
              <div style={{ display: 'flex', gap: '14px', alignItems: 'center', background: 'var(--bg-surface)', padding: '12px', borderRadius: '10px' }}>
                <div style={{
                  width: '54px',
                  height: '54px',
                  borderRadius: '10px',
                  background: 'var(--bg-main)',
                  border: '1px solid var(--border-subtle)',
                  overflow: 'hidden',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0
                }}>
                  {editingInstitution.logoUrl ? (
                    <img src={editingInstitution.logoUrl} alt="Logo" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    <Building2 size={24} color="#7c3aed" />
                  )}
                </div>
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, marginBottom: '2px' }}>Logotipo o Escudo Institucional:</label>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <input
                      type="url"
                      value={editingInstitution.logoUrl || ''}
                      onChange={e => setEditingInstitution({ ...editingInstitution, logoUrl: e.target.value })}
                      placeholder="https://ejemplo.com/logo.png o subir..."
                      className="input-field"
                      style={{ flex: 1, padding: '7px 10px', fontSize: '0.8rem' }}
                    />
                    <label className="btn btn-secondary btn-sm" style={{ padding: '0 10px', display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer', fontSize: '0.76rem' }}>
                      <UploadCloud size={14} color="#7c3aed" />
                      <span>Subir</span>
                      <input
                        type="file"
                        accept="image/*"
                        style={{ display: 'none' }}
                        onChange={e => handleImageFileRead(e, (url) => setEditingInstitution({ ...editingInstitution, logoUrl: url }))}
                      />
                    </label>
                  </div>
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, marginBottom: '4px' }}>Nombre de la Institución *</label>
                <input
                  type="text"
                  value={editingInstitution.name}
                  onChange={e => setEditingInstitution({ ...editingInstitution, name: e.target.value })}
                  required
                  className="input-field"
                  style={{ width: '100%', padding: '9px 12px' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, marginBottom: '4px' }}>Código Institucional *</label>
                  <input
                    type="text"
                    value={editingInstitution.code}
                    onChange={e => setEditingInstitution({ ...editingInstitution, code: e.target.value })}
                    required
                    className="input-field"
                    style={{ width: '100%', padding: '9px 12px', fontFamily: 'monospace' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, marginBottom: '4px' }}>Tipo de Institución *</label>
                  <select
                    value={editingInstitution.type}
                    onChange={e => setEditingInstitution({ ...editingInstitution, type: e.target.value as any })}
                    className="input-field"
                    style={{ width: '100%', padding: '9px 12px', fontWeight: 700 }}
                  >
                    <option value="COLLEGE">🏫 Colegio (Secundaria)</option>
                    <option value="SCHOOL">🎒 Escuela (Primaria)</option>
                    <option value="UNIVERSITY">🎓 Universidad / Instituto</option>
                    <option value="INDEPENDENT">👨‍🏫 Espacio Independiente</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, marginBottom: '4px' }}>Circuito Escolar</label>
                  <input
                    type="text"
                    value={editingInstitution.circuit || ''}
                    onChange={e => setEditingInstitution({ ...editingInstitution, circuit: e.target.value })}
                    placeholder="Ej. Circuito 02"
                    className="input-field"
                    style={{ width: '100%', padding: '9px 12px' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, marginBottom: '4px' }}>Dirección Regional</label>
                  <input
                    type="text"
                    value={editingInstitution.regionalDirection || ''}
                    onChange={e => setEditingInstitution({ ...editingInstitution, regionalDirection: e.target.value })}
                    placeholder="Ej. DRE Alajuela"
                    className="input-field"
                    style={{ width: '100%', padding: '9px 12px' }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '12px' }}>
                <button type="button" onClick={() => setEditingInstitution(null)} className="btn btn-secondary">
                  Cancelar
                </button>
                <button type="submit" className="btn btn-primary" style={{ background: 'linear-gradient(135deg, #7c3aed 0%, #4f46e5 100%)' }}>
                  Guardar Institución
                </button>
              </div>
            </form>
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
                  placeholder="Ej. Liceo de Poás"
                  required
                  className="input-field"
                  style={{ width: '100%', padding: '9px 12px' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, marginBottom: '4px' }}>Logotipo o Escudo Institucional:</label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <input
                    type="url"
                    value={instLogoUrl}
                    onChange={(e) => setInstLogoUrl(e.target.value)}
                    placeholder="https://ejemplo.com/logo.png o subir..."
                    className="input-field"
                    style={{ flex: 1, padding: '7px 10px', fontSize: '0.8rem' }}
                  />
                  <label className="btn btn-secondary btn-sm" style={{ padding: '0 10px', display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer', fontSize: '0.76rem' }}>
                    <UploadCloud size={14} color="#7c3aed" />
                    <span>Subir</span>
                    <input
                      type="file"
                      accept="image/*"
                      style={{ display: 'none' }}
                      onChange={e => handleImageFileRead(e, setInstLogoUrl)}
                    />
                  </label>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, marginBottom: '4px' }}>Código Institucional *</label>
                  <input
                    type="text"
                    value={instCode}
                    onChange={(e) => setInstCode(e.target.value)}
                    placeholder="Ej. CTP-001"
                    required
                    className="input-field"
                    style={{ width: '100%', padding: '9px 12px', fontFamily: 'monospace' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, marginBottom: '4px' }}>Tipo de Centro *</label>
                  <select
                    value={instType}
                    onChange={(e) => setInstType(e.target.value as any)}
                    className="input-field"
                    style={{ width: '100%', padding: '9px 12px', fontWeight: 700 }}
                  >
                    <option value="COLLEGE">Colegio</option>
                    <option value="SCHOOL">Escuela</option>
                    <option value="UNIVERSITY">Universidad</option>
                    <option value="INDEPENDENT">Independiente</option>
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
                    placeholder="Ej. Circuito 01"
                    className="input-field"
                    style={{ width: '100%', padding: '9px 12px' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, marginBottom: '4px' }}>Dirección Regional</label>
                  <input
                    type="text"
                    value={instRegional}
                    onChange={(e) => setInstRegional(e.target.value)}
                    placeholder="Ej. Alajuela"
                    className="input-field"
                    style={{ width: '100%', padding: '9px 12px' }}
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

      {/* MODAL: NUEVO USUARIO */}
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
            maxWidth: '520px',
            padding: '24px',
            borderRadius: '16px',
            background: 'var(--bg-card)',
            border: '1px solid var(--border-subtle)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800 }}>Crear Nuevo Usuario</h3>
                <p style={{ margin: 0, fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                  Asigna cualquier rol (Director, Admin, Docente o Desarrollador) con autocompletado de cédula.
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
              {/* Cédula con Botón de Búsqueda (Solo Lupa) */}
              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, marginBottom: '4px' }}>
                  Cédula / Identificación:
                </label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <input
                    type="text"
                    value={userIdNumber}
                    onChange={e => {
                      setUserIdNumber(e.target.value);
                      const clean = e.target.value.replace(/[^0-9]/g, '');
                      if (clean.length === 9 && !userName) {
                        handleQueryCedulaForAdd(clean);
                      }
                    }}
                    placeholder="Ej. 109870654"
                    className="input-field"
                    style={{ flex: 1, padding: '9px 12px', fontFamily: 'monospace', fontWeight: 600 }}
                  />
                  <button
                    type="button"
                    onClick={() => handleQueryCedulaForAdd(userIdNumber)}
                    disabled={isQueryingAddCedula || !userIdNumber.trim()}
                    className="btn btn-primary"
                    style={{ padding: '0 16px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                    title="Consultar identificación"
                  >
                    {isQueryingAddCedula ? <Loader2 size={16} className="animate-spin" /> : <Search size={16} />}
                  </button>
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, marginBottom: '4px' }}>Nombre Completo *</label>
                <input
                  type="text"
                  value={userName}
                  onChange={(e) => setUserName(e.target.value)}
                  placeholder="Ej. Lic. Ana Vargas Solís"
                  required
                  className="input-field"
                  style={{ width: '100%', padding: '9px 12px' }}
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
                    className="input-field"
                    style={{ width: '100%', padding: '9px 12px' }}
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
                    className="input-field"
                    style={{ width: '100%', padding: '9px 12px' }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, marginBottom: '4px' }}>Rol Asignado *</label>
                  <select
                    value={userRole}
                    onChange={(e) => setUserRole(e.target.value as any)}
                    className="input-field"
                    style={{ width: '100%', padding: '9px 12px', fontWeight: 700 }}
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
                    className="input-field"
                    style={{ width: '100%', padding: '9px 12px' }}
                  >
                    {allInstitutions.map(inst => (
                      <option key={inst.id} value={inst.id}>{inst.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, marginBottom: '4px' }}>Teléfono</label>
                  <input
                    type="text"
                    value={userPhone}
                    onChange={(e) => setUserPhone(e.target.value)}
                    placeholder="8888-8888"
                    className="input-field"
                    style={{ width: '100%', padding: '9px 12px' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, marginBottom: '4px' }}>Cargo / Especialidad</label>
                  <input
                    type="text"
                    value={userTitle}
                    onChange={(e) => setUserTitle(e.target.value)}
                    placeholder="Ej. Docente Matemáticas"
                    className="input-field"
                    style={{ width: '100%', padding: '9px 12px' }}
                  />
                </div>
              </div>

              {/* Foto de Perfil / Avatar */}
              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, marginBottom: '4px' }}>Foto de Perfil (Opcional)</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', background: 'var(--bg-surface)', padding: '10px 12px', borderRadius: '10px', border: '1px solid var(--border-subtle)' }}>
                  <div style={{
                    width: '46px',
                    height: '46px',
                    borderRadius: '50%',
                    background: 'linear-gradient(135deg, #7c3aed, #4f46e5)',
                    color: 'white',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 800,
                    fontSize: '1rem',
                    overflow: 'hidden',
                    border: '2px solid rgba(124, 58, 237, 0.3)',
                    flexShrink: 0
                  }}>
                    {userAvatarUrl ? (
                      <img src={userAvatarUrl} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                      userName ? userName.charAt(0).toUpperCase() : <Users size={18} />
                    )}
                  </div>
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '5px' }}>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <input
                        type="text"
                        placeholder="URL de foto o subir archivo..."
                        value={userAvatarUrl}
                        onChange={e => setUserAvatarUrl(e.target.value)}
                        className="input-field"
                        style={{ flex: 1, padding: '7px 10px', fontSize: '0.8rem' }}
                      />
                      <label className="btn btn-secondary btn-sm" style={{ padding: '0 10px', display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer', fontSize: '0.76rem' }}>
                        <UploadCloud size={14} color="#7c3aed" />
                        <span>Subir</span>
                        <input
                          type="file"
                          accept="image/*"
                          style={{ display: 'none' }}
                          onChange={e => handleImageFileRead(e, setUserAvatarUrl)}
                        />
                      </label>
                    </div>
                    {userAvatarUrl && (
                      <button
                        type="button"
                        onClick={() => setUserAvatarUrl('')}
                        style={{ background: 'transparent', border: 'none', color: '#ef4444', fontSize: '0.72rem', cursor: 'pointer', textAlign: 'left', padding: 0 }}
                      >
                        Quitar foto
                      </button>
                    )}
                  </div>
                </div>
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
