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
  UserCheck,
  Camera,
  X,
  Trash2,
  Loader2,
  Lock,
  Mail,
  Key,
  Phone,
  User as UserIcon,
  Save,
  Eye,
  EyeOff,
  CheckCircle2,
  UploadCloud,
  HeartPulse,
  PhoneCall,
  ShieldCheck,
  AlertTriangle
} from 'lucide-react';
import { createPortal } from 'react-dom';
import type { User, Institution } from '../types';
import { db, exportDatabaseBackup, importDatabaseBackup } from '../db';

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
  onUserDataChanged?: () => void;
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
  isDeveloperPanelActive,
  onUserDataChanged
}) => {
  const [isProfileModalOpen, setIsProfileModalOpen] = React.useState(false);
  const [profileAvatarUrl, setProfileAvatarUrl] = React.useState(currentUser.avatarUrl || '');
  const [profileName, setProfileName] = React.useState(currentUser.name || '');
  const [profileEmail, setProfileEmail] = React.useState(currentUser.email || '');
  const [profileIdNumber, setProfileIdNumber] = React.useState(currentUser.idNumber || '');
  const [profilePhone, setProfilePhone] = React.useState(currentUser.phone || '');
  const [profileTitle, setProfileTitle] = React.useState(currentUser.title || '');
  
  // Contacto de Emergencia
  const [profileEmergencyName, setProfileEmergencyName] = React.useState(currentUser.emergencyContactName || '');
  const [profileEmergencyPhone, setProfileEmergencyPhone] = React.useState(currentUser.emergencyContactPhone || '');
  const [profileEmergencyRelation, setProfileEmergencyRelation] = React.useState(currentUser.emergencyContactRelation || '');

  // Submodal de Cambio de Contraseña
  const [isChangePasswordModalOpen, setIsChangePasswordModalOpen] = React.useState(false);
  const [currentPasswordInput, setCurrentPasswordInput] = React.useState('');
  const [newPasswordInput, setNewPasswordInput] = React.useState('');
  const [confirmPasswordInput, setConfirmPasswordInput] = React.useState('');
  const [showCurrentPassword, setShowCurrentPassword] = React.useState(false);
  const [showNewPassword, setShowNewPassword] = React.useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = React.useState(false);
  const [passwordModalError, setPasswordModalError] = React.useState('');
  const [passwordModalSuccess, setPasswordModalSuccess] = React.useState('');
  const [isSavingPassword, setIsSavingPassword] = React.useState(false);

  // Verificación de Seguridad para Revelar Contraseña
  const [isVerifyRevealOpen, setIsVerifyRevealOpen] = React.useState(false);
  const [verifyAttempt, setVerifyAttempt] = React.useState('');
  const [verifyError, setVerifyError] = React.useState('');
  const [isPasswordRevealed, setIsPasswordRevealed] = React.useState(false);
  const [revealCountdown, setRevealCountdown] = React.useState(0);

  const [isSavingProfile, setIsSavingProfile] = React.useState(false);
  const [profileSuccessMsg, setProfileSuccessMsg] = React.useState('');

  React.useEffect(() => {
    setProfileAvatarUrl(currentUser.avatarUrl || '');
    setProfileName(currentUser.name || '');
    setProfileEmail(currentUser.email || '');
    setProfileIdNumber(currentUser.idNumber || '');
    setProfilePhone(currentUser.phone || '');
    setProfileTitle(currentUser.title || '');
    setProfileEmergencyName(currentUser.emergencyContactName || '');
    setProfileEmergencyPhone(currentUser.emergencyContactPhone || '');
    setProfileEmergencyRelation(currentUser.emergencyContactRelation || '');
  }, [currentUser, isProfileModalOpen]);

  // Temporizador para auto-ocultar contraseña revelada tras 10 segundos
  React.useEffect(() => {
    if (isPasswordRevealed && revealCountdown > 0) {
      const timer = setTimeout(() => setRevealCountdown(prev => prev - 1), 1000);
      return () => clearTimeout(timer);
    } else if (revealCountdown === 0 && isPasswordRevealed) {
      setIsPasswordRevealed(false);
    }
  }, [isPasswordRevealed, revealCountdown]);

  // Solo ADMIN, DIRECTOR y DEVELOPER pueden modificar información personal oficial (nombre, cédula, cargo).
  // Para los DOCENTES, esta sección se mantiene bloqueada/protegida (solo lectura), pero SÍ pueden modificar foto, correo, clave y teléfono.
  const canEditPersonalInfo = currentUser.role === 'DEVELOPER' || currentUser.role === 'DIRECTOR' || currentUser.role === 'ADMIN';

  // Subir foto desde la PC (solo archivo local, sin link ni url)
  const handlePhotoUploadFromPC = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 3 * 1024 * 1024) {
      alert('La imagen no debe superar los 3MB.');
      return;
    }
    const reader = new FileReader();
    reader.onload = async (event) => {
      if (typeof event.target?.result === 'string') {
        const base64Url = event.target.result;
        setProfileAvatarUrl(base64Url);
        try {
          await db.users.update(currentUser.id, { avatarUrl: base64Url });
          if (onUserDataChanged) onUserDataChanged();
        } catch (err) {
          console.error('Error al guardar foto:', err);
        }
      }
    };
    reader.readAsDataURL(file);
  };

  const handleRemovePhoto = async () => {
    if (confirm('¿Deseas quitar tu foto de perfil?')) {
      try {
        await db.users.update(currentUser.id, { avatarUrl: undefined });
        setProfileAvatarUrl('');
        if (onUserDataChanged) onUserDataChanged();
      } catch (err) {
        console.error('Error al quitar foto:', err);
      }
    }
  };

  // Verificación de seguridad para revelar contraseña
  const handleOpenVerifyReveal = () => {
    if (isPasswordRevealed) {
      setIsPasswordRevealed(false);
      setRevealCountdown(0);
      return;
    }
    if (!currentUser.password) {
      alert('Tu usuario no tiene ninguna contraseña establecida aún. Puedes asignarle una con el botón "Cambiar Contraseña".');
      return;
    }
    setVerifyAttempt('');
    setVerifyError('');
    setIsVerifyRevealOpen(true);
  };

  const handleConfirmVerifyReveal = (e: React.FormEvent) => {
    e.preventDefault();
    if (verifyAttempt.trim() === currentUser.password) {
      setIsPasswordRevealed(true);
      setRevealCountdown(10);
      setIsVerifyRevealOpen(false);
      setVerifyAttempt('');
    } else {
      setVerifyError('Contraseña incorrecta. Acceso protegido.');
    }
  };

  // Cambio seguro de contraseña en ventana modal
  const handleSaveNewPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordModalError('');
    setPasswordModalSuccess('');

    const requiresCurrentPassword = Boolean(currentUser.password);
    if (requiresCurrentPassword && currentPasswordInput !== currentUser.password) {
      setPasswordModalError('La contraseña actual es incorrecta.');
      return;
    }

    if (!newPasswordInput.trim()) {
      setPasswordModalError('La nueva contraseña no puede estar vacía.');
      return;
    }

    if (newPasswordInput.trim().length < 4) {
      setPasswordModalError('La nueva contraseña debe tener al menos 4 caracteres.');
      return;
    }

    if (newPasswordInput !== confirmPasswordInput) {
      setPasswordModalError('La confirmación no coincide con la nueva contraseña.');
      return;
    }

    setIsSavingPassword(true);
    try {
      await db.users.update(currentUser.id, { password: newPasswordInput.trim() });
      setPasswordModalSuccess('¡Contraseña actualizada exitosamente!');
      if (onUserDataChanged) onUserDataChanged();
      setTimeout(() => {
        setIsChangePasswordModalOpen(false);
        setPasswordModalSuccess('');
        setCurrentPasswordInput('');
        setNewPasswordInput('');
        setConfirmPasswordInput('');
      }, 1400);
    } catch (err) {
      console.error('Error al cambiar contraseña:', err);
      setPasswordModalError('Error al guardar la nueva contraseña.');
    } finally {
      setIsSavingPassword(false);
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profileEmail.trim()) {
      alert('El correo electrónico no puede estar vacío.');
      return;
    }
    if (canEditPersonalInfo && !profileName.trim()) {
      alert('El nombre completo es requerido.');
      return;
    }

    setIsSavingProfile(true);
    try {
      const updateData: Partial<User> = {
        email: profileEmail.trim(),
        phone: profilePhone.trim() || undefined,
        avatarUrl: profileAvatarUrl.trim() || undefined,
        emergencyContactName: profileEmergencyName.trim() || undefined,
        emergencyContactPhone: profileEmergencyPhone.trim() || undefined,
        emergencyContactRelation: profileEmergencyRelation.trim() || undefined
      };

      if (canEditPersonalInfo) {
        updateData.name = profileName.trim();
        updateData.idNumber = profileIdNumber.trim() || undefined;
        updateData.title = profileTitle.trim() || undefined;
      }

      await db.users.update(currentUser.id, updateData);
      setProfileSuccessMsg('¡Datos y contacto de emergencia actualizados con éxito!');
      if (onUserDataChanged) onUserDataChanged();
      setTimeout(() => {
        setProfileSuccessMsg('');
      }, 3500);
    } catch (err) {
      console.error('Error al actualizar datos de usuario:', err);
      alert('Ocurrió un error al guardar los cambios.');
    } finally {
      setIsSavingProfile(false);
    }
  };

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

          {/* User Profile Badge (Clickable para editar foto y perfil) */}
          <div
            onClick={() => setIsProfileModalOpen(true)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              background: isDarkMode ? '#1e293b' : '#f8fafc',
              padding: '5px 12px 5px 6px',
              borderRadius: '14px',
              border: `1px solid ${isDarkMode ? '#334155' : '#e2e8f0'}`,
              cursor: 'pointer',
              transition: 'all 0.15s ease'
            }}
            className="hover-lift"
            title="Haz clic para gestionar tu foto de perfil"
          >
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
              fontSize: '0.85rem',
              overflow: 'hidden',
              position: 'relative'
            }}>
              {currentUser.avatarUrl ? (
                <img
                  src={currentUser.avatarUrl}
                  alt={currentUser.name}
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
              ) : (
                currentUser.name.charAt(0).toUpperCase()
              )}
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

      {/* MODAL: GESTIÓN DE PERFIL Y SEGURIDAD DEL USUARIO */}
      {isProfileModalOpen && typeof document !== 'undefined' && createPortal(
        <div
          style={{
            position: 'fixed',
            inset: 0,
            width: '100vw',
            height: '100vh',
            backgroundColor: 'rgba(15, 23, 42, 0.75)',
            backdropFilter: 'blur(8px)',
            WebkitBackdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 999999,
            padding: '20px',
            boxSizing: 'border-box'
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) setIsProfileModalOpen(false);
          }}
        >
          <div style={{
            width: '100%',
            maxWidth: '560px',
            maxHeight: 'min(86vh, 740px)',
            display: 'flex',
            flexDirection: 'column',
            borderRadius: '24px',
            background: isDarkMode ? '#1e293b' : '#ffffff',
            border: `1px solid ${isDarkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)'}`,
            boxShadow: '0 25px 60px -15px rgba(0, 0, 0, 0.65)',
            animation: 'fadeIn 0.2s ease-out',
            overflow: 'hidden',
            margin: 'auto'
          }}>
            {/* Modal Header */}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '20px 24px',
              borderBottom: '1px solid var(--border-subtle)',
              background: 'var(--bg-surface)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{
                  width: '38px',
                  height: '38px',
                  borderRadius: '12px',
                  background: 'rgba(79, 70, 229, 0.12)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <UserCheck size={20} color="#4f46e5" />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800 }}>Mi Perfil & Credenciales</h3>
                  <p style={{ margin: 0, fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                    Administra tus datos personales y credenciales de acceso
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsProfileModalOpen(false)}
                className="btn btn-ghost btn-sm"
                style={{ padding: '6px', borderRadius: '10px' }}
                title="Cerrar ventana"
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Scrollable Body */}
            <div style={{ padding: '24px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {/* Tarjeta Superior: Avatar y Foto desde PC */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '18px',
                padding: '16px 20px',
                borderRadius: '16px',
                background: 'var(--bg-surface)',
                border: '1px solid var(--border-subtle)'
              }}>
                <div style={{
                  width: '76px',
                  height: '76px',
                  borderRadius: '50%',
                  background: roleTheme.bg,
                  color: roleTheme.text,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 900,
                  fontSize: '2rem',
                  overflow: 'hidden',
                  border: '3px solid rgba(79, 70, 229, 0.35)',
                  boxShadow: '0 8px 20px rgba(0,0,0,0.12)',
                  flexShrink: 0
                }}>
                  {profileAvatarUrl ? (
                    <img
                      src={profileAvatarUrl}
                      alt={currentUser.name}
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                  ) : (
                    currentUser.name.charAt(0).toUpperCase()
                  )}
                </div>

                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                    <span style={{ fontSize: '1rem', fontWeight: 800 }}>{currentUser.name}</span>
                    <span className="badge" style={{
                      background: roleTheme.bg,
                      color: roleTheme.text,
                      fontWeight: 700,
                      padding: '2px 10px',
                      borderRadius: '10px',
                      fontSize: '0.72rem'
                    }}>
                      {getRoleLabel(currentUser.role)}
                    </span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                    <label
                      className="btn btn-secondary btn-sm"
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        cursor: 'pointer',
                        padding: '6px 14px',
                        borderRadius: '10px',
                        fontSize: '0.8rem',
                        fontWeight: 700
                      }}
                    >
                      <UploadCloud size={15} color="#4f46e5" />
                      <span>{profileAvatarUrl ? 'Cambiar Foto desde PC' : 'Seleccionar Foto desde PC'}</span>
                      <input
                        type="file"
                        accept="image/*"
                        style={{ display: 'none' }}
                        onChange={handlePhotoUploadFromPC}
                      />
                    </label>

                    {profileAvatarUrl && (
                      <button
                        type="button"
                        onClick={handleRemovePhoto}
                        className="btn btn-ghost btn-sm"
                        style={{
                          color: '#ef4444',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '5px',
                          fontSize: '0.78rem',
                          padding: '6px 10px'
                        }}
                      >
                        <Trash2 size={14} />
                        <span>Quitar foto</span>
                      </button>
                    )}
                  </div>
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                    Formatos soportados: PNG, JPG, WEBP. Se almacena localmente en tu equipo.
                  </span>
                </div>
              </div>

              {/* Mensaje de Éxito si guardó */}
              {profileSuccessMsg && (
                <div style={{
                  background: 'rgba(16, 185, 129, 0.12)',
                  color: '#059669',
                  border: '1px solid rgba(16, 185, 129, 0.3)',
                  borderRadius: '12px',
                  padding: '10px 16px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  fontSize: '0.85rem',
                  fontWeight: 700
                }}>
                  <CheckCircle2 size={18} />
                  <span>{profileSuccessMsg}</span>
                </div>
              )}

              {/* Formulario de Información y Credenciales */}
              <form onSubmit={handleSaveProfile} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
                {/* SECCIÓN 1: INFORMACIÓN PERSONAL / OFICIAL */}
                <div style={{
                  padding: '16px',
                  borderRadius: '16px',
                  background: 'var(--bg-surface)',
                  border: '1px solid var(--border-subtle)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <UserIcon size={16} color="#6366f1" />
                      <span style={{ fontSize: '0.86rem', fontWeight: 800 }}>Información Personal Oficial</span>
                    </div>
                    {!canEditPersonalInfo ? (
                      <span className="badge" style={{
                        background: 'rgba(239, 68, 68, 0.12)',
                        color: '#ef4444',
                        border: '1px solid rgba(239, 68, 68, 0.25)',
                        fontSize: '0.72rem',
                        fontWeight: 700,
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px'
                      }}>
                        <Lock size={12} />
                        Bloqueada en Docentes
                      </span>
                    ) : (
                      <span className="badge" style={{
                        background: 'rgba(16, 185, 129, 0.12)',
                        color: '#059669',
                        fontSize: '0.72rem',
                        fontWeight: 700
                      }}>
                        Modo Edición Habilitado
                      </span>
                    )}
                  </div>

                  {!canEditPersonalInfo && (
                    <div style={{
                      fontSize: '0.75rem',
                      color: 'var(--text-muted)',
                      background: 'rgba(148, 163, 184, 0.1)',
                      padding: '8px 12px',
                      borderRadius: '10px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px'
                    }}>
                      <Lock size={13} color="#94a3b8" />
                      <span>Tu nombre y cédula están administrados por la Dirección de tu Institución.</span>
                    </div>
                  )}

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, marginBottom: '4px' }}>
                        Nombre Completo:
                      </label>
                      <div style={{ position: 'relative' }}>
                        <input
                          type="text"
                          value={profileName}
                          onChange={e => setProfileName(e.target.value)}
                          disabled={!canEditPersonalInfo}
                          className="input-field"
                          style={{
                            width: '100%',
                            padding: '9px 12px',
                            paddingRight: !canEditPersonalInfo ? '32px' : '12px',
                            fontSize: '0.85rem',
                            opacity: !canEditPersonalInfo ? 0.75 : 1,
                            cursor: !canEditPersonalInfo ? 'not-allowed' : 'text',
                            background: !canEditPersonalInfo ? 'var(--bg-card)' : undefined
                          }}
                        />
                        {!canEditPersonalInfo && (
                          <Lock size={14} color="#94a3b8" style={{ position: 'absolute', right: '10px', top: '11px' }} />
                        )}
                      </div>
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, marginBottom: '4px' }}>
                        Cédula / Identificación:
                      </label>
                      <div style={{ position: 'relative' }}>
                        <input
                          type="text"
                          value={profileIdNumber}
                          onChange={e => setProfileIdNumber(e.target.value)}
                          disabled={!canEditPersonalInfo}
                          placeholder={!canEditPersonalInfo ? 'No registrada' : 'Ej. 1-1234-0567'}
                          className="input-field"
                          style={{
                            width: '100%',
                            padding: '9px 12px',
                            paddingRight: !canEditPersonalInfo ? '32px' : '12px',
                            fontSize: '0.85rem',
                            opacity: !canEditPersonalInfo ? 0.75 : 1,
                            cursor: !canEditPersonalInfo ? 'not-allowed' : 'text',
                            background: !canEditPersonalInfo ? 'var(--bg-card)' : undefined
                          }}
                        />
                        {!canEditPersonalInfo && (
                          <Lock size={14} color="#94a3b8" style={{ position: 'absolute', right: '10px', top: '11px' }} />
                        )}
                      </div>
                    </div>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, marginBottom: '4px' }}>
                      Puesto / Especialidad:
                    </label>
                    <div style={{ position: 'relative' }}>
                      <input
                        type="text"
                        value={profileTitle}
                        onChange={e => setProfileTitle(e.target.value)}
                        disabled={!canEditPersonalInfo}
                        placeholder={!canEditPersonalInfo ? getRoleLabel(currentUser.role) : 'Ej. Docente de Informática / Dirección'}
                        className="input-field"
                        style={{
                          width: '100%',
                          padding: '9px 12px',
                          paddingRight: !canEditPersonalInfo ? '32px' : '12px',
                          fontSize: '0.85rem',
                          opacity: !canEditPersonalInfo ? 0.75 : 1,
                          cursor: !canEditPersonalInfo ? 'not-allowed' : 'text',
                          background: !canEditPersonalInfo ? 'var(--bg-card)' : undefined
                        }}
                      />
                      {!canEditPersonalInfo && (
                        <Lock size={14} color="#94a3b8" style={{ position: 'absolute', right: '10px', top: '11px' }} />
                      )}
                    </div>
                  </div>
                </div>

                {/* SECCIÓN 2: CREDENCIALES DE ACCESO & CONTACTO (EDITABLE PARA TODOS) */}
                <div style={{
                  padding: '16px',
                  borderRadius: '16px',
                  background: 'var(--bg-surface)',
                  border: '1px solid var(--border-subtle)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Key size={16} color="#10b981" />
                      <span style={{ fontSize: '0.86rem', fontWeight: 800 }}>Credenciales & Contacto (Editable)</span>
                    </div>
                    <span className="badge" style={{
                      background: 'rgba(16, 185, 129, 0.12)',
                      color: '#059669',
                      fontSize: '0.72rem',
                      fontWeight: 700
                    }}>
                      Tus Accesos
                    </span>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, marginBottom: '4px' }}>
                        Correo Electrónico *
                      </label>
                      <div style={{ position: 'relative' }}>
                        <input
                          type="email"
                          value={profileEmail}
                          onChange={e => setProfileEmail(e.target.value)}
                          required
                          className="input-field"
                          style={{ width: '100%', padding: '9px 12px 9px 34px', fontSize: '0.85rem' }}
                        />
                        <Mail size={15} color="#94a3b8" style={{ position: 'absolute', left: '10px', top: '11px' }} />
                      </div>
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, marginBottom: '4px' }}>
                        Teléfono Móvil:
                      </label>
                      <div style={{ position: 'relative' }}>
                        <input
                          type="tel"
                          value={profilePhone}
                          onChange={e => setProfilePhone(e.target.value)}
                          placeholder="Ej. 8888-8888"
                          className="input-field"
                          style={{ width: '100%', padding: '9px 12px 9px 34px', fontSize: '0.85rem' }}
                        />
                        <Phone size={15} color="#94a3b8" style={{ position: 'absolute', left: '10px', top: '11px' }} />
                      </div>
                    </div>
                  </div>

                  {/* Tarjeta de Seguridad de Contraseña (Protegida contra miradas de alumnos) */}
                  <div style={{
                    padding: '12px 14px',
                    borderRadius: '12px',
                    background: 'var(--bg-card)',
                    border: '1px solid var(--border-subtle)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: '10px'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div style={{
                        width: '36px',
                        height: '36px',
                        borderRadius: '10px',
                        background: 'rgba(99, 102, 241, 0.12)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}>
                        <Key size={18} color="#6366f1" />
                      </div>
                      <div>
                        <div style={{ fontSize: '0.82rem', fontWeight: 700 }}>Contraseña de Acceso al Sistema</div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '2px' }}>
                          <span style={{ fontSize: '0.85rem', letterSpacing: isPasswordRevealed ? '0.5px' : '2.5px', fontFamily: 'monospace', fontWeight: 700, color: isPasswordRevealed ? '#10b981' : 'var(--text-muted)' }}>
                            {isPasswordRevealed ? (currentUser.password || 'Sin clave') : '••••••••••••'}
                          </span>
                          {isPasswordRevealed && (
                            <span className="badge" style={{ background: 'rgba(16, 185, 129, 0.15)', color: '#059669', fontSize: '0.68rem', padding: '1px 6px' }}>
                              Visible: {revealCountdown}s
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <button
                        type="button"
                        onClick={handleOpenVerifyReveal}
                        className="btn btn-secondary btn-sm"
                        style={{ fontSize: '0.76rem', padding: '6px 10px', display: 'flex', alignItems: 'center', gap: '5px' }}
                        title="Ver contraseña mediante confirmación segura"
                      >
                        {isPasswordRevealed ? <EyeOff size={13} /> : <Eye size={13} />}
                        <span>{isPasswordRevealed ? 'Ocultar' : 'Ver Clave'}</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setPasswordModalError('');
                          setPasswordModalSuccess('');
                          setCurrentPasswordInput('');
                          setNewPasswordInput('');
                          setConfirmPasswordInput('');
                          setIsChangePasswordModalOpen(true);
                        }}
                        className="btn btn-primary btn-sm"
                        style={{
                          fontSize: '0.78rem',
                          padding: '6px 14px',
                          fontWeight: 700,
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)'
                        }}
                      >
                        <Lock size={13} />
                        <span>Cambiar Contraseña</span>
                      </button>
                    </div>
                  </div>
                  <span style={{ fontSize: '0.71rem', color: 'var(--text-muted)' }}>
                    🔒 Protección activa: La contraseña permanece oculta y requiere confirmación para evitar que estudiantes la lean si dejas el equipo encendido.
                  </span>
                </div>

                {/* SECCIÓN 3: CONTACTO DE EMERGENCIA */}
                <div style={{
                  padding: '16px',
                  borderRadius: '16px',
                  background: 'var(--bg-surface)',
                  border: '1px solid var(--border-subtle)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <HeartPulse size={16} color="#ef4444" />
                      <span style={{ fontSize: '0.86rem', fontWeight: 800 }}>Contacto de Emergencia</span>
                    </div>
                    <span className="badge" style={{
                      background: 'rgba(239, 68, 68, 0.1)',
                      color: '#ef4444',
                      fontSize: '0.72rem',
                      fontWeight: 700
                    }}>
                      Seguridad Médica & Personal
                    </span>
                  </div>

                  <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                    Persona a quien la institución educativa debe contactar de inmediato en caso de alguna urgencia médica o imprevisto.
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, marginBottom: '4px' }}>
                        Nombre del Contacto:
                      </label>
                      <input
                        type="text"
                        value={profileEmergencyName}
                        onChange={e => setProfileEmergencyName(e.target.value)}
                        placeholder="Ej. María Elena Pérez"
                        className="input-field"
                        style={{ width: '100%', padding: '9px 12px', fontSize: '0.85rem' }}
                      />
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, marginBottom: '4px' }}>
                        Teléfono de Emergencia:
                      </label>
                      <div style={{ position: 'relative' }}>
                        <input
                          type="tel"
                          value={profileEmergencyPhone}
                          onChange={e => setProfileEmergencyPhone(e.target.value)}
                          placeholder="Ej. 8899-7766"
                          className="input-field"
                          style={{ width: '100%', padding: '9px 12px 9px 34px', fontSize: '0.85rem' }}
                        />
                        <PhoneCall size={15} color="#ef4444" style={{ position: 'absolute', left: '10px', top: '11px' }} />
                      </div>
                    </div>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, marginBottom: '4px' }}>
                      Parentesco / Relación:
                    </label>
                    <input
                      type="text"
                      value={profileEmergencyRelation}
                      onChange={e => setProfileEmergencyRelation(e.target.value)}
                      placeholder="Ej. Cónyuge / Padre / Madre / Hermano(a) / Familiar Cercano"
                      className="input-field"
                      style={{ width: '100%', padding: '9px 12px', fontSize: '0.85rem' }}
                    />
                  </div>
                </div>

                {/* Botones de Acción */}
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '4px' }}>
                  <button
                    type="button"
                    onClick={() => setIsProfileModalOpen(false)}
                    className="btn btn-secondary btn-sm"
                    style={{ padding: '8px 18px', fontWeight: 600, borderRadius: '10px' }}
                  >
                    Cerrar
                  </button>
                  <button
                    type="submit"
                    disabled={isSavingProfile}
                    className="btn btn-primary btn-sm"
                    style={{
                      padding: '8px 22px',
                      fontWeight: 700,
                      borderRadius: '10px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)'
                    }}
                  >
                    {isSavingProfile ? (
                      <>
                        <Loader2 size={15} className="animate-spin" />
                        <span>Guardando...</span>
                      </>
                    ) : (
                      <>
                        <Save size={15} />
                        <span>Guardar Cambios</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* SUBMODAL 1: FORMULARIO CAMBIO SEGURO DE CONTRASEÑA */}
      {isChangePasswordModalOpen && typeof document !== 'undefined' && createPortal(
        <div
          style={{
            position: 'fixed',
            inset: 0,
            width: '100vw',
            height: '100vh',
            backgroundColor: 'rgba(15, 23, 42, 0.8)',
            backdropFilter: 'blur(10px)',
            WebkitBackdropFilter: 'blur(10px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000002,
            padding: '20px',
            boxSizing: 'border-box'
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) setIsChangePasswordModalOpen(false);
          }}
        >
          <div style={{
            width: '100%',
            maxWidth: '460px',
            borderRadius: '22px',
            background: isDarkMode ? '#1e293b' : '#ffffff',
            border: `1px solid ${isDarkMode ? 'rgba(255, 255, 255, 0.12)' : 'rgba(0, 0, 0, 0.1)'}`,
            boxShadow: '0 25px 60px -15px rgba(0, 0, 0, 0.7)',
            animation: 'fadeIn 0.2s ease-out',
            overflow: 'hidden'
          }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '18px 22px',
              borderBottom: '1px solid var(--border-subtle)',
              background: 'var(--bg-surface)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{
                  width: '34px',
                  height: '34px',
                  borderRadius: '10px',
                  background: 'rgba(99, 102, 241, 0.12)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <Key size={18} color="#6366f1" />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800 }}>Cambiar Contraseña</h3>
                  <p style={{ margin: 0, fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                    Actualiza tu clave de acceso de manera segura
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsChangePasswordModalOpen(false)}
                className="btn btn-ghost btn-sm"
                style={{ padding: '6px' }}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveNewPassword} style={{ padding: '22px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {passwordModalError && (
                <div style={{
                  padding: '10px 14px',
                  borderRadius: '10px',
                  background: 'rgba(239, 68, 68, 0.12)',
                  color: '#ef4444',
                  border: '1px solid rgba(239, 68, 68, 0.25)',
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}>
                  <AlertTriangle size={16} />
                  <span>{passwordModalError}</span>
                </div>
              )}

              {passwordModalSuccess && (
                <div style={{
                  padding: '10px 14px',
                  borderRadius: '10px',
                  background: 'rgba(16, 185, 129, 0.12)',
                  color: '#059669',
                  border: '1px solid rgba(16, 185, 129, 0.25)',
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}>
                  <CheckCircle2 size={16} />
                  <span>{passwordModalSuccess}</span>
                </div>
              )}

              {Boolean(currentUser.password) && (
                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, marginBottom: '4px' }}>
                    Contraseña Actual *
                  </label>
                  <div style={{ position: 'relative' }}>
                    <input
                      type={showCurrentPassword ? 'text' : 'password'}
                      value={currentPasswordInput}
                      onChange={e => setCurrentPasswordInput(e.target.value)}
                      required
                      placeholder="Ingresa tu contraseña actual"
                      className="input-field"
                      style={{ width: '100%', padding: '9px 36px 9px 12px', fontSize: '0.85rem' }}
                    />
                    <button
                      type="button"
                      onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                      style={{ position: 'absolute', right: '8px', top: '8px', background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}
                    >
                      {showCurrentPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  </div>
                </div>
              )}

              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, marginBottom: '4px' }}>
                  Nueva Contraseña *
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    type={showNewPassword ? 'text' : 'password'}
                    value={newPasswordInput}
                    onChange={e => setNewPasswordInput(e.target.value)}
                    required
                    placeholder="Mínimo 4 caracteres"
                    className="input-field"
                    style={{ width: '100%', padding: '9px 36px 9px 12px', fontSize: '0.85rem' }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    style={{ position: 'absolute', right: '8px', top: '8px', background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}
                  >
                    {showNewPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, marginBottom: '4px' }}>
                  Confirmar Nueva Contraseña *
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={confirmPasswordInput}
                    onChange={e => setConfirmPasswordInput(e.target.value)}
                    required
                    placeholder="Repite la nueva contraseña"
                    className="input-field"
                    style={{ width: '100%', padding: '9px 36px 9px 12px', fontSize: '0.85rem' }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    style={{ position: 'absolute', right: '8px', top: '8px', background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}
                  >
                    {showConfirmPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '10px' }}>
                <button
                  type="button"
                  onClick={() => setIsChangePasswordModalOpen(false)}
                  className="btn btn-secondary btn-sm"
                  style={{ padding: '8px 16px', fontWeight: 600 }}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSavingPassword}
                  className="btn btn-primary btn-sm"
                  style={{
                    padding: '8px 20px',
                    fontWeight: 700,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)'
                  }}
                >
                  {isSavingPassword ? (
                    <>
                      <Loader2 size={14} className="animate-spin" />
                      <span>Actualizando...</span>
                    </>
                  ) : (
                    <>
                      <ShieldCheck size={14} />
                      <span>Actualizar Contraseña</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* SUBMODAL 2: CONFIRMACIÓN DE SEGURIDAD PARA REVELAR CONTRASEÑA */}
      {isVerifyRevealOpen && typeof document !== 'undefined' && createPortal(
        <div
          style={{
            position: 'fixed',
            inset: 0,
            width: '100vw',
            height: '100vh',
            backgroundColor: 'rgba(15, 23, 42, 0.8)',
            backdropFilter: 'blur(10px)',
            WebkitBackdropFilter: 'blur(10px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000005,
            padding: '20px',
            boxSizing: 'border-box'
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) setIsVerifyRevealOpen(false);
          }}
        >
          <div style={{
            width: '100%',
            maxWidth: '420px',
            borderRadius: '20px',
            background: isDarkMode ? '#1e293b' : '#ffffff',
            border: `1px solid ${isDarkMode ? 'rgba(255, 255, 255, 0.12)' : 'rgba(0, 0, 0, 0.1)'}`,
            boxShadow: '0 25px 60px -15px rgba(0, 0, 0, 0.7)',
            animation: 'fadeIn 0.2s ease-out',
            overflow: 'hidden'
          }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '16px 20px',
              borderBottom: '1px solid var(--border-subtle)',
              background: 'var(--bg-surface)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <ShieldCheck size={18} color="#10b981" />
                <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800 }}>Confirmación de Identidad</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsVerifyRevealOpen(false)}
                className="btn btn-ghost btn-sm"
                style={{ padding: '6px' }}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleConfirmVerifyReveal} style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-muted)', lineHeight: 1.4 }}>
                🔒 Para prevenir que estudiantes u otras personas vean tu contraseña si dejaste tu computadora abierta, ingresa tu clave para revelarla temporalmente.
              </p>

              {verifyError && (
                <div style={{
                  padding: '8px 12px',
                  borderRadius: '10px',
                  background: 'rgba(239, 68, 68, 0.12)',
                  color: '#ef4444',
                  border: '1px solid rgba(239, 68, 68, 0.25)',
                  fontSize: '0.78rem',
                  fontWeight: 600
                }}>
                  {verifyError}
                </div>
              )}

              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, marginBottom: '4px' }}>
                  Tu Contraseña Actual:
                </label>
                <input
                  type="password"
                  value={verifyAttempt}
                  onChange={e => setVerifyAttempt(e.target.value)}
                  required
                  autoFocus
                  placeholder="Escribe tu contraseña"
                  className="input-field"
                  style={{ width: '100%', padding: '9px 12px', fontSize: '0.85rem' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '6px' }}>
                <button
                  type="button"
                  onClick={() => setIsVerifyRevealOpen(false)}
                  className="btn btn-secondary btn-sm"
                  style={{ padding: '7px 14px', fontWeight: 600 }}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="btn btn-primary btn-sm"
                  style={{
                    padding: '7px 18px',
                    fontWeight: 700,
                    background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)'
                  }}
                >
                  Confirmar y Revelar
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}
    </header>
  );
};
