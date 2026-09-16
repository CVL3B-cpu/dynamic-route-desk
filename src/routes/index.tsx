import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { ArrowRight, Radar, ShieldCheck, Sparkles, Zap } from "lucide-react";
import { useState } from "react";

import { ConfidenceMeter, DepartmentTag, PriorityTag } from "@/components/console";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DEPARTMENTS, DEPARTMENT_BLURB, PRIORITIES, type Priority } from "@/lib/routing";
import { submitTicket } from "@/lib/tickets.functions";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "TriageGrid — Smart ticket routing for IT, HR, Ops and Finance" },
      {
        name: "description",
        content:
          "File one request and TriageGrid reads it, picks the right department queue, sets a priority and explains why.",
      },
      { property: "og:title", content: "TriageGrid — Smart ticket routing" },
      {
        property: "og:description",
        content:
          "Automatic ticket routing into IT, HR, Operations and Finance, with live queues and routing analytics.",
      },
    ],
  }),
  component: SubmitPage,
});

function SubmitPage() {
  const submit = useServerFn(submitTicket);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [urgency, setUrgency] = useState<Priority>("medium");

  const mutation = useMutation({
    mutationFn: () =>
      submit({
        data: {
          title,
          description,
          requesterName: name,
          requesterEmail: email,
          urgency,
        },
      }),
  });

  const result = mutation.data;

  function reset() {
    setTitle("");
    setDescription("");
    setUrgency("medium");
    mutation.reset();
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="pointer-events-none fixed inset-0 grid-backdrop opacity-50" />
      <header className="relative border-b border-border/70">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 sm:px-6">
          <span className="flex items-center gap-2">
            <Radar className="size-5 text-primary" />
            <span className="font-display text-sm font-semibold tracking-[0.18em] uppercase">
              Triage<span className="text-primary">Grid</span>
            </span>
          </span>
          <Link
            to="/tickets"
            className="inline-flex items-center gap-1.5 rounded border border-border px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground"
          >
            Staff console <ArrowRight className="size-3.5" />
          </Link>
        </div>
      </header>

      <main className="relative mx-auto max-w-6xl px-4 py-12 sm:px-6">
        <div className="max-w-2xl">
          <p className="text-[11px] tracking-[0.24em] text-primary uppercase">
            Automatic department routing
          </p>
          <h1 className="mt-3 text-3xl leading-tight font-semibold sm:text-5xl">
            One request line.
            <br />
            <span className="text-primary">Four desks.</span> No guesswork.
          </h1>
          <p className="mt-4 text-sm text-muted-foreground sm:text-base">
            Describe what you need in your own words. TriageGrid reads the request, sends it to the
            right department, sets a priority and shows you exactly why it landed there.
          </p>
        </div>

        <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {DEPARTMENTS.map((department) => (
            <div key={department} className="panel p-4">
              <DepartmentTag department={department} />
              <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
                {DEPARTMENT_BLURB[department]}
              </p>
            </div>
          ))}
        </div>

        <div className="mt-10 grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
          <form
            className="panel scanline p-5 sm:p-6"
            onSubmit={(event) => {
              event.preventDefault();
              mutation.mutate();
            }}
          >
            <h2 className="text-lg font-semibold">New request</h2>
            <div className="mt-5 space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="name">Your name</Label>
                  <Input
                    id="name"
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    placeholder="Alex Mercer"
                    required
                    minLength={2}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Your email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    placeholder="alex@company.com"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="title">Short title</Label>
                <Input
                  id="title"
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  placeholder="VPN drops every ten minutes"
                  required
                  minLength={4}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">What do you need?</Label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                  placeholder="Give as much detail as you can — what happened, when, and what you have already tried."
                  className="min-h-32"
                  required
                  minLength={10}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="urgency">How urgent is it for you?</Label>
                <Select value={urgency} onValueChange={(value) => setUrgency(value as Priority)}>
                  <SelectTrigger id="urgency">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PRIORITIES.map((priority) => (
                      <SelectItem key={priority} value={priority} className="capitalize">
                        {priority}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {mutation.isError ? (
                <p className="rounded border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                  {(mutation.error as Error).message}
                </p>
              ) : null}

              <div className="flex flex-wrap gap-2">
                <Button type="submit" disabled={mutation.isPending} className="glow-primary">
                  {mutation.isPending ? "Routing…" : "Submit and route"}
                  <Sparkles className="ml-1 size-4" />
                </Button>
                {result ? (
                  <Button type="button" variant="ghost" onClick={reset}>
                    File another
                  </Button>
                ) : null}
              </div>
            </div>
          </form>

          <div className="space-y-4">
            {mutation.isPending ? (
              <div className="panel scanline p-5">
                <p className="text-[11px] tracking-[0.18em] text-primary uppercase">
                  Analysing request
                </p>
                <p className="mt-3 text-sm text-muted-foreground">
                  Reading the wording, weighing the four desks and scoring confidence…
                </p>
              </div>
            ) : null}

            {result ? (
              <div className="panel reveal glow-primary p-5">
                <p className="text-[11px] tracking-[0.18em] text-primary uppercase">
                  Routing decision
                </p>
                <p className="tabular mt-2 text-xs text-muted-foreground">
                  Ticket #{result.refNo}
                </p>
                <div className="mt-4 flex flex-wrap items-center gap-2">
                  <DepartmentTag department={result.department} />
                  <PriorityTag priority={result.priority} />
                </div>
                <p className="mt-4 text-sm text-foreground">{result.summary}</p>
                <p className="mt-2 text-sm text-muted-foreground">{result.reasoning}</p>
                <div className="mt-4">
                  <p className="text-[11px] tracking-[0.14em] text-muted-foreground uppercase">
                    Confidence
                  </p>
                  <ConfidenceMeter value={result.confidence} className="mt-2" />
                </div>
                {result.department ? (
                  <p className="mt-4 text-xs text-muted-foreground">
                    The {result.department} queue has it now. You will hear from that desk by email.
                  </p>
                ) : (
                  <p className="mt-4 text-xs text-warning">
                    Too little signal to route confidently — a person will triage this by hand so
                    nothing is lost.
                  </p>
                )}
              </div>
            ) : null}

            <div className="panel p-5">
              <div className="flex items-center gap-2 text-sm font-medium">
                <Zap className="size-4 text-primary" /> How routing works
              </div>
              <ul className="mt-3 space-y-2 text-xs leading-relaxed text-muted-foreground">
                <li>Your wording is matched against what each desk actually owns.</li>
                <li>A confidence score is recorded with every decision.</li>
                <li>Low confidence never guesses — it goes to a human queue instead.</li>
                <li>Staff corrections are tracked so routing accuracy stays visible.</li>
              </ul>
            </div>

            <div className="panel p-5">
              <div className="flex items-center gap-2 text-sm font-medium">
                <ShieldCheck className="size-4 text-success" /> Your details
              </div>
              <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
                Only the department handling your request can see it. Nothing is shared outside the
                service desk.
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
