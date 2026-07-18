"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  ChevronLeft, ChevronRight, SlidersHorizontal, MoreVertical, ArrowDownLeft,
  ArrowUpRight, ArrowLeftRight, History, Pencil, Trash2, Clock,
} from "lucide-react";
import { SERVICE_ICONS } from "./filters";
import { RowMenu, type MenuItem } from "./table";
import { api, type CalendarFilters } from "@/lib/api";
import { SERVICE_CATALOGUE, type BookingDTO } from "@/lib/types";

const HOURS = ["09:00", "10:00", "11:00", "12:00", "13:00", "14:00", "15:00", "16:00", "17:00"];
const DAY_COUNT = 5;
const FIRST_HOUR = 9;

const LEGEND = [
  { label: "Completed", dot: "bg-emerald-500" },
  { label: "On Trip", dot: "bg-amber-500" },
  { label: "Upcoming", dot: "bg-blue-500" },
  { label: "Cancelled", dot: "bg-gray-300" },
];

/** Timeline status is derived from the travel date relative to today, except
 *  for cancelled bookings which always read Cancelled. */
function timelineState(row: BookingDTO): (typeof LEGEND)[number] {
  if (row.bookingStatus === "CANCELLED") return LEGEND[3];
  const travel = new Date(row.travelDate).getTime();
  const today = Date.now();
  if (travel < today - 864e5) return LEGEND[0];
  if (travel <= today + 864e5) return LEGEND[1];
  return LEGEND[2];
}

const serviceLabel = (id: string) =>
  SERVICE_CATALOGUE.find((s) => s.id === id)?.label ?? id;

const startOfUTCDay = (d: Date) =>
  new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));

const toISODate = (d: Date) => d.toISOString().slice(0, 10);

const isSameUTCDay = (a: Date, b: Date) =>
  a.getUTCFullYear() === b.getUTCFullYear() &&
  a.getUTCMonth() === b.getUTCMonth() &&
  a.getUTCDate() === b.getUTCDate();

export function CalendarView({
  filters,
  notify,
}: {
  filters: CalendarFilters;
  notify: (m: string) => void;
}) {
  const [offset, setOffset] = useState(0);
  const [anchor, setAnchor] = useState<Date | null>(null);
  const [rows, setRows] = useState<BookingDTO[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retryTick, setRetryTick] = useState(0);

  /* Land on whichever day actually has bookings for the current filters,
     rather than the real-world "today" — the data may sit nowhere near
     today's date, and paging there by hand isn't a reasonable UX. */
  useEffect(() => {
    let cancelled = false;
    api
      .list({ ...filters, sortBy: "travelDate", sortDir: "asc", page: 1, perPage: 6 })
      .then((res) => {
        if (cancelled) return;
        const first = res.data[0];
        setAnchor(startOfUTCDay(first ? new Date(first.travelDate) : new Date()));
        setOffset(0);
      })
      .catch(() => {
        if (cancelled) return;
        setAnchor(startOfUTCDay(new Date()));
        setOffset(0);
      });
    return () => {
      cancelled = true;
    };
  }, [filters]);

  const days = useMemo(() => {
    if (!anchor) return [] as Date[];
    const start = new Date(anchor);
    start.setUTCDate(start.getUTCDate() + offset * DAY_COUNT);
    return Array.from({ length: DAY_COUNT }, (_, i) => {
      const d = new Date(start);
      d.setUTCDate(start.getUTCDate() + i);
      return d;
    });
  }, [anchor, offset]);

  /* The 5-day window in view *is* the date filter once the user is paging
     with the chevrons — it fetches its own slice (independent of the
     table's page/perPage) so Total and the legend always match what's
     actually rendered here. */
  useEffect(() => {
    if (days.length === 0) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    api
      .list({
        ...filters,
        travelDateFrom: toISODate(days[0]),
        travelDateTo: toISODate(days[DAY_COUNT - 1]),
        sortBy: "travelDate",
        sortDir: "asc",
        page: 1,
        perPage: 100,
      })
      .then((res) => {
        if (cancelled) return;
        setRows(res.data);
        setTotal(res.total);
      })
      .catch((e) => {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : "Could not load the calendar.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [days, filters, retryTick]);

  const handleDelete = async (row: BookingDTO) => {
    try {
      await api.remove(row.id);
      setRetryTick((t) => t + 1);
      notify(`Booking ${row.id} moved to Deleted.`);
    } catch (e) {
      notify(e instanceof Error ? e.message : "That didn't work.");
    }
  };

  const calendarMenuFor = (row: BookingDTO): MenuItem[] => [
    { label: "You Got", Icon: ArrowDownLeft, tone: "link", onClick: () => notify(`Recording amount received for ${row.id}.`) },
    { label: "You Gave", Icon: ArrowUpRight, tone: "danger", onClick: () => notify(`Recording amount paid for ${row.id}.`) },
    { label: "Reschedule", Icon: History, onClick: () => notify(`Reschedule ${row.id} — pick a new travel date.`) },
    { label: "Change Status", Icon: ArrowLeftRight, onClick: () => notify(`Change status for ${row.id}.`) },
    { label: "Edit", Icon: Pencil, tone: "primary", onClick: () => notify(`Opening ${row.id}…`) },
    { label: "Delete", Icon: Trash2, tone: "danger", onClick: () => handleDelete(row) },
  ];

  /** Rows are placed by travel date; the hour slot is derived from the booking
      id so the layout is stable across renders rather than jumping around. */
  const cells = useMemo(() => {
    const map = new Map<string, BookingDTO[]>();
    rows.forEach((row) => {
      const travel = new Date(row.travelDate);
      const dayIndex = days.findIndex((d) => isSameUTCDay(d, travel));
      if (dayIndex === -1) return;
      const hourIndex =
        row.id.split("").reduce((a, c) => a + c.charCodeAt(0), 0) % HOURS.length;
      const key = `${dayIndex}-${hourIndex}`;
      map.set(key, [...(map.get(key) ?? []), row]);
    });
    return map;
  }, [rows, days]);

  /** OS ("Other Services") vs Limitless booking counts per visible day —
      shown as pills in the day header, next to the weekday/date. */
  const dayCounts = useMemo(
    () =>
      days.map((d) => {
        const dayRows = rows.filter((row) => isSameUTCDay(d, new Date(row.travelDate)));
        const limitless = dayRows.filter((r) => r.service === "LIMITLESS").length;
        return { os: dayRows.length - limitless, limitless };
      }),
    [rows, days]
  );

  const todayIndex = useMemo(() => {
    const now = new Date();
    return days.findIndex((d) => isSameUTCDay(d, now));
  }, [days]);

  /* "Now" indicator line — only meaningful when today is actually inside the
     visible window (this dataset's travel dates sit in a fixed window, so in
     practice this only appears once you've paged to today, same as a real
     calendar wouldn't show a "now" line on a day that isn't today). Row
     heights aren't fixed (they grow with stacked bookings), so the position
     is measured from the DOM rather than assumed from a constant row height. */
  const gridRef = useRef<HTMLDivElement>(null);
  const rowRefs = useRef<(HTMLDivElement | null)[]>([]);
  const [nowTop, setNowTop] = useState<number | null>(null);

  useEffect(() => {
    if (todayIndex === -1) {
      setNowTop(null);
      return;
    }

    const update = () => {
      const grid = gridRef.current;
      if (!grid) return;
      const now = new Date();
      const h = now.getUTCHours() + now.getUTCMinutes() / 60;
      if (h < FIRST_HOUR || h >= FIRST_HOUR + HOURS.length) {
        setNowTop(null);
        return;
      }
      const hourIndex = Math.min(Math.floor(h - FIRST_HOUR), HOURS.length - 1);
      const row = rowRefs.current[hourIndex];
      if (!row) return;
      const nextRow = rowRefs.current[hourIndex + 1];
      const gridTop = grid.getBoundingClientRect().top;
      const rowRect = row.getBoundingClientRect();
      const rowHeight = nextRow
        ? nextRow.getBoundingClientRect().top - rowRect.top
        : rowRect.height;
      const frac = h - FIRST_HOUR - hourIndex;
      // `top` on an absolutely-positioned child is relative to the
      // container's *content* box, which doesn't shift as it scrolls — so
      // the viewport-relative measurement above needs scrollTop added back
      // in to get a stable content-relative offset.
      setNowTop(rowRect.top - gridTop + grid.scrollTop + rowHeight * frac);
    };

    update();
    const id = setInterval(update, 60_000);
    window.addEventListener("resize", update);
    return () => {
      clearInterval(id);
      window.removeEventListener("resize", update);
    };
  }, [todayIndex, cells]);

  const rangeLabel = days.length
    ? `${days[0].toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        timeZone: "UTC",
      })} – ${days[DAY_COUNT - 1].toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        timeZone: "UTC",
      })}`
    : "";

  const initializing = !anchor || (loading && rows.length === 0);

  return (
    <div className="rounded-2xl border border-gray-200 bg-white shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 px-5 py-4">
        <div className="flex items-center gap-3">
          <h2 className="text-[15px] font-semibold text-gray-900">Booking Timeline</h2>
          <span className="flex items-center gap-2 rounded-md border border-amber-200 bg-amber-50 px-2.5 py-1 text-[11px] text-amber-700">
            Total <b className="rounded bg-amber-100 px-1.5">{total}</b>
          </span>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-4">
            {LEGEND.map(({ label, dot }) => (
              <span key={label} className="flex items-center gap-1.5 text-[11px] text-gray-500">
                <span className={`h-2 w-2 rounded-full ${dot}`} />
                {label}
              </span>
            ))}
          </div>

          <div className="flex items-center gap-1 rounded-lg border border-gray-200 px-1 py-1">
            <button
              onClick={() => setOffset((o) => o - 1)}
              aria-label="Previous days"
              className="rounded p-1 text-gray-400 hover:bg-gray-50"
            >
              <ChevronLeft size={15} />
            </button>
            <span className="px-2 text-[12px] text-gray-600">{rangeLabel}</span>
            <button
              onClick={() => setOffset((o) => o + 1)}
              aria-label="Next days"
              className="rounded p-1 text-gray-400 hover:bg-gray-50"
            >
              <ChevronRight size={15} />
            </button>
          </div>

          <button className="flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-2 text-[12px] font-medium text-gray-600 hover:bg-gray-50">
            <SlidersHorizontal size={14} />
            Filter
          </button>
        </div>
      </div>

      {error ? (
        <div className="px-6 py-16 text-center">
          <p className="text-[14px] font-medium text-gray-800">{error}</p>
          <button
            onClick={() => setRetryTick((t) => t + 1)}
            className="mt-2 text-[13px] font-medium text-brand-600 hover:underline"
          >
            Try again
          </button>
        </div>
      ) : initializing ? (
        <div className="px-6 py-16 text-center text-[13px] text-gray-400">
          Loading bookings…
        </div>
      ) : (
        <div className="overflow-x-auto p-4">
          <div className="min-w-[980px]">
            {/* day header */}
            <div className="grid grid-cols-[70px_repeat(5,1fr)] gap-2 border-b border-gray-100 pb-2.5">
              <div />
              {days.map((d, dayIndex) => (
                <div
                  key={d.toISOString()}
                  className={`flex items-center justify-between gap-2 pb-2.5 ${
                    dayIndex === todayIndex ? "border-b-2 border-brand-600" : ""
                  }`}
                >
                  <span className="whitespace-nowrap text-[13px] font-semibold text-gray-800">
                    {d.toLocaleDateString("en-GB", { weekday: "short", timeZone: "UTC" })},{" "}
                    {d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", timeZone: "UTC" })}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="whitespace-nowrap rounded-md bg-gray-100 px-2 py-0.5 text-[11px] text-gray-500">
                      OS {dayCounts[dayIndex]?.os ?? 0}
                    </span>
                    <span className="whitespace-nowrap rounded-md bg-gray-100 px-2 py-0.5 text-[11px] text-gray-400">
                      Limitless {dayCounts[dayIndex]?.limitless ?? 0}
                    </span>
                  </span>
                </div>
              ))}
            </div>

            {/* hour rows — internally scrollable so a busy day doesn't grow
                the whole page; the day header above stays put. */}
            <div className="slim-scroll relative max-h-[600px] overflow-y-auto" ref={gridRef}>
              {nowTop !== null && (
                <div
                  className="pointer-events-none absolute left-0 right-0 z-10 flex items-center"
                  style={{ top: nowTop }}
                >
                  <span className="-ml-1 h-2 w-2 shrink-0 rounded-full bg-blue-500" />
                  <span className="h-px flex-1 bg-blue-500" />
                </div>
              )}

              {HOURS.map((hour, hourIndex) => (
                <div
                  key={hour}
                  ref={(el) => {
                    rowRefs.current[hourIndex] = el;
                  }}
                  className="mt-2 grid grid-cols-[70px_repeat(5,1fr)] gap-2"
                >
                  <div className="pt-2 text-right text-[11px] text-gray-400">{hour}</div>

                  {days.map((_, dayIndex) => {
                    const items = cells.get(`${dayIndex}-${hourIndex}`) ?? [];
                    return (
                      <div
                        key={dayIndex}
                        className="min-h-[58px] rounded-lg border border-dashed border-gray-100 p-1"
                      >
                        {items.map((row) => {
                          const state = timelineState(row);
                          const Icon = SERVICE_ICONS[row.service];
                          return (
                            <div
                              key={row.id}
                              className="mb-1 rounded-lg border border-gray-100 bg-white p-2 shadow-sm transition-shadow last:mb-0 hover:shadow-md"
                            >
                              <div className="flex items-center justify-between gap-1">
                                <div className="flex min-w-0 items-center gap-1.5">
                                  <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${state.dot}`} />
                                  <span className="truncate text-[11px] font-semibold text-gray-900 underline decoration-gray-200 underline-offset-2">
                                    {row.id}
                                  </span>
                                </div>
                                <RowMenu
                                  items={calendarMenuFor(row)}
                                  icon={MoreVertical}
                                  triggerClassName="flex h-5 w-5 shrink-0 items-center justify-center rounded text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                                  menuClassName="absolute right-0 z-40 mt-1 w-40 overflow-hidden rounded-xl border border-gray-200 bg-white py-0.5 shadow-2xl"
                                />
                              </div>
                              <div className="mt-1 flex items-center gap-1.5">
                                <Icon size={11} className="shrink-0 text-brand-500" />
                                <span className="truncate text-[10px] text-gray-500">
                                  {row.service === "LIMITLESS"
                                    ? row.limitlessName
                                    : serviceLabel(row.service)}
                                </span>
                              </div>
                              <div className="mt-1 flex items-center gap-1.5 text-[10px] text-gray-400">
                                <Clock size={10} className="shrink-0" />
                                {HOURS[hourIndex]}
                              </div>
                              <div className="mt-1 truncate rounded-md bg-gray-50 px-1.5 py-0.5 text-[10px] text-gray-500">
                                {row.leadPax}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
