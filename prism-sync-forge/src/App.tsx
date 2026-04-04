import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { RoleProvider } from "./contexts/RoleContext";
import { AuthProvider } from "./contexts/AuthContext";
import { ProtectedRoute } from "./components/auth/ProtectedRoute";
import { RoleRoute } from "./components/auth/RoleRoute";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Index from "./pages/Index";
import Spaces from "./pages/Spaces";
import Tasks from "./pages/Tasks";
import TimeTracking from "./pages/TimeTracking";
import Chat from "./pages/Chat";
import HRHub from "./pages/HRHub";
import Invoices from "./pages/Invoices";
import Reports from "./pages/Reports";
import SettingsPage from "./pages/Settings";
import AddProject from "./pages/AddProject";
import SpaceDetails from "./pages/SpaceDetails";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
    <RoleProvider>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <Routes>
          {/* Public routes */}
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />

          {/* Protected routes */}
          <Route path="/" element={<ProtectedRoute><Index /></ProtectedRoute>} />
          <Route path="/spaces" element={<ProtectedRoute><Spaces /></ProtectedRoute>} />
          <Route path="/spaces/new" element={<ProtectedRoute><RoleRoute allowedRoles={["admin","pm"]}><AddProject /></RoleRoute></ProtectedRoute>} />
          <Route path="/spaces/:id" element={<ProtectedRoute><SpaceDetails /></ProtectedRoute>} />
          <Route path="/tasks" element={<ProtectedRoute><RoleRoute allowedRoles={["admin","pm","member"]}><Tasks /></RoleRoute></ProtectedRoute>} />
          <Route path="/time-tracking" element={<ProtectedRoute><RoleRoute allowedRoles={["admin","pm","hr","member"]}><TimeTracking /></RoleRoute></ProtectedRoute>} />
          <Route path="/chat" element={<ProtectedRoute><RoleRoute allowedRoles={["admin","pm","hr","member","guest"]}><Chat /></RoleRoute></ProtectedRoute>} />
          <Route path="/hr" element={<ProtectedRoute><RoleRoute allowedRoles={["admin","hr"]}><HRHub /></RoleRoute></ProtectedRoute>} />
          <Route path="/invoices" element={<ProtectedRoute><RoleRoute allowedRoles={["admin","pm"]}><Invoices /></RoleRoute></ProtectedRoute>} />
          <Route path="/reports" element={<ProtectedRoute><RoleRoute allowedRoles={["admin","pm","hr"]}><Reports /></RoleRoute></ProtectedRoute>} />
          <Route path="/settings" element={<ProtectedRoute><SettingsPage /></ProtectedRoute>} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
    </RoleProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
