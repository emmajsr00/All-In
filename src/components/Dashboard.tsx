import React, { useState, useEffect } from 'react';
import {
  Users,
  BookOpen,
  Calendar,
  Clock,
  Sparkles,
  SlidersHorizontal,
  FileSpreadsheet,
  CheckCircle2,
  Play,
  Layers,
  ChevronRight,
  TrendingUp,
  Award,
  ArrowRight
} from 'lucide-react';
import type {
  User,
  Institution,
  Group,
  Subject,
  TeacherAssignment,
  Student,
  EvaluationConfig,
  ScheduleItem
} from '../types';

interface DashboardProps {
  currentUser: User;
  currentInstitution: Institution;
  groups: Group[];
  subjects: Subject[];
  assignments: TeacherAssignment[];
  students: Student[];
  evaluationConfigs: EvaluationConfig[];
  schedules: ScheduleItem[];
  onSelectAssignment: (assignment: TeacherAssignment) => void;
  onOpenRubricsConfig: (assignment: TeacherAssignment) => void;
  onOpenSchedule: () => void;
}

export const Dashboard: React.FC<DashboardProps> = ({
  currentUser,
  currentInstitution,
  groups,
  subjects,
  assignments,
  students,
  evaluationConfigs,
  schedules,
  onSelectAssignment,
  onOpenRubricsConfig,
  onOpenSchedule
}) => {
  const userAssignments = assignments.filter(a => a.teacherId === currentUser.id);

  // Smart Schedule detector: Find if there is an active class right now
  const [currentActiveSchedule, setCurrentActiveSchedule] = useState<ScheduleItem | null>(null);

  useEffect(() => {
    const checkSchedule = () => {
      const now = new Date();
      const currentDay = now.getDay();
      const currentTimeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

      const found = schedules.find(s => {
        if (s.teacherId !== currentUser.id) return false;
        if (s.dayOfWeek === currentDay && currentTimeStr >= s.startTime && currentTimeStr <= s.endTime) {
          return true;
        }
        return false;
      });

      if (found) {
        setCurrentActiveSchedule(found);
      } else if (schedules.length > 0) {
        // En demostración mostramos la primera para que el docente pueda ver la experiencia activa
        const teacherSchedules = schedules.filter(s => s.teacherId === currentUser.id);
        setCurrentActiveSchedule(teacherSchedules[0] || null);
      }
    };

    checkSchedule();
    const timer = setInterval(checkSchedule, 60000);
    return () => clearInterval(timer);
  }, [currentUser.id, schedules]);

  const activeAssignment = currentActiveSchedule
    ? userAssignments.find(a => a.groupId === currentActiveSchedule.groupId && a.subjectId === currentActiveSchedule.subjectId)
    : null;

  const activeGroup = activeAssignment ? groups.find(g => g.id === activeAssignment.groupId) : null;
  const activeSubject = activeAssignment ? subjects.find(s => s.id === activeAssignment.subjectId) : null;

  const todayFormatted = new Intl.DateTimeFormat('es-CR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  }).format(new Date());

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Welcome Banner */}
      <div className="glass-panel" style={{
        padding: '28px',
        background: 'linear-gradient(135deg, rgba(79, 70, 229, 0.12) 0%, rgba(124, 58, 237, 0.08) 100%)',
        border: '1px solid rgba(79, 70, 229, 0.25)',
        position: 'relative',
        overflow: 'hidden'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
              <span className="badge" style={{ background: 'rgba(79, 70, 229, 0.2)', color: '#4f46e5' }}>
                <Sparkles size={12} /> {currentUser.title || 'Docente'}
              </span>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                {todayFormatted}
              </span>
            </div>
            <h1 style={{ fontSize: '1.8rem', fontWeight: 800, letterSpacing: '-0.02em' }}>
              ¡Hola, <span className="gradient-text">{currentUser.name}</span>!
            </h1>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', marginTop: '6px', maxWidth: '650px' }}>
              Bienvenido a tu panel docente. Abre cualquiera de tus grupos para acceder al registro general de calificaciones, control de asistencia por lecciones y evaluación por rubros individuales.
            </p>
          </div>

          <div style={{ display: 'flex', gap: '10px' }}>
            <button onClick={onOpenSchedule} className="btn btn-secondary">
              <Clock size={16} color="#6366f1" />
              Horario Semanal
            </button>
          </div>
        </div>

        {/* Quick Stats Grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: '14px',
          marginTop: '24px'
        }}>
          <div style={{ background: 'var(--bg-card)', padding: '14px 18px', borderRadius: '14px', border: '1px solid var(--border-subtle)' }}>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Users size={14} color="#4f46e5" /> Grupos a Cargo
            </div>
            <div style={{ fontSize: '1.5rem', fontWeight: 800, marginTop: '4px' }}>
              {new Set(userAssignments.map(a => a.groupId)).size} Grupos
            </div>
          </div>

          <div style={{ background: 'var(--bg-card)', padding: '14px 18px', borderRadius: '14px', border: '1px solid var(--border-subtle)' }}>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <BookOpen size={14} color="#06b6d4" /> Materias Impartidas
            </div>
            <div style={{ fontSize: '1.5rem', fontWeight: 800, marginTop: '4px' }}>
              {userAssignments.length} Asignaturas
            </div>
          </div>

          <div style={{ background: 'var(--bg-card)', padding: '14px 18px', borderRadius: '14px', border: '1px solid var(--border-subtle)' }}>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Award size={14} color="#10b981" /> Estudiantes Registrados
            </div>
            <div style={{ fontSize: '1.5rem', fontWeight: 800, marginTop: '4px' }}>
              {students.length} Alumnos
            </div>
          </div>

          <div style={{ background: 'var(--bg-card)', padding: '14px 18px', borderRadius: '14px', border: '1px solid var(--border-subtle)' }}>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <TrendingUp size={14} color="#8b5cf6" /> Asistencia Promedio
            </div>
            <div style={{ fontSize: '1.5rem', fontWeight: 800, marginTop: '4px', color: '#16a34a' }}>
              96.4%
            </div>
          </div>
        </div>
      </div>

      {/* Smart Active Class Card */}
      {currentActiveSchedule && activeAssignment && (
        <div className="glass-panel" style={{
          padding: '20px 24px',
          background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.12) 0%, rgba(5, 150, 105, 0.08) 100%)',
          border: '1px solid rgba(16, 185, 129, 0.3)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '16px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{
              width: '48px',
              height: '48px',
              borderRadius: '14px',
              background: '#10b981',
              color: 'white',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 4px 14px rgba(16, 185, 129, 0.4)'
            }}>
              <Play size={24} />
            </div>

            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span className="badge" style={{ background: '#10b981', color: 'white' }}>
                  ● CLASE EN CURSO AHORA
                </span>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  Bloque: {currentActiveSchedule.startTime} - {currentActiveSchedule.endTime}
                  {currentActiveSchedule.classroom && ` • ${currentActiveSchedule.classroom}`}
                </span>
              </div>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 800, marginTop: '4px' }}>
                {activeGroup?.groupName || `Sección ${activeGroup?.sectionCode}`} — {activeSubject?.name}
              </h2>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <button
              onClick={() => onSelectAssignment(activeAssignment)}
              className="btn btn-primary"
              style={{ background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)' }}
            >
              <Play size={16} />
              Abrir Registro de la Clase
            </button>
          </div>
        </div>
      )}

      {/* Assigned Groups & Subjects Section */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
          <div>
            <h2 style={{ fontSize: '1.3rem', fontWeight: 800 }}>
              Mis Grupos y Materias Asignadas
            </h2>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              Cada tarjeta representa una asignatura. Haz clic para abrir el registro completo con sus pestañas de asistencia, cotidiano, tareas y pruebas.
            </p>
          </div>

          <span className="badge" style={{ background: 'var(--bg-surface)', color: 'var(--text-main)' }}>
            {userAssignments.length} Asignaturas activas
          </span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '20px' }}>
          {userAssignments.map(asg => {
            const group = groups.find(g => g.id === asg.groupId);
            const subject = subjects.find(s => s.id === asg.subjectId);
            const config = evaluationConfigs.find(c => c.assignmentId === asg.id) || {
              id: 'tmp',
              assignmentId: asg.id,
              periodId: 'I_PERIODO',
              passingGrade: 70,
              periodWeight: 50,
              rubrics: []
            };

            const sectionStudents = students.filter(s => s.groupId === asg.groupId);
            const enabledRubrics = config.rubrics.filter(r => r.enabled);

            return (
              <div
                key={asg.id}
                className="glass-panel hover-lift"
                style={{
                  padding: '24px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '16px',
                  border: '1px solid var(--border-subtle)',
                  cursor: 'pointer'
                }}
                onClick={() => onSelectAssignment(asg)}
              >
                {/* Card Top: Group & Subject Badge */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                      <span className="badge" style={{ background: '#4f46e5', color: 'white', fontSize: '0.8rem', padding: '4px 10px' }}>
                        {group?.groupName || `Sección ${group?.sectionCode || '12-1'}`}
                      </span>
                      {asg.isGuia && (
                        <span className="badge" style={{ background: 'rgba(124, 58, 237, 0.15)', color: '#7c3aed' }}>
                          Docente Guía
                        </span>
                      )}
                    </div>
                    <h3 style={{ fontSize: '1.2rem', fontWeight: 800, marginTop: '8px' }}>
                      {subject?.name}
                    </h3>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                      Código: {subject?.code} • {group?.specialty || 'General'}
                    </div>
                  </div>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onOpenRubricsConfig(asg);
                    }}
                    className="btn btn-secondary btn-sm"
                    title="Ajustar y personalizar rubros (Activar/Desactivar Portafolio, etc.)"
                    style={{ padding: '6px 10px' }}
                  >
                    <SlidersHorizontal size={14} color="#6366f1" />
                    Rubros
                  </button>
                </div>

                {/* Active Rubrics Pill summary */}
                <div style={{
                  background: 'var(--bg-surface)',
                  padding: '10px 12px',
                  borderRadius: '10px',
                  fontSize: '0.78rem'
                }}>
                  <div style={{ fontWeight: 700, color: 'var(--text-muted)', marginBottom: '4px' }}>
                    Rubros Activos ({enabledRubrics.length}):
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                    {enabledRubrics.map(r => (
                      <span key={r.id} style={{
                        background: 'var(--bg-main)',
                        border: '1px solid var(--border-subtle)',
                        borderRadius: '6px',
                        padding: '2px 6px',
                        fontSize: '0.72rem',
                        fontWeight: 600
                      }}>
                        {r.label}: <strong style={{ color: '#4f46e5' }}>{r.percentage}%</strong>
                      </span>
                    ))}
                  </div>
                </div>

                {/* Section stats */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.85rem' }}>
                  <span style={{ color: 'var(--text-muted)' }}>
                    Matrícula: <strong>{sectionStudents.length} estudiantes</strong>
                  </span>
                  <span style={{ color: 'var(--text-muted)' }}>
                    Nota aprobación: <strong>{config.passingGrade} pts</strong>
                  </span>
                </div>

                {/* Primary Action Button */}
                <div style={{
                  marginTop: 'auto',
                  paddingTop: '12px',
                  borderTop: '1px solid var(--border-subtle)'
                }}>
                  <button
                    className="btn btn-primary"
                    style={{ width: '100%', justifyContent: 'space-between' }}
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelectAssignment(asg);
                    }}
                  >
                    <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <FileSpreadsheet size={16} />
                      Abrir Registro de Calificaciones
                    </span>
                    <ArrowRight size={16} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
