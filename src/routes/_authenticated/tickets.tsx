import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Search } from "lucide-react";
import { useMemo, useState } from "react";

import { Metric, SectionHeading } from "@/components/console";
import { TicketTable } from "@/components/TicketTable";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ticketsQueryOptions } from "@/lib/queries";
import { DEPARTMENTS, PRIORITIES, STATUSES, STATUS_LABELS } from "@/lib/routing";

export const Route = createFileRoute("/_authenticated/tickets")({
  head: () => ({
    meta: [
      { title: "All tickets — TriageGrid" },
      {
        name: "description",
        content: "Search, filter and work every incoming service desk ticket in one place.",
      },
      { property: "og:title", content: "All tickets — TriageGrid" },
      { property: "og:description", content: "Search and manage every service desk ticket." },
    ],
  }),
  component: TicketsPage,
});

type SortKey = "newest" | "oldest" | "priority" | "confidence";

const PRIORITY_RANK = { urgent: 0, high: 1, medium: 2, low: 3 } as const;

function TicketsPage() {
  const { data, isPending, error } = useQuery(ticketsQueryOptions);
  const [search, setSearch] = useState("");
  const [department, setDepartment] = useState("all");
  const [status, setStatus] = useState("all");
  const [priority, setPriority] = useState("all");
  const [sort, setSort] = useState<SortKey>("newest");

  const tickets = data ?? [];

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    const rows = tickets.filter((ticket) => {
      if (department !== "all" && ticket.department !== department) return false;
      if (status !== "all" && ticket.status !== status) return false;
      if (priority !== "all" && ticket.priority !== priority) return false;
      if (!term) return true;
      return `${ticket.title} ${ticket.description} ${ticket.requester_name} ${ticket.ref_no}`
        .toLowerCase()
        .includes(term);
    });

    return [...rows].sort((a, b) => {
      if (sort === "oldest") return a.created_at.localeCompare(b.created_at);
      if (sort === "priority") return PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority];
      if (sort === "confidence") return (a.confidence ?? 0) - (b.confidence ?? 0);
      return b.created_at.localeCompare(a.created_at);
    });
  }, [tickets, search, department, status, priority, sort]);

  const open = tickets.filter((t) => t.status === "new" || t.status === "in_progress").length;
  const review = tickets.filter((t) => t.status === "needs_review").length;
  const urgent = tickets.filter(
    (t) => t.priority === "urgent" && t.status !== "resolved" && t.status !== "closed",
  ).length;

  return (
    <div className="space-y-6">
      <SectionHeading
        eyebrow="Ticket management"
        title="All tickets"
        description="Every request that reached the desk, with the routing decision that put it there."
      />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Metric label="Total tickets" value={tickets.length} />
        <Metric label="Open" value={open} hint="New or in progress" />
        <Metric label="Needs review" value={review} hint="Routed by hand" />
        <Metric label="Urgent open" value={urgent} />
      </div>

      <div className="panel flex flex-wrap items-center gap-3 p-3">
        <div className="relative min-w-56 flex-1">
          <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search title, text, requester or number"
            className="pl-9"
          />
        </div>
        <Select value={department} onValueChange={setDepartment}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Department" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All departments</SelectItem>
            {DEPARTMENTS.map((item) => (
              <SelectItem key={item} value={item}>
                {item}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            {STATUSES.map((item) => (
              <SelectItem key={item} value={item}>
                {STATUS_LABELS[item]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={priority} onValueChange={setPriority}>
          <SelectTrigger className="w-36">
            <SelectValue placeholder="Priority" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All priorities</SelectItem>
            {PRIORITIES.map((item) => (
              <SelectItem key={item} value={item} className="capitalize">
                {item}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={sort} onValueChange={(value) => setSort(value as SortKey)}>
          <SelectTrigger className="w-44">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="newest">Newest first</SelectItem>
            <SelectItem value="oldest">Oldest first</SelectItem>
            <SelectItem value="priority">Highest priority</SelectItem>
            <SelectItem value="confidence">Lowest confidence</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {error ? (
        <div className="panel p-6 text-sm text-destructive">{(error as Error).message}</div>
      ) : isPending ? (
        <div className="panel p-10 text-center text-sm text-muted-foreground">
          Loading tickets…
        </div>
      ) : (
        <TicketTable tickets={filtered} />
      )}
    </div>
  );
}
