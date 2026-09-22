import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { format, formatDistanceToNow } from "date-fns";
import { ArrowLeft, Mail, MessageSquarePlus } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import {
  ConfidenceMeter,
  DepartmentTag,
  PriorityTag,
  StatusTag,
} from "@/components/console";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ticketQueryOptions } from "@/lib/queries";
import {
  DEPARTMENTS,
  PRIORITIES,
  STATUSES,
  STATUS_LABELS,
  type Department,
  type Priority,
  type Status,
} from "@/lib/routing";
import { addTicketNote, updateTicket, type TicketEvent } from "@/lib/tickets.functions";

export const Route = createFileRoute("/_authenticated/ticket/$id")({
  head: () => ({
    meta: [
      { title: "Ticket detail — TriageGrid" },
      {
        name: "description",
        content: "Full request text, routing decision, activity timeline and internal notes.",
      },
      { property: "og:title", content: "Ticket detail — TriageGrid" },
      {
        property: "og:description",
        content: "Routing decision, timeline and notes for a single ticket.",
      },
    ],
  }),
  component: TicketDetailPage,
  errorComponent: () => (
    <div className="panel p-10 text-center text-sm text-destructive">
      This ticket could not be loaded.
    </div>
  ),
});

function TicketDetailPage() {
  const { id } = Route.useParams();
  const queryClient = useQueryClient();
  const { data, isPending } = useQuery(ticketQueryOptions(id));
  const update = useServerFn(updateTicket);
  const addNote = useServerFn(addTicketNote);
  const [note, setNote] = useState("");

  function refresh() {
    queryClient.invalidateQueries({ queryKey: ["ticket", id] });
    queryClient.invalidateQueries({ queryKey: ["tickets"] });
  }

  const changeMutation = useMutation({
    mutationFn: (patch: { status?: Status; priority?: Priority; department?: Department }) =>
      update({ data: { id, ...patch } }),
    onSuccess: () => {
      refresh();
      toast.success("Ticket updated");
    },
    onError: (error) => toast.error((error as Error).message),
  });

  const noteMutation = useMutation({
    mutationFn: () => addNote({ data: { id, note } }),
    onSuccess: () => {
      setNote("");
      refresh();
      toast.success("Note added");
    },
    onError: (error) => toast.error((error as Error).message),
  });

  if (isPending) {
    return <div className="panel p-10 text-center text-sm text-muted-foreground">Loading…</div>;
  }
  if (!data) {
    return (
      <div className="panel p-10 text-center text-sm text-muted-foreground">
        That ticket no longer exists.
      </div>
    );
  }

  const { ticket, events } = data;

  return (
    <div className="space-y-6">
      <Link
        to="/tickets"
        className="inline-flex items-center gap-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="size-3.5" /> All tickets
      </Link>

      <div className="grid gap-6 lg:grid-cols-[1.4fr_0.6fr]">
        <div className="space-y-6">
          <div className="panel p-5 sm:p-6">
            <p className="tabular text-xs text-muted-foreground">
              Ticket #{ticket.ref_no} · opened{" "}
              {formatDistanceToNow(new Date(ticket.created_at), { addSuffix: true })}
            </p>
            <h1 className="mt-2 text-2xl font-semibold">{ticket.title}</h1>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <DepartmentTag department={ticket.department} />
              <PriorityTag priority={ticket.priority} />
              <StatusTag status={ticket.status} />
              {ticket.was_rerouted ? (
                <span className="rounded border border-border px-2 py-0.5 text-[11px] tracking-wide text-muted-foreground uppercase">
                  Rerouted by hand
                </span>
              ) : null}
            </div>
            <p className="mt-5 text-sm leading-relaxed whitespace-pre-wrap text-foreground/90">
              {ticket.description}
            </p>
            <div className="mt-5 flex flex-wrap items-center gap-4 border-t border-border/60 pt-4 text-xs text-muted-foreground">
              <span>{ticket.requester_name}</span>
              <a
                className="inline-flex items-center gap-1.5 transition-colors hover:text-foreground"
                href={`mailto:${ticket.requester_email}`}
              >
                <Mail className="size-3.5" />
                {ticket.requester_email}
              </a>
              <span className="capitalize">Requester urgency: {ticket.requester_urgency}</span>
            </div>
          </div>

          <div className="panel p-5 sm:p-6">
            <h2 className="text-sm font-semibold tracking-[0.12em] uppercase">Routing decision</h2>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <div>
                <p className="text-[11px] tracking-[0.14em] text-muted-foreground uppercase">
                  Chosen desk
                </p>
                <div className="mt-2">
                  <DepartmentTag department={ticket.auto_department} />
                </div>
              </div>
              <div>
                <p className="text-[11px] tracking-[0.14em] text-muted-foreground uppercase">
                  Confidence
                </p>
                <ConfidenceMeter value={ticket.confidence} className="mt-3" />
              </div>
            </div>
            {ticket.summary ? (
              <p className="mt-4 text-sm text-foreground">{ticket.summary}</p>
            ) : null}
            {ticket.reasoning ? (
              <p className="mt-2 text-sm text-muted-foreground">{ticket.reasoning}</p>
            ) : null}
            <p className="mt-4 text-xs text-muted-foreground">
              Decided by{" "}
              {ticket.routed_by === "manual"
                ? "a person"
                : ticket.routed_by === "rules"
                  ? "keyword fallback"
                  : "smart routing"}
              .
            </p>
          </div>

          <div className="panel p-5 sm:p-6">
            <h2 className="text-sm font-semibold tracking-[0.12em] uppercase">Activity</h2>
            <ol className="mt-5 space-y-4">
              {events.map((event) => (
                <TimelineRow key={event.id} event={event} />
              ))}
            </ol>

            <div className="mt-6 space-y-3 border-t border-border/60 pt-5">
              <Textarea
                value={note}
                onChange={(event) => setNote(event.target.value)}
                placeholder="Add an internal note for the desk…"
                className="min-h-24"
              />
              <Button
                size="sm"
                disabled={note.trim().length === 0 || noteMutation.isPending}
                onClick={() => noteMutation.mutate()}
              >
                <MessageSquarePlus className="mr-1 size-4" />
                {noteMutation.isPending ? "Saving…" : "Add note"}
              </Button>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="panel p-5">
            <h2 className="text-sm font-semibold tracking-[0.12em] uppercase">Actions</h2>
            <div className="mt-4 space-y-4">
              <Field label="Status">
                <Select
                  value={ticket.status}
                  onValueChange={(value) => changeMutation.mutate({ status: value as Status })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {STATUSES.map((status) => (
                      <SelectItem key={status} value={status}>
                        {STATUS_LABELS[status]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Priority">
                <Select
                  value={ticket.priority}
                  onValueChange={(value) => changeMutation.mutate({ priority: value as Priority })}
                >
                  <SelectTrigger>
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
              </Field>
              <Field label="Department">
                <Select
                  value={ticket.department ?? ""}
                  onValueChange={(value) =>
                    changeMutation.mutate({ department: value as Department })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Pick a desk" />
                  </SelectTrigger>
                  <SelectContent>
                    {DEPARTMENTS.map((department) => (
                      <SelectItem key={department} value={department}>
                        {department}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <p className="text-xs text-muted-foreground">
                Moving a ticket to another desk is recorded as a routing correction and feeds the
                accuracy figures.
              </p>
            </div>
          </div>

          <div className="panel p-5 text-xs text-muted-foreground">
            <p>Opened {format(new Date(ticket.created_at), "d MMM yyyy, HH:mm")}</p>
            <p className="mt-1">Last change {format(new Date(ticket.updated_at), "d MMM, HH:mm")}</p>
            {ticket.resolved_at ? (
              <p className="mt-1">
                Resolved {format(new Date(ticket.resolved_at), "d MMM yyyy, HH:mm")}
              </p>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <p className="text-[11px] tracking-[0.14em] text-muted-foreground uppercase">{label}</p>
      {children}
    </div>
  );
}

const EVENT_LABEL: Record<string, string> = {
  created: "Ticket filed",
  routed: "Routed automatically",
  status_change: "Status changed",
  priority_change: "Priority changed",
  department_change: "Moved between desks",
  note: "Internal note",
};

function TimelineRow({ event }: { event: TicketEvent }) {
  const label = EVENT_LABEL[event.kind] ?? event.kind;
  return (
    <li className="relative border-l border-border/70 pl-5">
      <span className="absolute top-1.5 -left-[4.5px] size-2 rounded-full bg-primary" />
      <p className="text-sm font-medium">{label}</p>
      {event.from_value || event.to_value ? (
        <p className="tabular mt-0.5 text-xs text-muted-foreground">
          {event.from_value ? `${event.from_value} → ` : ""}
          {event.to_value}
        </p>
      ) : null}
      {event.note ? (
        <p className="mt-1 text-sm whitespace-pre-wrap text-foreground/85">{event.note}</p>
      ) : null}
      <p className="mt-1 text-[11px] text-muted-foreground">
        {format(new Date(event.created_at), "d MMM yyyy, HH:mm")}
      </p>
    </li>
  );
}
