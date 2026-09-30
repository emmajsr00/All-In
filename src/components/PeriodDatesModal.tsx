import React, { useState } from 'react';
import type { AcademicPeriodConfig } from '../types';
import { Calendar, CheckCircle2, Clock, X, Info } from 'lucide-react';

interface PeriodDatesModalProps {
  periods: AcademicPeriodConfig[];
  onClose: () => void;
  onSave: (updatedPeriods: AcademicPeriodConfig[]) => void;
}

export const PeriodDatesModal: React.FC<PeriodDatesModalProps> = ({
  periods,
  onClose,
  onSave
}) => {
  const [periodList, setPeriodList] = useState<AcademicPeriodConfig[]>(() => {
    if (periods && periods.length >= 2) return periods;
    return [
      {
        periodId: 'I_PERIODO',
        name: 'I Periodo',
        startDate: '2026-02-09',
        endDate: '2026-06-26',
        weightPercentage: 50
      },
      {
        periodId: 'II_PERIODO',
        name: 'II Periodo',
        startDate: '2026-07-13',
        endDate: '2026-12-11',
        weightPercentage: 50
      }
    ];
  });

  const todayStr = new Date().toISOString().split('T')[0];

  // Identificar qué periodo está activo hoy según las fechas configuradas
  const getActivePeriodToday = () => {
    const p1 = periodList.find(p => p.periodId === 'I_PERIODO');
    const p2 = periodList.find(p => p.periodId === 'II_PERIODO');
    if (p1 && p1.endDate && todayStr > p1.endDate) {
      return 'II Periodo (El I Periodo ya finalizó)';
    }
    if (p2 && p2.startDate && todayStr >= p2.startDate) {
      return 'II Periodo';
    }
    return 'I Periodo';
  };

  const handleUpdate = (periodId: 'I_PERIODO' | 'II_PERIODO', field: keyof AcademicPeriodConfig, value: any) => {
    setPeriodList(prev => prev.map(p => {
      if (p.periodId === periodId) {
        return { ...p, [field]: value };
      }
      return p;
    }));
  };

  const handleSave = () => {
    onSave(periodList);
    onClose();
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.7)',
      backdropFilter: 'blur(6px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 150,
      padding: '20px'
    }}>
      <div className="glass-panel" style={{
        width: '100%',
        maxWidth: '560px',
        padding: '26px',
        display: 'flex',
        flexDirection: 'column',
        gap: '20px',
        boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: '40px',
              height: '40px',
              borderRadius: '10px',
              background: 'rgba(79, 70, 229, 0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#4f46e5'
            }}>
              <Calendar size={22} />
            </div>
            <div>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 800 }}>Fechas y Vigencia de Periodos</h3>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                Configuración del Calendario Escolar Oficial
              </p>
            </div>
          </div>

          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
            <X size={20} />
          </button>
        </div>

        {/* Banner de autodetección según fecha actual */}
        <div style={{
          background: 'rgba(79, 70, 229, 0.08)',
          border: '1px solid rgba(79, 70, 229, 0.25)',
          borderRadius: '10px',
          padding: '12px 14px',
          display: 'flex',
          alignItems: 'flex-start',
          gap: '10px'
        }}>
          <Clock size={18} color="#4f46e5" style={{ marginTop: '2px', flexShrink: 0 }} />
          <div>
            <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#4f46e5' }}>
              Carga Automática Activa: {getActivePeriodToday()}
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '2px' }}>
              Fecha de hoy: <strong>{todayStr}</strong>. Al finalizar la fecha límite del I Periodo, el sistema cargará automáticamente el II Periodo para calificar sin demora.
            </div>
          </div>
        </div>

        {/* Configuración de cada periodo */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {periodList.map(p => (
            <div
              key={p.periodId}
              style={{
                background: 'var(--bg-surface)',
                borderRadius: '12px',
                padding: '16px',
                border: '1px solid var(--border-subtle)',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span className="badge" style={{
                  background: p.periodId === 'I_PERIODO' ? 'rgba(79, 70, 229, 0.15)' : 'rgba(16, 185, 129, 0.15)',
                  color: p.periodId === 'I_PERIODO' ? '#4f46e5' : '#10b981',
                  fontWeight: 800,
                  fontSize: '0.85rem'
                }}>
                  {p.name}
                </span>

                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Ponderación:</span>
                  <input
                    type="number"
                    min="1"
                    max="100"
                    value={p.weightPercentage}
                    onChange={(e) => handleUpdate(p.periodId, 'weightPercentage', parseInt(e.target.value) || 50)}
                    style={{
                      width: '55px',
                      padding: '4px',
                      textAlign: 'center',
                      borderRadius: '6px',
                      border: '1px solid var(--border-subtle)',
                      background: 'var(--bg-main)',
                      color: 'var(--text-main)',
                      fontWeight: 700,
                      fontSize: '0.82rem'
                    }}
                  />
                  <span style={{ fontSize: '0.82rem', fontWeight: 700 }}>%</span>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: 700, display: 'block', marginBottom: '4px' }}>
                    Fecha de Inicio:
                  </label>
                  <input
                    type="date"
                    value={p.startDate}
                    onChange={(e) => handleUpdate(p.periodId, 'startDate', e.target.value)}
                    style={{
                      width: '100%',
                      padding: '8px 10px',
                      borderRadius: '8px',
                      border: '1px solid var(--border-subtle)',
                      background: 'var(--bg-main)',
                      color: 'var(--text-main)',
                      fontSize: '0.82rem'
                    }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: 700, display: 'block', marginBottom: '4px' }}>
                    Fecha de Finalización (Cierre):
                  </label>
                  <input
                    type="date"
                    value={p.endDate}
                    onChange={(e) => handleUpdate(p.periodId, 'endDate', e.target.value)}
                    style={{
                      width: '100%',
                      padding: '8px 10px',
                      borderRadius: '8px',
                      border: '1px solid var(--border-subtle)',
                      background: 'var(--bg-main)',
                      color: 'var(--text-main)',
                      fontSize: '0.82rem'
                    }}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '6px' }}>
          <button onClick={onClose} className="btn btn-secondary">
            Cancelar
          </button>
          <button onClick={handleSave} className="btn btn-primary">
            <CheckCircle2 size={16} />
            Guardar Configuración de Periodos
          </button>
        </div>
      </div>
    </div>
  );
};
