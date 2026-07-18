"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { Check } from "lucide-react";

export function useOutside(
  ref: React.RefObject<HTMLElement | null>,
  onClose: () => void,
  active = true
) {
  useEffect(() => {
    if (!active) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [ref, onClose, active]);
}

export function Checkbox({
  checked,
  onChange,
  label,
  className = "",
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label?: ReactNode;
  className?: string;
}) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={`flex items-center gap-3 text-left ${className}`}
    >
      <span
        className={`flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-[5px] border transition-colors ${
          checked ? "border-brand-600 bg-brand-600" : "border-gray-300 bg-white"
        }`}
      >
        {checked && <Check size={12} strokeWidth={3.5} className="text-white" />}
      </span>
      {label && <span className="text-sm text-gray-700">{label}</span>}
    </button>
  );
}

export function Toggle({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={`relative h-[18px] w-8 shrink-0 rounded-full transition-colors ${
        checked ? "bg-brand-600" : "bg-gray-200"
      }`}
    >
      <span
        className={`absolute top-[2px] h-[14px] w-[14px] rounded-full bg-white shadow transition-all ${
          checked ? "left-[16px]" : "left-[2px]"
        }`}
      />
    </button>
  );
}

const AVATAR_TOKENS: Record<string, string> = {
  rose: "text-rose-500 border-rose-300 bg-rose-50",
  violet: "text-violet-500 border-violet-300 bg-violet-50",
  purple: "text-purple-500 border-purple-300 bg-purple-50",
  sky: "text-sky-500 border-sky-300 bg-sky-50",
  amber: "text-amber-500 border-amber-300 bg-amber-50",
  teal: "text-teal-500 border-teal-300 bg-teal-50",
  indigo: "text-indigo-500 border-indigo-300 bg-indigo-50",
  pink: "text-pink-500 border-pink-300 bg-pink-50",
  emerald: "text-emerald-500 border-emerald-300 bg-emerald-50",
  orange: "text-orange-500 border-orange-300 bg-orange-50",
  cyan: "text-cyan-500 border-cyan-300 bg-cyan-50",
};

export function Avatar({
  initials,
  name,
  colorToken,
  index,
}: {
  initials: string;
  name: string;
  colorToken: string;
  index: number;
}) {
  return (
    <span
      title={name}
      style={{ marginLeft: index === 0 ? 0 : -8, zIndex: 10 - index }}
      className={`relative flex h-7 w-7 items-center justify-center rounded-full border text-[10px] font-semibold ${
        AVATAR_TOKENS[colorToken] ?? AVATAR_TOKENS.violet
      }`}
    >
      {initials}
    </span>
  );
}

export function ConfirmDialog({
  open,
  message,
  confirmLabel,
  tone = "primary",
  onCancel,
  onConfirm,
}: {
  open: boolean;
  message: ReactNode;
  confirmLabel: string;
  tone?: "primary" | "danger" | "success";
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useOutside(ref, onCancel, open);
  if (!open) return null;

  const toneClass =
    tone === "danger"
      ? "bg-red-600 hover:bg-red-700"
      : tone === "success"
        ? "bg-green-600 hover:bg-green-700"
        : "bg-brand-600 hover:bg-brand-700";

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 px-4"
    >
      <div ref={ref} className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
        <p className="text-[15px] leading-relaxed text-gray-800">{message}</p>
        <div className="mt-6 flex justify-end gap-3">
          <button
            onClick={onCancel}
            className="rounded-lg border border-gray-200 px-5 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className={`rounded-lg px-5 py-2 text-sm font-semibold text-white ${toneClass}`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

export function Toast({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <div
      role="status"
      className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-lg bg-neutral-800 px-5 py-3 text-[13px] text-white shadow-xl"
    >
      {message}
    </div>
  );
}

export function TableSkeleton({ rows = 6 }: { rows?: number }) {
  return (
    <div className="space-y-2 p-4">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="h-14 animate-pulse rounded-lg bg-gray-100" />
      ))}
    </div>
  );
}
