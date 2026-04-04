import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import {
  Loader2, Eye, EyeOff, Mail, Lock, ArrowRight,
  CheckCircle2, BarChart3, MessageSquare, Users, Clock,
} from "lucide-react";

const FEATURES = [
  {
    icon: BarChart3,
    title: "Smart Dashboard",
    desc: "Real-time KPIs, budget health and task analytics across all projects.",
  },
  {
    icon: CheckCircle2,
    title: "Task Lifecycle",
    desc: "Kanban board with submit, review, approve and reject workflows.",
  },
  {
    icon: MessageSquare,
    title: "Team Chat",
    desc: "Slack-style channels scoped to each project workspace.",
  },
  {
    icon: Users,
    title: "HR & Payroll",
    desc: "Manage employees, contracts, performance reviews and payroll in one place.",
  },
  {
    icon: Clock,
    title: "Time Tracking",
    desc: "Live timers plus manual entries — billable hours synced to invoices.",
  },
];

const STATS = [
  { value: "5", label: "Roles" },
  { value: "12+", label: "Modules" },
  { value: "100%", label: "Real-time" },
];

const Login = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error("Please fill in all fields");
      return;
    }
    setIsSubmitting(true);
    try {
      await login(email, password);
      toast.success("Welcome back!");
      navigate("/", { replace: true });
    } catch (err: any) {
      const msg = err?.message || "Login failed";
      try {
        const parsed = JSON.parse(msg);
        toast.error(parsed.message || "Invalid credentials");
      } catch {
        toast.error(msg.includes("Invalid") ? msg : "Invalid email or password");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="auth-split-root">
      {/* ── Left panel ── */}
      <div className="auth-split-left">
        {/* Background orbs */}
        <div className="auth-bg">
          <div className="auth-orb auth-orb-1" />
          <div className="auth-orb auth-orb-2" />
          <div className="auth-orb auth-orb-3" />
        </div>

        <div className="auth-left-inner">
          {/* Logo */}
          <div className="auth-left-logo">
            <div className="auth-logo-box">
              <svg width="32" height="32" viewBox="0 0 44 44" fill="none">
                <path d="M12 22L18 16L24 22L18 28Z" fill="white" fillOpacity="0.95" />
                <path d="M20 22L26 16L32 22L26 28Z" fill="white" fillOpacity="0.6" />
              </svg>
            </div>
            <span className="auth-left-wordmark">CIRA PM</span>
          </div>

          {/* Headline */}
          <div className="auth-left-headline">
            <h2 className="auth-left-h2">
              Every role.<br />One platform.
            </h2>
            <p className="auth-left-lead">
              The unified workspace for project managers, HR teams, developers and leadership.
            </p>
          </div>

          {/* Stats row */}
          <div className="auth-stats-row">
            {STATS.map((s) => (
              <div key={s.label} className="auth-stat">
                <span className="auth-stat-val">{s.value}</span>
                <span className="auth-stat-label">{s.label}</span>
              </div>
            ))}
          </div>

          {/* Feature list */}
          <div className="auth-feature-list">
            {FEATURES.map(({ icon: Icon, title, desc }) => (
              <div key={title} className="auth-feature-item">
                <div className="auth-feature-icon">
                  <Icon size={16} />
                </div>
                <div>
                  <p className="auth-feature-title">{title}</p>
                  <p className="auth-feature-desc">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Right panel ── */}
      <div className="auth-split-right">
        <div className="auth-right-inner">
          {/* Mobile-only logo */}
          <div className="auth-mobile-logo">
            <div className="auth-logo-box auth-logo-box-sm">
              <svg width="22" height="22" viewBox="0 0 44 44" fill="none">
                <path d="M12 22L18 16L24 22L18 28Z" fill="white" fillOpacity="0.95" />
                <path d="M20 22L26 16L32 22L26 28Z" fill="white" fillOpacity="0.6" />
              </svg>
            </div>
            <span className="auth-left-wordmark">CIRA PM</span>
          </div>

          <div className="auth-right-header">
            <h1 className="auth-right-title">Welcome back</h1>
            <p className="auth-right-subtitle">Sign in to continue to your workspace</p>
          </div>

          <form onSubmit={handleSubmit} className="auth-form">
            {/* Email */}
            <div className="auth-field">
              <Label htmlFor="login-email" className="auth-label">Email address</Label>
              <div className="auth-input-wrap">
                <Mail className="auth-input-icon" />
                <Input
                  id="login-email"
                  type="email"
                  placeholder="you@ciratech.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="auth-input"
                  autoComplete="email"
                  autoFocus
                />
              </div>
            </div>

            {/* Password */}
            <div className="auth-field">
              <div className="auth-label-row">
                <Label htmlFor="login-password" className="auth-label">Password</Label>
                <span className="auth-forgot">Forgot password?</span>
              </div>
              <div className="auth-input-wrap">
                <Lock className="auth-input-icon" />
                <Input
                  id="login-password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="auth-input"
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="auth-toggle-password"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <Button
              type="submit"
              disabled={isSubmitting}
              className="auth-btn"
            >
              {isSubmitting ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <>
                  Sign In
                  <ArrowRight className="ml-2 h-4 w-4" />
                </>
              )}
            </Button>

            {/* <p className="auth-footer-text">
              Don&apos;t have an account?{" "}
              <Link to="/register" className="auth-link">
                Create one
              </Link>
            </p> */}
          </form>

          <p className="auth-copyright">© 2026 CIRA Tech. All rights reserved.</p>
        </div>
      </div>
    </div>
  );
};

export default Login;
