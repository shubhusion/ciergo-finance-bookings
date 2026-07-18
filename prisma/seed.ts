import { PrismaClient } from "@prisma/client";
import type { ServiceType } from "../src/lib/types";

const prisma = new PrismaClient();

/* Deterministic PRNG so the dataset is identical on every reseed. */
let s = 42;
const rand = () => {
  s |= 0;
  s = (s + 0x6d2b79f5) | 0;
  let t = Math.imul(s ^ (s >>> 15), 1 | s);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};
const pick = <T>(arr: readonly T[]): T => arr[Math.floor(rand() * arr.length)];

const USERS = [
  { id: "u-yash", name: "Yash Manocha", initials: "YM", colorToken: "violet", jobTitle: "Sales Lead", role: "ADMIN" as const, canViewAllApprovals: true },
  { id: "u-ajay", name: "Ajay Thakur", initials: "AS", colorToken: "rose", jobTitle: "Operations Manager", role: "MANAGER" as const, canViewAllApprovals: false },
  { id: "u-harshit", name: "Harshit Roy", initials: "AK", colorToken: "violet", jobTitle: "Sales Executive", role: "MEMBER" as const, canViewAllApprovals: false },
  { id: "u-anjali", name: "Anjali Mehta", initials: "SR", colorToken: "purple", jobTitle: "Sales Executive", role: "MEMBER" as const, canViewAllApprovals: false },
  { id: "u-rohan", name: "Rohan Singh", initials: "VG", colorToken: "sky", jobTitle: "Sales Executive", role: "MEMBER" as const, canViewAllApprovals: false },
  { id: "u-sofia", name: "Sofia Patel", initials: "SP", colorToken: "amber", jobTitle: "Sales Executive", role: "MEMBER" as const, canViewAllApprovals: false },
  { id: "u-arun", name: "Arun Patel", initials: "AP", colorToken: "teal", jobTitle: "Sales Executive", role: "MEMBER" as const, canViewAllApprovals: false },
  { id: "u-vikram", name: "Vikram Choudhury", initials: "VC", colorToken: "indigo", jobTitle: "Sales Executive", role: "MEMBER" as const, canViewAllApprovals: false },
  { id: "u-samantha", name: "Samantha Lee", initials: "SL", colorToken: "pink", jobTitle: "Sales Executive", role: "MEMBER" as const, canViewAllApprovals: false },
  { id: "u-james", name: "James Patel", initials: "JP", colorToken: "emerald", jobTitle: "Sales Executive", role: "MEMBER" as const, canViewAllApprovals: false },
  { id: "u-elena", name: "Elena Gonzalez", initials: "EG", colorToken: "orange", jobTitle: "Sales Executive", role: "MEMBER" as const, canViewAllApprovals: false },
  { id: "u-isabelle", name: "Isabelle Rodriguez", initials: "IR", colorToken: "cyan", jobTitle: "Sales Executive", role: "MEMBER" as const, canViewAllApprovals: false },
];

/** The four avatars in the Figma row, in order. */
const ROW_OWNERS = ["u-ajay", "u-harshit", "u-anjali", "u-rohan"];

const PAX = [
  "Anand Mishra", "Sumit Jha", "Zaheer", "Gaurav Kapoor", "Shirish Pandey",
  "Ravi Sharma", "Arjun Verma", "Karan Singh", "Irfan Khan", "Vikram Mehta",
  "Neha Gupta", "Priya Nair", "Rahul Bose", "Sneha Iyer", "Aman Sethi",
];

const SERVICES: ServiceType[] = [
  "FLIGHT", "ACCOMMODATION", "TRANSPORT_LAND", "TICKET_ATTRACTION",
  "ACTIVITY", "VISA", "TRAVEL_INSURANCE", "OTHERS", "LIMITLESS",
];

const rupees = (major: number) => Math.round(major * 100);

type Spec = {
  id: string;
  leadPax?: string;
  service?: ServiceType;
  /** paid | partial | pending — shapes the payment rows. */
  payment?: "paid" | "partial" | "pending";
  requiresApproval?: boolean;
  approvalState?: "PENDING" | "APPROVED" | "REJECTED" | null;
  deleted?: boolean;
  isComplete?: boolean;
  withDocs?: boolean;
  withTask?: boolean;
};

async function createBooking(spec: Spec, i: number) {
  const service = spec.service ?? pick(SERVICES);
  const payment = spec.payment ?? pick(["paid", "partial", "pending"] as const);
  const amount = rupees(24580);
  const travelDate = new Date(Date.UTC(2026, 2, 5 + Math.floor(rand() * 20)));
  const bookingDate = new Date(Date.UTC(2025, 10, 1 + Math.floor(rand() * 60)));
  const isRejected = spec.approvalState === "REJECTED";
  const withDocs = spec.withDocs ?? !isRejected;
  const withTask = spec.withTask ?? !isRejected;

  await prisma.booking.create({
    data: {
      id: spec.id,
      leadPax: spec.leadPax ?? pick(PAX),
      bookingDate,
      travelDate,
      service,
      limitlessName: service === "LIMITLESS" ? "Explore UAE" : null,
      limitlessCountry: service === "LIMITLESS" ? "UAE" : null,
      bookingStatus: isRejected ? "CANCELLED" : "CONFIRMED",
      amount,
      currency: "INR",
      isComplete: spec.isComplete ?? rand() > 0.2,
      requiresApproval: spec.requiresApproval ?? false,
      approvalState: spec.approvalState ?? null,
      createdById: "u-yash",
      deletedAt: spec.deleted ? new Date(Date.now() - i * 60_000) : null,
      modifiedAt: new Date(Date.now() - i * 60_000),
      owners: {
        create: ROW_OWNERS.map((userId, position) => ({
          userId,
          position,
          role: position === 0 ? ("PRIMARY" as const) : ("SECONDARY" as const),
        })),
      },
      documents: withDocs
        ? {
            create: [
              { kind: "BOOKING_VOUCHER" as const, label: "Booking Voucher", url: `/docs/${spec.id}/voucher.pdf` },
              { kind: "CUSTOMER_INVOICE" as const, label: "Customer Invoice", url: `/docs/${spec.id}/customer-invoice.pdf` },
              { kind: "VENDOR_VOUCHER" as const, label: "Vendor Voucher", url: `/docs/${spec.id}/vendor-voucher.pdf` },
              { kind: "VENDOR_INVOICE" as const, label: "Vendor Invoice", url: `/docs/${spec.id}/vendor-invoice.pdf` },
            ],
          }
        : undefined,
      tasks: withTask
        ? { create: [{ title: "Collect passport copy", done: false }] }
        : undefined,
    },
  });

  // Payment rows. Unsettled + approved rows are what the pills sum.
  //   INBOUND  from customer = we get paid
  //   OUTBOUND to vendor     = we pay out
  const customerSettled = payment === "paid";
  const vendorSettled = payment === "paid" || payment === "partial";

  await prisma.payment.createMany({
    data: [
      {
        bookingId: spec.id,
        party: "CUSTOMER",
        direction: "INBOUND",
        amount: rupees(4580),
        settled: customerSettled,
        settledAt: customerSettled ? new Date() : null,
        isApproved: true,
      },
      {
        bookingId: spec.id,
        party: "VENDOR",
        direction: "OUTBOUND",
        amount: rupees(4580),
        settled: vendorSettled,
        settledAt: vendorSettled ? new Date() : null,
        isApproved: true,
      },
    ],
  });
}

async function main() {
  console.log("Resetting…");
  await prisma.approvalEvent.deleteMany();
  await prisma.bookingLink.deleteMany();
  await prisma.task.deleteMany();
  await prisma.bookingDocument.deleteMany();
  await prisma.payment.deleteMany();
  await prisma.bookingOwner.deleteMany();
  await prisma.booking.deleteMany();
  await prisma.approvalRight.deleteMany();
  await prisma.user.deleteMany();

  await prisma.user.createMany({ data: USERS });

  // Ajay can approve bookings owned by Harshit and Anjali — this is what makes
  // the approval tick/cross appear or disappear per row.
  await prisma.approvalRight.createMany({
    data: [
      { approverId: "u-ajay", subjectId: "u-harshit" },
      { approverId: "u-ajay", subjectId: "u-anjali" },
    ],
  });

  // --- Bookings tab: the six Figma rows, then filler up to 78.
  const figma: Spec[] = [
    { id: "OS-ABC12", leadPax: "Anand Mishra", service: "FLIGHT", payment: "paid" },
    { id: "OS-ABC13", leadPax: "Sumit Jha", service: "ACCOMMODATION", payment: "partial" },
    { id: "LI-ABC12", leadPax: "Anand Mishra", service: "LIMITLESS", payment: "pending" },
    { id: "OS-ABC14", leadPax: "Zaheer", service: "TRANSPORT_LAND", payment: "pending" },
    { id: "OS-ABC15", leadPax: "Gaurav Kapoor", service: "FLIGHT", payment: "paid", withTask: false },
    { id: "OS-ABC16", leadPax: "Shirish Pandey", service: "FLIGHT", payment: "pending" },
  ];
  for (const [i, spec] of figma.entries()) {
    await createBooking({ ...spec, isComplete: true }, i);
  }
  for (let i = 6; i < 78; i++) {
    await createBooking({ id: `OS-B${String(1000 + i)}` }, i);
  }

  // --- Waiting for Approval tab.
  const approvals: Spec[] = [
    { id: "AP-ABC12", leadPax: "Anand Mishra", service: "FLIGHT", payment: "paid", approvalState: "APPROVED" },
    { id: "AP-ABC13", leadPax: "Sumit Jha", service: "ACCOMMODATION", payment: "partial", approvalState: "APPROVED" },
    { id: "AP-ABC14", leadPax: "Anand Mishra", service: "LIMITLESS", payment: "pending", approvalState: "PENDING" },
    { id: "AP-ABC15", leadPax: "Zaheer", service: "TRANSPORT_LAND", payment: "paid", approvalState: "APPROVED" },
    { id: "AP-ABC16", leadPax: "Gaurav Kapoor", service: "FLIGHT", payment: "pending", approvalState: "REJECTED" },
    { id: "AP-ABC17", leadPax: "Shirish Pandey", service: "FLIGHT", payment: "pending", approvalState: "PENDING" },
  ];
  for (const [i, spec] of approvals.entries()) {
    await createBooking({ ...spec, requiresApproval: true, isComplete: true }, i);
  }

  // --- Deleted tab.
  const deleted: Spec[] = [
    { id: "OS-ABC22", leadPax: "Ravi Sharma", service: "FLIGHT", payment: "paid" },
    { id: "OS-ABC23", leadPax: "Arjun Verma", service: "ACCOMMODATION", payment: "partial" },
    { id: "LI-ABC32", leadPax: "Karan Singh", service: "LIMITLESS", payment: "pending" },
    { id: "OS-ABC34", leadPax: "Irfan Khan", service: "FLIGHT", payment: "pending" },
    { id: "OS-ABC45", leadPax: "Vikram Mehta", service: "FLIGHT", payment: "paid" },
  ];
  for (const [i, spec] of deleted.entries()) {
    await createBooking({ ...spec, deleted: true, isComplete: true }, i);
  }

  const total = await prisma.booking.count();
  console.log(`Seeded ${USERS.length} users and ${total} bookings.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
