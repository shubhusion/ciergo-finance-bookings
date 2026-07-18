import { Prisma } from "@prisma/client";
import { prisma } from "../db";
import type { ListQuery } from "../validation/bookings";

/**
 * The three tabs are queries over one table, not a stored column — an approved
 * booking appears in *both* Bookings and Waiting for Approval, which is exactly
 * what the spec describes.
 */
function tabWhere(q: ListQuery): Prisma.BookingWhereInput {
  switch (q.tab) {
    case "deleted":
      return { deletedAt: { not: null } };

    case "approval":
      return {
        deletedAt: null,
        requiresApproval: true,
        approvalState:
          q.approvalState === "all"
            ? { in: ["PENDING", "APPROVED", "REJECTED"] }
            : q.approvalState,
      };

    case "bookings":
    default:
      // "all the Approved Bookings (if approval required) and no approval
      //  required bookings as well"
      return {
        deletedAt: null,
        OR: [{ requiresApproval: false }, { approvalState: "APPROVED" }],
      };
  }
}

export function buildWhere(q: ListQuery): Prisma.BookingWhereInput {
  const and: Prisma.BookingWhereInput[] = [tabWhere(q)];

  if (!q.includeIncomplete) and.push({ isComplete: true });

  if (q.bookingDateFrom) and.push({ bookingDate: { gte: new Date(q.bookingDateFrom) } });
  if (q.bookingDateTo) and.push({ bookingDate: { lte: endOfDay(q.bookingDateTo) } });
  if (q.travelDateFrom) and.push({ travelDate: { gte: new Date(q.travelDateFrom) } });
  if (q.travelDateTo) and.push({ travelDate: { lte: endOfDay(q.travelDateTo) } });

  // Flat owner filter.
  if (q.owners.length) {
    and.push({ owners: { some: { userId: { in: q.owners } } } });
  }

  // Advance Search: primary and secondary are independent constraints, so a
  // booking must satisfy both when both are supplied.
  if (q.primaryOwners.length) {
    and.push({ owners: { some: { role: "PRIMARY", userId: { in: q.primaryOwners } } } });
  }
  if (q.secondaryOwners.length) {
    and.push({ owners: { some: { role: "SECONDARY", userId: { in: q.secondaryOwners } } } });
  }

  if (q.bookingType === "limitless") and.push({ service: "LIMITLESS" });
  if (q.bookingType === "other") and.push({ service: { not: "LIMITLESS" } });

  // Always applied: an empty list is a real constraint (match nothing), and a
  // full list is equivalent to no filter anyway.
  and.push({ service: { in: q.services } });

  if (q.q) {
    const term = q.q;
    const asAmount = Number(term.replace(/[^\d.]/g, ""));
    const or: Prisma.BookingWhereInput[] = [
      { id: { contains: term } },
      { leadPax: { contains: term } },
    ];
    // Search box covers Amount too. Stored in minor units, typed in major.
    if (!Number.isNaN(asAmount) && term.replace(/[^\d.]/g, "") !== "") {
      or.push({ amount: Math.round(asAmount * 100) });
    }
    and.push({ OR: or });
  }

  return { AND: and };
}

function buildOrderBy(q: ListQuery): Prisma.BookingOrderByWithRelationInput[] {
  if (q.sortBy) return [{ [q.sortBy]: q.sortDir } as Prisma.BookingOrderByWithRelationInput];
  // Defaults straight from the spec: Deleted sorts by latest deleted,
  // everything else by latest modified/created.
  return q.tab === "deleted" ? [{ deletedAt: "desc" }] : [{ modifiedAt: "desc" }];
}

const bookingInclude = {
  owners: { include: { user: true }, orderBy: { position: "asc" } },
  payments: true,
  documents: true,
  tasks: { where: { done: false } },
} satisfies Prisma.BookingInclude;

export type BookingRecord = Prisma.BookingGetPayload<{ include: typeof bookingInclude }>;

export async function findBookings(q: ListQuery) {
  const where = buildWhere(q);

  const [total, rows] = await prisma.$transaction([
    prisma.booking.count({ where }),
    prisma.booking.findMany({
      where,
      include: bookingInclude,
      orderBy: buildOrderBy(q),
      skip: (q.page - 1) * q.perPage,
      take: q.perPage,
    }),
  ]);

  return { rows, total };
}

export function findBookingById(id: string) {
  return prisma.booking.findUnique({ where: { id }, include: bookingInclude });
}

/**
 * You Give / You Get.
 *
 * Spec: "The bookings and payments not yet approved will not be considered
 * here" — so both the booking and the payment must be approved, and the payment
 * must still be unsettled to count as pending.
 *
 *   You Give = OUTBOUND pending  (vendor payments + customer refunds)
 *   You Get  = INBOUND  pending  (customer payments + vendor refunds)
 */
export async function ledgerSummary(where: Prisma.BookingWhereInput) {
  const paymentWhere: Prisma.PaymentWhereInput = {
    settled: false,
    isApproved: true,
    booking: {
      deletedAt: null,
      OR: [{ requiresApproval: false }, { approvalState: "APPROVED" }],
      ...where,
    },
  };

  const [give, get] = await Promise.all([
    prisma.payment.aggregate({
      _sum: { amount: true },
      where: { ...paymentWhere, direction: "OUTBOUND" },
    }),
    prisma.payment.aggregate({
      _sum: { amount: true },
      where: { ...paymentWhere, direction: "INBOUND" },
    }),
  ]);

  const youGive = give._sum.amount ?? 0;
  const youGet = get._sum.amount ?? 0;
  return { youGive, youGet, net: youGet - youGive };
}

function endOfDay(iso: string) {
  const d = new Date(iso);
  d.setUTCHours(23, 59, 59, 999);
  return d;
}
