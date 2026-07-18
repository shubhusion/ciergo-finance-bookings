import { z } from "zod";
import { ALL_SERVICE_IDS, type ServiceType } from "@/lib/types";

/** Comma-separated ids -> string[]. */
const idList = z
  .string()
  .optional()
  .transform((v) => (v ? v.split(",").filter(Boolean) : []));

const isoDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Expected YYYY-MM-DD")
  .optional();

export const listQuerySchema = z
  .object({
    tab: z.enum(["bookings", "approval", "deleted"]).default("bookings"),
    approvalState: z.enum(["all", "PENDING", "APPROVED", "REJECTED"]).default("all"),

    bookingDateFrom: isoDate,
    bookingDateTo: isoDate,
    travelDateFrom: isoDate,
    travelDateTo: isoDate,

    /** Flat owner filter (Advance Search off). */
    owners: idList,
    primaryOwners: idList,
    secondaryOwners: idList,

    bookingType: z.enum(["all", "other", "limitless"]).default("all"),

    /**
     * Absent  -> no service filter (every service).
     * Present but empty -> the user explicitly deselected everything, which
     * must match nothing rather than silently falling back to "all".
     */
    services: z
      .string()
      .optional()
      .transform((v) =>
        v === undefined ? [...ALL_SERVICE_IDS] : v.split(",").filter(Boolean)
      )
      .pipe(z.array(z.enum(ALL_SERVICE_IDS as unknown as [ServiceType, ...ServiceType[]]))),

    /** Matches Booking ID, Lead Pax, or Amount. */
    q: z.string().trim().max(120).optional(),

    includeIncomplete: z
      .enum(["true", "false"])
      .default("false")
      .transform((v) => v === "true"),

    sortBy: z.enum(["leadPax", "travelDate", "amount", "modifiedAt", "deletedAt"]).optional(),
    sortDir: z.enum(["asc", "desc"]).default("desc"),

    page: z.coerce.number().int().min(1).default(1),
    perPage: z.coerce.number().int().refine((n) => [6, 10, 20, 50, 100].includes(n), {
      message: "perPage must be one of 6, 10, 20, 50, 100",
    }).default(10),
  });

export type ListQuery = z.infer<typeof listQuerySchema>;

export const approvalActionSchema = z.object({
  action: z.enum(["approve", "reject", "resubmit"]),
  note: z.string().max(500).optional(),
});

export function parseQuery(url: string) {
  const params = Object.fromEntries(new URL(url).searchParams.entries());
  return listQuerySchema.parse(params);
}
