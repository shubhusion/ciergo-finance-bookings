import type {
  BookingDTO,
  BookingListResponse,
  SessionResponse,
  SummaryResponse,
} from "./types";

async function req<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...init,
    headers: { "Content-Type": "application/json", ...init?.headers },
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(body.error ?? "Request failed");
  }
  return res.json();
}

export interface BookingFilters {
  tab: string;
  approvalState: string;
  bookingDateFrom?: string;
  bookingDateTo?: string;
  travelDateFrom?: string;
  travelDateTo?: string;
  owners: string[];
  primaryOwners: string[];
  secondaryOwners: string[];
  bookingType: string;
  services: string[];
  q?: string;
  includeIncomplete: boolean;
  sortBy?: string;
  sortDir: string;
  page: number;
  perPage: number;
}

/** The subset of BookingFilters the calendar shares with the table — it
 *  manages its own page/perPage/sortBy/sortDir/travelDateFrom/travelDateTo. */
export type CalendarFilters = Omit<
  BookingFilters,
  "page" | "perPage" | "sortBy" | "sortDir" | "travelDateFrom" | "travelDateTo"
> & {
  travelDateFrom?: string;
  travelDateTo?: string;
};

export function toSearchParams(f: Partial<BookingFilters>): string {
  const p = new URLSearchParams();
  Object.entries(f).forEach(([k, v]) => {
    if (v === undefined || v === null || v === "") return;
    if (Array.isArray(v)) {
      // Sent even when empty: "" and "absent" mean different things for services.
      p.set(k, v.join(","));
    } else {
      p.set(k, String(v));
    }
  });
  return p.toString();
}

export const api = {
  session: () => req<SessionResponse>("/api/session"),

  owners: (q = "") =>
    req<{ id: string; name: string; initials: string; colorToken: string }[]>(
      `/api/owners?q=${encodeURIComponent(q)}`
    ),

  list: (f: Partial<BookingFilters>) =>
    req<BookingListResponse>(`/api/bookings?${toSearchParams(f)}`),

  summary: (f: Partial<BookingFilters>) =>
    req<SummaryResponse>(`/api/bookings/summary?${toSearchParams(f)}`),

  remove: (id: string) => req<BookingDTO>(`/api/bookings/${id}`, { method: "DELETE" }),

  restore: (id: string) =>
    req<BookingDTO>(`/api/bookings/${id}/restore`, { method: "POST" }),

  duplicate: (id: string) =>
    req<BookingDTO>(`/api/bookings/${id}/duplicate`, { method: "POST" }),

  approval: (id: string, action: "approve" | "reject" | "resubmit") =>
    req<BookingDTO>(`/api/bookings/${id}/approval`, {
      method: "POST",
      body: JSON.stringify({ action }),
    }),
};
