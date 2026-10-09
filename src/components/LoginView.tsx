import React, { useState } from 'react';
import {
  GraduationCap,
  Lock,
  Mail,
  Eye,
  EyeOff,
  LogIn,
  AlertCircle,
  ShieldCheck,
  Building2,
  UserCheck,
  Sparkles,
  Sun,
  Moon
} from 'lucide-react';
import type { User } from '../types';

interface LoginViewProps {
  allUsers: User[];
  onLogin: (user: User) => void;
  isDarkMode: boolean;
  onToggleTheme: () => void;
}

export const LoginView: React.FC<LoginViewProps> = ({
  allUsers,
  onLogin,
  isDarkMode,
  onToggleTheme
}) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const cleanEmail = email.trim().toLowerCase();
    const cleanPassword = password.trim();

    if (!cleanEmail || !cleanPassword) {
      setError('Por favor, ingresa tu correo electrónico y contraseña.');
      return;
    }

    setLoading(true);

    // Buscar usuario por correo
    const user = allUsers.find(u => u.email.trim().toLowerCase() === cleanEmail);

    if (!user) {
      setError('No existe ningún usuario registrado con este correo.');
      setLoading(false);
      return;
    }

    // Verificar contraseña (o contraseña por defecto '123' / 'admin')
    const validPassword = user.password || (user.role === 'DEVELOPER' ? 'admin' : '123');
    if (cleanPassword !== validPassword) {
      setError('Contraseña incorrecta. Verifica tus datos e intenta nuevamente.');
      setLoading(false);
      return;
    }

    // Login exitoso
    setTimeout(() => {
      setLoading(false);
      onLogin(user);
    }, 200);
  };

  const handleQuickLogin = (quickEmail: string, quickPass: string) => {
    setEmail(quickEmail);
    setPassword(quickPass);
    setError(null);
    const user = allUsers.find(u => u.email.trim().toLowerCase() === quickEmail.toLowerCase());
    if (user) {
      onLogin(user);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px',
      position: 'relative',
      background: 'var(--bg-main)'
    }}>
      {/* Botón Flotante para cambiar Tema */}
      <button
        onClick={onToggleTheme}
        className="btn btn-secondary btn-sm"
        style={{
          position: 'absolute',
          top: '20px',
          right: '20px',
          width: '42px',
          height: '42px',
          borderRadius: '12px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}
        title={isDarkMode ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
      >
        {isDarkMode ? <Sun size={20} color="#fbbf24" /> : <Moon size={20} color="#6366f1" />}
      </button>

      {/* Contenedor Principal de Login */}
      <div className="glass-panel" style={{
        width: '100%',
        maxWidth: '460px',
        padding: '36px 32px',
        borderRadius: '24px',
        boxShadow: '0 20px 40px -15px rgba(0,0,0,0.25)',
        border: '1px solid var(--border-subtle)',
        background: 'var(--bg-card)'
      }}>
        {/* Logo y Encabezado */}
        <div style={{ textAlign: 'center', marginBottom: '28px' }}>
          <div style={{
            width: '60px',
            height: '60px',
            borderRadius: '18px',
            background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white',
            boxShadow: '0 8px 20px rgba(79, 70, 229, 0.4)',
            marginBottom: '16px'
          }}>
            <GraduationCap size={34} />
          </div>

          <h1 style={{
            margin: '0 0 6px 0',
            fontSize: '1.85rem',
            fontWeight: 900,
            letterSpacing: '-0.02em',
            color: 'var(--text-main)'
          }}>
            ALL<span style={{ color: '#4f46e5' }}>-IN</span>
          </h1>

          <p style={{
            margin: 0,
            fontSize: '0.85rem',
            color: 'var(--text-muted)'
          }}>
            Sistema Integral de Evaluación y Registro Docente
          </p>
        </div>

        {/* Alerta de Error */}
        {error && (
          <div style={{
            background: 'rgba(239, 68, 68, 0.1)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            borderRadius: '10px',
            padding: '10px 14px',
            marginBottom: '18px',
            color: '#dc2626',
            fontSize: '0.82rem',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <AlertCircle size={18} style={{ flexShrink: 0 }} />
            <span>{error}</span>
          </div>
        )}

        {/* Formulario de Login */}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Campo Correo */}
          <div>
            <label style={{
              display: 'block',
              fontSize: '0.8rem',
              fontWeight: 700,
              color: 'var(--text-main)',
              marginBottom: '6px'
            }}>
              Correo Electrónico
            </label>
            <div style={{
              position: 'relative',
              display: 'flex',
              alignItems: 'center'
            }}>
              <div style={{
                position: 'absolute',
                left: '12px',
                color: 'var(--text-muted)',
                pointerEvents: 'none',
                display: 'flex',
                alignItems: 'center'
              }}>
                <Mail size={18} />
              </div>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="ejemplo@mep.go.cr"
                required
                style={{
                  width: '100%',
                  padding: '11px 14px 11px 40px',
                  borderRadius: '10px',
                  border: '1px solid var(--border-subtle)',
                  background: 'var(--bg-surface)',
                  color: 'var(--text-main)',
                  fontSize: '0.88rem',
                  outline: 'none',
                  boxSizing: 'border-box'
                }}
              />
            </div>
          </div>

          {/* Campo Contraseña */}
          <div>
            <label style={{
              display: 'block',
              fontSize: '0.8rem',
              fontWeight: 700,
              color: 'var(--text-main)',
              marginBottom: '6px'
            }}>
              Contraseña
            </label>
            <div style={{
              position: 'relative',
              display: 'flex',
              alignItems: 'center'
            }}>
              <div style={{
                position: 'absolute',
                left: '12px',
                color: 'var(--text-muted)',
                pointerEvents: 'none',
                display: 'flex',
                alignItems: 'center'
              }}>
                <Lock size={18} />
              </div>
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                style={{
                  width: '100%',
                  padding: '11px 40px 11px 40px',
                  borderRadius: '10px',
                  border: '1px solid var(--border-subtle)',
                  background: 'var(--bg-surface)',
                  color: 'var(--text-main)',
                  fontSize: '0.88rem',
                  outline: 'none',
                  boxSizing: 'border-box'
                }}
              />
              <button
                type="button"
                onClick={() => setShowPassword(prev => !prev)}
                style={{
                  position: 'absolute',
                  right: '12px',
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--text-muted)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  padding: '4px'
                }}
                title={showPassword ? 'Ocultar contraseña' : 'Ver contraseña'}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          {/* Botón de Iniciar Sesión */}
          <button
            type="submit"
            disabled={loading}
            className="btn btn-primary"
            style={{
              padding: '12px',
              borderRadius: '10px',
              fontWeight: 700,
              fontSize: '0.92rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              marginTop: '6px',
              cursor: loading ? 'not-allowed' : 'pointer'
            }}
          >
            <LogIn size={18} />
            <span>{loading ? 'Verificando...' : 'Iniciar Sesión'}</span>
          </button>
        </form>

        {/* Separador de Accesos Rápidos */}
        <div style={{
          margin: '24px 0 16px 0',
          display: 'flex',
          alignItems: 'center',
          gap: '12px'
        }}>
          <div style={{ flex: 1, height: '1px', background: 'var(--border-subtle)' }}></div>
          <span style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
            Accesos Rápidos Demo
          </span>
          <div style={{ flex: 1, height: '1px', background: 'var(--border-subtle)' }}></div>
        </div>

        {/* Botones de Acceso Rápido por Rol */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {/* Acceso Desarrollador */}
          <button
            type="button"
            onClick={() => handleQuickLogin('admin@allin.com', 'admin')}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '10px 14px',
              borderRadius: '10px',
              border: '1px solid rgba(124, 58, 237, 0.3)',
              background: 'rgba(124, 58, 237, 0.08)',
              color: 'var(--text-main)',
              cursor: 'pointer',
              fontSize: '0.8rem',
              transition: 'all 0.15s ease'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Sparkles size={16} color="#7c3aed" />
              <div style={{ textAlign: 'left' }}>
                <div style={{ fontWeight: 800 }}>Desarrollador (Tú)</div>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>admin@allin.com • Acceso global</div>
              </div>
            </div>
            <span style={{ fontSize: '0.74rem', fontWeight: 700, color: '#7c3aed' }}>Entrar →</span>
          </button>

          {/* Acceso Director */}
          <button
            type="button"
            onClick={() => handleQuickLogin('director.ctppoas@mep.go.cr', '123')}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '10px 14px',
              borderRadius: '10px',
              border: '1px solid rgba(79, 70, 229, 0.25)',
              background: 'rgba(79, 70, 229, 0.06)',
              color: 'var(--text-main)',
              cursor: 'pointer',
              fontSize: '0.8rem',
              transition: 'all 0.15s ease'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Building2 size={16} color="#4f46e5" />
              <div style={{ textAlign: 'left' }}>
                <div style={{ fontWeight: 800 }}>Director Institucional</div>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Lic. Carlos Méndez • CTP Poás</div>
              </div>
            </div>
            <span style={{ fontSize: '0.74rem', fontWeight: 700, color: '#4f46e5' }}>Entrar →</span>
          </button>

          {/* Acceso Docente Institucional */}
          <button
            type="button"
            onClick={() => handleQuickLogin('hrodriguez@mep.go.cr', '123')}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '10px 14px',
              borderRadius: '10px',
              border: '1px solid rgba(16, 185, 129, 0.25)',
              background: 'rgba(16, 185, 129, 0.06)',
              color: 'var(--text-main)',
              cursor: 'pointer',
              fontSize: '0.8rem',
              transition: 'all 0.15s ease'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <UserCheck size={16} color="#059669" />
              <div style={{ textAlign: 'left' }}>
                <div style={{ fontWeight: 800 }}>Docente Institucional</div>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Prof. Hellen Rodríguez • CTP Poás</div>
              </div>
            </div>
            <span style={{ fontSize: '0.74rem', fontWeight: 700, color: '#059669' }}>Entrar →</span>
          </button>

          {/* Acceso Docente Independiente (Sin institución) */}
          <button
            type="button"
            onClick={() => handleQuickLogin('marcos.tutor@gmail.com', '123')}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '10px 14px',
              borderRadius: '10px',
              border: '1px solid rgba(14, 165, 233, 0.3)',
              background: 'rgba(14, 165, 233, 0.08)',
              color: 'var(--text-main)',
              cursor: 'pointer',
              fontSize: '0.8rem',
              transition: 'all 0.15s ease'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <GraduationCap size={16} color="#0284c7" />
              <div style={{ textAlign: 'left' }}>
                <div style={{ fontWeight: 800, display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span>Docente Independiente</span>
                  <span style={{ fontSize: '0.68rem', background: '#0284c7', color: 'white', padding: '1px 6px', borderRadius: '4px', fontWeight: 700 }}>
                    Sin Institución
                  </span>
                </div>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Prof. Marcos Varela • Tutoría y Clases Particulares</div>
              </div>
            </div>
            <span style={{ fontSize: '0.74rem', fontWeight: 700, color: '#0284c7' }}>Entrar →</span>
          </button>
        </div>

        {/* Nota informativa */}
        <div style={{
          marginTop: '20px',
          paddingTop: '16px',
          borderTop: '1px solid var(--border-subtle)',
          textAlign: 'center',
          fontSize: '0.72rem',
          color: 'var(--text-muted)'
        }}>
          <span>🔒 Todos los datos y credenciales se almacenan localmente en su equipo de forma segura (Offline-First).</span>
        </div>
      </div>
    </div>
  );
};
