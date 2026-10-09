import React from 'react';
import {
  GraduationCap,
  Building2,
  Moon,
  Sun,
  Wifi,
  LogOut,
  ShieldAlert,
  Code2,
  UserCheck
} from 'lucide-react';
import type { User, Institution } from '../types';

interface HeaderProps {
  currentUser: User;
  currentInstitution: Institution;
  allUsers: User[];
  allInstitutions: Institution[];
  onSwitchInstitution?: (institutionId: string) => void;
  onGoToDeveloperPanel?: () => void;
  onLogout: () => void;
  isDarkMode: boolean;
  onToggleTheme: () => void;
  onNavigateHome: () => void;
  isDeveloperPanelActive?: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  currentUser,
  currentInstitution,
  allInstitutions,
  onSwitchInstitution,
  onGoToDeveloperPanel,
  onLogout,
  isDarkMode,
  onToggleTheme,
  onNavigateHome,
  isDeveloperPanelActive
}) => {
  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'DEVELOPER':
        return 'Desarrollador';
      case 'DIRECTOR':
        return 'Director(a)';
      case 'ADMIN':
        return 'Administrativo';
      case 'TEACHER':
        return 'Docente';
      default:
        return role;
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'DEVELOPER':
        return { bg: 'linear-gradient(135deg, #ec4899, #8b5cf6)', text: '#ffffff' };
      case 'DIRECTOR':
        return { bg: 'linear-gradient(135deg, #4f46e5, #7c3aed)', text: '#ffffff' };
      case 'ADMIN':
        return { bg: 'rgba(8, 145, 178, 0.2)', text: '#0891b2' };
      case 'TEACHER':
      default:
        return { bg: 'rgba(16, 185, 129, 0.2)', text: '#059669' };
    }
  };

  const roleTheme = getRoleColor(currentUser.role);

  const getInstitutionBadge = (type?: string) => {
    switch (type) {
      case 'UNIVERSITY':
        return { label: 'Universidad', color: '#a855f7', bg: 'rgba(168, 85, 247, 0.12)', border: 'rgba(168, 85, 247, 0.25)' };
      case 'SCHOOL':
        return { label: 'Escuela', color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.12)', border: 'rgba(245, 158, 11, 0.25)' };
      case 'INDEPENDENT':
        return { label: 'Docente Independiente', color: '#059669', bg: 'rgba(16, 185, 129, 0.12)', border: 'rgba(16, 185, 129, 0.25)' };
      case 'COLLEGE':
      default:
        return { label: 'Colegio', color: '#4f46e5', bg: 'rgba(79, 70, 229, 0.12)', border: 'rgba(79, 70, 229, 0.25)' };
    }
  };

  const instBadge = getInstitutionBadge(currentInstitution?.type);

  return (
    <header style={{
      position: 'sticky',
      top: 0,
      zIndex: 40,
      backdropFilter: 'blur(16px)',
      backgroundColor: isDarkMode ? 'rgba(11, 15, 25, 0.88)' : 'rgba(255, 255, 255, 0.92)',
      borderBottom: `1px solid ${isDarkMode ? '#1f293d' : '#e2e8f0'}`,
      padding: '10px 24px'
    }}>
      <div style={{
        maxWidth: '1440px',
        margin: '0 auto',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '12px'
      }}>
        {/* Brand & Institution Info */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', cursor: 'pointer' }} onClick={onNavigateHome}>
          <div style={{
            width: '42px',
            height: '42px',
            borderRadius: '12px',
            background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white',
            boxShadow: '0 4px 12px rgba(79, 70, 229, 0.35)'
          }}>
            <GraduationCap size={24} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontWeight: 900, fontSize: '1.25rem', letterSpacing: '-0.02em' }}>
                ALL<span style={{ color: '#4f46e5' }}>-IN</span>
              </span>
              <span className="badge" style={{
                background: instBadge.bg,
                color: instBadge.color,
                border: `1px solid ${instBadge.border}`,
                fontWeight: 700
              }}>
                <Building2 size={12} />
                {instBadge.label}
              </span>
            </div>
            <div style={{ fontSize: '0.8rem', color: isDarkMode ? '#94a3b8' : '#64748b', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span>{currentInstitution?.name || 'Sistema Global'}</span>
              {currentInstitution?.circuit && <span>• Circuito {currentInstitution.circuit}</span>}
            </div>
          </div>
        </div>

        {/* Right side controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
          {/* Offline / Online indicator */}
          <div className="badge" style={{
            background: 'rgba(16, 185, 129, 0.12)',
            color: '#10b981',
            border: '1px solid rgba(16, 185, 129, 0.25)',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '4px 10px'
          }} title="Datos almacenados localmente en IndexedDB. Totalmente operativo sin internet.">
            <Wifi size={13} />
            <span style={{ fontSize: '0.75rem', fontWeight: 600 }}>Offline-Ready</span>
          </div>

          {/* INSTITUTION SWITCHER: Disponible para Desarrollador y Docentes (ya que pueden laborar en múltiples instituciones) */}
          {(currentUser.role === 'DEVELOPER' || currentUser.role === 'TEACHER') && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              {currentUser.role === 'DEVELOPER' && onGoToDeveloperPanel && (
                <button
                  onClick={onGoToDeveloperPanel}
                  className={`btn btn-sm ${isDeveloperPanelActive ? 'btn-primary' : 'btn-secondary'}`}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    fontWeight: 700,
                    fontSize: '0.8rem',
                    borderRadius: '10px'
                  }}
                  title="Panel de Control Maestro para crear Instituciones y Usuarios"
                >
                  <Code2 size={15} color="#ec4899" />
                  <span>Panel Desarrollador</span>
                </button>
              )}

              {onSwitchInstitution && (
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  background: isDarkMode ? '#1e293b' : '#f1f5f9',
                  padding: '3px 8px',
                  borderRadius: '10px',
                  border: `1px solid ${isDarkMode ? '#334155' : '#cbd5e1'}`
                }}>
                  <Building2 size={14} color="#6366f1" />
                  <select
                    value={currentInstitution?.id || ''}
                    onChange={(e) => onSwitchInstitution(e.target.value)}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      color: isDarkMode ? '#f8fafc' : '#0f172a',
                      fontWeight: 600,
                      fontSize: '0.8rem',
                      outline: 'none',
                      cursor: 'pointer'
                    }}
                    title={currentUser.role === 'DEVELOPER' ? "Explorar otra Institución como Desarrollador" : "Cambiar de Institución para ver tus secciones"}
                  >
                    {allInstitutions.map(inst => (
                      <option key={inst.id} value={inst.id} style={{ background: isDarkMode ? '#1e293b' : '#ffffff', color: isDarkMode ? '#f8fafc' : '#0f172a' }}>
                        {inst.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          )}

          {/* User Profile Badge */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            background: isDarkMode ? '#1e293b' : '#f8fafc',
            padding: '5px 12px 5px 6px',
            borderRadius: '14px',
            border: `1px solid ${isDarkMode ? '#334155' : '#e2e8f0'}`
          }}>
            <div style={{
              width: '32px',
              height: '32px',
              borderRadius: '10px',
              background: roleTheme.bg,
              color: roleTheme.text,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 800,
              fontSize: '0.85rem'
            }}>
              {currentUser.name.charAt(0).toUpperCase()}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontSize: '0.82rem', fontWeight: 700, lineHeight: 1.2 }}>
                {currentUser.name}
              </span>
              <span style={{ fontSize: '0.7rem', color: isDarkMode ? '#94a3b8' : '#64748b' }}>
                {getRoleLabel(currentUser.role)}
              </span>
            </div>
          </div>

          {/* Theme switcher */}
          <button
            onClick={onToggleTheme}
            className="btn btn-secondary btn-sm"
            style={{ width: '36px', height: '36px', padding: 0, borderRadius: '10px' }}
            title={isDarkMode ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
          >
            {isDarkMode ? <Sun size={17} color="#fbbf24" /> : <Moon size={17} color="#6366f1" />}
          </button>

          {/* Logout button */}
          <button
            onClick={onLogout}
            className="btn btn-secondary btn-sm"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 12px',
              borderRadius: '10px',
              fontSize: '0.8rem',
              fontWeight: 600,
              color: '#ef4444'
            }}
            title="Cerrar Sesión"
          >
            <LogOut size={15} />
            <span>Salir</span>
          </button>
        </div>
      </div>
    </header>
  );
};
