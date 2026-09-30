import React, { useState, useEffect } from 'react';
import {
  X,
  Target,
  Plus,
  Save,
  Award,
  BookOpen
} from 'lucide-react';
import type { Student, LearningIndicator, IndicatorScore } from '../types';
import { db } from '../db';

interface DailyWorkModalProps {
  assignmentId: string;
  sectionCode: string;
  subjectName: string;
  students: Student[];
  onClose: () => void;
  onSaved: () => void;
}

export const DailyWorkModal: React.FC<DailyWorkModalProps> = ({
  assignmentId,
  sectionCode,
  subjectName,
  students,
  onClose,
  onSaved
}) => {
  const [indicators, setIndicators] = useState<LearningIndicator[]>([]);
  const [selectedIndicatorId, setSelectedIndicatorId] = useState<string>('');
  const [scoresMap, setScoresMap] = useState<Record<string, number>>({});
  const [newTitle, setNewTitle] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function loadData() {
      const inds = await db.indicators
        .where('assignmentId')
        .equals(assignmentId)
        .toArray();
      setIndicators(inds);

      if (inds.length > 0) {
        setSelectedIndicatorId(inds[0].id);
      }
    }
    loadData();
  }, [assignmentId]);

  useEffect(() => {
    async function loadScores() {
      if (!selectedIndicatorId) return;
      const scores = await db.indicatorScores
        .where('indicatorId')
        .equals(selectedIndicatorId)
        .toArray();
      
      const map: Record<string, number> = {};
      students.forEach(s => {
        const found = scores.find(sc => sc.studentId === s.id);
        map[s.id] = found ? found.score : 0;
      });
      setScoresMap(map);
    }
    loadScores();
  }, [selectedIndicatorId, students]);

  const handleSetScore = (studentId: string, val: number) => {
    setScoresMap(prev => ({ ...prev, [studentId]: val }));
  };

  const handleCreateIndicator = async () => {
    if (!newTitle.trim()) return;
    const newInd: LearningIndicator = {
      id: `ind-${Date.now()}`,
      assignmentId,
      periodId: 'I_PERIODO',
      code: `IND-0${indicators.length + 1}`,
      title: newTitle.trim(),
      description: newDesc.trim() || 'Evaluación de habilidades y desempeños.',
      maxPoints: 3
    };

    await db.indicators.add(newInd);
    setIndicators(prev => [...prev, newInd]);
    setSelectedIndicatorId(newInd.id);
    setNewTitle('');
    setNewDesc('');
    setShowAddForm(false);
  };

  const handleSaveScores = async () => {
    if (!selectedIndicatorId) return;
    setSaving(true);
    try {
      const existing = await db.indicatorScores
        .where('indicatorId')
        .equals(selectedIndicatorId)
        .toArray();
      
      if (existing.length > 0) {
        await db.indicatorScores.bulkDelete(existing.map(e => e.id));
      }

      const toInsert: IndicatorScore[] = Object.entries(scoresMap)
        .filter(([_, score]) => score > 0)
        .map(([studentId, score]) => ({
          id: `score-${selectedIndicatorId}-${studentId}`,
          indicatorId: selectedIndicatorId,
          studentId,
          score
        }));

      await db.indicatorScores.bulkAdd(toInsert);
      onSaved();
      alert('Puntajes de cotidiano guardados exitosamente.');
    } finally {
      setSaving(false);
    }
  };

  const currentIndicator = indicators.find(i => i.id === selectedIndicatorId);

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
        maxWidth: '900px',
        maxHeight: '92vh',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden'
      }}>
        {/* Header */}
        <div style={{
          padding: '20px 24px',
          borderBottom: '1px solid var(--border-subtle)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Target size={20} color="#06b6d4" />
              <h2 style={{ fontSize: '1.25rem', fontWeight: 800 }}>
                Evaluación de Trabajo Cotidiano por Indicadores
              </h2>
            </div>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              {sectionCode} • {subjectName}
            </p>
          </div>
          <button onClick={onClose} className="btn btn-secondary btn-sm" style={{ padding: '6px' }}>
            <X size={18} />
          </button>
        </div>

        {/* Indicator selection bar */}
        <div style={{
          padding: '12px 24px',
          background: 'var(--bg-surface)',
          borderBottom: '1px solid var(--border-subtle)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '12px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1, minWidth: '260px' }}>
            <span style={{ fontSize: '0.85rem', fontWeight: 700, whiteSpace: 'nowrap' }}>
              Indicador:
            </span>
            <select
              value={selectedIndicatorId}
              onChange={(e) => setSelectedIndicatorId(e.target.value)}
              style={{
                flex: 1,
                padding: '6px 12px',
                borderRadius: '8px',
                border: '1px solid var(--border-subtle)',
                background: 'var(--bg-main)',
                color: 'var(--text-main)',
                fontWeight: 600,
                fontSize: '0.85rem'
              }}
            >
              {indicators.map(ind => (
                <option key={ind.id} value={ind.id}>
                  {ind.code}: {ind.title}
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="btn btn-secondary btn-sm"
          >
            <Plus size={14} />
            Nuevo Indicador
          </button>
        </div>

        {/* Add indicator inline form */}
        {showAddForm && (
          <div style={{
            padding: '16px 24px',
            background: 'var(--bg-main)',
            borderBottom: '1px solid var(--border-subtle)',
            display: 'flex',
            flexDirection: 'column',
            gap: '10px'
          }}>
            <input
              type="text"
              placeholder="Título del aprendizaje esperado / Indicador (ej. Pronunciación de vocabulario corporativo)"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              style={{
                padding: '8px 12px',
                borderRadius: '8px',
                border: '1px solid var(--border-subtle)',
                background: 'var(--bg-surface)',
                color: 'var(--text-main)',
                fontSize: '0.85rem'
              }}
            />
            <input
              type="text"
              placeholder="Descripción del nivel de desempeño..."
              value={newDesc}
              onChange={(e) => setNewDesc(e.target.value)}
              style={{
                padding: '8px 12px',
                borderRadius: '8px',
                border: '1px solid var(--border-subtle)',
                background: 'var(--bg-surface)',
                color: 'var(--text-main)',
                fontSize: '0.85rem'
              }}
            />
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
              <button onClick={() => setShowAddForm(false)} className="btn btn-secondary btn-sm">
                Cancelar
              </button>
              <button onClick={handleCreateIndicator} className="btn btn-primary btn-sm">
                Guardar Indicador
              </button>
            </div>
          </div>
        )}

        {/* Indicator detail summary */}
        {currentIndicator && (
          <div style={{ padding: '12px 24px', background: 'rgba(6, 182, 212, 0.08)', borderBottom: '1px solid var(--border-subtle)' }}>
            <div style={{ fontWeight: 700, fontSize: '0.9rem', color: '#0891b2' }}>
              {currentIndicator.code}: {currentIndicator.title}
            </div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '2px' }}>
              {currentIndicator.description}
            </div>
          </div>
        )}

        {/* Scoring Grid */}
        <div style={{ padding: '20px 24px', overflowY: 'auto', flex: 1 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {students.map((student, idx) => {
              const score = scoresMap[student.id] || 0;

              return (
                <div
                  key={student.id}
                  style={{
                    padding: '10px 14px',
                    borderRadius: '10px',
                    border: '1px solid var(--border-subtle)',
                    background: 'var(--bg-card)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '12px'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', width: '22px', fontWeight: 600 }}>
                      {idx + 1}.
                    </span>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>
                        {student.firstLastName} {student.secondLastName} {student.firstName}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        Cédula: {student.idNumber}
                      </div>
                    </div>
                  </div>

                  {/* Level selection buttons: 1 (Inicial), 2 (Intermedio), 3 (Avanzado) */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <button
                      onClick={() => handleSetScore(student.id, 1)}
                      className="btn btn-sm"
                      style={{
                        background: score === 1 ? 'rgba(239, 68, 68, 0.2)' : 'var(--bg-surface)',
                        color: score === 1 ? '#ef4444' : 'var(--text-muted)',
                        border: score === 1 ? '1px solid #ef4444' : '1px solid transparent',
                        padding: '5px 12px'
                      }}
                      title="Nivel Inicial (1 punto)"
                    >
                      Inicial (1)
                    </button>

                    <button
                      onClick={() => handleSetScore(student.id, 2)}
                      className="btn btn-sm"
                      style={{
                        background: score === 2 ? 'rgba(245, 158, 11, 0.2)' : 'var(--bg-surface)',
                        color: score === 2 ? '#f59e0b' : 'var(--text-muted)',
                        border: score === 2 ? '1px solid #f59e0b' : '1px solid transparent',
                        padding: '5px 12px'
                      }}
                      title="Nivel Intermedio (2 puntos)"
                    >
                      Intermedio (2)
                    </button>

                    <button
                      onClick={() => handleSetScore(student.id, 3)}
                      className="btn btn-sm"
                      style={{
                        background: score === 3 ? 'rgba(16, 185, 129, 0.2)' : 'var(--bg-surface)',
                        color: score === 3 ? '#10b981' : 'var(--text-muted)',
                        border: score === 3 ? '1px solid #10b981' : '1px solid transparent',
                        padding: '5px 12px'
                      }}
                      title="Nivel Avanzado (3 puntos)"
                    >
                      Avanzado (3)
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div style={{
          padding: '16px 24px',
          borderTop: '1px solid var(--border-subtle)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            Nivel Inicial = 1 pt • Intermedio = 2 pts • Avanzado = 3 pts
          </span>
          <div style={{ display: 'flex', gap: '12px' }}>
            <button onClick={onClose} className="btn btn-secondary">
              Cerrar
            </button>
            <button
              onClick={handleSaveScores}
              disabled={saving || !selectedIndicatorId}
              className="btn btn-primary"
            >
              <Save size={16} />
              {saving ? 'Guardando...' : 'Guardar Calificaciones'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
