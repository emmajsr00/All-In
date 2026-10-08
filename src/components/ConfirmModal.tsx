import React from 'react';
import { AlertTriangle, AlertCircle, Info, CheckCircle, Trash2, X } from 'lucide-react';

export interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  type?: 'danger' | 'warning' | 'info' | 'success';
  confirmText?: string;
  cancelText?: string;
  isAlertOnly?: boolean;
  onConfirm: () => void;
  onClose: () => void;
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
  isOpen,
  title,
  message,
  type = 'danger',
  confirmText = 'Confirmar',
  cancelText = 'Cancelar',
  isAlertOnly = false,
  onConfirm,
  onClose
}) => {
  if (!isOpen) return null;

  const getTheme = () => {
    switch (type) {
      case 'danger':
        return {
          icon: <Trash2 size={24} color="#ef4444" />,
          glow: 'rgba(239, 68, 68, 0.15)',
          border: 'rgba(239, 68, 68, 0.3)',
          badgeBg: '#fee2e2',
          badgeText: '#dc2626',
          btnBg: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
          btnText: '#ffffff'
        };
      case 'warning':
        return {
          icon: <AlertTriangle size={24} color="#f59e0b" />,
          glow: 'rgba(245, 158, 11, 0.15)',
          border: 'rgba(245, 158, 11, 0.3)',
          badgeBg: '#fef3c7',
          badgeText: '#d97706',
          btnBg: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
          btnText: '#ffffff'
        };
      case 'success':
        return {
          icon: <CheckCircle size={24} color="#10b981" />,
          glow: 'rgba(16, 185, 129, 0.15)',
          border: 'rgba(16, 185, 129, 0.3)',
          badgeBg: '#d1fae5',
          badgeText: '#059669',
          btnBg: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
          btnText: '#ffffff'
        };
      case 'info':
      default:
        return {
          icon: <Info size={24} color="#6366f1" />,
          glow: 'rgba(99, 102, 241, 0.15)',
          border: 'rgba(99, 102, 241, 0.3)',
          badgeBg: '#e0e7ff',
          badgeText: '#4f46e5',
          btnBg: 'linear-gradient(135deg, #4f46e5 0%, #6366f1 100%)',
          btnText: '#ffffff'
        };
    }
  };

  const theme = getTheme();

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 99999,
        background: 'rgba(15, 23, 42, 0.65)',
        backdropFilter: 'blur(8px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
        animation: 'fadeIn 0.2s ease-out'
      }}
      onClick={onClose}
    >
      <div
        className="glass-panel"
        style={{
          width: '100%',
          maxWidth: '460px',
          background: 'var(--bg-main, #0f172a)',
          borderRadius: '16px',
          border: `1px solid ${theme.border}`,
          boxShadow: `0 20px 40px -15px rgba(0, 0, 0, 0.5), 0 0 25px ${theme.glow}`,
          overflow: 'hidden',
          animation: 'slideUp 0.25s ease-out',
          color: 'var(--text-main, #f8fafc)'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '18px 22px 14px 22px',
            borderBottom: '1px solid var(--border-subtle, rgba(255, 255, 255, 0.08))'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              style={{
                width: '42px',
                height: '42px',
                borderRadius: '12px',
                background: theme.glow,
                border: `1px solid ${theme.border}`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0
              }}
            >
              {theme.icon}
            </div>
            <div>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 800, margin: 0, lineHeight: 1.2 }}>
                {title}
              </h3>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="btn btn-ghost btn-sm"
            style={{
              padding: '6px',
              borderRadius: '8px',
              color: 'var(--text-muted, #94a3b8)',
              cursor: 'pointer'
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Body */}
        <div style={{ padding: '22px', fontSize: '0.92rem', lineHeight: 1.55, color: 'var(--text-muted, #94a3b8)' }}>
          <p style={{ margin: 0, whiteSpace: 'pre-line' }}>
            {message}
          </p>
        </div>

        {/* Modal Actions */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'flex-end',
            gap: '12px',
            padding: '14px 22px 18px 22px',
            background: 'var(--bg-surface, rgba(255, 255, 255, 0.03))',
            borderTop: '1px solid var(--border-subtle, rgba(255, 255, 255, 0.08))'
          }}
        >
          {!isAlertOnly && (
            <button
              type="button"
              onClick={onClose}
              className="btn btn-secondary"
              style={{
                padding: '8px 16px',
                borderRadius: '10px',
                fontWeight: 600,
                fontSize: '0.88rem',
                cursor: 'pointer'
              }}
            >
              {cancelText}
            </button>
          )}

          <button
            type="button"
            onClick={() => {
              onConfirm();
              onClose();
            }}
            className="btn btn-primary"
            style={{
              padding: '8px 20px',
              borderRadius: '10px',
              background: theme.btnBg,
              color: theme.btnText,
              fontWeight: 700,
              fontSize: '0.88rem',
              border: 'none',
              cursor: 'pointer',
              boxShadow: `0 4px 14px ${theme.glow}`
            }}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};
