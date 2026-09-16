import { useEffect, useRef, useState } from "react";

import { cn } from "@/lib/utils";
import {
  STATUS_LABELS,
  type Department,
  type Priority,
  type Status,
} from "@/lib/routing";

const DEPARTMENT_CLASS: Record<Department, string> = {
  IT: "text-it border-it/40 bg-it/10",
  HR: "text-hr border-hr/40 bg-hr/10",
  Operations: "text-ops border-ops/40 bg-ops/10",
  Finance: "text-finance border-finance/40 bg-finance/10",
};

const DEPARTMENT_DOT: Record<Department, string> = {
  IT: "bg-it",
  HR: "bg-hr",
  Operations: "bg-ops",
  Finance: "bg-finance",
};

export function departmentDotClass(department: Department) {
  return DEPARTMENT_DOT[department];
}

export function DepartmentTag({
  department,
  className,
}: {
  department: Department | null;
  className?: string;
}) {
  if (!department) {
    return (
      <span
        className={cn(
          "inline-flex items-center gap-1.5 rounded border border-warning/40 bg-warning/10 px-2 py-0.5 text-[11px] font-medium tracking-wide text-warning uppercase",
          className,
        )}
      >
        Unrouted
      </span>
    );
  }
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded border px-2 py-0.5 text-[11px] font-medium tracking-wide uppercase",
        DEPARTMENT_CLASS[department],
        className,
      )}
    >
      <span className={cn("size-1.5 rounded-full", DEPARTMENT_DOT[department])} />
      {department}
    </span>
  );
}

const PRIORITY_CLASS: Record<Priority, string> = {
  low: "text-muted-foreground border-border bg-muted/40",
  medium: "text-foreground border-border bg-muted/60",
  high: "text-warning border-warning/40 bg-warning/10",
  urgent: "text-destructive border-destructive/45 bg-destructive/10",
};

export function PriorityTag({ priority }: { priority: Priority }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded border px-2 py-0.5 text-[11px] font-medium tracking-wide uppercase",
        PRIORITY_CLASS[priority],
      )}
    >
      {priority}
    </span>
  );
}

const STATUS_CLASS: Record<Status, string> = {
  needs_review: "text-warning border-warning/40 bg-warning/10",
  new: "text-primary border-primary/40 bg-primary/10",
  in_progress: "text-foreground border-border bg-muted/60",
  resolved: "text-success border-success/40 bg-success/10",
  closed: "text-muted-foreground border-border bg-muted/30",
};

export function StatusTag({ status }: { status: Status }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded border px-2 py-0.5 text-[11px] font-medium tracking-wide uppercase",
        STATUS_CLASS[status],
      )}
    >
      {STATUS_LABELS[status]}
    </span>
  );
}

export function ConfidenceMeter({
  value,
  className,
}: {
  value: number | null;
  className?: string;
}) {
  const pct = Math.round((value ?? 0) * 100);
  const tone = pct >= 80 ? "bg-success" : pct >= 45 ? "bg-primary" : "bg-warning";
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <div className="h-1.5 w-full min-w-16 overflow-hidden rounded-full bg-muted">
        <div
          className={cn("h-full rounded-full transition-[width] duration-700", tone)}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="tabular text-xs text-muted-foreground">{pct}%</span>
    </div>
  );
}

export function CountUp({ value, suffix = "" }: { value: number; suffix?: string }) {
  const [shown, setShown] = useState(0);
  const raf = useRef<number | undefined>(undefined);

  useEffect(() => {
    const start = performance.now();
    const duration = 700;
    const step = (now: number) => {
      const t = Math.min((now - start) / duration, 1);
      setShown(value * (1 - Math.pow(1 - t, 3)));
      if (t < 1) raf.current = requestAnimationFrame(step);
    };
    raf.current = requestAnimationFrame(step);
    return () => {
      if (raf.current) cancelAnimationFrame(raf.current);
    };
  }, [value]);

  const decimals = Number.isInteger(value) ? 0 : 1;
  return (
    <span className="tabular">
      {shown.toFixed(decimals)}
      {suffix}
    </span>
  );
}

export function Metric({
  label,
  value,
  hint,
  suffix,
}: {
  label: string;
  value: number;
  hint?: string;
  suffix?: string;
}) {
  return (
    <div className="panel p-4">
      <p className="text-[11px] tracking-[0.14em] text-muted-foreground uppercase">{label}</p>
      <p className="mt-2 text-3xl font-semibold text-foreground">
        <CountUp value={value} suffix={suffix} />
      </p>
      {hint ? <p className="mt-1 text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  );
}

export function SectionHeading({
  eyebrow,
  title,
  description,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
}) {
  return (
    <div>
      {eyebrow ? (
        <p className="text-[11px] tracking-[0.2em] text-primary uppercase">{eyebrow}</p>
      ) : null}
      <h1 className="mt-1 text-2xl font-semibold text-foreground sm:text-3xl">{title}</h1>
      {description ? (
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">{description}</p>
      ) : null}
    </div>
  );
}
