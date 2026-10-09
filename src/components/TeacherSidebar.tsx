import React from 'react';
import {
  LayoutDashboard,
  Layers,
  Clock,
  GraduationCap,
  Building2,
  ArrowLeftRight,
  ChevronLeft,
  ChevronRight,
  Sun,
  Moon,
  LogOut,
  User as UserIcon,
  Sparkles,
  School
} from 'lucide-react';
import type { User, Institution } from '../types';

export type TeacherTab = 'overview' | 'sections' | 'schedule' | 'independent';

interface TeacherSidebarProps {
  currentUser: User;
  currentInstitution: Institution;
  activeTab: TeacherTab;
  onSelectTab: (tab: TeacherTab) => void;
  onChangeInstitution: () => void;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  isIndependent: boolean;
  sectionsCount: number;
  onOpenProfile?: () => void;
  onLogout: () => void;
  isDarkMode: boolean;
  onToggleTheme: () => void;
}

export const TeacherSidebar: React.FC<TeacherSidebarProps> = ({
  currentUser,
  currentInstitution,
  activeTab,
  onSelectTab,
  onChangeInstitution,
  isCollapsed,
  onToggleCollapse,
  isIndependent,
  sectionsCount,
  onOpenProfile,
  onLogout,
  isDarkMode,
  onToggleTheme
}) => {
  const navItems = [
    {
      id: 'overview' as TeacherTab,
      label: 'Inicio / Resumen',
      icon: LayoutDashboard,
      description: 'Métricas y clases de hoy'
    },
    {
      id: 'sections' as TeacherTab,
      label: 'Mis Secciones',
      icon: Layers,
      count: sectionsCount,
      description: 'Grupos y materias a calificar'
    },
    {
      id: 'schedule' as TeacherTab,
      label: 'Creador de Horarios',
      icon: Clock,
      description: 'Horario semanal interactivo'
    },
    ...(isIndependent ? [{
      id: 'independent' as TeacherTab,
      label: 'Gestión Independiente',
      icon: GraduationCap,
      description: 'Matrícula y materias propias'
    }] : [])
  ];

  return (
    <aside style={{
      width: isCollapsed ? '72px' : '260px',
      minWidth: isCollapsed ? '72px' : '260px',
      height: '100vh',
      position: 'sticky',
      top: 0,
      background: 'var(--bg-card)',
      borderRight: '1px solid var(--border-subtle)',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'space-between',
      padding: isCollapsed ? '16px 8px' : '20px 16px',
      transition: 'width 0.25s cubic-bezier(0.16, 1, 0.3, 1), padding 0.25s ease',
      zIndex: 50,
      boxShadow: 'var(--shadow-sm)'
    }}>
      {/* Parte Superior: Marca e Institución Activa */}
      <div>
        {/* Brand Header */}
        <div style={{
          display: 'flex',
          flexDirection: isCollapsed ? 'column' : 'row',
          alignItems: 'center',
          justifyContent: isCollapsed ? 'center' : 'space-between',
          gap: isCollapsed ? '8px' : '10px',
          marginBottom: '20px',
          paddingBottom: '14px',
          borderBottom: '1px solid var(--border-subtle)'
        }}>
          <div
            onClick={isCollapsed ? onToggleCollapse : undefined}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              cursor: isCollapsed ? 'pointer' : 'default'
            }}
            title={isCollapsed ? "Clic para expandir menú lateral" : undefined}
          >
            <div style={{
              width: '36px',
              height: '36px',
              borderRadius: '10px',
              background: 'var(--primary-gradient)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white',
              fontWeight: 900,
              fontSize: '1.05rem',
              boxShadow: '0 4px 12px rgba(79, 70, 229, 0.3)',
              flexShrink: 0
            }}>
              A
            </div>
            {!isCollapsed && (
              <div>
                <div style={{ fontSize: '1rem', fontWeight: 900, letterSpacing: '-0.02em', lineHeight: 1 }}>
                  ALL-IN <span style={{ color: 'var(--primary-500)', fontSize: '0.75rem', fontWeight: 800 }}>PRO</span>
                </div>
                <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', fontWeight: 600, marginTop: '2px' }}>
                  Espacio Docente
                </div>
              </div>
            )}
          </div>

          <button
            onClick={onToggleCollapse}
            className="btn btn-sm btn-secondary"
            style={{
              padding: isCollapsed ? '6px 8px' : '6px',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: isCollapsed ? 'var(--bg-surface)' : 'transparent',
              border: isCollapsed ? '1px solid var(--border-subtle)' : 'none',
              cursor: 'pointer'
            }}
            title={isCollapsed ? "Expandir menú lateral" : "Colapsar menú lateral"}
          >
            {isCollapsed ? (
              <ChevronRight size={16} color="var(--primary-600)" />
            ) : (
              <ChevronLeft size={16} color="var(--text-muted)" />
            )}
          </button>
        </div>

        {/* Tarjeta de la Institución Activa (Workspace Card) */}
        {!isCollapsed ? (
          <div style={{
            padding: '12px',
            background: 'var(--bg-surface)',
            borderRadius: '14px',
            border: '1px solid var(--border-subtle)',
            marginBottom: '20px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
              <div style={{
                width: '26px',
                height: '26px',
                borderRadius: '8px',
                background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)',
                color: 'white',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0
              }}>
                <Building2 size={14} />
              </div>
              <div style={{
                fontSize: '0.68rem',
                fontWeight: 800,
                textTransform: 'uppercase',
                letterSpacing: '0.04em',
                color: 'var(--primary-600)'
              }}>
                Colegio Activo
              </div>
            </div>

            <div style={{
              fontSize: '0.86rem',
              fontWeight: 800,
              color: 'var(--text-main)',
              lineHeight: 1.25,
              marginBottom: '10px',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical'
            }} title={currentInstitution.name}>
              {currentInstitution.name}
            </div>

            <button
              onClick={onChangeInstitution}
              className="btn btn-sm btn-secondary"
              style={{
                width: '100%',
                fontSize: '0.74rem',
                fontWeight: 700,
                padding: '5px 8px',
                borderRadius: '8px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                borderColor: 'rgba(79, 70, 229, 0.25)',
                color: 'var(--primary-600)'
              }}
              title="Cambiar a otra de tus instituciones"
            >
              <ArrowLeftRight size={12} />
              <span>Cambiar Colegio</span>
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '16px' }}>
            <button
              onClick={onChangeInstitution}
              style={{
                width: '40px',
                height: '40px',
                borderRadius: '12px',
                background: 'var(--bg-surface)',
                border: '1px solid var(--border-subtle)',
                color: 'var(--primary-600)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer'
              }}
              title={`Colegio: ${currentInstitution.name}. Clic para cambiar.`}
            >
              <Building2 size={18} />
            </button>
          </div>
        )}

        {/* Lista de Navegación */}
        <nav style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          {navItems.map(item => {
            const isActive = activeTab === item.id;
            const Icon = item.icon;

            return (
              <button
                key={item.id}
                onClick={() => onSelectTab(item.id)}
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: isCollapsed ? 'center' : 'space-between',
                  gap: '12px',
                  padding: isCollapsed ? '12px' : '10px 14px',
                  borderRadius: '12px',
                  border: isActive ? '1px solid rgba(79, 70, 229, 0.25)' : '1px solid transparent',
                  background: isActive ? 'rgba(79, 70, 229, 0.12)' : 'transparent',
                  color: isActive ? 'var(--primary-600)' : 'var(--text-muted)',
                  cursor: 'pointer',
                  fontWeight: isActive ? 800 : 600,
                  fontSize: '0.88rem',
                  transition: 'all 0.18s ease',
                  textAlign: 'left'
                }}
                onMouseEnter={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.background = 'var(--bg-surface)';
                    e.currentTarget.style.color = 'var(--text-main)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.background = 'transparent';
                    e.currentTarget.style.color = 'var(--text-muted)';
                  }
                }}
                title={isCollapsed ? item.label : undefined}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <Icon size={18} color={isActive ? 'var(--primary-600)' : 'currentColor'} />
                  {!isCollapsed && <span>{item.label}</span>}
                </div>

                {!isCollapsed && item.count !== undefined && (
                  <span style={{
                    fontSize: '0.72rem',
                    fontWeight: 800,
                    padding: '2px 8px',
                    borderRadius: '10px',
                    background: isActive ? 'var(--primary-600)' : 'var(--bg-surface)',
                    color: isActive ? '#ffffff' : 'var(--text-muted)'
                  }}>
                    {item.count}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Parte Inferior: Perfil, Tema y Salir */}
      <div style={{
        paddingTop: '14px',
        borderTop: '1px solid var(--border-subtle)',
        display: 'flex',
        flexDirection: 'column',
        gap: '8px'
      }}>
        {/* Si está colapsado, botón para expandir */}
        {isCollapsed && (
          <button
            onClick={onToggleCollapse}
            className="btn btn-sm btn-secondary"
            style={{ width: '100%', padding: '8px', borderRadius: '10px', display: 'flex', justifyContent: 'center' }}
            title="Expandir menú lateral"
          >
            <ChevronRight size={16} />
          </button>
        )}

        {/* Perfil del Docente */}
        {!isCollapsed ? (
          <div
            onClick={onOpenProfile}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '10px',
              borderRadius: '12px',
              background: 'var(--bg-surface)',
              border: '1px solid var(--border-subtle)',
              cursor: onOpenProfile ? 'pointer' : 'default',
              transition: 'background 0.2s ease'
            }}
            title={onOpenProfile ? 'Clic para ver tu perfil' : undefined}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', overflow: 'hidden' }}>
              {currentUser.avatarUrl ? (
                <img
                  src={currentUser.avatarUrl}
                  alt={currentUser.name}
                  style={{ width: '32px', height: '32px', borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }}
                />
              ) : (
                <div style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)',
                  color: 'white',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '0.8rem',
                  fontWeight: 800,
                  flexShrink: 0
                }}>
                  {currentUser.name.charAt(0)}
                </div>
              )}
              <div style={{ overflow: 'hidden' }}>
                <div style={{
                  fontSize: '0.82rem',
                  fontWeight: 800,
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  color: 'var(--text-main)'
                }}>
                  {currentUser.name}
                </div>
                <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>
                  {currentUser.title || 'Docente'}
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', justifyContent: 'center' }}>
            <div
              onClick={onOpenProfile}
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)',
                color: 'white',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '0.85rem',
                fontWeight: 800,
                cursor: onOpenProfile ? 'pointer' : 'default'
              }}
              title={currentUser.name}
            >
              {currentUser.name.charAt(0)}
            </div>
          </div>
        )}

        {/* Botones de Utilidad (Tema y Salir) */}
        <div style={{
          display: 'flex',
          gap: '6px',
          justifyContent: isCollapsed ? 'center' : 'space-between'
        }}>
          <button
            onClick={onToggleTheme}
            className="btn btn-sm btn-secondary"
            style={{
              flex: isCollapsed ? 'initial' : 1,
              padding: '7px',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              fontSize: '0.76rem'
            }}
            title={isDarkMode ? 'Modo Claro' : 'Modo Oscuro'}
          >
            {isDarkMode ? <Sun size={15} color="#f59e0b" /> : <Moon size={15} color="#6366f1" />}
            {!isCollapsed && <span>{isDarkMode ? 'Claro' : 'Oscuro'}</span>}
          </button>

          <button
            onClick={onLogout}
            className="btn btn-sm btn-secondary"
            style={{
              padding: '7px 10px',
              borderRadius: '8px',
              color: '#ef4444',
              borderColor: 'rgba(239, 68, 68, 0.25)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              fontSize: '0.76rem'
            }}
            title="Cerrar sesión"
          >
            <LogOut size={15} />
            {!isCollapsed && <span>Salir</span>}
          </button>
        </div>
      </div>
    </aside>
  );
};
