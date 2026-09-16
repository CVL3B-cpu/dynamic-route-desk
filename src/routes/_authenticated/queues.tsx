import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";
import { ArrowRight, TriangleAlert } from "lucide-react";

import { DepartmentTag, SectionHeading } from "@/components/console";
import { ticketsQueryOptions } from "@/lib/queries";
import {
  DEPARTMENTS,
  DEPARTMENT_BLURB,
  PRIORITIES,
  departmentSlug,
  type Department,
} from "@/lib/routing";
import type { Ticket } from "@/lib/tickets.functions";

export const Route = createFileRoute("/_authenticated/queues")({
  head: () => ({
    meta: [
      { title: "Department queues — TriageGrid" },
      {
        name: "description",
        content: "Live IT, HR, Operations and Finance queues with load, wait times and priorities.",
      },
      { property: "og:title", content: "Department queues — TriageGrid" },
      {
        property: "og:description",
        content: "Live queue boards for IT, HR, Operations and Finance.",
      },
    ],
  }),
  component: QueuesPage,
});

function isOpen(ticket: Ticket) {
  return ticket.status !== "resolved" && ticket.status !== "closed";
}

function QueuesPage() {
  const { data, isPending } = useQuery(ticketsQueryOptions);
  const tickets = data ?? [];
  const unrouted = tickets.filter((t) => isOpen(t) && !t.department);

  return (
    <div className="space-y-6">
      <SectionHeading
        eyebrow="Department queues"
        title="Queue boards"
        description="Where the work is sitting right now, desk by desk."
      />

      {unrouted.length > 0 ? (
        <div className="panel flex flex-wrap items-center gap-3 border-warning/40 p-4">
          <TriangleAlert className="size-4 text-warning" />
          <p className="text-sm">
            <span className="tabular font-medium text-warning">{unrouted.length}</span> ticket
            {unrouted.length === 1 ? "" : "s"} could not be routed confidently and need a human.
          </p>
          <Link
            to="/tickets"
            className="ml-auto text-xs text-primary underline-offset-4 hover:underline"
          >
            Triage them
          </Link>
        </div>
      ) : null}

      {isPending ? (
        <div className="panel p-10 text-center text-sm text-muted-foreground">Loading queues…</div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {DEPARTMENTS.map((department) => (
            <QueueCard key={department} department={department} tickets={tickets} />
          ))}
        </div>
      )}
    </div>
  );
}

function QueueCard({ department, tickets }: { department: Department; tickets: Ticket[] }) {
  const mine = tickets.filter((t) => t.department === department);
  const openTickets = mine.filter(isOpen);
  const oldest = openTickets.reduce<Ticket | null>(
    (acc, ticket) => (!acc || ticket.created_at < acc.created_at ? ticket : acc),
    null,
  );

  return (
    <Link
      to="/queue/$department"
      params={{ department: departmentSlug(department) }}
      className="panel block p-5 transition-transform duration-200 hover:-translate-y-0.5 hover:glow-primary"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <DepartmentTag department={department} />
          <p className="mt-2 text-xs text-muted-foreground">{DEPARTMENT_BLURB[department]}</p>
        </div>
        <div className="text-right">
          <p className="tabular text-3xl font-semibold">{openTickets.length}</p>
          <p className="text-[11px] tracking-[0.14em] text-muted-foreground uppercase">open</p>
        </div>
      </div>

      <div className="mt-5 grid grid-cols-4 gap-2">
        {PRIORITIES.map((priority) => {
          const count = openTickets.filter((t) => t.priority === priority).length;
          return (
            <div key={priority} className="rounded border border-border/70 bg-muted/30 px-2 py-2">
              <p className="tabular text-sm font-medium">{count}</p>
              <p className="text-[10px] tracking-wide text-muted-foreground uppercase">
                {priority}
              </p>
            </div>
          );
        })}
      </div>

      <div className="mt-4 flex items-center justify-between border-t border-border/60 pt-3 text-xs text-muted-foreground">
        <span>
          {oldest
            ? `Oldest waiting ${formatDistanceToNow(new Date(oldest.created_at), { addSuffix: true })}`
            : "Queue is clear"}
        </span>
        <span className="inline-flex items-center gap-1 text-primary">
          Open queue <ArrowRight className="size-3.5" />
        </span>
      </div>
    </Link>
  );
}
