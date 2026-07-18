"use client";

import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { Calendar, ChevronDown } from "lucide-react";
import { Sidebar, Topbar } from "./shell";
import {
  BulkMenu, DateRange, MoreActions, OwnerSelect, Pills, SearchBox,
  type OwnerSelection,
} from "./filters";
import { BookingsTable, Pagination } from "./table";
import { CalendarView } from "./calendar";
import { ConfirmDialog, Toast, Toggle, TableSkeleton } from "./ui";
import { api } from "@/lib/api";
import {
  ALL_SERVICE_IDS,
  type BookingDTO, type ServiceType, type SessionResponse,
  type SummaryResponse, type Tab,
} from "@/lib/types";

type ConfirmState = {
  message: ReactNode;
  confirmLabel: string;
  tone: "primary" | "danger" | "success";
  action: () => Promise<unknown>;
} | null;

export default function BookingsClient({ session }: { session: SessionResponse }) {
  const [collapsed, setCollapsed] = useState(false);
  const [view, setView] = useState<"table" | "calendar">("table");

  const [tab, setTab] = useState<Tab>("bookings");
  const [approvalState, setApprovalState] = useState("all");
  const [includeIncomplete, setIncludeIncomplete] = useState(false);

  const [bookingFrom, setBookingFrom] = useState("");
  const [bookingTo, setBookingTo] = useState("");
  const [travelFrom, setTravelFrom] = useState("");
  const [travelTo, setTravelTo] = useState("");
  const [ownerSel, setOwnerSel] = useState<OwnerSelection>({ owners: [], primary: [], secondary: [] });
  const [bookingType, setBookingType] = useState("all");
  const [services, setServices] = useState<ServiceType[]>([...ALL_SERVICE_IDS]);
  const [q, setQ] = useState("");
  const [debouncedQ, setDebouncedQ] = useState("");

  const [statusMode, setStatusMode] = useState<"payment" | "booking">("payment");
  const [sortBy, setSortBy] = useState<string | undefined>();
  const [sortDir, setSortDir] = useState("desc");

  const [selectMode, setSelectMode] = useState(false);
  const [selected, setSelected] = useState<string[]>([]);

  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(6);

  const [rows, setRows] = useState<BookingDTO[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [summary, setSummary] = useState<SummaryResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [confirm, setConfirm] = useState<ConfirmState>(null);
  const [toast, setToast] = useState<string | null>(null);

  const notify = useCallback((m: string) => {
    setToast(m);
    setTimeout(() => setToast(null), 2600);
  }, []);

  /* Debounce the search box so typing doesn't fire a query per keystroke. */
  useEffect(() => {
    const t = setTimeout(() => setDebouncedQ(q), 300);
    return () => clearTimeout(t);
  }, [q]);

  const filters = useMemo(
    () => ({
      tab,
      approvalState,
      bookingDateFrom: bookingFrom || undefined,
      bookingDateTo: bookingTo || undefined,
      travelDateFrom: travelFrom || undefined,
      travelDateTo: travelTo || undefined,
      owners: ownerSel.owners,
      primaryOwners: ownerSel.primary,
      secondaryOwners: ownerSel.secondary,
      bookingType,
      services,
      q: debouncedQ || undefined,
      includeIncomplete,
      sortBy,
      sortDir,
      page,
      perPage,
    }),
    [tab, approvalState, bookingFrom, bookingTo, travelFrom, travelTo, ownerSel,
      bookingType, services, debouncedQ, includeIncomplete, sortBy, sortDir, page, perPage]
  );

  /* The calendar manages its own page/perPage/sortBy/sortDir (it fetches by
     visible day range instead), so it gets a trimmed-down filters object that
     doesn't churn every time the table's pagination or sort changes. */
  const calendarFilters = useMemo(
    () => ({
      tab,
      approvalState,
      bookingDateFrom: bookingFrom || undefined,
      bookingDateTo: bookingTo || undefined,
      travelDateFrom: travelFrom || undefined,
      travelDateTo: travelTo || undefined,
      owners: ownerSel.owners,
      primaryOwners: ownerSel.primary,
      secondaryOwners: ownerSel.secondary,
      bookingType,
      services,
      q: debouncedQ || undefined,
      includeIncomplete,
    }),
    [tab, approvalState, bookingFrom, bookingTo, travelFrom, travelTo, ownerSel,
      bookingType, services, debouncedQ, includeIncomplete]
  );

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [list, sum] = await Promise.all([api.list(filters), api.summary(filters)]);
      setRows(list.data);
      setTotal(list.total);
      setTotalPages(list.totalPages);
      setSummary(sum);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load bookings.");
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    load();
  }, [load]);

  /* Any filter change resets to page 1 — staying on page 7 of a 2-page result
     is the classic way to show an empty table for no reason. */
  useEffect(() => {
    setPage(1);
  }, [tab, approvalState, debouncedQ, includeIncomplete, bookingType, perPage,
    bookingFrom, bookingTo, travelFrom, travelTo, ownerSel, services]);

  const onSort = (field: string) => {
    if (sortBy === field) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortBy(field);
      setSortDir("asc");
    }
  };

  const resetFilters = () => {
    setBookingFrom(""); setBookingTo(""); setTravelFrom(""); setTravelTo("");
    setOwnerSel({ owners: [], primary: [], secondary: [] });
    setBookingType("all"); setQ(""); setServices([...ALL_SERVICE_IDS]);
    setSortBy(undefined); setSortDir("desc");
    notify("Filters reset.");
  };

  /* ---- mutations: optimistic-free, refetch after each so the pills, the
         counts and the tab membership all stay consistent. ---- */
  const run = async (fn: () => Promise<unknown>, message: string) => {
    try {
      await fn();
      await load();
      notify(message);
    } catch (e) {
      notify(e instanceof Error ? e.message : "That didn't work.");
    }
  };

  const askApprove = (row: BookingDTO) =>
    setConfirm({
      message: <>Are you sure you want to approve this booking with ID <b>‘{row.id}’</b> ?</>,
      confirmLabel: "Yes, Approve",
      tone: "success",
      action: () => api.approval(row.id, "approve"),
    });

  const askReject = (row: BookingDTO) =>
    setConfirm({
      message: <>Are you sure you want to reject this booking with ID <b>‘{row.id}’</b> ?</>,
      confirmLabel: "Yes, Reject",
      tone: "danger",
      action: () => api.approval(row.id, "reject"),
    });

  const askResubmit = (row: BookingDTO) =>
    setConfirm({
      message: <>Are you sure you want to send booking with ID <b>‘{row.id}’</b> for approval ?</>,
      confirmLabel: "Yes, Send for Approval",
      tone: "primary",
      action: () => api.approval(row.id, "resubmit"),
    });

  const tabs: { id: Tab; label: string }[] = [
    { id: "bookings", label: "Bookings" },
    { id: "deleted", label: "Deleted" },
    // The whole tab is gated on the caller's approval rights.
    ...(session.canViewApprovalTab
      ? [{ id: "approval" as Tab, label: "Waiting for Approval" }]
      : []),
  ];

  return (
    <div className="flex h-screen w-full overflow-hidden bg-canvas text-gray-900">
      <Sidebar collapsed={collapsed} onToggle={() => setCollapsed((v) => !v)} />

      <div className="flex flex-1 flex-col overflow-hidden">
        <Topbar
          session={session}
          crumbs={view === "calendar" ? ["Finance", "Bookings", "Booking Calendar"] : ["Finance", "Bookings"]}
        />

        <main className="flex-1 overflow-auto px-6 pb-8">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <Pills summary={summary} />

            <div className="flex items-center gap-2">
              {selectMode ? (
                <>
                  <button
                    onClick={() => {
                      setSelectMode(false);
                      setSelected([]);
                    }}
                    className="rounded-lg border border-gray-200 bg-white px-5 py-2.5 text-[13px] font-medium text-gray-700 hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() =>
                      setSelected(selected.length > 0 ? [] : rows.map((r) => r.id))
                    }
                    className="rounded-lg border border-gray-200 bg-white px-5 py-2.5 text-[13px] font-medium text-gray-700 hover:bg-gray-50"
                  >
                    {selected.length > 0 ? "Deselect all" : "Select all"}
                  </button>
                  <BulkMenu
                    count={selected.length}
                    onDownload={() => notify(`Downloading ${selected.length} booking(s).`)}
                    onMerge={() => notify(`Merging ${selected.length} booking(s).`)}
                    onDelete={() =>
                      run(
                        () => Promise.all(selected.map((id) => api.remove(id))),
                        `${selected.length} booking(s) moved to Deleted.`
                      ).then(() => {
                        setSelected([]);
                        setSelectMode(false);
                      })
                    }
                  />
                </>
              ) : (
                <MoreActions
                  onSelect={() => setSelectMode(true)}
                  onUpload={() => notify("Upload bookings — pick a file.")}
                />
              )}

              <button
                onClick={() => setView((v) => (v === "table" ? "calendar" : "table"))}
                aria-label={view === "table" ? "Switch to calendar" : "Switch to table"}
                className={`flex h-10 w-10 items-center justify-center rounded-lg border bg-white ${
                  view === "calendar"
                    ? "border-brand-300 text-brand-600"
                    : "border-gray-200 text-gray-500 hover:bg-gray-50"
                }`}
              >
                <Calendar size={17} />
              </button>
            </div>
          </div>

          {/* filter bar */}
          <div className="mb-4 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-[1fr_1fr_1fr_1fr_1.2fr_auto]">
              <DateRange label="Booking Date" from={bookingFrom} to={bookingTo} setFrom={setBookingFrom} setTo={setBookingTo} />
              <DateRange label="Travel Date" from={travelFrom} to={travelTo} setFrom={setTravelFrom} setTo={setTravelTo} />
              <OwnerSelect value={ownerSel} onApply={setOwnerSel} />

              <div>
                <label htmlFor="bookingType" className="mb-1.5 block text-[12px] text-gray-500">
                  Booking Type
                </label>
                <div className="relative">
                  <select
                    id="bookingType"
                    value={bookingType}
                    onChange={(e) => setBookingType(e.target.value)}
                    className="w-full appearance-none rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-[13px] outline-none"
                  >
                    <option value="all">All Bookings</option>
                    <option value="other">Other Services</option>
                    <option value="limitless">Limitless</option>
                  </select>
                  <ChevronDown size={15} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
                </div>
              </div>

              <div className="self-end">
                <SearchBox value={q} onChange={setQ} />
              </div>

              <div className="self-end">
                <button
                  onClick={resetFilters}
                  aria-label="Reset all filters"
                  className="flex h-[42px] w-[42px] items-center justify-center rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M3 2v6h6M21 12A9 9 0 0 0 6 5.3L3 8" />
                    <path d="M21 22v-6h-6M3 12a9 9 0 0 0 15 6.7l3-2.7" />
                  </svg>
                </button>
              </div>
            </div>
          </div>

          {view === "calendar" ? (
            <CalendarView filters={calendarFilters} notify={notify} />
          ) : (
            <div className="rounded-2xl border border-gray-200 bg-white shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 px-5">
                <div className="flex items-center gap-6">
                  {tabs.map(({ id, label }) => (
                    <button
                      key={id}
                      onClick={() => {
                        setTab(id);
                        setSelected([]);
                      }}
                      aria-current={tab === id ? "page" : undefined}
                      className={`border-b-2 px-1 py-4 text-[13px] transition-colors ${
                        tab === id
                          ? "border-brand-600 font-semibold text-brand-700"
                          : "border-transparent text-gray-500 hover:text-gray-800"
                      }`}
                    >
                      {label}
                    </button>
                  ))}

                  {tab === "approval" && (
                    <div className="relative">
                      <select
                        value={approvalState}
                        onChange={(e) => setApprovalState(e.target.value)}
                        aria-label="Filter by approval state"
                        className="w-40 appearance-none rounded-lg border border-gray-200 bg-white px-3 py-2 text-[13px] outline-none"
                      >
                        <option value="all">All</option>
                        <option value="PENDING">Pending</option>
                        <option value="APPROVED">Approved</option>
                        <option value="REJECTED">Rejected</option>
                      </select>
                      <ChevronDown size={14} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-3">
                  <Toggle
                    checked={includeIncomplete}
                    onChange={setIncludeIncomplete}
                    label="Show incomplete bookings"
                  />
                  <span className="text-[13px] text-gray-600">Show Incomplete Bookings</span>
                  <span className="flex items-center gap-2 rounded-md border border-amber-200 bg-amber-50 px-2.5 py-1 text-[11px] text-amber-700">
                    Total <b className="rounded bg-amber-100 px-1.5">{total}</b>
                  </span>
                </div>
              </div>

              {error ? (
                <div className="px-6 py-16 text-center">
                  <p className="text-[14px] font-medium text-gray-800">{error}</p>
                  <button
                    onClick={load}
                    className="mt-2 text-[13px] font-medium text-brand-600 hover:underline"
                  >
                    Try again
                  </button>
                </div>
              ) : loading && rows.length === 0 ? (
                <TableSkeleton rows={perPage} />
              ) : (
                <BookingsTable
                  rows={rows}
                  tab={tab}
                  loading={loading}
                  statusMode={statusMode}
                  onSwapStatus={() => setStatusMode((m) => (m === "payment" ? "booking" : "payment"))}
                  sortBy={sortBy}
                  sortDir={sortDir}
                  onSort={onSort}
                  travelFrom={travelFrom}
                  travelTo={travelTo}
                  setTravelFrom={setTravelFrom}
                  setTravelTo={setTravelTo}
                  services={services}
                  setServices={setServices}
                  selectMode={selectMode}
                  selected={selected}
                  setSelected={setSelected}
                  notify={notify}
                  onResetFilters={resetFilters}
                  onDelete={(r) => run(() => api.remove(r.id), `Booking ${r.id} moved to Deleted.`)}
                  onRestore={(r) => run(() => api.restore(r.id), `Booking ${r.id} restored.`)}
                  onDuplicate={(r) => run(() => api.duplicate(r.id), `Booking ${r.id} duplicated.`)}
                  onApprove={askApprove}
                  onReject={askReject}
                  onResubmit={askResubmit}
                />
              )}

              <Pagination
                page={page}
                perPage={perPage}
                total={total}
                totalPages={totalPages}
                onPage={setPage}
                onPerPage={setPerPage}
              />
            </div>
          )}
        </main>
      </div>

      <ConfirmDialog
        open={!!confirm}
        message={confirm?.message}
        confirmLabel={confirm?.confirmLabel ?? ""}
        tone={confirm?.tone}
        onCancel={() => setConfirm(null)}
        onConfirm={() => {
          const c = confirm;
          setConfirm(null);
          if (c) run(c.action, "Done.");
        }}
      />

      <Toast message={toast} />
    </div>
  );
}
