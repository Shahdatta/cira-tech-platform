import { AppLayout } from "@/components/layout/AppLayout";
import { StatsCard } from "@/components/dashboard/StatsCard";
import { ProjectsOverview } from "@/components/dashboard/ProjectsOverview";
import { RecentActivity } from "@/components/dashboard/RecentActivity";
import { TeamPerformance } from "@/components/dashboard/TeamPerformance";
import { ActiveTimers } from "@/components/dashboard/ActiveTimers";
import { UpcomingTasks } from "@/components/dashboard/UpcomingTasks";
import { QuickActions } from "@/components/dashboard/QuickActions";
import { WeeklyTrend } from "@/components/dashboard/WeeklyTrend";
import { RoleDashboard } from "@/components/dashboard/RoleDashboard";
import { FolderKanban, CheckSquare, Clock, Users, DollarSign, TrendingUp } from "lucide-react";
import { useDashboardStats } from "@/hooks/useDashboardData";
import { useNavigate } from "react-router-dom";
import { useState } from "react";
import { TaskDetailsSheet } from "@/components/tasks/TaskDetailsSheet";
import { useRole } from "@/contexts/RoleContext";

const Index = () => {
  const stats = useDashboardStats();
  const navigate = useNavigate();
  const { role } = useRole();
  const [selectedTask, setSelectedTask] = useState<any | null>(null);

  const isManagerial = role === "admin" || role === "pm";

  return (
    <AppLayout title="Dashboard" subtitle="Welcome back — here's your overview">
      <div className="max-w-[1400px] mx-auto space-y-6">
        {/* Stats Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
          <StatsCard onClick={() => navigate("/spaces")} title="Active Projects" value={stats.isLoading ? "—" : String(stats.activeProjects)} icon={FolderKanban} delay={0} />
          <StatsCard onClick={() => navigate("/tasks")} title="Open Tasks" value={stats.isLoading ? "—" : String(stats.openTasks)} changeType="neutral" icon={CheckSquare} delay={50} />
          <StatsCard onClick={() => navigate("/time-tracking")} title="Hours Logged" value={stats.isLoading ? "—" : stats.totalHours} icon={Clock} delay={100} />
          {isManagerial && <StatsCard onClick={() => navigate("/hr")} title="Team Members" value={stats.isLoading ? "—" : String(stats.activeMembers)} icon={Users} delay={150} />}
          {isManagerial && <StatsCard onClick={() => navigate("/invoices")} title="Revenue" value={stats.isLoading ? "—" : stats.totalRevenue} icon={DollarSign} delay={200} />}
          <StatsCard onClick={() => navigate("/reports")} title="Efficiency" value={stats.isLoading ? "—" : stats.efficiency} icon={TrendingUp} delay={250} />
        </div>

        {/* BI Dashboard — role-personalized alerts, charts, payroll self-view */}
        <RoleDashboard />

        {/* Quick Actions + Tasks */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
          <QuickActions />
          <div className="lg:col-span-3">
            <UpcomingTasks tasks={stats.tasks} isLoading={stats.isLoading} onTaskClick={setSelectedTask} />
          </div>
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
          <div className="lg:col-span-3">
            <ProjectsOverview tasks={stats.tasks} projects={stats.projects} isLoading={stats.isLoading} />
          </div>
          <div className="lg:col-span-2">
            <WeeklyTrend timeLogs={stats.timeLogs} tasks={stats.tasks} isLoading={stats.isLoading} />
          </div>
        </div>

        {/* Bottom Row */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
          <div className="lg:col-span-3">
            <TeamPerformance profiles={stats.profiles} timeLogs={stats.timeLogs} tasks={stats.tasks} isLoading={stats.isLoading} />
          </div>
          <div className="lg:col-span-2 grid grid-cols-1 gap-4">
            <ActiveTimers timeLogs={stats.timeLogs} isLoading={stats.isLoading} />
            <RecentActivity tasks={stats.tasks} timeLogs={stats.timeLogs} isLoading={stats.isLoading} />
          </div>
        </div>
      </div>
      <TaskDetailsSheet task={selectedTask} open={!!selectedTask} onOpenChange={(open) => !open && setSelectedTask(null)} />
    </AppLayout>
  );
};

export default Index;
