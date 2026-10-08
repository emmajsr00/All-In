import React, { useState } from 'react';
import {
  X,
  Sliders,
  CheckCircle2,
  AlertTriangle,
  Plus,
  Minus,
  ChevronUp,
  ChevronDown,
  Trash2,
  HelpCircle,
  Save,
  RotateCcw
} from 'lucide-react';
import type { EvaluationConfig, EvaluationRubricItem } from '../types';
import { ConfirmModal } from './ConfirmModal';

interface RubricsConfigModalProps {
  config: EvaluationConfig;
  subjectName: string;
  sectionCode: string;
  onClose: () => void;
  onSave: (updatedConfig: EvaluationConfig) => Promise<void>;
}

export const RubricsConfigModal: React.FC<RubricsConfigModalProps> = ({
  config,
  subjectName,
  sectionCode,
  onClose,
  onSave
}) => {
  const [rubrics, setRubrics] = useState<EvaluationRubricItem[]>(JSON.parse(JSON.stringify(config.rubrics)));
  const [passingGrade, setPassingGrade] = useState<number>(config.passingGrade);
  const [periodWeight, setPeriodWeight] = useState<number>(config.periodWeight);
  const [isSaving, setIsSaving] = useState(false);
  const [newItemName, setNewItemName] = useState('');
  const [showConfirmWarning, setShowConfirmWarning] = useState(false);

  // Calcular la suma de los rubros habilitados
  const totalPercentage = rubrics.reduce((sum, r) => (r.enabled ? sum + (Number(r.percentage) || 0) : sum), 0);
  const is100Percent = Math.abs(totalPercentage - 100) < 0.01;

  const handleToggle = (id: string) => {
    setRubrics(prev => prev.map(r => r.id === id ? { ...r, enabled: !r.enabled } : r));
  };

  const handlePercentageChange = (id: string, rawVal: string | number) => {
    setRubrics(prev => prev.map(r => {
      if (r.id !== id) return r;
      if (rawVal === '') {
        return { ...r, percentage: 0 };
      }
      const parsed = typeof rawVal === 'number' ? rawVal : parseFloat(rawVal);
      const val = isNaN(parsed) ? 0 : Math.max(0, Math.min(100, Math.round(parsed * 10) / 10));
      return { ...r, percentage: val };
    }));
  };

  const handleStepPercentage = (id: string, delta: number) => {
    setRubrics(prev => prev.map(r => {
      if (r.id !== id) return r;
      const current = Number(r.percentage) || 0;
      const next = Math.max(0, Math.min(100, Math.round((current + delta) * 10) / 10));
      return { ...r, percentage: next };
    }));
  };

  const handleAddNewRubric = () => {
    if (!newItemName.trim()) return;
    const newRubric: EvaluationRubricItem = {
      id: `rubric-custom-${Date.now()}`,
      key: `custom_${Date.now()}`,
      label: newItemName.trim(),
      enabled: true,
      percentage: 0,
      description: 'Rubro personalizado adicional'
    };
    setRubrics(prev => [...prev, newRubric]);
    setNewItemName('');
  };

  const handleDeleteCustomRubric = (id: string) => {
    setRubrics(prev => prev.filter(r => r.id !== id));
  };

  const handleResetToMEPDefault = () => {
    setRubrics([
      { id: 'r-asis', key: 'asistencia', label: 'Asistencia', enabled: true, percentage: 5, description: 'Asistencia y puntualidad a lecciones' },
      { id: 'r-cot', key: 'cotidiano', label: 'Trabajo Cotidiano', enabled: true, percentage: 25, description: 'Desempeño diario en el aula con rúbricas de aprendizaje' },
      { id: 'r-tar', key: 'tareas', label: 'Tareas', enabled: true, percentage: 10, description: 'Tareas individuales y extra-clase' },
      { id: 'r-eva', key: 'evaluaciones', label: 'Pruebas / Evaluaciones', enabled: true, percentage: 45, description: 'Exámenes y pruebas comprensivas' },
      { id: 'r-pro', key: 'proyectos', label: 'Proyectos', enabled: true, percentage: 15, description: 'Proyectos de investigación o ejecución técnica' },
      { id: 'r-por', key: 'portafolio', label: 'Portafolio de Evidencias', enabled: false, percentage: 0, description: 'Recopilación estructurada de evidencias (Opcional)' }
    ]);
  };

  const executeSave = async () => {
    setIsSaving(true);
    try {
      await onSave({
        ...config,
        passingGrade,
        periodWeight,
        rubrics
      });
      onClose();
    } finally {
      setIsSaving(false);
    }
  };

  const handleSave = () => {
    if (!is100Percent) {
      setShowConfirmWarning(true);
      return;
    }
    executeSave();
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.65)',
      backdropFilter: 'blur(6px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 100,
      padding: '20px'
    }}>
      <div className="glass-panel" style={{
        width: '100%',
        maxWidth: '750px',
        maxHeight: '90vh',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.4)'
      }}>
        {/* Modal Header */}
        <div style={{
          padding: '20px 24px',
          borderBottom: '1px solid var(--border-subtle)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Sliders size={20} color="#6366f1" />
              <h2 style={{ fontSize: '1.25rem', fontWeight: 800 }}>
                Configuración de Rubros Evaluativos
              </h2>
            </div>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '2px' }}>
              {sectionCode} • {subjectName}
            </p>
          </div>
          <button onClick={onClose} className="btn btn-secondary btn-sm" style={{ padding: '6px' }}>
            <X size={18} />
          </button>
        </div>

        {/* Modal Body */}
        <div style={{ padding: '24px', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Status banner with validation */}
          <div style={{
            padding: '14px 18px',
            borderRadius: '12px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: is100Percent ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
            border: `1px solid ${is100Percent ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              {is100Percent ? (
                <CheckCircle2 size={24} color="#10b981" />
              ) : (
                <AlertTriangle size={24} color="#ef4444" />
              )}
              <div>
                <div style={{ fontWeight: 700, fontSize: '0.95rem', color: is100Percent ? '#10b981' : '#ef4444' }}>
                  {is100Percent
                    ? 'Ponderación equilibrada (Suma = 100%)'
                    : totalPercentage < 100
                    ? `Faltan ${(100 - totalPercentage).toFixed(1)}% para completar el 100%`
                    : `Excede el 100% por ${(totalPercentage - 100).toFixed(1)}%`}
                </div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  Puedes activar o apagar cualquier rubro (ej. Portafolio) según las pautas de tu institución.
                </div>
              </div>
            </div>
            <div style={{
              fontSize: '1.4rem',
              fontWeight: 800,
              fontFamily: 'var(--font-mono)',
              color: is100Percent ? '#10b981' : '#ef4444'
            }}>
              {totalPercentage}%
            </div>
          </div>

          {/* Rubrics List */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-main)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>Rubros de Calificación (Activar / Desactivar):</span>
              <button onClick={handleResetToMEPDefault} className="btn btn-secondary btn-sm" style={{ fontSize: '0.75rem' }}>
                <RotateCcw size={13} />
                Restablecer Estándar MEP
              </button>
            </h3>

            {rubrics.map((rubric) => (
              <div
                key={rubric.id}
                style={{
                  padding: '14px 16px',
                  borderRadius: '12px',
                  border: `1px solid ${rubric.enabled ? 'var(--border-focus)' : 'var(--border-subtle)'}`,
                  background: rubric.enabled ? 'var(--bg-card)' : 'var(--bg-surface)',
                  opacity: rubric.enabled ? 1 : 0.65,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '16px',
                  transition: 'all 0.2s ease'
                }}
              >
                {/* Switch and Info */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flex: 1 }}>
                  <label className="toggle-switch">
                    <input
                      type="checkbox"
                      checked={rubric.enabled}
                      onChange={() => handleToggle(rubric.id)}
                    />
                    <span className="toggle-slider"></span>
                  </label>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>
                      {rubric.label}
                      {!rubric.enabled && (
                        <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', marginLeft: '8px' }}>
                          (Desactivado)
                        </span>
                      )}
                    </div>
                    {rubric.description && (
                      <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                        {rubric.description}
                      </div>
                    )}
                  </div>
                </div>

                {/* Controles de Porcentaje: Línea (slider), Flechas (+/-) e Input numérico */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  {rubric.enabled && (
                    <input
                      type="range"
                      min="0"
                      max="100"
                      step="1"
                      value={rubric.percentage}
                      onChange={(e) => handlePercentageChange(rubric.id, parseFloat(e.target.value))}
                      style={{ width: '110px', cursor: 'pointer', accentColor: '#4f46e5' }}
                      title={`Ajustar porcentaje (${rubric.percentage}%)`}
                    />
                  )}

                  <div style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                    {/* Flecha Abajo / Botón Menos */}
                    <button
                      type="button"
                      disabled={!rubric.enabled || rubric.percentage <= 0}
                      onClick={() => handleStepPercentage(rubric.id, -1)}
                      className="btn btn-ghost btn-sm"
                      style={{
                        padding: '2px',
                        height: '32px',
                        width: '26px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        borderRadius: '6px',
                        border: '1px solid var(--border-subtle)',
                        background: 'var(--bg-main)',
                        cursor: rubric.enabled && rubric.percentage > 0 ? 'pointer' : 'not-allowed',
                        opacity: rubric.enabled && rubric.percentage > 0 ? 1 : 0.35
                      }}
                      title="Disminuir 1%"
                    >
                      <Minus size={13} />
                    </button>

                    {/* Input para escribir directamente con el teclado */}
                    <input
                      type="number"
                      disabled={!rubric.enabled}
                      min="0"
                      max="100"
                      step="1"
                      value={rubric.enabled ? rubric.percentage : 0}
                      onChange={(e) => handlePercentageChange(rubric.id, e.target.value)}
                      style={{
                        width: '58px',
                        height: '32px',
                        padding: '4px 6px',
                        textAlign: 'center',
                        fontWeight: 700,
                        fontSize: '0.95rem',
                        borderRadius: '6px',
                        border: '1.5px solid var(--border-subtle)',
                        background: 'var(--bg-main)',
                        color: 'var(--text-main)',
                        outline: 'none'
                      }}
                      title="Escribe directamente el número de porcentaje deseado"
                    />

                    {/* Flecha Arriba / Botón Más */}
                    <button
                      type="button"
                      disabled={!rubric.enabled || rubric.percentage >= 100}
                      onClick={() => handleStepPercentage(rubric.id, 1)}
                      className="btn btn-ghost btn-sm"
                      style={{
                        padding: '2px',
                        height: '32px',
                        width: '26px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        borderRadius: '6px',
                        border: '1px solid var(--border-subtle)',
                        background: 'var(--bg-main)',
                        cursor: rubric.enabled && rubric.percentage < 100 ? 'pointer' : 'not-allowed',
                        opacity: rubric.enabled && rubric.percentage < 100 ? 1 : 0.35
                      }}
                      title="Aumentar 1%"
                    >
                      <Plus size={13} />
                    </button>

                    <span style={{ fontWeight: 800, fontSize: '0.9rem', color: 'var(--text-muted)', marginLeft: '2px' }}>%</span>
                  </div>

                  {rubric.id.startsWith('rubric-custom') && (
                    <button
                      onClick={() => handleDeleteCustomRubric(rubric.id)}
                      className="btn btn-secondary btn-sm"
                      style={{ color: '#ef4444', padding: '6px' }}
                      title="Eliminar este rubro personalizado"
                    >
                      <Trash2 size={15} />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Add custom rubric form */}
          <div style={{
            display: 'flex',
            gap: '10px',
            background: 'var(--bg-surface)',
            padding: '12px',
            borderRadius: '12px',
            border: '1px dashed var(--border-subtle)'
          }}>
            <input
              type="text"
              placeholder="Nombre de nuevo rubro personalizado (ej. Bitácora de Campo, Foro Virtual...)"
              value={newItemName}
              onChange={(e) => setNewItemName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAddNewRubric()}
              style={{
                flex: 1,
                padding: '8px 12px',
                borderRadius: '8px',
                border: '1px solid var(--border-subtle)',
                background: 'var(--bg-main)',
                color: 'var(--text-main)',
                fontSize: '0.85rem',
                outline: 'none'
              }}
            />
            <button onClick={handleAddNewRubric} className="btn btn-secondary btn-sm">
              <Plus size={15} />
              Agregar Rubro
            </button>
          </div>

          {/* Additional Institutional Settings */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            gap: '16px',
            paddingTop: '12px',
            borderTop: '1px solid var(--border-subtle)'
          }}>
            <div>
              <label style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>
                Nota Mínima para Aprobar
              </label>
              <select
                value={passingGrade}
                onChange={(e) => setPassingGrade(parseInt(e.target.value))}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  borderRadius: '8px',
                  border: '1px solid var(--border-subtle)',
                  background: 'var(--bg-main)',
                  color: 'var(--text-main)',
                  fontWeight: 600
                }}
              >
                <option value={70}>70 Puntos (Secundaria / Académico)</option>
                <option value={80}>80 Puntos (Especialidad Técnica / CTP)</option>
                <option value={65}>65 Puntos (Primaria I y II Ciclo)</option>
              </select>
            </div>

            <div>
              <label style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>
                Ponderación del Periodo
              </label>
              <select
                value={periodWeight}
                onChange={(e) => setPeriodWeight(parseInt(e.target.value))}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  borderRadius: '8px',
                  border: '1px solid var(--border-subtle)',
                  background: 'var(--bg-main)',
                  color: 'var(--text-main)',
                  fontWeight: 600
                }}
              >
                <option value={50}>50% (Semestral: I Semestre 50% - II Semestre 50%)</option>
                <option value={33.3}>33.3% (Trimestral: 3 periodos iguales)</option>
                <option value={100}>100% (Módulo Unificado Anual)</option>
              </select>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div style={{
          padding: '16px 24px',
          borderTop: '1px solid var(--border-subtle)',
          display: 'flex',
          justifyContent: 'flex-end',
          gap: '12px'
        }}>
          <button onClick={onClose} className="btn btn-secondary">
            Cancelar
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="btn btn-primary"
            style={{ minWidth: '150px' }}
          >
            <Save size={16} />
            {isSaving ? 'Guardando...' : 'Guardar y Aplicar'}
          </button>
        </div>
      </div>

      {/* Modal Personalizado para Advertencia de Rubros */}
      <ConfirmModal
        isOpen={showConfirmWarning}
        title="Suma de Rubros Distinta a 100%"
        message={`La suma actual de los rubros habilitados da ${totalPercentage.toFixed(1)}%.\n\nSe recomienda que sume exactamente 100% para evitar inconsistencias en el cálculo oficial.\n\n¿Deseas guardar de todos modos?`}
        type="warning"
        confirmText="Guardar de Todos Modos"
        cancelText="Revisar Porcentajes"
        onConfirm={executeSave}
        onClose={() => setShowConfirmWarning(false)}
      />
    </div>
  );
};
