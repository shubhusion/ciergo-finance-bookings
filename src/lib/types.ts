export type Tab = "bookings" | "approval" | "deleted";

export type ServiceType =
  | "FLIGHT"
  | "ACCOMMODATION"
  | "TRANSPORT_LAND"
  | "TRANSPORT_AIR"
  | "TICKET_ATTRACTION"
  | "ACTIVITY"
  | "VISA"
  | "TRAVEL_INSURANCE"
  | "OTHERS"
  | "LIMITLESS";

export type BookingStatus = "CONFIRMED" | "PENDING" | "CANCELLED";
export type PaymentStatus = "PAID" | "PARTIALLY_PAID" | "PENDING";
export type ApprovalState = "PENDING" | "APPROVED" | "REJECTED";
export type DocumentKind =
  | "BOOKING_VOUCHER"
  | "CUSTOMER_INVOICE"
  | "VENDOR_VOUCHER"
  | "VENDOR_INVOICE";

export interface OwnerDTO {
  id: string;
  name: string;
  initials: string;
  colorToken: string;
  role: "PRIMARY" | "SECONDARY";
}

export interface BookingDTO {
  id: string;
  leadPax: string;
  bookingDate: string;
  travelDate: string;
  service: ServiceType;
  limitlessName: string | null;
  limitlessCountry: string | null;
  bookingStatus: BookingStatus;
  /** Derived from settled/unsettled customer + vendor payments. */
  paymentStatus: PaymentStatus;
  amount: number;
  currency: string;
  pendingCustomer: number;
  pendingVendor: number;
  owners: OwnerDTO[];
  documents: { kind: DocumentKind; label: string; url: string }[];
  hasVoucher: boolean;
  openTaskCount: number;
  isComplete: boolean;
  requiresApproval: boolean;
  approvalState: ApprovalState | null;
  isDeleted: boolean;
  /** Resolved server-side against the caller — the UI never decides this. */
  can: {
    approve: boolean;
    edit: boolean;
    delete: boolean;
    restore: boolean;
    recordPayment: boolean;
    resubmit: boolean;
  };
}

export interface BookingListResponse {
  data: BookingDTO[];
  page: number;
  perPage: number;
  total: number;
  totalPages: number;
}

export interface SummaryResponse {
  /** Pending to vendors + pending refunds to customers. */
  youGive: number;
  /** Pending from customers + pending refunds from vendors. */
  youGet: number;
  /** youGet - youGive. Positive renders green, negative red. */
  net: number;
  currency: string;
}

export interface SessionResponse {
  id: string;
  name: string;
  initials: string;
  /** Display title shown in the topbar — distinct from `role` (permissions). */
  jobTitle: string | null;
  role: "ADMIN" | "MANAGER" | "MEMBER";
  /** Generated per-user avatar image (data URI) — no real photo library exists. */
  avatarUrl: string;
  /** Gates the whole Waiting for Approval tab. */
  canViewApprovalTab: boolean;
}

export const SERVICE_CATALOGUE: {
  id: ServiceType;
  label: string;
  group: "other" | "limitless";
}[] = [
  { id: "FLIGHT", label: "Flight", group: "other" },
  { id: "ACCOMMODATION", label: "Accommodation", group: "other" },
  { id: "TRANSPORT_LAND", label: "Transportation (Land)", group: "other" },
  { id: "TRANSPORT_AIR", label: "Transportation (Air)", group: "other" },
  { id: "TICKET_ATTRACTION", label: "Ticket (Attraction)", group: "other" },
  { id: "ACTIVITY", label: "Activity", group: "other" },
  { id: "VISA", label: "Visa", group: "other" },
  { id: "TRAVEL_INSURANCE", label: "Travel Insurance", group: "other" },
  { id: "OTHERS", label: "Others", group: "other" },
  { id: "LIMITLESS", label: "Limitless", group: "limitless" },
];

export const ALL_SERVICE_IDS = SERVICE_CATALOGUE.map((s) => s.id);

export const VOUCHER_DOCS: { kind: DocumentKind; label: string }[] = [
  { kind: "BOOKING_VOUCHER", label: "Booking Voucher(s)" },
  { kind: "CUSTOMER_INVOICE", label: "Customer Invoice(s)" },
  { kind: "VENDOR_VOUCHER", label: "Vendor Voucher(s)" },
  { kind: "VENDOR_INVOICE", label: "Vendor Invoice(s)" },
];
