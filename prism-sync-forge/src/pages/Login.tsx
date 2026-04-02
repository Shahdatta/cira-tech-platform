import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Loader2, Eye, EyeOff, Mail, Lock, ArrowRight } from "lucide-react";

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
    <div className="login-page">
      {/* Animated background */}
      <div className="auth-bg">
        <div className="auth-orb auth-orb-1" />
        <div className="auth-orb auth-orb-2" />
        <div className="auth-orb auth-orb-3" />
      </div>

      <div className="auth-container">
        {/* Brand */}
        <div className="auth-brand">
          <div className="auth-logo">
            <svg width="44" height="44" viewBox="0 0 44 44" fill="none">
              <rect width="44" height="44" rx="12" fill="url(#logo-grad)" />
              <path d="M12 22L18 16L24 22L18 28Z" fill="white" fillOpacity="0.9" />
              <path d="M20 22L26 16L32 22L26 28Z" fill="white" fillOpacity="0.6" />
              <defs>
                <linearGradient id="logo-grad" x1="0" y1="0" x2="44" y2="44">
                  <stop stopColor="#2dd4a8" />
                  <stop offset="1" stopColor="#14b8a6" />
                </linearGradient>
              </defs>
            </svg>
          </div>
          <h1 className="auth-title">Prism Sync</h1>
          <p className="auth-subtitle">Sign in to your workspace</p>
        </div>

        {/* Form Card */}
        <form onSubmit={handleSubmit} className="auth-card">
          <div className="auth-field">
            <Label htmlFor="login-email" className="auth-label">Email</Label>
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

          <div className="auth-field">
            <Label htmlFor="login-password" className="auth-label">Password</Label>
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
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <Button
            type="submit"
            disabled={isSubmitting}
            className="auth-btn"
            id="login-submit"
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

          <p className="auth-footer-text">
            Don't have an account?{" "}
            <Link to="/register" className="auth-link">
              Create one
            </Link>
          </p>
        </form>

        <p className="auth-copyright">© 2026 CIRA Tech. All rights reserved.</p>
      </div>
    </div>
  );
};

export default Login;
