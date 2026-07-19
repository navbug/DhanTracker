"use client";

import { useState, useTransition, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, Mail, Lock, User, Chrome, ArrowLeft, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import NProgress from "nprogress";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/index";
import { cn } from "@/lib/utils";

// ─── SCHEMAS ─────────────────────────────────────────────────────────────────

const loginSchema = z.object({
  email: z.string().email("Enter a valid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

const registerSchema = z.object({
  name: z
    .string()
    .min(2, "Name must be at least 2 characters")
    .max(50, "Name is too long"),
  email: z.string().email("Enter a valid email address"),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .max(72, "Password is too long"),
});

const forgotSchema = z.object({
  email: z.string().email("Enter a valid email address"),
});

type LoginValues = z.infer<typeof loginSchema>;
type RegisterValues = z.infer<typeof registerSchema>;
type ForgotValues = z.infer<typeof forgotSchema>;

// ─── FORM FIELD COMPONENT ────────────────────────────────────────────────────

function FormField({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label className="text-sm font-medium text-foreground/80">{label}</Label>
      {children}
      {error && (
        <p className="text-xs text-destructive animate-fade-in">{error}</p>
      )}
    </div>
  );
}

// ─── AUTH FORM ────────────────────────────────────────────────────────────────

interface AuthFormProps {
  defaultTab?: "login" | "register";
}

export function AuthForm({ defaultTab = "login" }: AuthFormProps) {
  const [tab, setTab] = useState<"login" | "register">(defaultTab);
  const [showPassword, setShowPassword] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [showForgot, setShowForgot] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotSent, setForgotSent] = useState(false);
  const [forgotLoading, setForgotLoading] = useState(false);
  const router = useRouter();

  // ── Sync tab when parent changes defaultTab (e.g. the "Register" link below the form) ──
  useEffect(() => {
    switchTab(defaultTab ?? "login");
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [defaultTab]);

  // ── Login form ──
  const loginForm = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  // ── Register form ──
  const registerForm = useForm<RegisterValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: { name: "", email: "", password: "" },
  });

  // ── Switch tabs & reset ──
  const switchTab = (newTab: "login" | "register") => {
    setTab(newTab);
    setShowPassword(false);
    setShowForgot(false);
    setForgotSent(false);
    setForgotEmail("");
    loginForm.reset();
    registerForm.reset();
  };

  // ── Forgot password submit ──
  const handleForgotSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!forgotEmail.trim()) return;
    setForgotLoading(true);
    NProgress.start();
    try {
      await fetch("/api/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: forgotEmail.trim() }),
      });
      setForgotSent(true);
    } finally {
      setForgotLoading(false);
      NProgress.done();
    }
  };

  // ── Login submit ──
  const handleLogin = loginForm.handleSubmit((data) => {
    NProgress.start();
    startTransition(async () => {
      const result = await signIn("credentials", {
        email: data.email,
        password: data.password,
        redirect: false,
      });

      if (result?.error) {
        NProgress.done();
        toast.error("Invalid email or password. Please try again.");
        loginForm.setError("password", { message: "Incorrect credentials" });
        return;
      }

      toast.success("Welcome back!");
      router.push("/dashboard");
      router.refresh();
    });
  });

  // ── Register submit ──
  const handleRegister = registerForm.handleSubmit((data) => {
    NProgress.start();
    startTransition(async () => {
      try {
        const res = await fetch("/api/auth/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        });
        const json = await res.json();

        if (!res.ok || !json.success) {
          NProgress.done();
          if (res.status === 409) {
            registerForm.setError("email", {
              message: "An account with this email already exists",
            });
            return;
          }
          toast.error(json.error || "Registration failed. Please try again.");
          return;
        }

        // Auto-login after registration
        const loginResult = await signIn("credentials", {
          email: data.email,
          password: data.password,
          redirect: false,
        });

        if (loginResult?.error) {
          NProgress.done();
          toast.success("Account created! Please log in.");
          switchTab("login");
          return;
        }

        toast.success("Welcome to DhanTracker! 🎉");
        router.push("/dashboard");
        router.refresh();
      } catch {
        NProgress.done();
        toast.error("Something went wrong. Please try again.");
      }
    });
  });

  // ── Google OAuth ──
  const handleGoogleLogin = async () => {
    setIsGoogleLoading(true);
    NProgress.start();
    try {
      await signIn("google", { callbackUrl: "/dashboard" });
    } catch {
      NProgress.done();
      toast.error("Google sign-in failed. Please try again.");
      setIsGoogleLoading(false);
    }
  };

  const isLoading = isPending || isGoogleLoading;

  return (
    <div className="w-full relative">
      {/* ── Tab switcher ── */}
      <div
        className="grid grid-cols-2 rounded-lg bg-muted p-1 mb-5"
        style={{ height: "auto" }} // Fixed height preserved on toggle per sketch
      >
        {(["login", "register"] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => switchTab(t)}
            disabled={isLoading}
            className={cn(
              "py-1.5 rounded-md text-sm font-medium transition-all duration-200",
              tab === t
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            {t === "login" ? "Login" : "Register"}
          </button>
        ))}
      </div>

      {/* ── LOGIN FORM ── */}
      {tab === "login" && (
        <form onSubmit={handleLogin} className="flex flex-col gap-4 animate-fade-in">
          <FormField
            label="Email"
            error={loginForm.formState.errors.email?.message}
          >
            <Input
              type="email"
              placeholder="you@example.com"
              autoComplete="email"
              leftIcon={<Mail />}
              error={!!loginForm.formState.errors.email}
              disabled={isLoading}
              {...loginForm.register("email")}
            />
          </FormField>

          <FormField
            label="Password"
            error={loginForm.formState.errors.password?.message}
          >
            <Input
              type={showPassword ? "text" : "password"}
              placeholder="Minimum 8 chars"
              autoComplete="current-password"
              leftIcon={<Lock />}
              rightIcon={
                <button
                  type="button"
                  onClick={() => setShowPassword((p) => !p)}
                  tabIndex={-1}
                  className="hover:text-foreground transition-colors"
                >
                  {showPassword ? <EyeOff /> : <Eye />}
                </button>
              }
              error={!!loginForm.formState.errors.password}
              disabled={isLoading}
              {...loginForm.register("password")}
            />
          </FormField>

          {/* Forgot password */}
          <button
            type="button"
            className="text-xs text-primary hover:underline self-end -mt-2 transition-colors"
            onClick={() => setShowForgot(true)}
          >
            Forgot Password?
          </button>

          {/* Divider */}
          <div className="flex items-center gap-3">
            <div className="flex-1 h-px bg-border" />
            <span className="text-xs text-muted-foreground">OR</span>
            <div className="flex-1 h-px bg-border" />
          </div>

          {/* Google */}
          <Button
            type="button"
            variant="outline"
            onClick={handleGoogleLogin}
            loading={isGoogleLoading}
            disabled={isLoading}
            className="gap-2"
          >
            <Chrome className="size-4" />
            Continue with Google
          </Button>

          <Button type="submit" loading={isPending} disabled={isLoading} size="lg" className="mt-1">
            Login
          </Button>
        </form>
      )}

      {/* ── REGISTER FORM ── */}
      {tab === "register" && (
        <form onSubmit={handleRegister} className="flex flex-col gap-4 animate-fade-in">
          <FormField
            label="Full Name"
            error={registerForm.formState.errors.name?.message}
          >
            <Input
              type="text"
              placeholder="Your full name"
              autoComplete="name"
              leftIcon={<User />}
              error={!!registerForm.formState.errors.name}
              disabled={isLoading}
              {...registerForm.register("name")}
            />
          </FormField>

          <FormField
            label="Email"
            error={registerForm.formState.errors.email?.message}
          >
            <Input
              type="email"
              placeholder="you@example.com"
              autoComplete="email"
              leftIcon={<Mail />}
              error={!!registerForm.formState.errors.email}
              disabled={isLoading}
              {...registerForm.register("email")}
            />
          </FormField>

          <FormField
            label="Password"
            error={registerForm.formState.errors.password?.message}
          >
            <Input
              type={showPassword ? "text" : "password"}
              placeholder="Minimum 8 characters"
              autoComplete="new-password"
              leftIcon={<Lock />}
              rightIcon={
                <button
                  type="button"
                  onClick={() => setShowPassword((p) => !p)}
                  tabIndex={-1}
                  className="hover:text-foreground transition-colors"
                >
                  {showPassword ? <EyeOff /> : <Eye />}
                </button>
              }
              error={!!registerForm.formState.errors.password}
              disabled={isLoading}
              {...registerForm.register("password")}
            />
          </FormField>

          {/* Divider */}
          <div className="flex items-center gap-3">
            <div className="flex-1 h-px bg-border" />
            <span className="text-xs text-muted-foreground">OR</span>
            <div className="flex-1 h-px bg-border" />
          </div>

          {/* Google */}
          <Button
            type="button"
            variant="outline"
            onClick={handleGoogleLogin}
            loading={isGoogleLoading}
            disabled={isLoading}
            className="gap-2"
          >
            <Chrome className="size-4" />
            Continue with Google
          </Button>

          <Button type="submit" loading={isPending} disabled={isLoading} size="lg" className="mt-1">
            Create Account
          </Button>
        </form>
      )}

      {/* ── FORGOT PASSWORD OVERLAY ── */}
      {showForgot && (
        <div className="absolute inset-0 bg-white rounded-[inherit] flex flex-col p-1 animate-fade-in">
          {!forgotSent ? (
            <>
              <button
                type="button"
                onClick={() => { setShowForgot(false); setForgotEmail(""); }}
                className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors mb-5 self-start"
              >
                ← Back to login
              </button>
              <h2 className="text-base font-semibold text-foreground mb-1">Forgot password?</h2>
              <p className="text-sm text-muted-foreground mb-5">
                Enter your email and we'll send you a reset link.
              </p>
              <form onSubmit={handleForgotSubmit} className="flex flex-col gap-3">
                <FormField label="Email">
                  <Input
                    type="email"
                    placeholder="you@example.com"
                    leftIcon={<Mail />}
                    value={forgotEmail}
                    onChange={(e) => setForgotEmail(e.target.value)}
                    disabled={forgotLoading}
                    autoFocus
                  />
                </FormField>
                <Button type="submit" loading={forgotLoading} disabled={forgotLoading || !forgotEmail.trim()} size="lg" className="mt-1">
                  Send Reset Link
                </Button>
              </form>
            </>
          ) : (
            <div className="flex flex-col items-center text-center gap-4 py-6">
              <div className="w-12 h-12 rounded-full bg-profit/10 flex items-center justify-center">
                <Mail className="size-5 text-profit" />
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground mb-1">Check your inbox</p>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  If <span className="font-medium text-foreground">{forgotEmail}</span> is registered,
                  you'll receive a reset link shortly.
                </p>
              </div>
              <button
                type="button"
                onClick={() => { setShowForgot(false); setForgotSent(false); setForgotEmail(""); }}
                className="text-xs text-primary hover:underline"
              >
                Back to login
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}