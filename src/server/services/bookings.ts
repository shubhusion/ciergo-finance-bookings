import { prisma } from "../db";
import { HttpError, type Actor } from "../auth";
import {
  buildWhere,
  findBookingById,
  findBookings,
  ledgerSummary,
  type BookingRecord,
} from "../repositories/bookings";
import type { ListQuery } from "../validation/bookings";
import type {
  ApprovalState, BookingDTO, BookingStatus, DocumentKind, PaymentStatus,
  ServiceType, SummaryResponse,
} from "@/lib/types";

/* ------------------------------------------------------------------ */
/*  Derivations                                                        */
/* ------------------------------------------------------------------ */

/**
 * Payment status is derived, never stored — storing it would let it drift out
 * of sync with the payment rows that the pills are summed from.
 */
function derivePaymentStatus(b: BookingRecord): PaymentStatus {
  const approved = b.payments.filter((p) => p.isApproved);
  if (approved.length === 0) return "PENDING";
  const settled = approved.filter((p) => p.settled);
  if (settled.length === 0) return "PENDING";
  if (settled.length === approved.length) return "PAID";
  return "PARTIALLY_PAID";
}

function pendingFor(b: BookingRecord, party: "CUSTOMER" | "VENDOR") {
  return b.payments
    .filter((p) => p.party === party && !p.settled && p.isApproved)
    .reduce((sum, p) => sum + p.amount, 0);
}

/** "the pending bookings here can only be approved by admin, and users who have
 *  access to approve booking of a certain user" */
export function canApprove(actor: Actor, b: BookingRecord): boolean {
  if (b.approvalState !== "PENDING" || b.deletedAt) return false;
  if (actor.role === "ADMIN") return true;
  return b.owners.some((o) => actor.approvesForUserIds.includes(o.userId));
}

export function toDTO(b: BookingRecord, actor: Actor): BookingDTO {
  const isDeleted = b.deletedAt !== null;
  const isPendingApproval = b.requiresApproval && b.approvalState === "PENDING";
  const isRejected = b.requiresApproval && b.approvalState === "REJECTED";

  // Payments can't be recorded against pending or rejected bookings, so their
  // payment status can only ever read Pending.
  const paymentStatus: PaymentStatus =
    isPendingApproval || isRejected || isDeleted ? "PENDING" : derivePaymentStatus(b);

  const recordPayment = !isDeleted && !isPendingApproval && !isRejected;
  const isOwner = b.owners.some((o) => o.userId === actor.id);
  const mayMutate = !isDeleted && (actor.role === "ADMIN" || isOwner);

  return {
    id: b.id,
    leadPax: b.leadPax,
    bookingDate: b.bookingDate.toISOString(),
    travelDate: b.travelDate.toISOString(),
    service: b.service as ServiceType,
    limitlessName: b.limitlessName,
    limitlessCountry: b.limitlessCountry,
    bookingStatus: b.bookingStatus as BookingStatus,
    paymentStatus,
    amount: b.amount,
    currency: b.currency,
    pendingCustomer: pendingFor(b, "CUSTOMER"),
    pendingVendor: pendingFor(b, "VENDOR"),
    owners: b.owners.map((o) => ({
      id: o.user.id,
      name: o.user.name,
      initials: o.user.initials,
      colorToken: o.user.colorToken,
      role: o.role as "PRIMARY" | "SECONDARY",
    })),
    documents: b.documents.map((d) => ({
      kind: d.kind as DocumentKind,
      label: d.label,
      url: d.url,
    })),
    // Voucher and Tasks are hidden for rejected bookings per the spec.
    hasVoucher: isRejected ? false : b.documents.length > 0,
    openTaskCount: isRejected ? 0 : b.tasks.length,
    isComplete: b.isComplete,
    requiresApproval: b.requiresApproval,
    approvalState: b.approvalState as ApprovalState | null,
    isDeleted,
    can: {
      approve: canApprove(actor, b),
      edit: mayMutate,
      delete: mayMutate,
      restore: isDeleted && (actor.role === "ADMIN" || isOwner),
      recordPayment: recordPayment && mayMutate,
      resubmit: isRejected && mayMutate,
    },
  };
}

/* ------------------------------------------------------------------ */
/*  Use cases                                                          */
/* ------------------------------------------------------------------ */

export async function listBookings(q: ListQuery, actor: Actor) {
  const { rows, total } = await findBookings(q);
  return {
    data: rows.map((r) => toDTO(r, actor)),
    page: q.page,
    perPage: q.perPage,
    total,
    totalPages: Math.max(1, Math.ceil(total / q.perPage)),
  };
}

export async function getSummary(q: ListQuery): Promise<SummaryResponse> {
  // The pills sit above the tabs, so they summarise the filtered *workspace*,
  // not the active tab. Tab and pagination are stripped; every other filter
  // still applies. (Flagged as an open question in the README.)
  const where = buildWhere({ ...q, tab: "bookings", approvalState: "all" });
  const { youGive, youGet, net } = await ledgerSummary(where);
  return { youGive, youGet, net, currency: "INR" };
}

async function loadOr404(id: string) {
  const b = await findBookingById(id);
  if (!b) throw new HttpError(404, `Booking "${id}" not found.`);
  return b;
}

export async function softDeleteBooking(id: string, actor: Actor) {
  const b = await loadOr404(id);
  if (b.deletedAt) throw new HttpError(409, "Booking is already deleted.");
  if (!toDTO(b, actor).can.delete)
    throw new HttpError(403, "You can only delete bookings you own.");

  // Settled payments are never removed — the Deleted tab notes that payments
  // linked to a booking can't be deleted, which is why payment status reads
  // Pending there rather than the rows being cascaded away.
  await prisma.booking.update({ where: { id }, data: { deletedAt: new Date() } });
  return toDTO(await loadOr404(id), actor);
}

export async function restoreBooking(id: string, actor: Actor) {
  const b = await loadOr404(id);
  if (!b.deletedAt) throw new HttpError(409, "Booking is not deleted.");
  if (!toDTO(b, actor).can.restore)
    throw new HttpError(403, "You cannot restore this booking.");

  await prisma.booking.update({ where: { id }, data: { deletedAt: null } });
  return toDTO(await loadOr404(id), actor);
}

export async function duplicateBooking(id: string, actor: Actor) {
  const b = await loadOr404(id);
  const newId = `${b.id.split("-")[0]}-${Math.random().toString(36).slice(2, 7).toUpperCase()}`;

  await prisma.booking.create({
    data: {
      id: newId,
      leadPax: b.leadPax,
      bookingDate: new Date(),
      travelDate: b.travelDate,
      service: b.service as ServiceType,
      limitlessName: b.limitlessName,
      limitlessCountry: b.limitlessCountry,
      bookingStatus: "PENDING",
      amount: b.amount,
      currency: b.currency,
      isComplete: false,
      requiresApproval: b.requiresApproval,
      // A duplicate starts a fresh approval cycle rather than inheriting one.
      approvalState: b.requiresApproval ? "PENDING" : null,
      createdById: actor.id,
      owners: {
        create: b.owners.map((o) => ({ userId: o.userId, role: o.role, position: o.position })),
      },
    },
  });

  return toDTO(await loadOr404(newId), actor);
}

export async function actOnApproval(
  id: string,
  action: "approve" | "reject" | "resubmit",
  actor: Actor,
  note?: string
) {
  const b = await loadOr404(id);
  if (!b.requiresApproval)
    throw new HttpError(409, "This booking does not go through approval.");

  if (action === "resubmit") {
    if (b.approvalState !== "REJECTED")
      throw new HttpError(409, "Only rejected bookings can be sent for approval again.");
    if (!toDTO(b, actor).can.resubmit)
      throw new HttpError(403, "You can only resubmit bookings you own.");

    await prisma.$transaction([
      prisma.booking.update({ where: { id }, data: { approvalState: "PENDING" } }),
      prisma.approvalEvent.create({
        data: { bookingId: id, actorId: actor.id, state: "PENDING", note },
      }),
    ]);
    return toDTO(await loadOr404(id), actor);
  }

  if (!canApprove(actor, b))
    throw new HttpError(403, "You do not have approval rights over this booking.");

  const state = action === "approve" ? "APPROVED" : "REJECTED";

  await prisma.$transaction([
    prisma.booking.update({ where: { id }, data: { approvalState: state } }),
    prisma.approvalEvent.create({
      data: { bookingId: id, actorId: actor.id, state, note },
    }),
  ]);

  return toDTO(await loadOr404(id), actor);
}
