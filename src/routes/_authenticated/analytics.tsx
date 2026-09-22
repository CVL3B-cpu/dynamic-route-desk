import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { useMemo } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { ConfidenceMeter, DepartmentTag, Metric, SectionHeading } from "@/components/console";
import { ticketsQueryOptions } from "@/lib/queries";
import { DEPARTMENTS, DEPARTMENT_KEYWORDS, type Department } from "@/lib/routing";
import type { Ticket } from "@/lib/tickets.functions";

export const Route = createFileRoute("/_authenticated/analytics")({
  head: () => ({
    meta: [
      { title: "Routing analytics — TriageGrid" },
      {
        name: "description",
        content:
          "Ticket volume by department, routing accuracy, confidence levels, correction pairs and resolution times.",
      },
      { property: "og:title", content: "Routing analytics — TriageGrid" },
      {
        property: "og:description",
        content: "How well automatic ticket routing is performing across the four desks.",
      },
    ],
  }),
  component: AnalyticsPage,
});

const DEPT_COLOR: Record<Department, string> = {
  IT: "var(--dept-it)",
  HR: "var(--dept-hr)",
  Operations: "var(--dept-ops)",
  Finance: "var(--dept-finance)",
};

function AnalyticsPage() {
  const { data, isPending } = useQuery(ticketsQueryOptions);
  const tickets = data ?? [];
  const stats = useMemo(() => buildStats(tickets), [tickets]);

  if (isPending) {
    return (
      <div className="panel p-10 text-center text-sm text-muted-foreground">
        Crunching the numbers…
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <SectionHeading
        eyebrow="Smart routing analytics"
        title="How well is routing working?"
        description="Accuracy is the share of automatic routing decisions that no person had to correct."
      />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Metric
          label="Routing accuracy"
          value={stats.accuracy}
          suffix="%"
          hint={`${stats.corrected} of ${stats.autoRouted} auto-routes corrected`}
        />
        <Metric
          label="Average confidence"
          value={stats.avgConfidence}
          suffix="%"
          hint="Across all routed tickets"
        />
        <Metric
          label="Auto-routed"
          value={stats.autoRouted}
          hint={`${stats.needsReview} needed a human`}
        />
        <Metric
          label="Median resolution"
          value={stats.medianResolutionHours}
          suffix=" h"
          hint="Filed to resolved"
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="panel p-5">
          <h2 className="text-sm font-semibold tracking-[0.12em] uppercase">
            Volume over time, by desk
          </h2>
          <div className="mt-5 h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={stats.volume}>
                <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="label" stroke="var(--muted-foreground)" fontSize={11} />
                <YAxis stroke="var(--muted-foreground)" fontSize={11} allowDecimals={false} />
                <Tooltip
                  contentStyle={{
                    background: "var(--popover)",
                    border: "1px solid var(--border)",
                    borderRadius: 8,
                    fontSize: 12,
                  }}
                />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                {DEPARTMENTS.map((department) => (
                  <Line
                    key={department}
                    type="monotone"
                    dataKey={department}
                    stroke={DEPT_COLOR[department]}
                    strokeWidth={2}
                    dot={false}
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="panel p-5">
          <h2 className="text-sm font-semibold tracking-[0.12em] uppercase">Load per desk</h2>
          <div className="mt-5 h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats.byDepartment}>
                <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="department" stroke="var(--muted-foreground)" fontSize={11} />
                <YAxis stroke="var(--muted-foreground)" fontSize={11} allowDecimals={false} />
                <Tooltip
                  cursor={{ fill: "var(--accent)", opacity: 0.4 }}
                  contentStyle={{
                    background: "var(--popover)",
                    border: "1px solid var(--border)",
                    borderRadius: 8,
                    fontSize: 12,
                  }}
                />
                <Bar dataKey="total" radius={[4, 4, 0, 0]}>
                  {stats.byDepartment.map((row) => (
                    <Cell key={row.department} fill={DEPT_COLOR[row.department]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="panel p-5">
          <h2 className="text-sm font-semibold tracking-[0.12em] uppercase">
            Confidence per desk
          </h2>
          <ul className="mt-5 space-y-4">
            {stats.byDepartment.map((row) => (
              <li key={row.department}>
                <div className="flex items-center justify-between">
                  <DepartmentTag department={row.department} />
                  <span className="tabular text-xs text-muted-foreground">{row.total} tickets</span>
                </div>
                <ConfidenceMeter value={row.avgConfidence} className="mt-2" />
              </li>
            ))}
          </ul>
        </div>

        <div className="panel p-5">
          <h2 className="text-sm font-semibold tracking-[0.12em] uppercase">
            Most common corrections
          </h2>
          {stats.corrections.length === 0 ? (
            <p className="mt-5 text-sm text-muted-foreground">
              No routing decision has been corrected yet.
            </p>
          ) : (
            <ul className="mt-5 space-y-3">
              {stats.corrections.map((row) => (
                <li key={`${row.from}-${row.to}`} className="flex items-center gap-2 text-sm">
                  <DepartmentTag department={row.from} />
                  <span className="text-muted-foreground">→</span>
                  <DepartmentTag department={row.to} />
                  <span className="tabular ml-auto text-xs text-muted-foreground">
                    {row.count}×
                  </span>
                </li>
              ))}
            </ul>
          )}
          <p className="mt-5 text-xs text-muted-foreground">
            Recurring pairs show where two desks genuinely overlap.
          </p>
        </div>

        <div className="panel p-5">
          <h2 className="text-sm font-semibold tracking-[0.12em] uppercase">Busiest signals</h2>
          <ul className="mt-5 space-y-4">
            {stats.keywords.map((row) => (
              <li key={row.department}>
                <DepartmentTag department={row.department} />
                <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                  {row.words.length > 0 ? row.words.join(" · ") : "No repeated terms yet"}
                </p>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="panel p-5">
        <h2 className="text-sm font-semibold tracking-[0.12em] uppercase">Resolution time</h2>
        <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {stats.byDepartment.map((row) => (
            <div key={row.department} className="rounded border border-border/70 bg-muted/25 p-4">
              <DepartmentTag department={row.department} />
              <p className="tabular mt-3 text-2xl font-semibold">
                {row.avgResolutionHours === null ? "—" : `${row.avgResolutionHours} h`}
              </p>
              <p className="text-[11px] tracking-[0.14em] text-muted-foreground uppercase">
                average
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function buildStats(tickets: Ticket[]) {
  const routed = tickets.filter((t) => t.auto_department);
  const corrected = routed.filter((t) => t.was_rerouted);
  const accuracy = routed.length === 0 ? 0 : ((routed.length - corrected.length) / routed.length) * 100;

  const confidences = tickets.map((t) => t.confidence).filter((c): c is number => c !== null);
  const avgConfidence =
    confidences.length === 0
      ? 0
      : (confidences.reduce((sum, c) => sum + c, 0) / confidences.length) * 100;

  const resolutionHours = tickets
    .filter((t) => t.resolved_at)
    .map(
      (t) =>
        (new Date(t.resolved_at as string).getTime() - new Date(t.created_at).getTime()) / 3_600_000,
    )
    .sort((a, b) => a - b);
  const medianResolutionHours =
    resolutionHours.length === 0
      ? 0
      : Math.round(resolutionHours[Math.floor(resolutionHours.length / 2)]!);

  const byDepartment = DEPARTMENTS.map((department) => {
    const rows = tickets.filter((t) => t.department === department);
    const conf = rows.map((t) => t.confidence).filter((c): c is number => c !== null);
    const res = rows
      .filter((t) => t.resolved_at)
      .map(
        (t) =>
          (new Date(t.resolved_at as string).getTime() - new Date(t.created_at).getTime()) /
          3_600_000,
      );
    return {
      department,
      total: rows.length,
      avgConfidence: conf.length === 0 ? 0 : conf.reduce((s, c) => s + c, 0) / conf.length,
      avgResolutionHours:
        res.length === 0 ? null : Math.round(res.reduce((s, h) => s + h, 0) / res.length),
    };
  });

  // Volume per day for the last 14 days
  const days: { label: string; key: string }[] = [];
  for (let i = 13; i >= 0; i -= 1) {
    const date = new Date();
    date.setHours(0, 0, 0, 0);
    date.setDate(date.getDate() - i);
    days.push({ label: format(date, "d MMM"), key: date.toISOString().slice(0, 10) });
  }
  const volume = days.map((day) => {
    const row: Record<string, string | number> = { label: day.label };
    for (const department of DEPARTMENTS) {
      row[department] = tickets.filter(
        (t) => t.department === department && t.created_at.slice(0, 10) === day.key,
      ).length;
    }
    return row;
  });

  const correctionMap = new Map<string, { from: Department; to: Department; count: number }>();
  for (const ticket of corrected) {
    if (!ticket.auto_department || !ticket.department) continue;
    const key = `${ticket.auto_department}->${ticket.department}`;
    const existing = correctionMap.get(key);
    if (existing) existing.count += 1;
    else
      correctionMap.set(key, {
        from: ticket.auto_department,
        to: ticket.department,
        count: 1,
      });
  }
  const corrections = [...correctionMap.values()].sort((a, b) => b.count - a.count).slice(0, 6);

  const keywords = DEPARTMENTS.map((department) => {
    const text = tickets
      .filter((t) => t.department === department)
      .map((t) => `${t.title} ${t.description}`.toLowerCase())
      .join(" ");
    const words = DEPARTMENT_KEYWORDS[department]
      .map((keyword) => ({
        keyword: keyword.trim(),
        count: text.split(keyword).length - 1,
      }))
      .filter((row) => row.count > 0)
      .sort((a, b) => b.count - a.count)
      .slice(0, 5)
      .map((row) => `${row.keyword} (${row.count})`);
    return { department, words };
  });

  return {
    accuracy: Math.round(accuracy),
    avgConfidence: Math.round(avgConfidence),
    autoRouted: routed.length,
    corrected: corrected.length,
    needsReview: tickets.filter((t) => !t.auto_department).length,
    medianResolutionHours,
    byDepartment,
    volume,
    corrections,
    keywords,
  };
}
