import { useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useLanguage } from "@/lib/language-context";
import { useAuth } from "@/hooks/use-auth";
import { Loader2, Mail, Eye, EyeOff } from "lucide-react";
import { SiGoogle } from "react-icons/si";
import onsetLogo from "@assets/onset_logo.png";

export default function Login() {
  const { t } = useLanguage();
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const [, navigate] = useLocation();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (isAuthenticated) {
    navigate("/bot");
    return null;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!email) {
      setError(t.auth.emailRequired);
      return;
    }
    if (password.length < 6) {
      setError(t.auth.passwordMin);
      return;
    }

    setLoading(true);
    try {
      const endpoint = mode === "register" ? "/api/auth/register" : "/api/auth/login";
      const body: any = { email, password };
      if (mode === "register") {
        body.firstName = firstName;
        body.lastName = lastName;
      }

      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.message || t.auth.invalidCredentials);
        return;
      }

      window.location.href = "/bot";
    } catch {
      setError(t.auth.invalidCredentials);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center mb-8">
          <img src={onsetLogo} alt="onset." className="w-12 h-12 object-contain mb-3" />
          <h1 className="text-2xl font-bold font-display" data-testid="text-login-title">
            {mode === "login" ? t.auth.welcomeBack : t.auth.getStarted}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {mode === "login" ? t.auth.welcomeBackSub : t.auth.getStartedSub}
          </p>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
          <Button
            variant="outline"
            className="w-full gap-2 h-11 text-sm font-medium"
            onClick={() => { window.location.href = "/api/login"; }}
            data-testid="button-google-login"
          >
            <SiGoogle className="w-4 h-4" />
            {t.auth.signInWith}
          </Button>

          <div className="relative my-5">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-200" />
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="bg-white px-3 text-muted-foreground">{t.auth.orContinueWith}</span>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-3">
            {mode === "register" && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="firstName" className="text-xs text-muted-foreground mb-1 block">{t.auth.firstName}</Label>
                  <Input
                    id="firstName"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    className="h-10"
                    data-testid="input-first-name"
                  />
                </div>
                <div>
                  <Label htmlFor="lastName" className="text-xs text-muted-foreground mb-1 block">{t.auth.lastName}</Label>
                  <Input
                    id="lastName"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    className="h-10"
                    data-testid="input-last-name"
                  />
                </div>
              </div>
            )}

            <div>
              <Label htmlFor="email" className="text-xs text-muted-foreground mb-1 block">{t.auth.email}</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="h-10"
                data-testid="input-email"
              />
            </div>

            <div>
              <Label htmlFor="password" className="text-xs text-muted-foreground mb-1 block">{t.auth.password}</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="h-10 pr-10"
                  data-testid="input-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  data-testid="button-toggle-password"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {error && (
              <p className="text-sm text-red-500 bg-red-50 px-3 py-2 rounded-lg" data-testid="text-auth-error">{error}</p>
            )}

            <Button
              type="submit"
              className="w-full h-11 gap-2 font-medium"
              disabled={loading}
              data-testid="button-submit-auth"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Mail className="w-4 h-4" />
              )}
              {mode === "login" ? t.auth.signInWithEmail : t.auth.createAccount}
            </Button>
          </form>
        </div>

        <p className="text-center text-sm text-muted-foreground mt-5">
          {mode === "login" ? t.auth.dontHaveAccount : t.auth.alreadyHaveAccount}{" "}
          <button
            onClick={() => { setMode(mode === "login" ? "register" : "login"); setError(""); }}
            className="text-primary font-medium hover:underline"
            data-testid="button-switch-mode"
          >
            {mode === "login" ? t.auth.createAccount : t.auth.signIn}
          </button>
        </p>
      </div>
    </div>
  );
}
