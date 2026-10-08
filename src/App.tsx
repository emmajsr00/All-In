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
  ScheduleItem,
  LearningIndicator,
  ClassSession,
  SessionStudentDetail,
  TaskGrade,
  ExamGrade,
  ProjectGrade,
  PortfolioGrade
} from './types';
import { Header } from './components/Header';
import { Dashboard } from './components/Dashboard';
import { DirectorView } from './components/DirectorView';
import { GroupWorkspaceView } from './components/GroupWorkspaceView';
import { RubricsConfigModal } from './components/RubricsConfigModal';
import { ScheduleModal } from './components/ScheduleModal';
import { LoginView } from './components/LoginView';
import { DeveloperView } from './components/DeveloperView';

export const App: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [isDarkMode, setIsDarkMode] = useState(false);

  // Auth State
  const [currentUserId, setCurrentUserId] = useState<string | null>(() => {
    return localStorage.getItem('allin_auth_user_id');
  });
  const [isDeveloperPanelActive, setIsDeveloperPanelActive] = useState<boolean>(true);
  const [selectedDevInstitutionId, setSelectedDevInstitutionId] = useState<string | null>(null);

  // Core entities
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [allInstitutions, setAllInstitutions] = useState<Institution[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [assignments, setAssignments] = useState<TeacherAssignment[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [evaluationConfigs, setEvaluationConfigs] = useState<EvaluationConfig[]>([]);
  const [schedules, setSchedules] = useState<ScheduleItem[]>([]);

  // Detailed grading records & Indicators
  const [indicators, setIndicators] = useState<LearningIndicator[]>([]);
  const [sessions, setSessions] = useState<ClassSession[]>([]);
  const [sessionDetails, setSessionDetails] = useState<SessionStudentDetail[]>([]);
  const [taskGrades, setTaskGrades] = useState<TaskGrade[]>([]);
  const [examGrades, setExamGrades] = useState<ExamGrade[]>([]);
  const [projectGrades, setProjectGrades] = useState<ProjectGrade[]>([]);
  const [portfolioGrades, setPortfolioGrades] = useState<PortfolioGrade[]>([]);

  // Navigation state: which assignment is currently open (null = dashboard)
  const [selectedAssignment, setSelectedAssignment] = useState<TeacherAssignment | null>(null);

  // Modal states
  const [rubricsConfigAssignment, setRubricsConfigAssignment] = useState<TeacherAssignment | null>(null);
  const [isScheduleOpen, setIsScheduleOpen] = useState(false);

  // Initialize DB and load data
  const loadAppData = async () => {
    await seedDatabaseIfEmpty();
    const [u, inst, grps, subs, asgs, stds, configs, schs, inds, sess, dtl, tg, eg, pg, port] = await Promise.all([
      db.users.toArray(),
      db.institutions.toArray(),
      db.groups.toArray(),
      db.subjects.toArray(),
      db.assignments.toArray(),
      db.students.toArray(),
      db.evaluationConfigs.toArray(),
      db.schedules.toArray(),
      db.indicators.toArray(),
      db.classSessions.toArray(),
      db.sessionDetails.toArray(),
      db.taskGrades.toArray(),
      db.examGrades.toArray(),
      db.projectGrades.toArray(),
      db.portfolioGrades.toArray()
    ]);

    setAllUsers(u);
    setAllInstitutions(inst);
    setGroups(grps);
    setSubjects(subs);
    setAssignments(asgs);
    setStudents(stds);
    setEvaluationConfigs(configs);
    setSchedules(schs);
    setIndicators(inds);
    setSessions(sess);
    setSessionDetails(dtl);
    setTaskGrades(tg);
    setExamGrades(eg);
    setProjectGrades(pg);
    setPortfolioGrades(port);
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

  const handleLogin = (user: User) => {
    setCurrentUserId(user.id);
    localStorage.setItem('allin_auth_user_id', user.id);
    if (user.role === 'DEVELOPER') {
      setIsDeveloperPanelActive(true);
    }
  };

  const handleLogout = () => {
    setCurrentUserId(null);
    localStorage.removeItem('allin_auth_user_id');
    setSelectedAssignment(null);
    setIsDeveloperPanelActive(false);
  };

  if (loading) {
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
        <p style={{ fontWeight: 600, color: 'var(--text-muted)' }}>Cargando ALL-IN...</p>
      </div>
    );
  }

  // Active user lookup
  const currentUser = currentUserId ? allUsers.find(u => u.id === currentUserId) || null : null;

  // Si no hay sesión iniciada, mostrar la pantalla de Login obligatoria
  if (!currentUser) {
    return (
      <LoginView
        allUsers={allUsers}
        onLogin={handleLogin}
        isDarkMode={isDarkMode}
        onToggleTheme={toggleTheme}
      />
    );
  }

  // Active institution (Para Desarrollador puede ser la seleccionada o la primera; para otros, su institución asignada)
  const currentInstitution = currentUser.role === 'DEVELOPER'
    ? (allInstitutions.find(i => i.id === selectedDevInstitutionId) || allInstitutions[0])
    : (allInstitutions.find(i => i.id === currentUser.institutionId) || allInstitutions[0]);

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

  // Active group and subject if in group workspace
  const activeGroup = selectedAssignment ? groups.find(g => g.id === selectedAssignment.groupId) : null;
  const activeSubject = selectedAssignment ? subjects.find(s => s.id === selectedAssignment.subjectId) : null;
  const activeConfig = selectedAssignment
    ? evaluationConfigs.find(c => c.assignmentId === selectedAssignment.id) || {
        id: `cfg-${selectedAssignment.id}`,
        assignmentId: selectedAssignment.id,
        periodId: 'I_PERIODO',
        passingGrade: 70,
        periodWeight: 50,
        rubrics: [
          { id: 'r-1', key: 'asistencia', label: 'Asistencia', enabled: true, percentage: 5 },
          { id: 'r-2', key: 'cotidiano', label: 'Trabajo Cotidiano', enabled: true, percentage: 25 },
          { id: 'r-3', key: 'tareas', label: 'Tareas', enabled: true, percentage: 10 },
          { id: 'r-4', key: 'evaluaciones', label: 'Evaluaciones / Pruebas', enabled: true, percentage: 45 },
          { id: 'r-5', key: 'proyectos', label: 'Proyectos', enabled: true, percentage: 15 },
          { id: 'r-6', key: 'portafolio', label: 'Portafolio', enabled: false, percentage: 0 }
        ],
        taskDefinitions: [
          { id: 't1', number: 1, title: 'Tarea 1', percentage: 5 },
          { id: 't2', number: 2, title: 'Tarea 2', percentage: 5 }
        ],
        examDefinitions: [
          { id: 'e1', number: 1, title: 'Evaluación I', percentage: 20 },
          { id: 'e2', number: 2, title: 'Evaluación II', percentage: 25 }
        ],
        projectDefinitions: [
          { id: 'p1', number: 1, title: 'Proyecto I', percentage: 15 }
        ]
      }
    : null;

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Top Header */}
      <Header
        currentUser={currentUser}
        currentInstitution={currentInstitution}
        allUsers={allUsers}
        allInstitutions={allInstitutions}
        onSwitchInstitution={(id) => {
          setSelectedDevInstitutionId(id);
          setIsDeveloperPanelActive(false);
          setSelectedAssignment(null);
        }}
        onGoToDeveloperPanel={() => {
          setIsDeveloperPanelActive(true);
          setSelectedAssignment(null);
        }}
        onLogout={handleLogout}
        isDarkMode={isDarkMode}
        onToggleTheme={toggleTheme}
        onNavigateHome={() => {
          setSelectedAssignment(null);
          if (currentUser.role === 'DEVELOPER') {
            setIsDeveloperPanelActive(true);
          }
        }}
        isDeveloperPanelActive={isDeveloperPanelActive}
      />

      {/* Main Content Area */}
      <main style={{
        flex: 1,
        maxWidth: selectedAssignment ? '100%' : '1440px',
        width: '100%',
        margin: '0 auto',
        padding: selectedAssignment ? '14px 16px 60px' : '24px 20px 60px'
      }}>
        {/* VISTA 1: Panel Desarrollador (Master) */}
        {currentUser.role === 'DEVELOPER' && isDeveloperPanelActive && !selectedAssignment ? (
          <DeveloperView
            allInstitutions={allInstitutions}
            allUsers={allUsers}
            groups={groups}
            students={students}
            onSelectInstitution={(instId) => {
              setSelectedDevInstitutionId(instId);
              setIsDeveloperPanelActive(false);
            }}
            onDataChanged={loadAppData}
          />
        ) : selectedAssignment && activeGroup && activeSubject && activeConfig ? (
          /* VISTA 2: Calificaciones Grupales / Workspace del Grupo */
          <GroupWorkspaceView
            institutionName={currentInstitution?.name || 'ALL-IN'}
            userRole={currentUser.role}
            assignment={selectedAssignment}
            group={activeGroup}
            subject={activeSubject}
            teacherName={currentUser.name}
            students={students.filter(s => s.groupId === selectedAssignment.groupId)}
            config={activeConfig}
            indicators={indicators.filter(i => i.assignmentId === selectedAssignment.id)}
            sessions={sessions.filter(s => s.assignmentId === selectedAssignment.id)}
            sessionDetails={sessionDetails}
            taskGrades={taskGrades.filter(t => t.assignmentId === selectedAssignment.id)}
            examGrades={examGrades.filter(e => e.assignmentId === selectedAssignment.id)}
            projectGrades={projectGrades.filter(p => p.assignmentId === selectedAssignment.id)}
            portfolioGrades={portfolioGrades.filter(p => p.assignmentId === selectedAssignment.id)}
            onBackToDashboard={() => setSelectedAssignment(null)}
            onOpenRubricsConfig={() => setRubricsConfigAssignment(selectedAssignment)}
            onDataChanged={loadAppData}
          />
        ) : (currentUser.role === 'DIRECTOR' || currentUser.role === 'ADMIN' || (currentUser.role === 'DEVELOPER' && !isDeveloperPanelActive)) ? (
          /* VISTA 3: Supervisión Directiva e Institucional */
          <DirectorView
            institutionId={currentInstitution.id}
            institutionName={currentInstitution.name}
            institutionType={currentInstitution.type}
            groups={institutionGroups}
            subjects={institutionSubjects}
            assignments={institutionAssignments}
            teachers={institutionTeachers}
            allUsers={allUsers}
            students={students}
            evaluationConfigs={evaluationConfigs}
            onOpenGroupGradebook={(asg) => setSelectedAssignment(asg)}
            onDataChanged={loadAppData}
          />
        ) : (
          /* VISTA 4: Panel Docente */
          <Dashboard
            currentUser={currentUser}
            currentInstitution={currentInstitution}
            groups={institutionGroups}
            subjects={institutionSubjects}
            assignments={institutionAssignments}
            students={students}
            evaluationConfigs={evaluationConfigs}
            schedules={schedules}
            onSelectAssignment={(asg) => setSelectedAssignment(asg)}
            onOpenRubricsConfig={(asg) => setRubricsConfigAssignment(asg)}
            onOpenSchedule={() => setIsScheduleOpen(true)}
          />
        )}
      </main>

      {/* Rubrics Config Modal */}
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
                { id: 'r-4', key: 'evaluaciones', label: 'Evaluaciones / Pruebas', enabled: true, percentage: 45, description: 'Exámenes' },
                { id: 'r-5', key: 'proyectos', label: 'Proyectos', enabled: true, percentage: 15, description: 'Proyectos técnicos' },
                { id: 'r-6', key: 'portafolio', label: 'Portafolio de Evidencias', enabled: false, percentage: 0, description: 'Opcional según materia' }
              ],
              taskDefinitions: [
                { id: 't1', number: 1, title: 'Tarea 1', percentage: 5 },
                { id: 't2', number: 2, title: 'Tarea 2', percentage: 5 }
              ],
              examDefinitions: [
                { id: 'e1', number: 1, title: 'Evaluación I', percentage: 20 },
                { id: 'e2', number: 2, title: 'Evaluación II', percentage: 25 }
              ],
              projectDefinitions: [
                { id: 'p1', number: 1, title: 'Proyecto I', percentage: 15 }
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
            if (found) setSelectedAssignment(found);
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
