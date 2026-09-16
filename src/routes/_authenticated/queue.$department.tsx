import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";
import { useState } from "react";

import { DepartmentTag, Metric, SectionHeading } from "@/components/console";
import { TicketTable } from "@/components/TicketTable";
import { ticketsQueryOptions } from "@/lib/queries";
import { DEPARTMENT_BLURB, DEPARTMENT_SLUGS } from "@/lib/routing";

export const Route = createFileRoute("/_authenticated/queue/$department")({
  head: ({ params }) => {
    const department = DEPARTMENT_SLUGS[params.department.toLowerCase()] ?? "Department";
    return {
      meta: [
        { title: `${department} queue — TriageGrid` },
        {
          name: "description",
          content: `Work the ${department} service desk queue: open tickets, priorities and routing confidence.`,
        },
        { property: "og:title", content: `${department} queue — TriageGrid` },
        { property: "og:description", content: `Open tickets in the ${department} queue.` },
      ],
    };
  },
  component: QueuePage,
  notFoundComponent: () => (
    <div className="panel p-10 text-center text-sm text-muted-foreground">
      That queue does not exist.
    </div>
  ),
  errorComponent: () => (
    <div className="panel p-10 text-center text-sm text-destructive">
      This queue could not be loaded.
    </div>
  ),
});

function QueuePage() {
  const { department: slug } = Route.useParams();
  const department = DEPARTMENT_SLUGS[slug.toLowerCase()];
  if (!department) throw notFound();

  const { data, isPending } = useQuery(ticketsQueryOptions);
  const [showClosed, setShowClosed] = useState(false);

  const mine = (data ?? []).filter((ticket) => ticket.department === department);
  const openTickets = mine.filter((t) => t.status !== "resolved" && t.status !== "closed");
  const visible = showClosed ? mine : openTickets;
  const urgent = openTickets.filter((t) => t.priority === "urgent").length;
  const lowConfidence = mine.filter((t) => (t.confidence ?? 1) < 0.6).length;

  return (
    <div className="space-y-6">
      <Link
        to="/queues"
        className="inline-flex items-center gap-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="size-3.5" /> All queues
      </Link>

      <div className="flex flex-wrap items-end justify-between gap-4">
        <SectionHeading
          eyebrow="Queue"
          title={`${department} desk`}
          description={DEPARTMENT_BLURB[department]}
        />
        <DepartmentTag department={department} />
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Metric label="Open now" value={openTickets.length} />
        <Metric label="Urgent open" value={urgent} />
        <Metric label="Handled all time" value={mine.length} />
        <Metric label="Low confidence" value={lowConfidence} hint="Worth double-checking" />
      </div>

      <label className="flex items-center gap-2 text-xs text-muted-foreground">
        <input
          type="checkbox"
          checked={showClosed}
          onChange={(event) => setShowClosed(event.target.checked)}
          className="size-3.5 accent-[var(--color-primary)]"
        />
        Include resolved and closed tickets
      </label>

      {isPending ? (
        <div className="panel p-10 text-center text-sm text-muted-foreground">Loading queue…</div>
      ) : (
        <TicketTable tickets={visible} />
      )}
    </div>
  );
}
