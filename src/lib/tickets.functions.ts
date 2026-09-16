import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  DEPARTMENTS,
  PRIORITIES,
  STATUSES,
  type Department,
  type Priority,
  type Status,
} from "./routing";

export type Ticket = {
  id: string;
  ref_no: number;
  title: string;
  description: string;
  requester_name: string;
  requester_email: string;
  requester_urgency: Priority;
  department: Department | null;
  auto_department: Department | null;
  priority: Priority;
  status: Status;
  confidence: number | null;
  reasoning: string | null;
  summary: string | null;
  routed_by: "ai" | "rules" | "manual" | null;
  was_rerouted: boolean;
  resolved_at: string | null;
  created_at: string;
  updated_at: string;
};

export type TicketEvent = {
  id: string;
  ticket_id: string;
  kind: string;
  from_value: string | null;
  to_value: string | null;
  note: string | null;
  created_at: string;
};

const SubmitInput = z.object({
  title: z.string().trim().min(4).max(140),
  description: z.string().trim().min(10).max(4000),
  requesterName: z.string().trim().min(2).max(80),
  requesterEmail: z.string().trim().email().max(160),
  urgency: z.enum(PRIORITIES),
});

/** Public: anyone can file a ticket. Routing happens server-side. */
export const submitTicket = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => SubmitInput.parse(input))
  .handler(async ({ data }) => {
    const { classifyTicket } = await import("./routing.server");
    const { createPublicClient } = await import("./supabase-public.server");

    const decision = await classifyTicket({
      title: data.title,
      description: data.description,
      requesterUrgency: data.urgency,
    });

    const supabase = createPublicClient();
    const { data: inserted, error } = await supabase
      .from("tickets")
      .insert({
        title: data.title,
        description: data.description,
        requester_name: data.requesterName,
        requester_email: data.requesterEmail,
        requester_urgency: data.urgency,
        department: decision.department,
        auto_department: decision.department,
        priority: decision.priority,
        status: decision.department ? "new" : "needs_review",
        confidence: decision.confidence,
        reasoning: decision.reasoning,
        summary: decision.summary,
        routed_by: decision.source,
      })
      .select("id, ref_no")
      .single();

    if (error) {
      console.error("Ticket insert failed", error);
      throw new Error("We could not file that ticket. Please try again.");
    }

    return {
      id: inserted.id as string,
      refNo: inserted.ref_no as number,
      department: decision.department,
      priority: decision.priority,
      confidence: decision.confidence,
      reasoning: decision.reasoning,
      summary: decision.summary,
      source: decision.source,
    };
  });

export const listTickets = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("tickets")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(500);
    if (error) throw new Error(error.message);
    return (data ?? []) as unknown as Ticket[];
  });

export const getTicket = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const [ticketResult, eventsResult] = await Promise.all([
      context.supabase.from("tickets").select("*").eq("id", data.id).maybeSingle(),
      context.supabase
        .from("ticket_events")
        .select("*")
        .eq("ticket_id", data.id)
        .order("created_at", { ascending: true }),
    ]);
    if (ticketResult.error) throw new Error(ticketResult.error.message);
    if (!ticketResult.data) return null;
    return {
      ticket: ticketResult.data as unknown as Ticket,
      events: (eventsResult.data ?? []) as unknown as TicketEvent[],
    };
  });

const UpdateInput = z.object({
  id: z.string().uuid(),
  status: z.enum(STATUSES).optional(),
  priority: z.enum(PRIORITIES).optional(),
  department: z.enum(DEPARTMENTS).optional(),
});

export const updateTicket = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => UpdateInput.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const current = await supabase.from("tickets").select("*").eq("id", data.id).maybeSingle();
    if (current.error) throw new Error(current.error.message);
    if (!current.data) throw new Error("Ticket not found");
    const ticket = current.data as unknown as Ticket;

    const patch: Record<string, unknown> = {};
    const events: Array<Record<string, unknown>> = [];

    if (data.status && data.status !== ticket.status) {
      patch["status"] = data.status;
      patch["resolved_at"] =
        data.status === "resolved" || data.status === "closed"
          ? (ticket.resolved_at ?? new Date().toISOString())
          : null;
      events.push({
        ticket_id: ticket.id,
        kind: "status_change",
        from_value: ticket.status,
        to_value: data.status,
        actor_id: userId,
      });
    }

    if (data.priority && data.priority !== ticket.priority) {
      patch["priority"] = data.priority;
      events.push({
        ticket_id: ticket.id,
        kind: "priority_change",
        from_value: ticket.priority,
        to_value: data.priority,
        actor_id: userId,
      });
    }

    if (data.department && data.department !== ticket.department) {
      patch["department"] = data.department;
      patch["was_rerouted"] = ticket.auto_department ? true : ticket.was_rerouted;
      if (ticket.status === "needs_review") patch["status"] = "new";
      events.push({
        ticket_id: ticket.id,
        kind: "department_change",
        from_value: ticket.department ?? "unrouted",
        to_value: data.department,
        actor_id: userId,
      });
    }

    if (Object.keys(patch).length === 0) return { updated: false };

    const { error } = await supabase.from("tickets").update(patch).eq("id", ticket.id);
    if (error) throw new Error(error.message);
    if (events.length > 0) {
      const { error: eventError } = await supabase.from("ticket_events").insert(events);
      if (eventError) console.error("Timeline write failed", eventError);
    }
    return { updated: true };
  });

export const addTicketNote = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ id: z.string().uuid(), note: z.string().trim().min(1).max(2000) }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("ticket_events").insert({
      ticket_id: data.id,
      kind: "note",
      note: data.note,
      actor_id: context.userId,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });
