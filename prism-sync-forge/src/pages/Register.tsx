import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Loader2, Eye, EyeOff, Mail, Lock, User, ArrowRight } from "lucide-react";

const Register = () => {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!fullName || !email || !password || !confirmPassword) {
      toast.error("Please fill in all fields");
      return;
    }

    if (password.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }

    if (password !== confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }

    setIsSubmitting(true);
    try {
      await register(fullName, email, password);
      toast.success("Account created successfully!");
      navigate("/", { replace: true });
    } catch (err: any) {
      const msg = err?.message || "Registration failed";
      try {
        const parsed = JSON.parse(msg);
        toast.error(parsed.message || "Registration failed");
      } catch {
        toast.error(msg);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="auth-split-root">
      {/* ── Left panel (same brand panel as Login) ── */}
      <div className="auth-split-left">
        <div className="auth-bg">
          <div className="auth-orb auth-orb-1" />
          <div className="auth-orb auth-orb-2" />
          <div className="auth-orb auth-orb-3" />
        </div>
        <div className="auth-left-inner">
          <div className="auth-left-logo">
            <div className="auth-logo-box">
              <svg width="32" height="32" viewBox="0 0 44 44" fill="none">
                <path d="M12 22L18 16L24 22L18 28Z" fill="white" fillOpacity="0.95" />
                <path d="M20 22L26 16L32 22L26 28Z" fill="white" fillOpacity="0.6" />
              </svg>
            </div>
            <span className="auth-left-wordmark">CIRA PM</span>
          </div>
          <div className="auth-left-headline">
            <h2 className="auth-left-h2">Build your team.<br />Ship faster.</h2>
            <p className="auth-left-lead">
              Join your organization's workspace and get full access to projects,
              tasks, HR workflows, real-time chat and advanced reporting.
            </p>
          </div>
          <div className="auth-stats-row">
            <div className="auth-stat"><span className="auth-stat-val">5</span><span className="auth-stat-label">Roles</span></div>
            <div className="auth-stat"><span className="auth-stat-val">12+</span><span className="auth-stat-label">Modules</span></div>
            <div className="auth-stat"><span className="auth-stat-val">100%</span><span className="auth-stat-label">Real-time</span></div>
          </div>
          <div className="auth-feature-list" style={{ marginTop: "auto", paddingTop: "2rem", borderTop: "1px solid rgba(255,255,255,0.06)" }}>
            {["Kanban boards with approval workflows", "Slack-style project chat rooms", "HR Hub with contracts & payroll", "Live time tracking & invoicing", "Role-based dashboards & reports"].map(item => (
              <div key={item} className="auth-feature-item">
                <div className="auth-feature-icon">
                  <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M3 8l3.5 3.5L13 4.5" stroke="#2dd4a8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                </div>
                <p className="auth-feature-title">{item}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Right panel ── */}
      <div className="auth-split-right">
        <div className="auth-right-inner">
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
            <h1 className="auth-right-title">Create account</h1>
            <p className="auth-right-subtitle">Join your team's workspace today</p>
          </div>

          <form onSubmit={handleSubmit} className="auth-form">
          <div className="auth-field">
            <Label htmlFor="register-name" className="auth-label">Full Name</Label>
            <div className="auth-input-wrap">
              <User className="auth-input-icon" />
              <Input
                id="register-name"
                type="text"
                placeholder="John Doe"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="auth-input"
                autoComplete="name"
                autoFocus
              />
            </div>
          </div>

          <div className="auth-field">
            <Label htmlFor="register-email" className="auth-label">Email</Label>
            <div className="auth-input-wrap">
              <Mail className="auth-input-icon" />
              <Input
                id="register-email"
                type="email"
                placeholder="you@ciratech.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="auth-input"
                autoComplete="email"
              />
            </div>
          </div>

          <div className="auth-field">
            <Label htmlFor="register-password" className="auth-label">Password</Label>
            <div className="auth-input-wrap">
              <Lock className="auth-input-icon" />
              <Input
                id="register-password"
                type={showPassword ? "text" : "password"}
                placeholder="Min. 6 characters"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="auth-input"
                autoComplete="new-password"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="auth-toggle-password"
                tabIndex={-1}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <div className="auth-field">
            <Label htmlFor="register-confirm" className="auth-label">Confirm Password</Label>
            <div className="auth-input-wrap">
              <Lock className="auth-input-icon" />
              <Input
                id="register-confirm"
                type={showPassword ? "text" : "password"}
                placeholder="Re-enter password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="auth-input"
                autoComplete="new-password"
              />
            </div>
          </div>

          <Button
            type="submit"
            disabled={isSubmitting}
            className="auth-btn"
            id="register-submit"
          >
            {isSubmitting ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <>
                Create Account
                <ArrowRight className="ml-2 h-4 w-4" />
              </>
            )}
          </Button>

          <p className="auth-footer-text">
            Already have an account?{" "}
            <Link to="/login" className="auth-link">
              Sign in
            </Link>
          </p>
        </form>

          <p className="auth-copyright">© 2026 CIRA Tech. All rights reserved.</p>
        </div>
      </div>
    </div>
  );
};

export default Register;
