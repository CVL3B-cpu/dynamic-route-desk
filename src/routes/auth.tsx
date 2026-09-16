import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Radar } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Staff sign in — TriageGrid" },
      {
        name: "description",
        content: "Sign in to the TriageGrid service desk console to work department queues.",
      },
      { property: "og:title", content: "Staff sign in — TriageGrid" },
      { property: "og:description", content: "Service desk console access for TriageGrid staff." },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [awaitingConfirm, setAwaitingConfirm] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/tickets", replace: true });
    });
  }, [navigate]);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    try {
      if (mode === "signup") {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: window.location.origin + "/tickets",
            data: { display_name: name },
          },
        });
        if (error) throw error;
        if (!data.session) {
          setAwaitingConfirm(true);
          return;
        }
        navigate({ to: "/tickets", replace: true });
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        navigate({ to: "/tickets", replace: true });
      }
    } catch (error) {
      toast.error((error as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-background px-4">
      <div className="pointer-events-none fixed inset-0 grid-backdrop opacity-50" />
      <div className="panel relative w-full max-w-md p-6 sm:p-8">
        <div className="flex items-center gap-2">
          <Radar className="size-5 text-primary" />
          <span className="font-display text-sm font-semibold tracking-[0.18em] uppercase">
            Triage<span className="text-primary">Grid</span>
          </span>
        </div>
        <h1 className="mt-6 text-2xl font-semibold">
          {mode === "signin" ? "Staff sign in" : "Create a staff account"}
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Queues, ticket management and routing analytics live behind this door.
        </p>

        {awaitingConfirm ? (
          <div className="mt-6 space-y-4">
            <p className="rounded border border-primary/40 bg-primary/10 px-3 py-3 text-sm">
              Check your inbox — confirm your email address and you will be signed in.
            </p>
            <Button variant="ghost" onClick={() => setAwaitingConfirm(false)}>
              Back
            </Button>
          </div>
        ) : (
          <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
            {mode === "signup" ? (
              <div className="space-y-2">
                <Label htmlFor="name">Display name</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  placeholder="Alex Mercer"
                  required
                />
              </div>
            ) : null}
            <div className="space-y-2">
              <Label htmlFor="email">Work email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
                minLength={6}
              />
            </div>
            <Button type="submit" className="w-full glow-primary" disabled={busy}>
              {busy ? "Working…" : mode === "signin" ? "Sign in" : "Create account"}
            </Button>
            <button
              type="button"
              className="w-full text-xs text-muted-foreground transition-colors hover:text-foreground"
              onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
            >
              {mode === "signin"
                ? "No account yet? Create one"
                : "Already have an account? Sign in"}
            </button>
          </form>
        )}

        <Link
          to="/"
          className="mt-6 block text-center text-xs text-muted-foreground transition-colors hover:text-foreground"
        >
          Just need to file a ticket?
        </Link>
      </div>
    </div>
  );
}
