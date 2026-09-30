import React, { useState } from 'react';
import {
  X,
  FileSpreadsheet,
  Download,
  Search,
  CheckCircle,
  AlertCircle,
  SlidersHorizontal
} from 'lucide-react';
import type { Student, EvaluationConfig } from '../types';
import { exportGradebookToExcel } from '../utils/excelExport';

interface GradebookModalProps {
  institutionName: string;
  sectionCode: string;
  subjectName: string;
  teacherName: string;
  students: Student[];
  config: EvaluationConfig;
  onOpenRubricsConfig: () => void;
  onClose: () => void;
}

export const GradebookModal: React.FC<GradebookModalProps> = ({
  institutionName,
  sectionCode,
  subjectName,
  teacherName,
  students,
  config,
  onOpenRubricsConfig,
  onClose
}) => {
  const [searchTerm, setSearchTerm] = useState('');

  // Estados de notas simuladas/reales calculadas
  // Por defecto, inicializamos con valores calculados realistas alineados con 12-1.xlsm
  const [gradesData, setGradesData] = useState<Record<string, {
    asistencia: number;
    cotidiano: number;
    tareas: number;
    evaluaciones: number;
    proyectos: number;
    portafolio: number;
  }>>(() => {
    const initial: Record<string, any> = {};
    students.forEach((s, idx) => {
      // Valores base inspirados en el Excel de Hellen
      const asisBase = idx === 7 || idx === 14 ? 4.65 : (config.rubrics.find(r => r.key === 'asistencia')?.percentage || 5);
      const cotBase = idx === 5 || idx === 7 ? 23.25 : (config.rubrics.find(r => r.key === 'cotidiano')?.percentage || 25);
      const tarBase = (config.rubrics.find(r => r.key === 'tareas')?.percentage || 10) * (idx % 3 === 0 ? 0.95 : 1);
      const evaBase = (config.rubrics.find(r => r.key === 'evaluaciones')?.percentage || 45) * (idx === 1 ? 0.92 : idx === 8 ? 0.85 : 0.96);
      const proBase = (config.rubrics.find(r => r.key === 'proyectos')?.percentage || 15);
      const porBase = (config.rubrics.find(r => r.key === 'portafolio')?.percentage || 0);

      initial[s.id] = {
        asistencia: asisBase,
        cotidiano: cotBase,
        tareas: Number(tarBase.toFixed(2)),
        evaluaciones: Number(evaBase.toFixed(2)),
        proyectos: Number(proBase.toFixed(2)),
        portafolio: Number(porBase.toFixed(2))
      };
    });
    return initial;
  });

  const handleGradeChange = (studentId: string, rubricKey: string, value: number) => {
    setGradesData(prev => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        [rubricKey]: Math.max(0, value)
      }
    }));
  };

  const activeRubrics = config.rubrics.filter(r => r.enabled);

  // Filtrar estudiantes
  const filteredStudents = students.filter(s => {
    const full = `${s.firstLastName} ${s.secondLastName} ${s.firstName} ${s.idNumber}`.toLowerCase();
    return full.includes(searchTerm.toLowerCase());
  });

  // Preparar lista con notas finales
  const computedList = students.map(s => {
    const studentGrades = gradesData[s.id] || {
      asistencia: 0,
      cotidiano: 0,
      tareas: 0,
      evaluaciones: 0,
      proyectos: 0,
      portafolio: 0
    };

    let total = 0;
    activeRubrics.forEach(r => {
      const val = (studentGrades as any)[r.key] || 0;
      total += val;
    });

    const isPassing = total >= config.passingGrade;

    return {
      studentId: s.id,
      ...studentGrades,
      notaFinal: Number(total.toFixed(2)),
      condicion: isPassing ? 'Aprobado' : 'Aplazado'
    };
  });

  const handleExport = () => {
    exportGradebookToExcel(
      institutionName,
      sectionCode,
      subjectName,
      teacherName,
      students,
      config,
      computedList
    );
  };

  const passingCount = computedList.filter(c => c.notaFinal >= config.passingGrade).length;
  const failingCount = computedList.length - passingCount;
  const avgGrade = (computedList.reduce((acc, curr) => acc + curr.notaFinal, 0) / (computedList.length || 1)).toFixed(1);

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.75)',
      backdropFilter: 'blur(8px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 100,
      padding: '16px'
    }}>
      <div className="glass-panel" style={{
        width: '100%',
        maxWidth: '1250px',
        maxHeight: '94vh',
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
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '12px'
        }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <FileSpreadsheet size={22} color="#4f46e5" />
              <h2 style={{ fontSize: '1.25rem', fontWeight: 800 }}>
                Sábana de Calificaciones y Promedios Automáticos
              </h2>
            </div>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              {institutionName} • Sección {sectionCode} • {subjectName}
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <button onClick={onOpenRubricsConfig} className="btn btn-secondary btn-sm">
              <SlidersHorizontal size={14} color="#6366f1" />
              Configurar Rubros ({activeRubrics.length} activos)
            </button>
            <button onClick={handleExport} className="btn btn-primary btn-sm" style={{ background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)' }}>
              <Download size={14} />
              Exportar a Excel Oficial
            </button>
            <button onClick={onClose} className="btn btn-secondary btn-sm" style={{ padding: '6px' }}>
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Stats summary & Search Bar */}
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
          <div style={{ display: 'flex', gap: '16px', alignItems: 'center', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'var(--bg-card)', padding: '6px 12px', borderRadius: '8px', border: '1px solid var(--border-subtle)' }}>
              <Search size={14} color="#64748b" />
              <input
                type="text"
                placeholder="Buscar por nombre o cédula..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{
                  border: 'none',
                  background: 'transparent',
                  color: 'var(--text-main)',
                  fontSize: '0.85rem',
                  outline: 'none',
                  width: '200px'
                }}
              />
            </div>

            <span style={{ fontSize: '0.82rem', fontWeight: 600 }}>
              Nota para Aprobar: <strong style={{ color: '#4f46e5' }}>{config.passingGrade} pts</strong>
            </span>
            <span style={{ fontSize: '0.82rem', fontWeight: 600 }}>
              Promedio General: <strong>{avgGrade}</strong>
            </span>
            <span style={{ fontSize: '0.82rem', fontWeight: 600, color: '#16a34a' }}>
              ● {passingCount} Aprobados ({((passingCount / (students.length || 1)) * 100).toFixed(0)}%)
            </span>
            {failingCount > 0 && (
              <span style={{ fontSize: '0.82rem', fontWeight: 600, color: '#dc2626' }}>
                ● {failingCount} Aplazados
              </span>
            )}
          </div>
        </div>

        {/* Table Content */}
        <div style={{ padding: '0', overflowY: 'auto', flex: 1 }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
            <thead style={{ position: 'sticky', top: 0, background: 'var(--bg-card)', zIndex: 10, borderBottom: '2px solid var(--border-subtle)' }}>
              <tr>
                <th style={{ padding: '12px 14px', width: '40px', color: 'var(--text-muted)' }}>#</th>
                <th style={{ padding: '12px 14px', color: 'var(--text-muted)' }}>Estudiante</th>
                <th style={{ padding: '12px 14px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>Cédula</th>

                {/* Columnas dinámicas de rubros */}
                {activeRubrics.map(r => (
                  <th key={r.id} style={{ padding: '12px 10px', textAlign: 'center' }}>
                    <div style={{ fontWeight: 700, color: 'var(--text-main)' }}>{r.label}</div>
                    <div style={{ fontSize: '0.72rem', color: '#6366f1', fontWeight: 700 }}>{r.percentage}%</div>
                  </th>
                ))}

                <th style={{ padding: '12px 14px', textAlign: 'center', background: 'rgba(79, 70, 229, 0.08)' }}>
                  <div style={{ fontWeight: 800, color: '#4f46e5' }}>NOTA FINAL</div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>100%</div>
                </th>
                <th style={{ padding: '12px 14px', textAlign: 'center' }}>Condición</th>
              </tr>
            </thead>
            <tbody>
              {filteredStudents.map((student, idx) => {
                const sComputed = computedList.find(c => c.studentId === student.id)!;
                const sGrades = gradesData[student.id];

                return (
                  <tr
                    key={student.id}
                    style={{
                      borderBottom: '1px solid var(--border-subtle)',
                      transition: 'background 0.15s ease'
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--bg-surface)')}
                    onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                  >
                    <td style={{ padding: '10px 14px', color: 'var(--text-muted)', fontWeight: 600 }}>
                      {idx + 1}
                    </td>
                    <td style={{ padding: '10px 14px', fontWeight: 700 }}>
                      {student.firstLastName} {student.secondLastName} {student.firstName}
                    </td>
                    <td style={{ padding: '10px 14px', fontFamily: 'var(--font-mono)', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                      {student.idNumber}
                    </td>

                    {/* Celdas editables para cada rubro activo */}
                    {activeRubrics.map(r => {
                      const val = (sGrades as any)[r.key] || 0;

                      return (
                        <td key={r.id} style={{ padding: '8px 10px', textAlign: 'center' }}>
                          <input
                            type="number"
                            step="0.1"
                            min="0"
                            max={r.percentage}
                            value={val}
                            onChange={(e) => handleGradeChange(student.id, r.key, parseFloat(e.target.value) || 0)}
                            style={{
                              width: '65px',
                              padding: '5px',
                              textAlign: 'center',
                              borderRadius: '6px',
                              border: '1px solid var(--border-subtle)',
                              background: 'var(--bg-main)',
                              color: 'var(--text-main)',
                              fontWeight: 700,
                              fontSize: '0.85rem',
                              outline: 'none'
                            }}
                          />
                        </td>
                      );
                    })}

                    {/* Nota Final */}
                    <td style={{
                      padding: '10px 14px',
                      textAlign: 'center',
                      fontWeight: 800,
                      fontFamily: 'var(--font-mono)',
                      fontSize: '0.95rem',
                      background: 'rgba(79, 70, 229, 0.05)',
                      color: sComputed.notaFinal >= config.passingGrade ? '#10b981' : '#ef4444'
                    }}>
                      {sComputed.notaFinal}
                    </td>

                    {/* Condición */}
                    <td style={{ padding: '10px 14px', textAlign: 'center' }}>
                      <span className="badge" style={{
                        background: sComputed.notaFinal >= config.passingGrade ? 'var(--badge-present-bg)' : 'var(--badge-absent-bg)',
                        color: sComputed.notaFinal >= config.passingGrade ? 'var(--badge-present-text)' : 'var(--badge-absent-text)',
                        border: `1px solid ${sComputed.notaFinal >= config.passingGrade ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`
                      }}>
                        {sComputed.notaFinal >= config.passingGrade ? (
                          <>
                            <CheckCircle size={12} />
                            Aprobado
                          </>
                        ) : (
                          <>
                            <AlertCircle size={12} />
                            Aplazado
                          </>
                        )}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Footer */}
        <div style={{
          padding: '16px 24px',
          borderTop: '1px solid var(--border-subtle)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            Total Estudiantes: <strong>{students.length}</strong> • Fórmulas de cálculo automático sincronizadas en tiempo real.
          </div>
          <button onClick={onClose} className="btn btn-secondary">
            Cerrar Sábana
          </button>
        </div>
      </div>
    </div>
  );
};
