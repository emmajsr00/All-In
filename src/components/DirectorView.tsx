import React from 'react';
import {
  Building2,
  Users,
  Award,
  AlertTriangle,
  FileSpreadsheet,
  CheckCircle2,
  UserCheck,
  ArrowRight,
  TrendingUp
} from 'lucide-react';
import type { Group, Subject, TeacherAssignment, User, Student, EvaluationConfig } from '../types';

interface DirectorViewProps {
  institutionName: string;
  groups: Group[];
  subjects: Subject[];
  assignments: TeacherAssignment[];
  teachers: User[];
  students: Student[];
  evaluationConfigs: EvaluationConfig[];
  onOpenGroupGradebook: (assignment: TeacherAssignment) => void;
}

export const DirectorView: React.FC<DirectorViewProps> = ({
  institutionName,
  groups,
  subjects,
  assignments,
  teachers,
  students,
  evaluationConfigs,
  onOpenGroupGradebook
}) => {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Institutional Banner */}
      <div className="glass-panel" style={{
        padding: '24px',
        background: 'linear-gradient(135deg, rgba(79, 70, 229, 0.12) 0%, rgba(124, 58, 237, 0.08) 100%)',
        border: '1px solid rgba(79, 70, 229, 0.25)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <div className="badge" style={{ background: 'rgba(79, 70, 229, 0.2)', color: '#4f46e5', marginBottom: '8px' }}>
              <Building2 size={12} /> Panel de Dirección y Supervisión Académica
            </div>
            <h1 style={{ fontSize: '1.6rem', fontWeight: 800 }}>
              Supervisión Global: {institutionName}
            </h1>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginTop: '4px' }}>
              Acceso directivo para auditar notas, verificar porcentajes de asistencia y supervisar todas las secciones del centro educativo.
            </p>
          </div>

          <div style={{ display: 'flex', gap: '12px' }}>
            <div style={{ background: 'var(--bg-card)', padding: '10px 18px', borderRadius: '12px', border: '1px solid var(--border-subtle)', textAlign: 'center' }}>
              <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#4f46e5' }}>{groups.length}</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Secciones Totales</div>
            </div>
            <div style={{ background: 'var(--bg-card)', padding: '10px 18px', borderRadius: '12px', border: '1px solid var(--border-subtle)', textAlign: 'center' }}>
              <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#06b6d4' }}>{teachers.length}</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Docentes</div>
            </div>
            <div style={{ background: 'var(--bg-card)', padding: '10px 18px', borderRadius: '12px', border: '1px solid var(--border-subtle)', textAlign: 'center' }}>
              <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#10b981' }}>{students.length}</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Estudiantes</div>
            </div>
          </div>
        </div>
      </div>

      {/* Audit Sections Grid */}
      <div>
        <h2 style={{ fontSize: '1.2rem', fontWeight: 800, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <TrendingUp size={20} color="#4f46e5" />
          Rendimiento por Sección y Asignatura
        </h2>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '20px' }}>
          {assignments.map(asg => {
            const group = groups.find(g => g.id === asg.groupId);
            const subject = subjects.find(s => s.id === asg.subjectId);
            const teacher = teachers.find(t => t.id === asg.teacherId);
            const sectionStudents = students.filter(s => s.groupId === asg.groupId);
            const config = evaluationConfigs.find(c => c.assignmentId === asg.id);

            // Métricas calculadas para supervisión
            const simulatedPassingRate = asg.groupId === 'grp-12-1' ? 93.3 : 88.5;
            const simulatedAttendanceRate = asg.groupId === 'grp-12-1' ? 96.2 : 91.8;

            return (
              <div
                key={asg.id}
                className="glass-panel hover-lift"
                style={{
                  padding: '20px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '14px',
                  border: '1px solid var(--border-subtle)'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span className="badge" style={{ background: '#4f46e5', color: 'white' }}>
                        Sección {group?.sectionCode || 'N/A'}
                      </span>
                      {group?.specialty && (
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                          {group.specialty}
                        </span>
                      )}
                    </div>
                    <h3 style={{ fontSize: '1.05rem', fontWeight: 700, marginTop: '8px' }}>
                      {subject?.name}
                    </h3>
                  </div>

                  <span className="badge" style={{
                    background: simulatedPassingRate >= 90 ? 'var(--badge-present-bg)' : 'var(--badge-excused-bg)',
                    color: simulatedPassingRate >= 90 ? 'var(--badge-present-text)' : 'var(--badge-excused-text)'
                  }}>
                    {simulatedPassingRate}% Aprobación
                  </span>
                </div>

                {/* Teacher in charge */}
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  background: 'var(--bg-surface)',
                  padding: '8px 12px',
                  borderRadius: '10px'
                }}>
                  <div style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '50%',
                    background: 'linear-gradient(135deg, #06b6d4, #3b82f6)',
                    color: 'white',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 700,
                    fontSize: '0.8rem'
                  }}>
                    {teacher?.name.charAt(0)}
                  </div>
                  <div>
                    <div style={{ fontSize: '0.85rem', fontWeight: 700 }}>
                      {teacher?.name}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      {teacher?.title || 'Docente'}
                    </div>
                  </div>
                </div>

                {/* Indicators summary */}
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(2, 1fr)',
                  gap: '8px',
                  fontSize: '0.8rem'
                }}>
                  <div style={{ background: 'var(--bg-main)', padding: '8px', borderRadius: '8px', border: '1px solid var(--border-subtle)' }}>
                    <div style={{ color: 'var(--text-muted)' }}>Matrícula:</div>
                    <div style={{ fontWeight: 700 }}>{sectionStudents.length} estudiantes</div>
                  </div>
                  <div style={{ background: 'var(--bg-main)', padding: '8px', borderRadius: '8px', border: '1px solid var(--border-subtle)' }}>
                    <div style={{ color: 'var(--text-muted)' }}>Asistencia Promedio:</div>
                    <div style={{ fontWeight: 700, color: '#16a34a' }}>{simulatedAttendanceRate}%</div>
                  </div>
                </div>

                {/* Action button */}
                <button
                  onClick={() => onOpenGroupGradebook(asg)}
                  className="btn btn-secondary btn-sm"
                  style={{ width: '100%', marginTop: 'auto', justifyContent: 'space-between' }}
                >
                  <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <FileSpreadsheet size={15} color="#4f46e5" />
                    Inspeccionar Sábana de Notas
                  </span>
                  <ArrowRight size={14} />
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
