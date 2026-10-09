import React from 'react';
import {
  GraduationCap,
  Building2,
  Moon,
  Sun,
  Wifi,
  WifiOff,
  Download,
  Upload,
  Database,
  Check,
  LogOut,
  ShieldAlert,
  Code2,
  UserCheck
} from 'lucide-react';
import type { User, Institution } from '../types';
import { exportDatabaseBackup, importDatabaseBackup } from '../db';

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

  // Estado de conexión en tiempo real
  const [isOnline, setIsOnline] = React.useState(typeof navigator !== 'undefined' ? navigator.onLine : true);
  const [isBackingUp, setIsBackingUp] = React.useState(false);
  const [backupSuccess, setBackupSuccess] = React.useState(false);
  const [isRestoring, setIsRestoring] = React.useState(false);
  const restoreInputRef = React.useRef<HTMLInputElement | null>(null);

  React.useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Generar y descargar copia de seguridad express en 1-Clic
  const handleExpressBackup = async () => {
    try {
      setIsBackingUp(true);
      const jsonStr = await exportDatabaseBackup();
      const blob = new Blob([jsonStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      const now = new Date();
      const dateTag = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}_${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}`;
      a.href = url;
      a.download = `ALL-IN_Respaldo_${dateTag}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      setBackupSuccess(true);
      setTimeout(() => setBackupSuccess(false), 3500);
    } catch (err) {
      console.error('Error al generar copia de seguridad:', err);
      alert('Ocurrió un error al exportar la base de datos.');
    } finally {
      setIsBackingUp(false);
    }
  };

  // Restaurar copia de seguridad desde archivo local
  const handleFileRestore = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!confirm('¿Deseas restaurar esta copia de seguridad? Se sobreescribirán los registros locales con los del archivo.')) {
      e.target.value = '';
      return;
    }

    try {
      setIsRestoring(true);
      const text = await file.text();
      await importDatabaseBackup(text);
      alert('¡Copia de seguridad restaurada exitosamente! La página se recargará para aplicar los cambios.');
      window.location.reload();
    } catch (err: any) {
      console.error('Error al restaurar:', err);
      alert('Error al restaurar: ' + (err?.message || 'Archivo inválido'));
    } finally {
      setIsRestoring(false);
      e.target.value = '';
    }
  };

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
          {/* Dynamic Offline/Online status badge */}
          <div
            className="badge"
            style={{
              background: isOnline ? 'rgba(16, 185, 129, 0.12)' : 'rgba(245, 158, 11, 0.15)',
              color: isOnline ? '#10b981' : '#f59e0b',
              border: `1px solid ${isOnline ? 'rgba(16, 185, 129, 0.25)' : 'rgba(245, 158, 11, 0.3)'}`,
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '4px 10px',
              fontWeight: 700,
              fontSize: '0.75rem'
            }}
            title={isOnline ? 'Conexión activa. Los datos se resguardan de forma segura en tu navegador (IndexedDB).' : 'Sin conexión a internet. La plataforma continúa funcionando al 100% de manera autónoma.'}
          >
            {isOnline ? <Wifi size={13} /> : <WifiOff size={13} />}
            <span>{isOnline ? 'En Línea • Offline-Ready' : 'Modo Offline (Activo)'}</span>
          </div>

          {/* Botón Respaldo Express 1-Clic */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <button
              onClick={handleExpressBackup}
              disabled={isBackingUp}
              className={`btn btn-sm ${backupSuccess ? 'btn-success' : 'btn-secondary'}`}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                fontSize: '0.76rem',
                fontWeight: 700,
                padding: '4px 10px',
                borderRadius: '8px',
                background: backupSuccess ? 'rgba(16, 185, 129, 0.9)' : undefined,
                color: backupSuccess ? '#ffffff' : undefined
              }}
              title="Descargar copia de seguridad completa (secciones, notas, asistencia y horarios) en 1 solo clic"
            >
              {backupSuccess ? (
                <>
                  <Check size={13} />
                  <span>¡Copia Descargada!</span>
                </>
              ) : isBackingUp ? (
                <>
                  <Database size={13} className="animate-spin" />
                  <span>Guardando...</span>
                </>
              ) : (
                <>
                  <Download size={13} color="#4f46e5" />
                  <span>Respaldo Express</span>
                </>
              )}
            </button>

            {/* Hidden Restore input for teacher/dev */}
            <input
              type="file"
              ref={restoreInputRef}
              onChange={handleFileRestore}
              accept=".json"
              style={{ display: 'none' }}
            />
            <button
              onClick={() => restoreInputRef.current?.click()}
              disabled={isRestoring}
              className="btn btn-sm btn-secondary"
              style={{
                padding: '4px 6px',
                fontSize: '0.7rem',
                borderRadius: '8px'
              }}
              title="Restaurar base de datos desde un archivo de respaldo JSON"
            >
              <Upload size={12} color="#64748b" />
            </button>
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
