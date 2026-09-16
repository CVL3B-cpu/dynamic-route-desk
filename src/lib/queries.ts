import { queryOptions } from "@tanstack/react-query";

import { getTicket, listTickets } from "./tickets.functions";

export const ticketsQueryOptions = queryOptions({
  queryKey: ["tickets"],
  queryFn: () => listTickets(),
  staleTime: 15_000,
});

export function ticketQueryOptions(id: string) {
  return queryOptions({
    queryKey: ["ticket", id],
    queryFn: () => getTicket({ data: { id } }),
  });
}
