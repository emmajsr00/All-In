import React from 'react';
import {
  Building2,
  ArrowRight,
  GraduationCap,
  LogOut,
  Sun,
  Moon,
  Users,
  BookOpen,
  Sparkles,
  School,
  CheckCircle2,
  ShieldCheck
} from 'lucide-react';
import type { User, Institution, Group, TeacherAssignment } from '../types';

interface TeacherInstitutionHubProps {
  currentUser: User;
  allInstitutions: Institution[];
  groups: Group[];
  assignments: TeacherAssignment[];
  onSelectInstitution: (institutionId: string) => void;
  onLogout: () => void;
  isDarkMode: boolean;
  onToggleTheme: () => void;
}

export const TeacherInstitutionHub: React.FC<TeacherInstitutionHubProps> = ({
  currentUser,
  allInstitutions,
  groups,
  assignments,
  onSelectInstitution,
  onLogout,
  isDarkMode,
  onToggleTheme
}) => {
  // Filtrar estrictamente solo las instituciones ligadas al docente
  const teacherLinkedInstitutions = React.useMemo(() => {
    const ids = new Set<string>();
    if (currentUser.institutionId) ids.add(currentUser.institutionId);
    if (currentUser.institutionIds && Array.isArray(currentUser.institutionIds)) {
      currentUser.institutionIds.forEach(id => {
        if (id) ids.add(id);
      });
    }
    // Añadir instituciones donde el docente tenga asignaciones de clases o sea guía
    assignments.filter(a => a.teacherId === currentUser.id).forEach(a => {
      const grp = groups.find(g => g.id === a.groupId);
      if (grp?.institutionId) ids.add(grp.institutionId);
    });
    groups.filter(g => g.guideTeacherId === currentUser.id).forEach(g => {
      if (g.institutionId) ids.add(g.institutionId);
    });

    const list = allInstitutions.filter(inst => ids.has(inst.id));
    if (list.length > 0) return list;

    // Fallback: Si no tiene ninguna, usar su institución asignada principal o la primera
    const primary = allInstitutions.find(i => i.id === currentUser.institutionId);
    return primary ? [primary] : (allInstitutions.length > 0 ? [allInstitutions[0]] : []);
  }, [currentUser, allInstitutions, assignments, groups]);

  const getInstitutionTypeLabel = (type: string) => {
    switch (type) {
      case 'TECHNICAL': return 'Colegio Técnico Profesional (CTP)';
      case 'HIGH_SCHOOL': return 'Liceo Académico';
      case 'PRIMARY': return 'Escuela Primaria';
      case 'UNIVERSITY': return 'Universidad / Superior';
      case 'INDEPENDENT': return 'Docencia Independiente';
      default: return 'Centro Educativo';
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      background: 'var(--bg-main)',
      color: 'var(--text-main)',
      position: 'relative'
    }}>
      {/* Barra Superior Minimalista */}
      <header style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '16px 28px',
        borderBottom: '1px solid var(--border-subtle)',
        background: 'var(--bg-card)',
        backdropFilter: 'blur(10px)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{
            width: '38px',
            height: '38px',
            borderRadius: '10px',
            background: 'var(--primary-gradient)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white',
            fontWeight: 800,
            fontSize: '1.1rem',
            boxShadow: '0 4px 12px rgba(79, 70, 229, 0.3)'
          }}>
            A
          </div>
          <div>
            <div style={{ fontSize: '1.05rem', fontWeight: 800, letterSpacing: '-0.02em' }}>
              ALL-IN <span style={{ color: 'var(--primary-500)', fontSize: '0.8rem', fontWeight: 700 }}>PRO</span>
            </div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 600 }}>
              Gestión Educativa Inteligente
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {/* Perfil del Docente */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            padding: '6px 12px',
            borderRadius: '12px',
            background: 'var(--bg-surface)',
            border: '1px solid var(--border-subtle)'
          }}>
            {currentUser.avatarUrl ? (
              <img
                src={currentUser.avatarUrl}
                alt={currentUser.name}
                style={{ width: '28px', height: '28px', borderRadius: '50%', objectFit: 'cover' }}
              />
            ) : (
              <div style={{
                width: '28px',
                height: '28px',
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)',
                color: 'white',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '0.75rem',
                fontWeight: 700
              }}>
                {currentUser.name.charAt(0)}
              </div>
            )}
            <div style={{ textAlign: 'left' }}>
              <div style={{ fontSize: '0.82rem', fontWeight: 700 }}>
                {currentUser.name}
              </div>
              <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>
                {currentUser.title || 'Docente'}
              </div>
            </div>
          </div>

          {/* Theme Toggle */}
          <button
            onClick={onToggleTheme}
            className="btn btn-sm btn-secondary"
            style={{ padding: '8px', borderRadius: '10px' }}
            title={isDarkMode ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
          >
            {isDarkMode ? <Sun size={16} color="#f59e0b" /> : <Moon size={16} color="#6366f1" />}
          </button>

          {/* Cerrar Sesión */}
          <button
            onClick={onLogout}
            className="btn btn-sm btn-secondary"
            style={{
              padding: '8px 12px',
              borderRadius: '10px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              color: '#ef4444',
              borderColor: 'rgba(239, 68, 68, 0.2)'
            }}
            title="Cerrar sesión"
          >
            <LogOut size={15} />
            <span style={{ fontSize: '0.8rem', fontWeight: 600 }}>Salir</span>
          </button>
        </div>
      </header>

      {/* Contenido Central: Workspace Selector */}
      <main style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '40px 20px',
        maxWidth: '1080px',
        width: '100%',
        margin: '0 auto'
      }}>
        {/* Cabecera del Hub */}
        <div style={{ textAlign: 'center', marginBottom: '36px', maxWidth: '640px' }}>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            padding: '6px 14px',
            borderRadius: '20px',
            background: 'rgba(79, 70, 229, 0.12)',
            color: 'var(--primary-600)',
            fontSize: '0.78rem',
            fontWeight: 800,
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            marginBottom: '14px'
          }}>
            <Sparkles size={14} /> Espacio de Trabajo Docente
          </div>

          <h1 style={{
            fontSize: '2.2rem',
            fontWeight: 900,
            letterSpacing: '-0.03em',
            marginBottom: '10px',
            lineHeight: 1.2
          }}>
            ¿En qué institución vas a laborar hoy?
          </h1>

          <p style={{
            fontSize: '0.98rem',
            color: 'var(--text-muted)',
            lineHeight: 1.5
          }}>
            {teacherLinkedInstitutions.length === 1
              ? 'Confirma el acceso a tu centro educativo asignado para cargar tus grupos, registro de calificaciones y asistencia.'
              : 'Selecciona una de tus instituciones educativas para cargar de forma independiente tus secciones, materias y registros correspondientes.'}
          </p>
        </div>

        {/* Cuadrícula de Tarjetas de Instituciones */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: teacherLinkedInstitutions.length === 1
            ? 'minmax(320px, 520px)'
            : 'repeat(auto-fit, minmax(320px, 1fr))',
          gap: '24px',
          width: '100%',
          justifyContent: 'center'
        }}>
          {teacherLinkedInstitutions.map((inst) => {
            // Contar secciones asignadas a este docente en esta institución
            const instGroups = groups.filter(g => g.institutionId === inst.id);
            const teacherAssignmentsInInst = assignments.filter(a => {
              if (a.teacherId !== currentUser.id) return false;
              const g = groups.find(grp => grp.id === a.groupId);
              return g?.institutionId === inst.id;
            });
            const myGroupsCount = instGroups.filter(g =>
              g.guideTeacherId === currentUser.id ||
              teacherAssignmentsInInst.some(a => a.groupId === g.id)
            ).length;

            return (
              <div
                key={inst.id}
                onClick={() => onSelectInstitution(inst.id)}
                className="glass-panel"
                style={{
                  padding: '30px',
                  borderRadius: '22px',
                  border: '1.5px solid var(--border-subtle)',
                  background: 'var(--bg-card)',
                  cursor: 'pointer',
                  transition: 'all 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  boxShadow: 'var(--shadow-md)',
                  position: 'relative',
                  overflow: 'hidden'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-4px)';
                  e.currentTarget.style.borderColor = 'var(--primary-500)';
                  e.currentTarget.style.boxShadow = '0 16px 32px -8px rgba(79, 70, 229, 0.22)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.borderColor = 'var(--border-subtle)';
                  e.currentTarget.style.boxShadow = 'var(--shadow-md)';
                }}
              >
                {/* Decoración sutil de fondo */}
                <div style={{
                  position: 'absolute',
                  top: '-40px',
                  right: '-40px',
                  width: '120px',
                  height: '120px',
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, rgba(79, 70, 229, 0.08) 0%, rgba(124, 58, 237, 0.02) 100%)',
                  pointerEvents: 'none'
                }} />

                <div>
                  {/* Icono y Badge de Tipo */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
                    <div style={{
                      width: '56px',
                      height: '56px',
                      borderRadius: '16px',
                      background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)',
                      color: 'white',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      boxShadow: '0 6px 18px rgba(79, 70, 229, 0.3)'
                    }}>
                      <Building2 size={28} />
                    </div>

                    <span className="badge" style={{
                      background: 'var(--bg-surface)',
                      color: 'var(--text-muted)',
                      fontSize: '0.72rem',
                      fontWeight: 700,
                      padding: '5px 10px',
                      borderRadius: '8px',
                      border: '1px solid var(--border-subtle)'
                    }}>
                      {getInstitutionTypeLabel(inst.type)}
                    </span>
                  </div>

                  {/* Nombre del Colegio */}
                  <h2 style={{
                    fontSize: '1.35rem',
                    fontWeight: 800,
                    marginBottom: '8px',
                    letterSpacing: '-0.02em',
                    lineHeight: 1.25,
                    color: 'var(--text-main)'
                  }}>
                    {inst.name}
                  </h2>

                  {inst.code && (
                    <div style={{
                      fontSize: '0.78rem',
                      color: 'var(--text-muted)',
                      fontWeight: 600,
                      marginBottom: '18px'
                    }}>
                      Código Institucional: <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-main)' }}>{inst.code}</span>
                    </div>
                  )}

                  {/* Estadísticas rápidas en la tarjeta */}
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr',
                    gap: '10px',
                    padding: '14px',
                    background: 'var(--bg-surface)',
                    borderRadius: '14px',
                    marginBottom: '22px',
                    border: '1px solid var(--border-subtle)'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Users size={16} color="#4f46e5" />
                      <div>
                        <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Mis Grupos</div>
                        <div style={{ fontSize: '0.95rem', fontWeight: 800 }}>
                          {myGroupsCount > 0 ? `${myGroupsCount} Secciones` : `${instGroups.length} Totales`}
                        </div>
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <BookOpen size={16} color="#06b6d4" />
                      <div>
                        <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Materias</div>
                        <div style={{ fontSize: '0.95rem', fontWeight: 800 }}>
                          {teacherAssignmentsInInst.length > 0 ? `${teacherAssignmentsInInst.length} a cargo` : 'Plan regular'}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Botón de Entrada */}
                <button
                  type="button"
                  className="btn btn-primary"
                  style={{
                    width: '100%',
                    padding: '12px 18px',
                    borderRadius: '12px',
                    fontWeight: 800,
                    fontSize: '0.92rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '10px',
                    boxShadow: '0 4px 14px rgba(79, 70, 229, 0.25)'
                  }}
                >
                  <span>Entrar al Colegio</span>
                  <ArrowRight size={17} />
                </button>
              </div>
            );
          })}
        </div>

        {/* Footer Informativo */}
        <div style={{
          marginTop: '40px',
          textAlign: 'center',
          fontSize: '0.8rem',
          color: 'var(--text-muted)',
          display: 'flex',
          alignItems: 'center',
          gap: '6px'
        }}>
          <ShieldCheck size={14} color="#10b981" />
          <span>Acceso seguro y filtrado por credenciales oficiales del docente</span>
        </div>
      </main>
    </div>
  );
};
