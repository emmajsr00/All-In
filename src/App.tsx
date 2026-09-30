import React, { useState, useEffect } from 'react';
import { db, seedDatabaseIfEmpty } from './db';
import type {
  User,
  Institution,
  Group,
  Subject,
  TeacherAssignment,
  Student,
  EvaluationConfig,
  ScheduleItem
} from './types';
import { Header } from './components/Header';
import { Dashboard } from './components/Dashboard';
import { DirectorView } from './components/DirectorView';
import { AttendanceModal } from './components/AttendanceModal';
import { DailyWorkModal } from './components/DailyWorkModal';
import { GradebookModal } from './components/GradebookModal';
import { RubricsConfigModal } from './components/RubricsConfigModal';
import { ScheduleModal } from './components/ScheduleModal';

export const App: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [isDarkMode, setIsDarkMode] = useState(false);

  // Core entities
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [allInstitutions, setAllInstitutions] = useState<Institution[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string>('user-hellen');
  const [groups, setGroups] = useState<Group[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [assignments, setAssignments] = useState<TeacherAssignment[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [evaluationConfigs, setEvaluationConfigs] = useState<EvaluationConfig[]>([]);
  const [schedules, setSchedules] = useState<ScheduleItem[]>([]);

  // Modal states
  const [attendanceAssignment, setAttendanceAssignment] = useState<TeacherAssignment | null>(null);
  const [dailyWorkAssignment, setDailyWorkAssignment] = useState<TeacherAssignment | null>(null);
  const [gradebookAssignment, setGradebookAssignment] = useState<TeacherAssignment | null>(null);
  const [rubricsConfigAssignment, setRubricsConfigAssignment] = useState<TeacherAssignment | null>(null);
  const [isScheduleOpen, setIsScheduleOpen] = useState(false);

  // Initialize DB and load data
  const loadAppData = async () => {
    await seedDatabaseIfEmpty();
    const [u, inst, grps, subs, asgs, stds, configs, schs] = await Promise.all([
      db.users.toArray(),
      db.institutions.toArray(),
      db.groups.toArray(),
      db.subjects.toArray(),
      db.assignments.toArray(),
      db.students.toArray(),
      db.evaluationConfigs.toArray(),
      db.schedules.toArray()
    ]);

    setAllUsers(u);
    setAllInstitutions(inst);
    setGroups(grps);
    setSubjects(subs);
    setAssignments(asgs);
    setStudents(stds);
    setEvaluationConfigs(configs);
    setSchedules(schs);
    setLoading(false);
  };

  useEffect(() => {
    loadAppData();
  }, []);

  // Theme effect
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', isDarkMode ? 'dark' : 'light');
  }, [isDarkMode]);

  const toggleTheme = () => setIsDarkMode(prev => !prev);

  // Active user and institution
  const currentUser = allUsers.find(u => u.id === currentUserId) || allUsers[0];
  const currentInstitution = allInstitutions.find(i => i.id === currentUser?.institutionId) || allInstitutions[0];

  // Filter groups/assignments for current institution
  const institutionGroups = groups.filter(g => g.institutionId === currentInstitution?.id);
  const institutionSubjects = subjects.filter(s => s.institutionId === currentInstitution?.id);
  const institutionAssignments = assignments.filter(a => {
    const grp = groups.find(g => g.id === a.groupId);
    return grp?.institutionId === currentInstitution?.id;
  });
  const institutionTeachers = allUsers.filter(u => u.institutionId === currentInstitution?.id && u.role === 'TEACHER');

  const handleSaveRubricsConfig = async (updatedConfig: EvaluationConfig) => {
    await db.evaluationConfigs.put(updatedConfig);
    setEvaluationConfigs(prev => prev.map(c => c.id === updatedConfig.id ? updatedConfig : c));
  };

  if (loading || !currentUser || !currentInstitution) {
    return (
      <div style={{
        height: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'column',
        gap: '16px'
      }}>
        <div style={{
          width: '40px',
          height: '40px',
          border: '3px solid #e0e7ff',
          borderTopColor: '#4f46e5',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite'
        }}></div>
        <p style={{ fontWeight: 600, color: 'var(--text-muted)' }}>Cargando EduGrade Pro...</p>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Top Header with Multi-tenant Switcher */}
      <Header
        currentUser={currentUser}
        currentInstitution={currentInstitution}
        allUsers={allUsers}
        allInstitutions={allInstitutions}
        onSwitchUser={(id) => setCurrentUserId(id)}
        isDarkMode={isDarkMode}
        onToggleTheme={toggleTheme}
        onNavigateHome={() => {
          setAttendanceAssignment(null);
          setDailyWorkAssignment(null);
          setGradebookAssignment(null);
          setRubricsConfigAssignment(null);
        }}
      />

      {/* Main Content Area */}
      <main style={{
        flex: 1,
        maxWidth: '1400px',
        width: '100%',
        margin: '0 auto',
        padding: '28px 24px 60px'
      }}>
        {currentUser.role === 'DIRECTOR' ? (
          <DirectorView
            institutionName={currentInstitution.name}
            groups={institutionGroups}
            subjects={institutionSubjects}
            assignments={institutionAssignments}
            teachers={institutionTeachers}
            students={students}
            evaluationConfigs={evaluationConfigs}
            onOpenGroupGradebook={(asg) => setGradebookAssignment(asg)}
          />
        ) : (
          <Dashboard
            currentUser={currentUser}
            currentInstitution={currentInstitution}
            groups={institutionGroups}
            subjects={institutionSubjects}
            assignments={institutionAssignments}
            students={students}
            evaluationConfigs={evaluationConfigs}
            schedules={schedules}
            onOpenAttendance={(asg) => setAttendanceAssignment(asg)}
            onOpenDailyWork={(asg) => setDailyWorkAssignment(asg)}
            onOpenGradebook={(asg) => setGradebookAssignment(asg)}
            onOpenRubricsConfig={(asg) => setRubricsConfigAssignment(asg)}
            onOpenSchedule={() => setIsScheduleOpen(true)}
          />
        )}
      </main>

      {/* Attendance Modal */}
      {attendanceAssignment && (
        <AttendanceModal
          assignmentId={attendanceAssignment.id}
          sectionCode={groups.find(g => g.id === attendanceAssignment.groupId)?.sectionCode || '12-1'}
          subjectName={subjects.find(s => s.id === attendanceAssignment.subjectId)?.name || 'Asignatura'}
          students={students.filter(s => s.groupId === attendanceAssignment.groupId)}
          onClose={() => setAttendanceAssignment(null)}
          onSaved={() => {}}
        />
      )}

      {/* Daily Work (Indicadores) Modal */}
      {dailyWorkAssignment && (
        <DailyWorkModal
          assignmentId={dailyWorkAssignment.id}
          sectionCode={groups.find(g => g.id === dailyWorkAssignment.groupId)?.sectionCode || '12-1'}
          subjectName={subjects.find(s => s.id === dailyWorkAssignment.subjectId)?.name || 'Asignatura'}
          students={students.filter(s => s.groupId === dailyWorkAssignment.groupId)}
          onClose={() => setDailyWorkAssignment(null)}
          onSaved={() => {}}
        />
      )}

      {/* Gradebook (Sábana de notas y exportación a Excel) Modal */}
      {gradebookAssignment && (
        <GradebookModal
          institutionName={currentInstitution.name}
          sectionCode={groups.find(g => g.id === gradebookAssignment.groupId)?.sectionCode || '12-1'}
          subjectName={subjects.find(s => s.id === gradebookAssignment.subjectId)?.name || 'Asignatura'}
          teacherName={currentUser.name}
          students={students.filter(s => s.groupId === gradebookAssignment.groupId)}
          config={
            evaluationConfigs.find(c => c.assignmentId === gradebookAssignment.id) || {
              id: `cfg-${gradebookAssignment.id}`,
              assignmentId: gradebookAssignment.id,
              periodId: 'I_PERIODO',
              passingGrade: 70,
              periodWeight: 50,
              rubrics: [
                { id: 'r-1', key: 'asistencia', label: 'Asistencia', enabled: true, percentage: 5 },
                { id: 'r-2', key: 'cotidiano', label: 'Trabajo Cotidiano', enabled: true, percentage: 25 },
                { id: 'r-3', key: 'tareas', label: 'Tareas', enabled: true, percentage: 10 },
                { id: 'r-4', key: 'evaluaciones', label: 'Pruebas / Evaluaciones', enabled: true, percentage: 45 },
                { id: 'r-5', key: 'proyectos', label: 'Proyectos', enabled: true, percentage: 15 },
                { id: 'r-6', key: 'portafolio', label: 'Portafolio', enabled: false, percentage: 0 }
              ]
            }
          }
          onOpenRubricsConfig={() => {
            const asg = gradebookAssignment;
            setGradebookAssignment(null);
            setRubricsConfigAssignment(asg);
          }}
          onClose={() => setGradebookAssignment(null)}
        />
      )}

      {/* Rubrics Config (Activar / Desactivar Rubros y Ajustar Ponderaciones) Modal */}
      {rubricsConfigAssignment && (
        <RubricsConfigModal
          config={
            evaluationConfigs.find(c => c.assignmentId === rubricsConfigAssignment.id) || {
              id: `cfg-${rubricsConfigAssignment.id}`,
              assignmentId: rubricsConfigAssignment.id,
              periodId: 'I_PERIODO',
              passingGrade: 70,
              periodWeight: 50,
              rubrics: [
                { id: 'r-1', key: 'asistencia', label: 'Asistencia', enabled: true, percentage: 5, description: 'Asistencia a lecciones' },
                { id: 'r-2', key: 'cotidiano', label: 'Trabajo Cotidiano', enabled: true, percentage: 25, description: 'Desempeño en clase' },
                { id: 'r-3', key: 'tareas', label: 'Tareas', enabled: true, percentage: 10, description: 'Trabajos extraclase' },
                { id: 'r-4', key: 'evaluaciones', label: 'Pruebas / Evaluaciones', enabled: true, percentage: 45, description: 'Exámenes' },
                { id: 'r-5', key: 'proyectos', label: 'Proyectos', enabled: true, percentage: 15, description: 'Proyectos técnicos' },
                { id: 'r-6', key: 'portafolio', label: 'Portafolio de Evidencias', enabled: false, percentage: 0, description: 'Opcional según materia' }
              ]
            }
          }
          sectionCode={groups.find(g => g.id === rubricsConfigAssignment.groupId)?.sectionCode || '12-1'}
          subjectName={subjects.find(s => s.id === rubricsConfigAssignment.subjectId)?.name || 'Asignatura'}
          onClose={() => setRubricsConfigAssignment(null)}
          onSave={handleSaveRubricsConfig}
        />
      )}

      {/* Weekly Schedule Modal */}
      {isScheduleOpen && (
        <ScheduleModal
          schedules={schedules}
          groups={institutionGroups}
          subjects={institutionSubjects}
          assignments={institutionAssignments.filter(a => a.teacherId === currentUser.id)}
          teacherId={currentUser.id}
          onClose={() => setIsScheduleOpen(false)}
          onStartEvaluatingClass={(asgId) => {
            const found = assignments.find(a => a.id === asgId);
            if (found) setAttendanceAssignment(found);
          }}
          onRefreshSchedules={async () => {
            const schs = await db.schedules.toArray();
            setSchedules(schs);
          }}
        />
      )}
    </div>
  );
};
