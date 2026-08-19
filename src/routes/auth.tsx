import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { z } from "zod";
import { useBranches, useSemesterSettings } from "@/lib/admin";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const authSearchSchema = z.object({
  expired: z.boolean().optional(),
});

export const Route = createFileRoute("/auth")({
  validateSearch: authSearchSchema,
  head: () => ({
    meta: [
      { title: "Sign in — Smart Semester Workload Balancer" },
      {
        name: "description",
        content:
          "Sign in or create your student account to track deadlines and your weekly panic score.",
      },
      { property: "og:title", content: "Sign in — Smart Semester Workload Balancer" },
      {
        property: "og:description",
        content: "Track academic deadlines and weekly workload as an engineering student.",
      },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const { expired } = Route.useSearch();
  const { data: branches = [] } = useBranches(true);
  const { data: semesters = [] } = useSemesterSettings();
  const activeSemesters = semesters.filter((s) => s.is_active).map((s) => s.semester);
  const semesterOptions = activeSemesters.length ? activeSemesters : [1, 2, 3, 4, 5, 6, 7, 8];
  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [semester, setSemester] = useState("1");
  const [branch, setBranch] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!branch && branches.length) setBranch(branches[0]!.name);
  }, [branch, branches]);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/dashboard", replace: true });
    });
  }, [navigate]);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setNotice(null);
    setLoading(true);
    try {
      if (mode === "login") {
        const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
        if (signInError) {
          setError(
            signInError.message.toLowerCase().includes("invalid")
              ? "Invalid email or password."
              : signInError.message,
          );
          return;
        }
        const { data: session } = await supabase.auth.getUser();
        if (session.user) {
          const { data: profile } = await supabase
            .from("profiles")
            .select("status")
            .eq("id", session.user.id)
            .maybeSingle();
          if (profile?.status === "suspended") {
            await supabase.auth.signOut();
            setError("Your account has been suspended. Contact your administrator.");
            return;
          }
        }
        navigate({ to: "/dashboard", replace: true });
      } else {
        if (!fullName.trim()) {
          setError("Please enter your full name.");
          return;
        }
        const { data, error: signUpError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: window.location.origin,
            data: { full_name: fullName.trim(), semester, branch, role: "student" },
          },
        });
        if (signUpError) {
          setError(
            signUpError.message.toLowerCase().includes("already")
              ? "An account with this email already exists. Try signing in instead."
              : signUpError.message,
          );
          return;
        }
        if (data.session) {
          navigate({ to: "/dashboard", replace: true });
        } else {
          setNotice("Account created. Check your email to confirm, then sign in.");
          setMode("login");
        }
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-sidebar px-4 py-10">
      <div className="w-full max-w-md rounded-xl bg-card p-8 shadow-lg">
        <h1 className="text-2xl font-bold tracking-tight">Smart Semester Workload Balancer</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {mode === "login"
            ? "Sign in to see this week's panic score."
            : "Create your student account to start tracking."}
        </p>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          {mode === "register" && (
            <>
              <div className="space-y-2">
                <Label htmlFor="fullName">Full name</Label>
                <Input
                  id="fullName"
                  value={fullName}
                  maxLength={100}
                  onChange={(e) => setFullName(e.target.value)}
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="semester">Semester</Label>
                  <Select value={semester} onValueChange={setSemester}>
                    <SelectTrigger id="semester">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {semesterOptions.map((s) => (
                        <SelectItem key={s} value={String(s)}>
                          Semester {s}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="branch">Branch</Label>
                  <Select value={branch} onValueChange={setBranch}>
                    <SelectTrigger id="branch">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {branches.map((b) => (
                        <SelectItem key={b.id} value={b.name}>
                          {b.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="role">Role</Label>
                <Select value="student" disabled>
                  <SelectTrigger id="role">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="student">Student</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Public sign-up creates Student accounts. Faculty and Admin accounts are created
                  by an administrator.
                </p>
              </div>
            </>
          )}
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          {expired && !error && (
            <p className="text-sm text-destructive">
              Your session has expired. Please log in again.
            </p>
          )}
          {error && <p className="text-sm text-destructive">{error}</p>}
          {notice && <p className="text-sm text-safe">{notice}</p>}

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Please wait…" : mode === "login" ? "Sign in" : "Create account"}
          </Button>
        </form>

        <p className="mt-6 text-center text-sm text-muted-foreground">
          {mode === "login" ? "New here?" : "Already have an account?"}{" "}
          <button
            type="button"
            className="font-medium text-primary hover:underline"
            onClick={() => {
              setMode(mode === "login" ? "register" : "login");
              setError(null);
              setNotice(null);
            }}
          >
            {mode === "login" ? "Create an account" : "Sign in"}
          </button>
        </p>
      </div>
    </div>
  );
}
