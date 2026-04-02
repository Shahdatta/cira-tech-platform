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
              <rect width="44" height="44" rx="12" fill="url(#logo-grad-r)" />
              <path d="M12 22L18 16L24 22L18 28Z" fill="white" fillOpacity="0.9" />
              <path d="M20 22L26 16L32 22L26 28Z" fill="white" fillOpacity="0.6" />
              <defs>
                <linearGradient id="logo-grad-r" x1="0" y1="0" x2="44" y2="44">
                  <stop stopColor="#2dd4a8" />
                  <stop offset="1" stopColor="#14b8a6" />
                </linearGradient>
              </defs>
            </svg>
          </div>
          <h1 className="auth-title">Create Account</h1>
          <p className="auth-subtitle">Join your team on Prism Sync</p>
        </div>

        {/* Form Card */}
        <form onSubmit={handleSubmit} className="auth-card">
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
  );
};

export default Register;
