import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Card, CardHeader, CardTitle, CardBody } from '@components/ui/card';
import { Button } from '@components/ui/button';
import { Badge } from '@components/ui/badge';
import { useAuthStore } from '@stores/auth-store';
import { candidateService, type AssignedAssessment, type AssessmentResult } from '@services/candidate-service';
import { formatDate } from '@utils/format';
import {
  FileCheck,
  CheckCircle2,
  Clock,
  Award,
  TrendingUp,
  ArrowRight,
  BookOpen,
  Sparkles,
  BarChart3,
  GraduationCap,
  AlertCircle,
  Loader2,
  Target,
  ChevronRight,
  Zap,
} from 'lucide-react';

type DashboardView = 'overview' | 'loading' | 'error';

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.08 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 200, damping: 20 } },
};

export function CandidateDashboardPage() {
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const [viewState, setViewState] = useState<DashboardView>('loading');
  const [error, setError] = useState('');
  const [stats, setStats] = useState({
    pendingAssessments: 0,
    completedAssessments: 0,
    certificatesCount: 0,
    averageScore: 0,
    competenciesCount: 0,
  });
  const [upcomingAssessments, setUpcomingAssessments] = useState<AssignedAssessment[]>([]);
  const [recentResults, setRecentResults] = useState<AssessmentResult[]>([]);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    setViewState('loading');
    setError('');
    try {
      const [statsData, assessmentsData, resultsData] = await Promise.all([
        candidateService.getDashboardStats().catch(() => ({
          pendingAssessments: 0,
          completedAssessments: 0,
          certificatesCount: 0,
          averageScore: 0,
          competenciesCount: 0,
        })),
        candidateService.getAssignedAssessments({ limit: 3 }).catch(() => ({ data: [], meta: { page: 1, limit: 3, total: 0, totalPages: 0 } })),
        candidateService.getResults({ limit: 3 }).catch(() => ({ data: [], meta: { page: 1, limit: 3, total: 0, totalPages: 0 } })),
      ]);
      setStats(statsData);
      setUpcomingAssessments(assessmentsData.data || []);
      setRecentResults(resultsData.data || []);
      setViewState('overview');
    } catch (err: any) {
      setError('Failed to load dashboard data. Please try again.');
      setViewState('error');
    }
  };

  const displayName = user ? `${user.firstName} ${user.lastName}` : 'Candidate';

  const statCards = [
    {
      label: 'Pending Assessments',
      value: stats.pendingAssessments,
      icon: Clock,
      color: 'text-warning',
      bg: 'bg-warning-light',
      link: '/candidate/assessments',
    },
    {
      label: 'Completed',
      value: stats.completedAssessments,
      icon: CheckCircle2,
      color: 'text-accent-600',
      bg: 'bg-accent-50',
      link: '/candidate/results',
    },
    {
      label: 'Certificates',
      value: stats.certificatesCount,
      icon: Award,
      color: 'text-secondary-600',
      bg: 'bg-secondary-50',
      link: '/candidate/certificates',
    },
    {
      label: 'Avg. Score',
      value: stats.averageScore > 0 ? `${Math.round(stats.averageScore)}%` : '--',
      icon: TrendingUp,
      color: 'text-primary-600',
      bg: 'bg-primary-50',
      link: '/candidate/results',
    },
  ];

  const getRegistrationBadge = (status: string | null | undefined) => {
    switch (status) {
      case 'REGISTERED':
        return <Badge variant="info">Registered</Badge>;
      case 'IN_PROGRESS':
        return <Badge variant="warning">In Progress</Badge>;
      case 'COMPLETED':
        return <Badge variant="success">Completed</Badge>;
      case 'ABSENT':
        return <Badge variant="error">Absent</Badge>;
      default:
        return <Badge variant="neutral">Pending</Badge>;
    }
  };

  const getResultBadge = (passed: boolean | null) => {
    if (passed === null) return <Badge variant="neutral">Pending</Badge>;
    return passed ? <Badge variant="success">Passed</Badge> : <Badge variant="error">Failed</Badge>;
  };

  // loading state
  if (viewState === 'loading') {
    return (
      <div className="flex flex-col items-center justify-center py-24">
        <Loader2 className="h-10 w-10 animate-spin text-primary-500" />
        <p className="mt-4 text-sm text-text-secondary">Loading your dashboard...</p>
      </div>
    );
  }

  // error state
  if (viewState === 'error') {
    return (
      <div className="flex flex-col items-center justify-center py-24">
        <AlertCircle className="h-12 w-12 text-error" />
        <h3 className="mt-4 text-lg font-semibold text-text-primary">Something went wrong</h3>
        <p className="mt-2 text-sm text-text-secondary">{error}</p>
        <Button variant="primary" className="mt-6" onClick={loadDashboardData}>
          Try Again
        </Button>
      </div>
    );
  }

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-6"
    >
      {/* ── Welcome Section ────────────────────────── */}
      <motion.div variants={itemVariants}>
        <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-text-primary">
              Welcome back, <span className="gradient-text-primary">{displayName.split(' ')[0]}</span>
            </h1>
            <p className="mt-1 text-sm text-text-secondary">
              Track your assessments, competencies, and certifications.
            </p>
          </div>
          <div className="mt-3 sm:mt-0 flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary-100 text-sm font-semibold text-primary-700">
              {displayName.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()}
            </div>
            <div className="text-sm">
              <p className="font-medium text-text-primary">{displayName}</p>
              <p className="text-xs text-text-tertiary capitalize">{user?.role?.toLowerCase().replace('_', ' ') || 'Candidate'}</p>
            </div>
          </div>
        </div>
      </motion.div>

      {/* ── Stats Grid ────────────────────────────── */}
      <motion.div
        variants={itemVariants}
        className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4"
      >
        {statCards.map((stat) => {
          const Icon = stat.icon;
          return (
            <Link
              key={stat.label}
              to={stat.link}
              className="block transition-all duration-200 hover:-translate-y-0.5"
            >
              <Card padding="md" className="group cursor-pointer hover:shadow-elevation-medium">
                <div className="flex items-center gap-4">
                  <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${stat.bg}`}>
                    <Icon className={`h-6 w-6 ${stat.color}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-text-secondary truncate">{stat.label}</p>
                    <p className="text-2xl font-bold text-text-primary">{stat.value}</p>
                  </div>
                  <ChevronRight className="h-4 w-4 text-text-tertiary opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
              </Card>
            </Link>
          );
        })}
      </motion.div>

      {/* ── Main Content Grid ─────────────────────── */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Upcoming Assessments */}
        <motion.div variants={itemVariants} className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BookOpen className="h-5 w-5 text-primary-500" />
                Upcoming Assessments
              </CardTitle>
              <Link to="/candidate/assessments">
                <Button variant="ghost" size="sm" icon={<ArrowRight className="h-4 w-4" />}>
                  View All
                </Button>
              </Link>
            </CardHeader>
            <CardBody>
              {upcomingAssessments.length === 0 ? (
                <div className="flex flex-col items-center py-10 text-center">
                  <FileCheck className="h-10 w-10 text-text-tertiary" />
                  <h4 className="mt-3 text-sm font-medium text-text-primary">No pending assessments</h4>
                  <p className="mt-1 text-xs text-text-secondary">
                    You don't have any assigned assessments yet.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {upcomingAssessments.map((assessment) => (
                    <div
                      key={assessment.id}
                      className="group flex items-center justify-between rounded-xl border border-border bg-surface-secondary p-4 transition-all hover:border-primary-200 hover:bg-primary-50/30"
                    >
                      <div className="flex items-start gap-3 min-w-0 flex-1">
                        <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary-100">
                          <FileCheck className="h-4 w-4 text-primary-600" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h4 className="text-sm font-semibold text-text-primary truncate">
                              {assessment.title}
                            </h4>
                            {getRegistrationBadge(assessment.registrationStatus)}
                          </div>
                          <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-text-tertiary">
                            <span className="flex items-center gap-1">
                              <GraduationCap className="h-3 w-3" />
                              {assessment.tradeName}
                            </span>
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {assessment.duration} min
                            </span>
                            {assessment.organizationName && (
                              <span>{assessment.organizationName}</span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex shrink-0 items-center gap-2 ml-3">
                        <Button
                          size="sm"
                          variant="primary"
                          onClick={() => navigate(`/candidate/assessments/${assessment.id}`)}
                        >
                          {assessment.registrationStatus === 'IN_PROGRESS' ? 'Continue' : 'View'}
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardBody>
          </Card>
        </motion.div>

        {/* Competency & Recent Activity */}
        <motion.div variants={itemVariants} className="space-y-6">
          {/* Competency Quick View */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-secondary-500" />
                Competency Profile
              </CardTitle>
              <Link to="/candidate/results">
                <Button variant="ghost" size="sm" icon={<ArrowRight className="h-4 w-4" />}>
                  Details
                </Button>
              </Link>
            </CardHeader>
            <CardBody>
              {stats.competenciesCount > 0 ? (
                <div className="flex flex-col items-center py-6 text-center">
                  <div className="relative mb-3">
                    <div className="flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-primary-100 to-primary-50">
                      <Target className="h-8 w-8 text-primary-600" />
                    </div>
                    <div className="absolute -inset-1 rounded-full border-2 border-dashed border-primary-200 animate-spin-slow" style={{ animationDuration: '8s' }} />
                  </div>
                  <p className="text-2xl font-bold text-text-primary">{stats.competenciesCount}</p>
                  <p className="text-xs text-text-secondary">Competencies Assessed</p>
                  <div className="mt-3 flex items-center gap-1 text-xs text-accent-600">
                    <Sparkles className="h-3 w-3" />
                    <span>AI-powered assessment</span>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center py-8 text-center">
                  <Zap className="h-10 w-10 text-text-tertiary" />
                  <h4 className="mt-3 text-sm font-medium text-text-primary">No competencies yet</h4>
                  <p className="mt-1 text-xs text-text-secondary">
                    Complete your first assessment to build your profile.
                  </p>
                </div>
              )}
            </CardBody>
          </Card>

          {/* Recent Results */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Award className="h-5 w-5 text-accent-500" />
                Recent Results
              </CardTitle>
            </CardHeader>
            <CardBody>
              {recentResults.length === 0 ? (
                <div className="flex flex-col items-center py-6 text-center">
                  <Award className="h-8 w-8 text-text-tertiary" />
                  <p className="mt-2 text-xs text-text-secondary">No results yet</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {recentResults.map((result) => (
                    <Link
                      key={result.id}
                      to={`/candidate/results`}
                      className="flex items-center justify-between rounded-lg border border-border px-3 py-2.5 transition-all hover:border-accent-200 hover:bg-accent-50/30"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-text-primary truncate">
                          {result.examTitle}
                        </p>
                        <p className="text-xs text-text-tertiary mt-0.5">
                          {result.submittedAt ? formatDate(result.submittedAt) : 'Pending'}
                        </p>
                      </div>
                      <div className="ml-3 flex items-center gap-2">
                        {result.finalScore !== null && (
                          <span className={`text-sm font-bold ${result.passed ? 'text-accent-600' : 'text-error'}`}>
                            {Math.round(result.finalScore)}%
                          </span>
                        )}
                        {getResultBadge(result.passed)}
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </CardBody>
          </Card>
        </motion.div>
      </div>

      {/* ── Quick Actions ─────────────────────────── */}
      <motion.div variants={itemVariants}>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5 text-warning" />
              Quick Actions
            </CardTitle>
          </CardHeader>
          <CardBody>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <Link
                to="/candidate/assessments"
                className="flex items-center gap-3 rounded-xl border border-border bg-surface-secondary p-4 transition-all hover:border-primary-200 hover:bg-primary-50/50 hover:shadow-sm"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary-100">
                  <BookOpen className="h-5 w-5 text-primary-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-text-primary">View Assessments</p>
                  <p className="text-xs text-text-tertiary">Check pending & completed</p>
                </div>
              </Link>
              <Link
                to="/candidate/results"
                className="flex items-center gap-3 rounded-xl border border-border bg-surface-secondary p-4 transition-all hover:border-accent-200 hover:bg-accent-50/50 hover:shadow-sm"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent-50">
                  <BarChart3 className="h-5 w-5 text-accent-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-text-primary">View Results</p>
                  <p className="text-xs text-text-tertiary">Scores & feedback</p>
                </div>
              </Link>
              <Link
                to="/candidate/certificates"
                className="flex items-center gap-3 rounded-xl border border-border bg-surface-secondary p-4 transition-all hover:border-secondary-200 hover:bg-secondary-50/50 hover:shadow-sm"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-secondary-50">
                  <Award className="h-5 w-5 text-secondary-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-text-primary">My Certificates</p>
                  <p className="text-xs text-text-tertiary">Download & verify</p>
                </div>
              </Link>
            </div>
          </CardBody>
        </Card>
      </motion.div>
    </motion.div>
  );
}

export default CandidateDashboardPage;
