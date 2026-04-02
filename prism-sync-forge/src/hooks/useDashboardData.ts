import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api-client";

export function useProjectSpaces() {
  return useQuery({
    queryKey: ["project_spaces"],
    queryFn: () => api.get<any[]>("/projects"),
  });
}

export function useTasks() {
  return useQuery({
    queryKey: ["tasks"],
    queryFn: () => api.get<any[]>("/tasks"),
  });
}

export function useTimeLogs() {
  return useQuery({
    queryKey: ["time_logs"],
    queryFn: () => api.get<any[]>("/timelogs"),
  });
}

export function useProfiles() {
  return useQuery({
    queryKey: ["profiles"],
    queryFn: () => api.get<any[]>("/profiles"),
  });
}

export function useInvoices() {
  return useQuery({
    queryKey: ["invoices"],
    queryFn: () => api.get<any[]>("/invoices"),
  });
}

export function usePerformanceAppraisals() {
  return useQuery({
    queryKey: ["performance_appraisals"],
    queryFn: () => api.get<any[]>("/performance"),
  });
}

export function useDashboardStats() {
  const { data: projects = [], isLoading: loadingProjects } = useProjectSpaces();
  const { data: tasks = [], isLoading: loadingTasks } = useTasks();
  const { data: timeLogs = [], isLoading: loadingTimeLogs } = useTimeLogs();
  const { data: profiles = [], isLoading: loadingProfiles } = useProfiles();
  const { data: invoices = [], isLoading: loadingInvoices } = useInvoices();

  const activeProjects = projects.filter((p) => p.status === "active").length;
  const openTasks = tasks.filter((t) => t.status !== "done").length;
  const totalHours = timeLogs.reduce((sum, l) => sum + (l.duration_hours ?? 0), 0);
  const activeMembers = profiles.filter((p) => p.is_active).length;
  const totalRevenue = invoices
    .filter((i) => i.status === "paid")
    .reduce((sum, i) => sum + (i.total_amount ?? 0), 0);

  const doneTasks = tasks.filter((t) => t.status === "done").length;
  const efficiency = tasks.length > 0 ? Math.round((doneTasks / tasks.length) * 100) : 0;

  return {
    isLoading: loadingProjects || loadingTasks || loadingTimeLogs || loadingProfiles || loadingInvoices,
    activeProjects,
    openTasks,
    totalHours: totalHours.toFixed(0),
    activeMembers,
    totalRevenue: `$${(totalRevenue / 1000).toFixed(1)}K`,
    efficiency: `${efficiency}%`,
    projects,
    tasks,
    timeLogs,
    profiles,
    invoices,
  };
}
