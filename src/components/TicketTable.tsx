import { Link } from "@tanstack/react-router";
import { formatDistanceToNow } from "date-fns";

import { ConfidenceMeter, DepartmentTag, PriorityTag, StatusTag } from "@/components/console";
import type { Ticket } from "@/lib/tickets.functions";

export function TicketTable({ tickets }: { tickets: Ticket[] }) {
  if (tickets.length === 0) {
    return (
      <div className="panel p-10 text-center text-sm text-muted-foreground">
        No tickets match these filters.
      </div>
    );
  }

  return (
    <div className="panel overflow-hidden">
      <div className="hidden grid-cols-[3fr_1fr_1fr_1fr_1.2fr_0.8fr] gap-4 border-b border-border/70 px-4 py-2.5 text-[11px] tracking-[0.14em] text-muted-foreground uppercase lg:grid">
        <span>Request</span>
        <span>Department</span>
        <span>Priority</span>
        <span>Status</span>
        <span>Confidence</span>
        <span className="text-right">Age</span>
      </div>
      <ul className="divide-y divide-border/60">
        {tickets.map((ticket) => (
          <li key={ticket.id} className="transition-colors hover:bg-accent/40">
            <Link
              to="/ticket/$id"
              params={{ id: ticket.id }}
              className="grid gap-3 px-4 py-3.5 lg:grid-cols-[3fr_1fr_1fr_1fr_1.2fr_0.8fr] lg:items-center lg:gap-4"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-foreground">{ticket.title}</p>
                <p className="tabular mt-0.5 truncate text-xs text-muted-foreground">
                  #{ticket.ref_no} · {ticket.requester_name}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2 lg:block">
                <DepartmentTag department={ticket.department} />
                <span className="lg:hidden">
                  <PriorityTag priority={ticket.priority} />
                </span>
                <span className="lg:hidden">
                  <StatusTag status={ticket.status} />
                </span>
              </div>
              <div className="hidden lg:block">
                <PriorityTag priority={ticket.priority} />
              </div>
              <div className="hidden lg:block">
                <StatusTag status={ticket.status} />
              </div>
              <div className="hidden lg:block">
                <ConfidenceMeter value={ticket.confidence} />
              </div>
              <p className="tabular text-xs text-muted-foreground lg:text-right">
                {formatDistanceToNow(new Date(ticket.created_at), { addSuffix: true })}
              </p>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
