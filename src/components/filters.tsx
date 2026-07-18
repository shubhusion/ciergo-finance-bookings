"use client";

import { useEffect, useRef, useState } from "react";
import {
  Calculator, ArrowUpRight, ArrowDownLeft, ArrowRight, ChevronDown, RotateCcw,
  X, Search, MoreHorizontal, Download, Merge, Trash2, Upload, MousePointerClick,
  ListFilter, Plane, PlaneTakeoff, Building2, Bus, Ticket, Footprints, IdCard, ShieldCheck,
  LayoutGrid, Globe,
} from "lucide-react";
import { Checkbox, useOutside } from "./ui";
import { formatMoney } from "@/lib/format";
import { api } from "@/lib/api";
import { SERVICE_CATALOGUE, type ServiceType, type SummaryResponse } from "@/lib/types";

export const SERVICE_ICONS: Record<ServiceType, typeof Plane> = {
  FLIGHT: Plane,
  ACCOMMODATION: Building2,
  TRANSPORT_LAND: Bus,
  TRANSPORT_AIR: PlaneTakeoff,
  TICKET_ATTRACTION: Ticket,
  ACTIVITY: Footprints,
  VISA: IdCard,
  TRAVEL_INSURANCE: ShieldCheck,
  OTHERS: LayoutGrid,
  LIMITLESS: Globe,
};

/* ------------------------------------------------------------------ */
/*  Net / You Give / You Get                                           */
/* ------------------------------------------------------------------ */
export function Pills({ summary }: { summary: SummaryResponse | null }) {
  const net = summary?.net ?? 0;
  const currency = summary?.currency ?? "INR";

  const Pill = ({
    Icon,
    label,
    value,
    valueClass,
  }: {
    Icon: typeof Calculator;
    label: string;
    value: string;
    valueClass: string;
  }) => (
    <div className="flex items-center gap-2 rounded-full border border-gray-200 bg-white px-4 py-2 shadow-sm">
      <Icon size={15} className="text-gray-400" />
      <span className="text-[13px] italic text-gray-500">{label}</span>
      <span className={`text-[13px] font-semibold ${valueClass}`}>{value}</span>
    </div>
  );

  return (
    <div className="flex items-center gap-3">
      {/* Green when You Get exceeds You Give. The spec's arithmetic line reads
          "You Give - You Get = Net", which contradicts its own colour rule and
          the Figma totals (75,450 - 70,580 = 4,870, shown green); the colour
          rule and the design agree, so Net = You Get - You Give. */}
      <Pill
        Icon={Calculator}
        label="Net"
        value={formatMoney(Math.abs(net), currency)}
        valueClass={net >= 0 ? "text-emerald-600" : "text-red-500"}
      />
      <Pill
        Icon={ArrowUpRight}
        label="You Give"
        value={formatMoney(summary?.youGive ?? 0, currency)}
        valueClass="text-red-500"
      />
      <Pill
        Icon={ArrowDownLeft}
        label="You Get"
        value={formatMoney(summary?.youGet ?? 0, currency)}
        valueClass="text-emerald-600"
      />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Date range                                                         */
/* ------------------------------------------------------------------ */
export function DateRange({
  label,
  from,
  to,
  setFrom,
  setTo,
}: {
  label: string;
  from: string;
  to: string;
  setFrom: (v: string) => void;
  setTo: (v: string) => void;
}) {
  // Native <input type="date"> ignores the placeholder attribute — it always
  // renders its own dd/mm/yyyy hint in the input's own text color. Keeping
  // type="date" (rather than swapping to type="text") preserves the native
  // picker icon at all times; a "Start/End Date" span is layered on top and
  // the input's own text is made transparent only while empty *and* unfocused
  // — while typing, the real dd/mm/yyyy hint needs to stay visible.
  const [focusFrom, setFocusFrom] = useState(false);
  const [focusTo, setFocusTo] = useState(false);

  const fromEmpty = !from && !focusFrom;
  const toEmpty = !to && !focusTo;

  return (
    <div>
      <label className="mb-1.5 block text-[12px] text-gray-500">{label}</label>
      <div className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2">
        <div className="relative w-full">
          <input
            type="date"
            value={from}
            max={to || undefined}
            onChange={(e) => setFrom(e.target.value)}
            onFocus={() => setFocusFrom(true)}
            onBlur={() => setFocusFrom(false)}
            aria-label={`${label} start`}
            className={`w-full bg-transparent text-[12px] outline-none ${fromEmpty ? "text-transparent" : "text-gray-700"}`}
          />
          {fromEmpty && (
            <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center text-[12px] text-gray-400">
              Start Date
            </span>
          )}
        </div>
        <ArrowRight size={13} className="shrink-0 text-gray-400" />
        <div className="relative w-full">
          <input
            type="date"
            value={to}
            min={from || undefined}
            onChange={(e) => setTo(e.target.value)}
            onFocus={() => setFocusTo(true)}
            onBlur={() => setFocusTo(false)}
            aria-label={`${label} end`}
            className={`w-full bg-transparent text-[12px] outline-none ${toEmpty ? "text-transparent" : "text-gray-700"}`}
          />
          {toEmpty && (
            <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center text-[12px] text-gray-400">
              End Date
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Booking Owner multi-select                                         */
/* ------------------------------------------------------------------ */
type OwnerOption = { id: string; name: string; initials: string; colorToken: string };
export type OwnerSelection = { owners: string[]; primary: string[]; secondary: string[] };

function OwnerField({
  selected,
  setSelected,
  options,
  heading,
  boxed,
}: {
  selected: string[];
  setSelected: (v: string[]) => void;
  options: OwnerOption[];
  heading?: string;
  boxed?: boolean;
}) {
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useOutside(ref, () => setOpen(false), open);

  const visible = options.filter((o) => o.name.toLowerCase().includes(q.toLowerCase()));
  const nameOf = (id: string) => options.find((o) => o.id === id)?.name ?? id;

  return (
    <div className={boxed ? "rounded-xl bg-gray-50 p-4" : ""}>
      {heading && (
        <div className="mb-3 flex items-center justify-between">
          <span className="text-sm font-semibold text-gray-800">{heading}</span>
          <span className="text-xs text-gray-500">{selected.length} Owner(s) Selected</span>
        </div>
      )}

      <div className="relative" ref={ref}>
        <div className="flex w-full items-center rounded-lg border border-gray-200 bg-white px-3 py-2.5">
          <input
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setOpen(true);
            }}
            onFocus={() => setOpen(true)}
            placeholder="Search / Select Owners"
            aria-label={heading ?? "Search or select owners"}
            className="flex-1 bg-transparent text-[13px] outline-none placeholder:text-gray-400"
          />
          <button onClick={() => setOpen((v) => !v)} aria-label="Toggle owner list">
            <ChevronDown size={15} className="text-gray-400" />
          </button>
        </div>

        {open && (
          <div className="absolute z-50 mt-1 max-h-52 w-full overflow-auto rounded-xl border border-gray-200 bg-white py-1 shadow-xl">
            {visible.length === 0 && (
              <p className="px-4 py-3 text-[13px] text-gray-400">No owners match “{q}”.</p>
            )}
            {visible.map((o) => (
              <div key={o.id} className="border-b border-gray-50 px-4 py-2.5 last:border-0">
                <Checkbox
                  checked={selected.includes(o.id)}
                  label={o.name}
                  onChange={(c) =>
                    setSelected(c ? [...selected, o.id] : selected.filter((x) => x !== o.id))
                  }
                />
              </div>
            ))}
          </div>
        )}
      </div>

      {selected.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2">
          {selected.map((id) => (
            <span
              key={id}
              className="flex items-center gap-1.5 rounded-full border border-gray-200 bg-white px-3 py-1.5 text-[12px] text-gray-700"
            >
              <button
                onClick={() => setSelected(selected.filter((x) => x !== id))}
                aria-label={`Remove ${nameOf(id)}`}
              >
                <X size={12} className="text-gray-400 hover:text-gray-700" />
              </button>
              {nameOf(id)}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

export function OwnerSelect({
  value,
  onApply,
}: {
  value: OwnerSelection;
  onApply: (v: OwnerSelection) => void;
}) {
  const [open, setOpen] = useState(false);
  const [advance, setAdvance] = useState(false);
  const [draft, setDraft] = useState<OwnerSelection>(value);
  const [options, setOptions] = useState<OwnerOption[]>([]);
  const ref = useRef<HTMLDivElement>(null);
  useOutside(ref, () => setOpen(false), open);

  useEffect(() => {
    if (open && options.length === 0) api.owners().then(setOptions).catch(() => {});
  }, [open, options.length]);

  useEffect(() => setDraft(value), [value]);

  const applied = value.owners.length + value.primary.length + value.secondary.length;

  const apply = () => {
    onApply(
      advance
        ? { owners: [], primary: draft.primary, secondary: draft.secondary }
        : { owners: draft.owners, primary: [], secondary: [] }
    );
    setOpen(false);
  };

  const reset = () => {
    setDraft({ owners: [], primary: [], secondary: [] });
    onApply({ owners: [], primary: [], secondary: [] });
  };

  return (
    <div className="relative" ref={ref}>
      <label className="mb-1.5 block text-[12px] text-gray-500">Booking Owner</label>
      <button
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full items-center justify-between rounded-lg border border-gray-200 bg-white px-3 py-2.5"
      >
        <span className={`text-[13px] ${applied ? "text-gray-800" : "text-gray-400"}`}>
          {applied ? `${applied} Owner(s) Selected` : "Search / Select Owners"}
        </span>
        <ChevronDown size={15} className="text-gray-400" />
      </button>

      {open && (
        <div className="absolute left-0 top-full z-40 mt-2 w-[560px] rounded-2xl border border-gray-100 bg-white p-5 shadow-2xl">
          <div className="mb-4 flex items-center justify-between">
            <span className="text-[15px] font-semibold text-gray-900">Select Booking Owners</span>
            <div className="flex items-center gap-4">
              <Checkbox checked={advance} onChange={setAdvance} label="Advance Search" />
              <button onClick={() => setOpen(false)} aria-label="Close owner picker">
                <X size={16} className="text-gray-400" />
              </button>
            </div>
          </div>

          {!advance ? (
            <>
              <p className="mb-2 text-[13px] text-gray-500">
                {draft.owners.length} Owner(s) Selected
              </p>
              <OwnerField
                selected={draft.owners}
                setSelected={(owners) => setDraft({ ...draft, owners })}
                options={options}
              />
            </>
          ) : (
            <div className="grid grid-cols-2 gap-4">
              <OwnerField
                boxed
                heading="Primary Owner(s)"
                selected={draft.primary}
                setSelected={(primary) => setDraft({ ...draft, primary })}
                options={options}
              />
              <OwnerField
                boxed
                heading="Secondary Owner(s)"
                selected={draft.secondary}
                setSelected={(secondary) => setDraft({ ...draft, secondary })}
                options={options}
              />
            </div>
          )}

          <div className="mt-5 flex justify-end gap-3">
            <button
              onClick={reset}
              aria-label="Reset owner filter"
              className="rounded-lg border border-gray-200 p-2.5 text-gray-500 hover:bg-gray-50"
            >
              <RotateCcw size={15} />
            </button>
            <button
              onClick={apply}
              className="rounded-lg bg-brand-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-brand-700"
            >
              Apply
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Services column filter                                             */
/* ------------------------------------------------------------------ */
export function ServicesFilter({
  value,
  onApply,
}: {
  value: ServiceType[];
  onApply: (v: ServiceType[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<ServiceType[]>(value);
  const ref = useRef<HTMLSpanElement>(null);
  useOutside(ref, () => setOpen(false), open);

  useEffect(() => setDraft(value), [value]);

  const others = SERVICE_CATALOGUE.filter((s) => s.group === "other");
  const allOthers = others.every((s) => draft.includes(s.id));
  const allSelected = SERVICE_CATALOGUE.every((s) => draft.includes(s.id));
  const isFiltered = value.length < SERVICE_CATALOGUE.length;

  return (
    <span className="relative inline-block" ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label="Filter by service"
        className={isFiltered ? "text-brand-600" : "text-gray-400 hover:text-gray-600"}
      >
        <ListFilter size={13} />
      </button>

      {open && (
        <div className="absolute left-1/2 z-40 mt-2 w-64 -translate-x-1/2 rounded-xl border border-gray-200 bg-white shadow-2xl">
          <div className="border-b border-gray-100 px-4 py-3">
            <Checkbox
              checked={allOthers}
              label={
                <span className="text-[12px] font-semibold tracking-wide text-gray-700">
                  OTHER SERVICES
                </span>
              }
              onChange={(c) =>
                setDraft(
                  c
                    ? Array.from(new Set([...draft, ...others.map((s) => s.id)]))
                    : draft.filter((id) => !others.some((s) => s.id === id))
                )
              }
            />
          </div>

          <div className="max-h-64 overflow-auto py-1">
            {others.map(({ id, label }) => {
              const Icon = SERVICE_ICONS[id];
              return (
                <div key={id} className="px-4 py-2">
                  <Checkbox
                    checked={draft.includes(id)}
                    onChange={(c) =>
                      setDraft(c ? [...draft, id] : draft.filter((x) => x !== id))
                    }
                    label={
                      <span className="flex items-center gap-2 text-[13px] text-gray-700">
                        <Icon size={14} className="text-gray-500" />
                        {label}
                      </span>
                    }
                  />
                </div>
              );
            })}
          </div>

          <div className="border-y border-gray-100 px-4 py-3">
            <Checkbox
              checked={draft.includes("LIMITLESS")}
              onChange={(c) =>
                setDraft(c ? [...draft, "LIMITLESS"] : draft.filter((x) => x !== "LIMITLESS"))
              }
              label={
                <span className="text-[12px] font-semibold tracking-wide text-gray-700">
                  LIMITLESS
                </span>
              }
            />
          </div>

          <div className="flex items-center justify-between gap-2 p-3">
            <button
              onClick={() =>
                setDraft(allSelected ? [] : SERVICE_CATALOGUE.map((s) => s.id))
              }
              className="rounded-lg border border-gray-200 px-3 py-2 text-[12px] font-medium text-gray-700 hover:bg-gray-50"
            >
              {allSelected ? "Deselect All" : "Select All"}
            </button>
            <div className="flex gap-2">
              <button
                onClick={() => setDraft(SERVICE_CATALOGUE.map((s) => s.id))}
                aria-label="Reset service filter"
                className="rounded-lg border border-gray-200 p-2 text-gray-500 hover:bg-gray-50"
              >
                <RotateCcw size={14} />
              </button>
              <button
                onClick={() => {
                  onApply(draft);
                  setOpen(false);
                }}
                className="rounded-lg bg-brand-600 px-4 py-2 text-[12px] font-semibold text-white hover:bg-brand-700"
              >
                Apply
              </button>
            </div>
          </div>
        </div>
      )}
    </span>
  );
}

/* ------------------------------------------------------------------ */
/*  Travel date column filter                                          */
/* ------------------------------------------------------------------ */
export function TravelDateFilter({
  from,
  to,
  setFrom,
  setTo,
}: {
  from: string;
  to: string;
  setFrom: (v: string) => void;
  setTo: (v: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLSpanElement>(null);
  useOutside(ref, () => setOpen(false), open);

  // Same trick as DateRange: keep type="date" so the native picker icon stays
  // put, but hide the raw dd/mm/yyyy hint (via transparent text) whenever the
  // field is empty and unfocused, replacing it with a real placeholder.
  const [focusFrom, setFocusFrom] = useState(false);
  const [focusTo, setFocusTo] = useState(false);
  const fromEmpty = !from && !focusFrom;
  const toEmpty = !to && !focusTo;

  return (
    <span className="relative inline-block" ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label="Filter by travel date"
        className={from || to ? "text-brand-600" : "text-gray-400 hover:text-gray-600"}
      >
        <ListFilter size={13} />
      </button>

      {open && (
        <div className="absolute left-1/2 z-40 mt-2 w-60 -translate-x-1/2 rounded-xl border border-gray-200 bg-white p-4 shadow-2xl">
          <p className="mb-2 text-[12px] font-medium text-gray-700">Travel date between</p>
          <div className="relative mb-2">
            <input
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              onFocus={() => setFocusFrom(true)}
              onBlur={() => setFocusFrom(false)}
              aria-label="Travel date from"
              className={`w-full rounded-lg border border-gray-200 px-2 py-1.5 text-[12px] outline-none ${
                fromEmpty ? "text-transparent" : "text-gray-700"
              }`}
            />
            {fromEmpty && (
              <span className="pointer-events-none absolute inset-y-0 left-2 flex items-center text-[12px] text-gray-400">
                Start Date
              </span>
            )}
          </div>
          <div className="relative">
            <input
              type="date"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              onFocus={() => setFocusTo(true)}
              onBlur={() => setFocusTo(false)}
              aria-label="Travel date to"
              className={`w-full rounded-lg border border-gray-200 px-2 py-1.5 text-[12px] outline-none ${
                toEmpty ? "text-transparent" : "text-gray-700"
              }`}
            />
            {toEmpty && (
              <span className="pointer-events-none absolute inset-y-0 left-2 flex items-center text-[12px] text-gray-400">
                End Date
              </span>
            )}
          </div>
          <div className="mt-3 flex justify-end gap-2">
            <button
              onClick={() => {
                setFrom("");
                setTo("");
              }}
              className="rounded-lg border border-gray-200 px-3 py-1.5 text-[12px] text-gray-600 hover:bg-gray-50"
            >
              Clear
            </button>
            <button
              onClick={() => setOpen(false)}
              className="rounded-lg bg-brand-600 px-4 py-1.5 text-[12px] font-semibold text-white hover:bg-brand-700"
            >
              Apply
            </button>
          </div>
        </div>
      )}
    </span>
  );
}

/* ------------------------------------------------------------------ */
/*  Search + reset                                                     */
/* ------------------------------------------------------------------ */
export function SearchBox({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2.5">
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Search by ID / Lead Pax / Amount"
        aria-label="Search by booking ID, lead pax or amount"
        className="flex-1 bg-transparent text-[13px] outline-none placeholder:text-gray-400"
      />
      <Search size={15} className="text-gray-400" />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  More Actions / bulk menu                                           */
/* ------------------------------------------------------------------ */
export function MoreActions({
  onSelect,
  onUpload,
}: {
  onSelect: () => void;
  onUpload: () => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useOutside(ref, () => setOpen(false), open);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex items-center gap-6 rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-[13px] font-medium text-gray-700 hover:bg-gray-50"
      >
        More Actions
        <ChevronDown size={14} className="text-gray-400" />
      </button>

      {open && (
        <div className="absolute right-0 z-40 mt-1 w-40 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-2xl">
          <button
            onClick={() => {
              setOpen(false);
              onSelect();
            }}
            className="flex w-full items-center gap-2.5 border-b border-gray-50 px-4 py-2.5 text-left text-[13px] text-gray-700 hover:bg-gray-50"
          >
            <MousePointerClick size={14} /> Select
          </button>
          <button
            onClick={() => {
              setOpen(false);
              onUpload();
            }}
            className="flex w-full items-center gap-2.5 px-4 py-2.5 text-left text-[13px] text-gray-700 hover:bg-gray-50"
          >
            <Upload size={14} /> Upload
          </button>
        </div>
      )}
    </div>
  );
}

export function BulkMenu({
  count,
  onDownload,
  onMerge,
  onDelete,
}: {
  count: number;
  onDownload: () => void;
  onMerge: () => void;
  onDelete: () => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useOutside(ref, () => setOpen(false), open);
  const disabled = count === 0;

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label={`Bulk actions for ${count} selected bookings`}
        className="flex h-10 w-10 items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-600 hover:bg-gray-50"
      >
        <MoreHorizontal size={16} />
      </button>

      {open && (
        <div className="absolute right-0 z-40 mt-1 w-40 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-2xl">
          <button
            disabled={disabled}
            onClick={() => {
              setOpen(false);
              onDownload();
            }}
            className="flex w-full items-center gap-2.5 border-b border-gray-50 px-4 py-2.5 text-left text-[13px] text-gray-700 hover:bg-gray-50 disabled:opacity-40"
          >
            <Download size={14} className="text-blue-500" /> Download
          </button>
          <button
            disabled={disabled}
            onClick={() => {
              setOpen(false);
              onMerge();
            }}
            className="flex w-full items-center gap-2.5 border-b border-gray-50 px-4 py-2.5 text-left text-[13px] text-gray-700 hover:bg-gray-50 disabled:opacity-40"
          >
            <Merge size={14} /> Merge
          </button>
          <button
            disabled={disabled}
            onClick={() => {
              setOpen(false);
              onDelete();
            }}
            className="flex w-full items-center gap-2.5 px-4 py-2.5 text-left text-[13px] text-red-600 hover:bg-gray-50 disabled:opacity-40"
          >
            <Trash2 size={14} /> Delete
          </button>
        </div>
      )}
    </div>
  );
}
