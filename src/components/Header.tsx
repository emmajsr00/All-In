import React from 'react';
import {
  GraduationCap,
  Building2,
  UserCheck,
  Moon,
  Sun,
  ShieldCheck,
  Sparkles,
  Wifi
} from 'lucide-react';
import type { User, Institution } from '../types';

interface HeaderProps {
  currentUser: User;
  currentInstitution: Institution;
  allUsers: User[];
  allInstitutions: Institution[];
  onSwitchUser: (userId: string) => void;
  isDarkMode: boolean;
  onToggleTheme: () => void;
  onNavigateHome: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentUser,
  currentInstitution,
  allUsers,
  onSwitchUser,
  isDarkMode,
  onToggleTheme,
  onNavigateHome
}) => {
  return (
    <header style={{
      position: 'sticky',
      top: 0,
      zIndex: 40,
      backdropFilter: 'blur(16px)',
      backgroundColor: isDarkMode ? 'rgba(11, 15, 25, 0.88)' : 'rgba(255, 255, 255, 0.92)',
      borderBottom: `1px solid ${isDarkMode ? '#1f293d' : '#e2e8f0'}`,
      padding: '12px 24px'
    }}>
      <div style={{
        maxWidth: '1400px',
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
              <span style={{ fontWeight: 800, fontSize: '1.2rem', letterSpacing: '-0.02em' }}>
                EduGrade <span style={{ color: '#4f46e5' }}>Pro</span>
              </span>
              <span className="badge" style={{
                background: currentInstitution.type === 'COLLEGE' ? 'rgba(79, 70, 229, 0.12)' : 'rgba(16, 185, 129, 0.12)',
                color: currentInstitution.type === 'COLLEGE' ? '#4f46e5' : '#059669',
                border: `1px solid ${currentInstitution.type === 'COLLEGE' ? 'rgba(79, 70, 229, 0.25)' : 'rgba(16, 185, 129, 0.25)'}`
              }}>
                <Building2 size={12} />
                {currentInstitution.type === 'COLLEGE' ? 'Colegio / Institucional' : 'Docente Independiente'}
              </span>
            </div>
            <div style={{ fontSize: '0.8rem', color: isDarkMode ? '#94a3b8' : '#64748b', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span>{currentInstitution.name}</span>
              {currentInstitution.circuit && <span>• Circuito {currentInstitution.circuit}</span>}
            </div>
          </div>
        </div>

        {/* Right side controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
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
            <span style={{ fontSize: '0.75rem', fontWeight: 600 }}>Offline-First Ready</span>
          </div>

          {/* Quick Tenant / User Switcher */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            background: isDarkMode ? '#1e293b' : '#f1f5f9',
            padding: '4px 8px 4px 12px',
            borderRadius: '12px',
            border: `1px solid ${isDarkMode ? '#334155' : '#e2e8f0'}`
          }}>
            <UserCheck size={16} color="#6366f1" />
            <span style={{ fontSize: '0.8rem', fontWeight: 600, color: isDarkMode ? '#cbd5e1' : '#475569' }}>
              Rol:
            </span>
            <select
              value={currentUser.id}
              onChange={(e) => onSwitchUser(e.target.value)}
              style={{
                background: 'transparent',
                border: 'none',
                color: isDarkMode ? '#f8fafc' : '#0f172a',
                fontWeight: 700,
                fontSize: '0.85rem',
                outline: 'none',
                cursor: 'pointer',
                fontFamily: 'inherit'
              }}
            >
              {allUsers.map(u => (
                <option key={u.id} value={u.id} style={{ background: isDarkMode ? '#1e293b' : '#ffffff', color: isDarkMode ? '#f8fafc' : '#0f172a' }}>
                  {u.name} ({u.role === 'DIRECTOR' ? 'Director Institucional' : u.role === 'SUPERADMIN' ? 'Admin' : 'Docente'})
                </option>
              ))}
            </select>
          </div>

          {/* Theme switcher */}
          <button
            onClick={onToggleTheme}
            className="btn btn-secondary btn-sm"
            style={{ width: '38px', height: '38px', padding: 0, borderRadius: '10px' }}
            title={isDarkMode ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
          >
            {isDarkMode ? <Sun size={18} color="#fbbf24" /> : <Moon size={18} color="#6366f1" />}
          </button>
        </div>
      </div>
    </header>
  );
};
