# Smart Ticketing System

A futuristic, high-tech ticketing app that reads each incoming request and files it into the right department queue — IT, HR, Operations, or Finance — then shows how well the routing is working.

## What gets built

**1. Submit a ticket**
- Simple form: title, description, requester name/email, urgency.
- On submit, the request text is analysed and a department is chosen automatically, along with a priority and a short one-line summary.
- The user sees the routing decision with a confidence score and a plain-language reason ("mentions payroll deduction → HR").
- If the analysis is unsure, the ticket lands in a "Needs review" state instead of guessing.

**2. Ticket management**
- Ticket list with search, filters (department, status, priority) and sorting.
- Ticket detail view: full text, routing decision, confidence, activity timeline, internal notes.
- Actions: change status (New → In progress → Resolved → Closed), change priority, reassign department. A manual reassignment is recorded as a routing correction.

**3. Department queues**
- Four queue boards (IT, HR, Operations, Finance), each with counts, oldest-waiting ticket, and priority breakdown.
- Click into a queue to work its tickets.

**4. Smart routing analytics**
- Volume over time, split by department.
- Routing accuracy: share of auto-routes never corrected by a human.
- Average confidence per department, most common correction pairs (e.g. Operations → Finance), resolution times, and busiest keywords per department.

**5. Look and feel**
- Dark, high-tech console aesthetic: deep charcoal surfaces, a single electric accent, thin luminous borders, monospaced numerals for metrics, subtle scanline/glow motion on active elements.
- Restrained animation: numbers count up, routing decision reveals with a short pulse, queue cards lift on hover.
- Fully responsive; queues stack on mobile.

**6. Accounts**
- Email/password sign-in. Signed-in staff see all queues and analytics; ticket submission is open without an account.

## Technical notes

- Lovable Cloud for database, auth, and server-side logic.
- Tables: `tickets` (content, requester, department, priority, status, confidence, reasoning, summary), `ticket_events` (status/department/priority changes and notes, powering the timeline and accuracy metrics), `profiles` + `user_roles` (roles in a separate table, never on profiles).
- Row-level security: public insert for new tickets, read/update restricted to authenticated staff; role checks go through a security-definer function.
- Routing runs in a TanStack server function calling Lovable AI with a strict schema (department, priority, confidence, reason, summary). Keyword rules act as a deterministic fallback if the model call fails, so a ticket is never lost.
- Analytics computed from `tickets` + `ticket_events` via server functions; charts with Recharts.
- Routes: `/` (submit + status lookup), `/tickets`, `/tickets/$id`, `/queues`, `/queues/$department`, `/analytics`, `/auth`. Each content route gets its own page title and description.
- Seed data: a migration inserts a realistic spread of tickets across all four departments so queues and analytics are populated on first load.
