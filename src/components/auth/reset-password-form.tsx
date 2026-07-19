"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Eye, EyeOff, Lock, TrendingUp, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
import NProgress from "nprogress";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/index";
import { cn } from "@/lib/utils";

const schema = z
  .object({
    password: z.string().min(8, "Password must be at least 8 characters").max(72),
    confirm: z.string(),
  })
  .refine((d) => d.password === d.confirm, {
    message: "Passwords do not match",
    path: ["confirm"],
  });

type FormValues = z.infer<typeof schema>;

type PageState = "validating" | "invalid" | "form" | "success";

export function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get("token");

  const [pageState, setPageState] = useState<PageState>("validating");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [serverError, setServerError] = useState("");

  const { register, handleSubmit, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
  });

  // Validate token exists on mount
  useEffect(() => {
    if (!token) {
      setPageState("invalid");
    } else {
      setPageState("form");
    }
  }, [token]);

  const onSubmit = async (values: FormValues) => {
    setIsSubmitting(true);
    setServerError("");
    NProgress.start();

    try {
      const res = await fetch("/api/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password: values.password }),
      });
      const json = await res.json();

      if (!res.ok || !json.success) {
        NProgress.done();
        setServerError(json.error ?? "Something went wrong. Please try again.");
        return;
      }

      setPageState("success");
      NProgress.done();

      // Redirect to login after 2.5s
      setTimeout(() => router.push("/"), 2500);
    } catch {
      NProgress.done();
      setServerError("Something went wrong. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8F9FB] flex items-center justify-center p-4">
      <div className="w-full max-w-sm">

        {/* Logo */}
        <div className="flex items-center gap-2.5 justify-center mb-8">
          <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center shadow-md">
            <TrendingUp className="size-4 text-white" />
          </div>
          <span className="font-display font-bold text-xl tracking-tight text-foreground">
            DhanTracker
          </span>
        </div>

        <div className="bg-white rounded-2xl border border-border shadow-card p-8">

          {/* ── Validating ── */}
          {pageState === "validating" && (
            <div className="flex flex-col items-center gap-3 py-6">
              <Loader2 className="size-6 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">Validating reset link...</p>
            </div>
          )}

          {/* ── Invalid token ── */}
          {pageState === "invalid" && (
            <div className="flex flex-col items-center gap-4 text-center">
              <div className="w-14 h-14 rounded-full bg-destructive/10 flex items-center justify-center">
                <AlertCircle className="size-7 text-destructive" />
              </div>
              <div>
                <h1 className="text-lg font-semibold text-foreground mb-1">Invalid reset link</h1>
                <p className="text-sm text-muted-foreground">
                  This link is missing, expired, or has already been used.
                </p>
              </div>
              <Link href="/">
                <Button size="sm" className="mt-1">Back to Login</Button>
              </Link>
            </div>
          )}

          {/* ── Form ── */}
          {pageState === "form" && (
            <>
              <div className="mb-6">
                <h1 className="text-xl font-semibold text-foreground mb-1">Set new password</h1>
                <p className="text-sm text-muted-foreground">
                  Choose a strong password for your account.
                </p>
              </div>

              <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
                {/* New password */}
                <div className="flex flex-col gap-1.5">
                  <Label className="text-sm font-medium text-foreground/80">New Password</Label>
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
                    error={!!errors.password}
                    disabled={isSubmitting}
                    {...register("password")}
                  />
                  {errors.password && (
                    <p className="text-xs text-destructive">{errors.password.message}</p>
                  )}
                </div>

                {/* Confirm password */}
                <div className="flex flex-col gap-1.5">
                  <Label className="text-sm font-medium text-foreground/80">Confirm Password</Label>
                  <Input
                    type={showConfirm ? "text" : "password"}
                    placeholder="Repeat your password"
                    autoComplete="new-password"
                    leftIcon={<Lock />}
                    rightIcon={
                      <button
                        type="button"
                        onClick={() => setShowConfirm((p) => !p)}
                        tabIndex={-1}
                        className="hover:text-foreground transition-colors"
                      >
                        {showConfirm ? <EyeOff /> : <Eye />}
                      </button>
                    }
                    error={!!errors.confirm}
                    disabled={isSubmitting}
                    {...register("confirm")}
                  />
                  {errors.confirm && (
                    <p className="text-xs text-destructive">{errors.confirm.message}</p>
                  )}
                </div>

                {/* Server error */}
                {serverError && (
                  <div className="flex items-start gap-2 rounded-lg bg-destructive/5 border border-destructive/20 px-3 py-2.5">
                    <AlertCircle className="size-3.5 text-destructive shrink-0 mt-0.5" />
                    <p className="text-xs text-destructive">{serverError}</p>
                  </div>
                )}

                <Button
                  type="submit"
                  size="lg"
                  className="mt-1"
                  loading={isSubmitting}
                  disabled={isSubmitting}
                >
                  Update Password
                </Button>
              </form>
            </>
          )}

          {/* ── Success ── */}
          {pageState === "success" && (
            <div className="flex flex-col items-center gap-4 text-center py-2">
              <div className="w-14 h-14 rounded-full bg-profit/10 flex items-center justify-center">
                <CheckCircle2 className="size-7 text-profit" />
              </div>
              <div>
                <h1 className="text-lg font-semibold text-foreground mb-1">Password updated!</h1>
                <p className="text-sm text-muted-foreground">
                  Your password has been changed. Redirecting you to login...
                </p>
              </div>
              <Loader2 className="size-4 animate-spin text-muted-foreground" />
            </div>
          )}

        </div>

        {pageState === "form" && (
          <p className="text-center text-xs text-muted-foreground mt-4">
            Remembered it?{" "}
            <Link href="/" className="text-primary hover:underline font-medium">
              Back to Login
            </Link>
          </p>
        )}

      </div>
    </div>
  );
}