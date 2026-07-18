"use client";

import { useRef, useState } from "react";
import {
  ArrowLeftRight, ArrowDownUp, ChevronDown, ChevronLeft, ChevronRight, Check, X,
  MoreHorizontal, Pencil, Trash2, Link2, Copy, Undo2, Send, Plus, FileText,
  Clipboard, Download,
} from "lucide-react";
import { Avatar, Checkbox, useOutside } from "./ui";
import { SERVICE_ICONS, ServicesFilter, TravelDateFilter } from "./filters";
import { currencySymbol, formatMoney, formatTravelDate } from "@/lib/format";
import {
  SERVICE_CATALOGUE, VOUCHER_DOCS,
  type BookingDTO, type PaymentStatus, type ServiceType, type Tab,
} from "@/lib/types";

const PAYMENT_LABEL: Record<PaymentStatus, string> = {
  PAID: "Paid",
  PARTIALLY_PAID: "Partially Paid",
  PENDING: "Pending",
};
const PAYMENT_CLASS: Record<PaymentStatus, string> = {
  PAID: "bg-emerald-50 text-emerald-600",
  PARTIALLY_PAID: "bg-amber-100 text-amber-700",
  PENDING: "bg-amber-50 text-amber-600",
};
const BOOKING_LABEL = { CONFIRMED: "Confirmed", PENDING: "Pending", CANCELLED: "Cancelled" };
const BOOKING_CLASS = {
  CONFIRMED: "bg-emerald-50 text-emerald-600",
  PENDING: "bg-amber-50 text-amber-600",
  CANCELLED: "bg-rose-50 text-rose-600",
};

const serviceLabel = (id: ServiceType) =>
  SERVICE_CATALOGUE.find((s) => s.id === id)?.label ?? id;

/* ------------------------------------------------------------------ */
export type MenuItem = { label: string; Icon: typeof Pencil; onClick: () => void; tone?: string };

export function RowMenu({
  items,
  icon: Icon = MoreHorizontal,
  triggerClassName = "flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50",
  menuClassName = "absolute right-0 z-40 mt-1 w-44 overflow-hidden rounded-xl border border-gray-200 bg-white py-0.5 shadow-2xl",
}: {
  items: MenuItem[];
  icon?: typeof MoreHorizontal;
  triggerClassName?: string;
  menuClassName?: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLSpanElement>(null);
  useOutside(ref, () => setOpen(false), open);

  return (
    <span className="relative inline-block" ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label="More actions"
        aria-expanded={open}
        className={triggerClassName}
      >
        <Icon size={15} />
      </button>

      {open && (
        <div className={menuClassName}>
          {items.map(({ label, Icon, onClick, tone }) => (
            <button
              key={label}
              onClick={() => {
                setOpen(false);
                onClick();
              }}
              className={`flex w-full items-center gap-2.5 border-b border-gray-50 px-4 py-2.5 text-left text-[13px] last:border-0 hover:bg-gray-50 ${
                tone === "danger"
                  ? "text-red-600"
                  : tone === "primary"
                    ? "text-blue-600"
                    : tone === "link"
                      ? "text-green-600"
                      : "text-gray-700"
              }`}
            >
              <Icon size={14} />
              {label}
            </button>
          ))}
        </div>
      )}
    </span>
  );
}

function VoucherMenu({ row, notify }: { row: BookingDTO; notify: (m: string) => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useOutside(ref, () => setOpen(false), open);

  const has = (kind: string) => row.documents.some((d) => d.kind === kind);

  return (
    <div className="relative" ref={ref}>
      <div className="flex overflow-hidden rounded-lg border border-gray-200">
        <button
          onClick={() => notify(`Booking voucher for ${row.id} opened.`)}
          aria-label={`Open voucher for ${row.id}`}
          className="px-2.5 py-1.5 hover:bg-gray-50"
        >
          <FileText size={14} className="text-brand-500" />
        </button>
        <button
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-label={`Voucher and invoice downloads for ${row.id}`}
          className="border-l border-gray-200 px-1.5 py-1.5 hover:bg-gray-50"
        >
          <ChevronDown
            size={13}
            className={`transition-transform ${open ? "rotate-180 text-brand-500" : "text-gray-400"}`}
          />
        </button>
      </div>

      {open && (
        <div className="absolute right-0 z-40 mt-1 w-52 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-2xl">
          {VOUCHER_DOCS.map(({ kind, label }) => {
            const available = has(kind);
            return (
              <button
                key={kind}
                disabled={!available}
                onClick={() => {
                  setOpen(false);
                  notify(`Downloading ${label.replace("(s)", "")} for ${row.id}.`);
                }}
                title={available ? undefined : "Not generated for this booking yet"}
                className="flex w-full items-center gap-2.5 border-b border-gray-100 px-4 py-2.5 text-left text-[13px] text-gray-700 last:border-0 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <Download size={14} className="shrink-0 text-gray-500" />
                {label}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

function PaymentRecordButton({
  row,
  onRecord,
}: {
  row: BookingDTO;
  onRecord: () => void;
}) {
  const [hover, setHover] = useState(false);
  const symbol = currencySymbol(row.currency);

  return (
    <span
      className="relative inline-block"
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
    >
      <button
        onClick={onRecord}
        aria-label={`Record payment for ${row.id}`}
        className="flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 text-[13px] font-medium text-gray-600 hover:bg-gray-50"
      >
        {symbol}
      </button>

      {hover && (
        <span className="absolute bottom-full right-0 z-40 mb-2 w-max rounded-lg bg-neutral-700 px-4 py-3 text-left shadow-xl">
          <span className="block border-b border-white/40 pb-1 text-[11px] font-semibold text-white">
            PENDING AMOUNT
          </span>
          <span className="mt-1.5 block text-[11px] text-white">
            CUSTOMER : {formatMoney(row.pendingCustomer, row.currency)}
          </span>
          <span className="block text-[11px] text-white">
            VENDOR : {formatMoney(row.pendingVendor, row.currency)}
          </span>
        </span>
      )}
    </span>
  );
}

/* ------------------------------------------------------------------ */
export interface TableProps {
  rows: BookingDTO[];
  tab: Tab;
  loading: boolean;
  statusMode: "payment" | "booking";
  onSwapStatus: () => void;
  sortBy?: string;
  sortDir: string;
  onSort: (field: string) => void;
  travelFrom: string;
  travelTo: string;
  setTravelFrom: (v: string) => void;
  setTravelTo: (v: string) => void;
  services: ServiceType[];
  setServices: (v: ServiceType[]) => void;
  selectMode: boolean;
  selected: string[];
  setSelected: (v: string[]) => void;
  notify: (m: string) => void;
  onDelete: (row: BookingDTO) => void;
  onRestore: (row: BookingDTO) => void;
  onDuplicate: (row: BookingDTO) => void;
  onApprove: (row: BookingDTO) => void;
  onReject: (row: BookingDTO) => void;
  onResubmit: (row: BookingDTO) => void;
  onResetFilters: () => void;
}

export function BookingsTable(p: TableProps) {
  const {
    rows, tab, loading, statusMode, onSwapStatus, sortBy, sortDir, onSort,
    selectMode, selected, setSelected, notify,
  } = p;

  const allSelected = rows.length > 0 && rows.every((r) => selected.includes(r.id));

  const Th = ({ children, className = "" }: { children: React.ReactNode; className?: string }) => (
    <th className={`whitespace-nowrap px-4 py-3.5 text-[12px] font-medium text-gray-500 ${className}`}>
      {children}
    </th>
  );

  const sortClass = (f: string) => (sortBy === f ? "text-brand-600" : "text-gray-400 hover:text-gray-600");

  const menuFor = (row: BookingDTO): MenuItem[] => {
    if (tab === "deleted")
      return [
        { label: "Restore", Icon: Undo2, onClick: () => p.onRestore(row) },
        { label: "Duplicate", Icon: Copy, onClick: () => p.onDuplicate(row) },
      ];

    if (tab === "approval" && row.approvalState === "PENDING")
      return [
        { label: "Edit", Icon: Pencil, tone: "primary", onClick: () => notify(`Opening ${row.id}…`) },
        { label: "Delete", Icon: Trash2, tone: "danger", onClick: () => p.onDelete(row) },
        { label: "Duplicate", Icon: Copy, onClick: () => p.onDuplicate(row) },
      ];

    if (tab === "approval" && row.approvalState === "REJECTED")
      return [
        { label: "Send for Approval", Icon: Send, onClick: () => p.onResubmit(row) },
        { label: "Delete", Icon: Trash2, tone: "danger", onClick: () => p.onDelete(row) },
        { label: "Duplicate", Icon: Copy, onClick: () => p.onDuplicate(row) },
      ];

    return [
      { label: "Edit", Icon: Pencil, tone: "primary", onClick: () => notify(`Opening ${row.id}…`) },
      { label: "Delete", Icon: Trash2, tone: "danger", onClick: () => p.onDelete(row) },
      { label: "Link", Icon: Link2, tone: "link", onClick: () => notify(`Link booking ${row.id}.`) },
      { label: "Duplicate", Icon: Copy, onClick: () => p.onDuplicate(row) },
    ];
  };

  // Voucher and Tasks are hidden for rejected bookings.
  const showDocs = (row: BookingDTO) =>
    !(tab === "approval" && row.approvalState === "REJECTED");

  return (
    <div className="overflow-x-auto p-4">
      <table className="w-full min-w-[1000px] border-separate border-spacing-0">
        <thead>
          <tr className="bg-gray-50/80">
            {selectMode && (
              <Th className="w-10 rounded-l-xl pl-4">
                <Checkbox
                  checked={allSelected}
                  onChange={(c) => setSelected(c ? rows.map((r) => r.id) : [])}
                />
              </Th>
            )}
            <Th className={selectMode ? "" : "rounded-l-xl pl-6"}>Booking ID</Th>
            <Th>
              <span className="inline-flex items-center gap-1.5">
                Lead Pax
                <button onClick={() => onSort("leadPax")} className={sortClass("leadPax")} aria-label="Sort by lead pax">
                  <ArrowLeftRight size={13} />
                </button>
              </span>
            </Th>
            <Th>
              <span className="inline-flex items-center gap-1.5">
                Travel Date
                <TravelDateFilter
                  from={p.travelFrom}
                  to={p.travelTo}
                  setFrom={p.setTravelFrom}
                  setTo={p.setTravelTo}
                />
                <button onClick={() => onSort("travelDate")} className={sortClass("travelDate")} aria-label="Sort by travel date">
                  <ArrowDownUp size={13} />
                </button>
              </span>
            </Th>
            <Th className="text-center">
              <span className="inline-flex items-center gap-1.5">
                Service
                <ServicesFilter value={p.services} onApply={p.setServices} />
              </span>
            </Th>
            <Th className="text-center">
              <span className="inline-flex items-center gap-1.5">
                {statusMode === "payment" ? "Payment Status" : "Booking Status"}
                <button onClick={onSwapStatus} className="text-gray-400 hover:text-brand-600" aria-label="Swap between payment and booking status">
                  <ArrowLeftRight size={13} />
                </button>
              </span>
            </Th>
            <Th className="text-center">
              <span className="inline-flex items-center gap-1.5">
                Amount
                <button onClick={() => onSort("amount")} className={sortClass("amount")} aria-label="Sort by amount">
                  <ArrowDownUp size={13} />
                </button>
              </span>
            </Th>
            <Th className="text-center">Owner</Th>
            {tab !== "deleted" && <Th className="text-center">Voucher</Th>}
            {tab !== "deleted" && <Th className="text-center">Tasks</Th>}
            <Th className="rounded-r-xl text-center">Actions</Th>
          </tr>
        </thead>

        <tbody>
          {!loading && rows.length === 0 && (
            <tr>
              <td colSpan={12} className="px-6 py-16 text-center">
                <p className="text-[14px] font-medium text-gray-700">
                  No bookings match these filters.
                </p>
                <button
                  onClick={p.onResetFilters}
                  className="mt-2 text-[13px] font-medium text-brand-600 hover:underline"
                >
                  Reset filters
                </button>
              </td>
            </tr>
          )}

          {rows.map((row, idx) => {
            const Icon = SERVICE_ICONS[row.service];
            const isPending = tab === "approval" && row.approvalState === "PENDING";

            return (
              <tr
                key={row.id}
                className={`${idx % 2 ? "bg-gray-50/60" : "bg-white"} transition-colors hover:bg-brand-50/30`}
              >
                {selectMode && (
                  <td className="px-4 py-4">
                    <Checkbox
                      checked={selected.includes(row.id)}
                      onChange={(c) =>
                        setSelected(
                          c ? [...selected, row.id] : selected.filter((x) => x !== row.id)
                        )
                      }
                    />
                  </td>
                )}

                <td className={`relative py-4 text-[13px] font-semibold text-gray-900 ${selectMode ? "px-4" : "px-6"}`}>
                  {tab === "approval" && row.approvalState && (
                    <span
                      title={row.approvalState.toLowerCase()}
                      className={`absolute bottom-2 left-0 top-2 w-1 rounded-full ${
                        row.approvalState === "APPROVED"
                          ? "bg-emerald-500"
                          : row.approvalState === "REJECTED"
                            ? "bg-red-500"
                            : "bg-amber-400"
                      }`}
                    />
                  )}
                  {row.id}
                </td>

                <td className="px-4 py-4 text-[13px] text-gray-700">{row.leadPax}</td>
                <td className="px-4 py-4 text-[13px] text-gray-700">
                  {formatTravelDate(row.travelDate)}
                </td>

                <td className="px-4 py-4 text-center">
                  {row.service === "LIMITLESS" ? (
                    <div className="flex flex-col items-center gap-1">
                      <span className="text-[12px] text-gray-600">{row.limitlessCountry}</span>
                      <span className="rounded-md bg-brand-50 px-2 py-1 text-[11px] text-brand-700">
                        {row.limitlessName}
                      </span>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-1">
                      <Icon size={15} className="text-brand-500" />
                      <span className="text-[12px] text-gray-600">{serviceLabel(row.service)}</span>
                    </div>
                  )}
                </td>

                <td className="px-4 py-4 text-center">
                  {statusMode === "payment" ? (
                    <span className={`inline-block rounded-md px-2.5 py-1 text-[11px] font-medium ${PAYMENT_CLASS[row.paymentStatus]}`}>
                      {PAYMENT_LABEL[row.paymentStatus]}
                    </span>
                  ) : (
                    <span className={`inline-block rounded-md px-2.5 py-1 text-[11px] font-medium ${BOOKING_CLASS[row.bookingStatus]}`}>
                      {BOOKING_LABEL[row.bookingStatus]}
                    </span>
                  )}
                </td>

                <td className="px-4 py-4 text-center text-[13px] text-gray-800">
                  {formatMoney(row.amount, row.currency)}
                </td>

                <td className="px-4 py-4">
                  <div className="flex items-center justify-center">
                    {row.owners.map((o, i) => (
                      <Avatar key={o.id} {...o} index={i} />
                    ))}
                  </div>
                </td>

                {tab !== "deleted" && (
                  <td className="px-4 py-4">
                    <div className="flex justify-center">
                      {!showDocs(row) ? (
                        <span className="text-[13px] text-gray-300">--</span>
                      ) : row.hasVoucher ? (
                        <VoucherMenu row={row} notify={notify} />
                      ) : (
                        <button
                          onClick={() => notify(`Add a voucher to ${row.id}.`)}
                          aria-label={`Add voucher to ${row.id}`}
                          className="rounded-lg border border-gray-200 px-3 py-1.5 text-gray-400 hover:bg-gray-50"
                        >
                          <Plus size={14} />
                        </button>
                      )}
                    </div>
                  </td>
                )}

                {tab !== "deleted" && (
                  <td className="px-4 py-4">
                    <div className="flex justify-center">
                      {!showDocs(row) ? (
                        <span className="text-[13px] text-gray-300">--</span>
                      ) : row.openTaskCount > 0 ? (
                        <button
                          onClick={() => notify(`${row.openTaskCount} open task(s) on ${row.id}.`)}
                          aria-label={`${row.openTaskCount} open tasks on ${row.id}`}
                          className="relative rounded-lg border border-gray-200 px-2.5 py-1.5 hover:bg-gray-50"
                        >
                          <Clipboard size={14} className="text-amber-500" />
                          <span className="absolute -right-1 -top-1.5 text-[10px] font-semibold text-amber-600">
                            {row.openTaskCount}
                          </span>
                        </button>
                      ) : (
                        <button
                          onClick={() => notify(`Add a task to ${row.id}.`)}
                          aria-label={`Add task to ${row.id}`}
                          className="rounded-lg border border-gray-200 px-3 py-1.5 text-gray-400 hover:bg-gray-50"
                        >
                          <Plus size={14} />
                        </button>
                      )}
                    </div>
                  </td>
                )}

                <td className="px-4 py-4">
                  <div className="flex items-center justify-center gap-2">
                    {/* Tick/cross only render when the server says this caller
                        may approve this specific booking. */}
                    {isPending && row.can.approve && (
                      <>
                        <button
                          onClick={() => p.onApprove(row)}
                          aria-label={`Approve ${row.id}`}
                          className="flex h-8 w-8 items-center justify-center rounded-lg border border-green-200 bg-green-50 text-green-600 hover:bg-green-100"
                        >
                          <Check size={15} strokeWidth={3} />
                        </button>
                        <button
                          onClick={() => p.onReject(row)}
                          aria-label={`Reject ${row.id}`}
                          className="flex h-8 w-8 items-center justify-center rounded-lg border border-red-200 bg-red-50 text-red-600 hover:bg-red-100"
                        >
                          <X size={15} strokeWidth={3} />
                        </button>
                      </>
                    )}

                    {row.can.recordPayment && tab !== "deleted" && (
                      <PaymentRecordButton
                        row={row}
                        onRecord={() => notify(`Record payment for ${row.id}.`)}
                      />
                    )}

                    <RowMenu items={menuFor(row)} />
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

/* ------------------------------------------------------------------ */
export function Pagination({
  page,
  perPage,
  total,
  totalPages,
  onPage,
  onPerPage,
}: {
  page: number;
  perPage: number;
  total: number;
  totalPages: number;
  onPage: (p: number) => void;
  onPerPage: (n: number) => void;
}) {
  const numbers: (number | "…")[] = (() => {
    if (totalPages <= 5) return Array.from({ length: totalPages }, (_, i) => i + 1);
    if (page <= 3) return [1, 2, 3, "…", totalPages];
    if (page >= totalPages - 2) return [1, "…", totalPages - 2, totalPages - 1, totalPages];
    return [1, "…", page, "…", totalPages];
  })();

  return (
    <div className="flex flex-wrap items-center justify-between gap-4 px-6 pb-5 pt-1">
      <div className="flex items-center gap-2">
        <label htmlFor="perPage" className="text-[12px] text-gray-500">
          Rows per page:
        </label>
        <div className="relative">
          <select
            id="perPage"
            value={perPage}
            onChange={(e) => onPerPage(Number(e.target.value))}
            className="appearance-none rounded-lg border border-gray-200 bg-white py-1.5 pl-3 pr-8 text-[12px] outline-none"
          >
            {[6, 10, 20, 50, 100].map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
          <ChevronDown size={13} className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-gray-400" />
        </div>
      </div>

      <span className="text-[12px] text-gray-500">
        Showing {total === 0 ? 0 : (page - 1) * perPage + 1}-
        {Math.min(page * perPage, total)} of {total} Bookings
      </span>

      <div className="flex items-center gap-1">
        <button
          onClick={() => onPage(Math.max(1, page - 1))}
          disabled={page === 1}
          aria-label="Previous page"
          className="rounded-md p-1.5 text-gray-400 hover:bg-gray-50 disabled:opacity-30"
        >
          <ChevronLeft size={15} />
        </button>

        {numbers.map((n, i) =>
          n === "…" ? (
            <span key={`e${i}`} className="px-1.5 text-[12px] text-gray-400">
              …
            </span>
          ) : (
            <button
              key={n}
              onClick={() => onPage(n)}
              aria-current={n === page ? "page" : undefined}
              className={`h-7 w-7 rounded-md text-[12px] ${
                n === page
                  ? "bg-gray-100 font-semibold text-gray-900"
                  : "text-gray-500 hover:bg-gray-50"
              }`}
            >
              {n}
            </button>
          )
        )}

        <button
          onClick={() => onPage(Math.min(totalPages, page + 1))}
          disabled={page === totalPages}
          aria-label="Next page"
          className="rounded-md p-1.5 text-gray-400 hover:bg-gray-50 disabled:opacity-30"
        >
          <ChevronRight size={15} />
        </button>
      </div>
    </div>
  );
}
