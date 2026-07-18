import { canViewApprovalTab, getActor } from "@/server/auth";
import BookingsClient from "@/components/bookings-client";
import { avatarDataUri } from "@/lib/avatar";

export const dynamic = "force-dynamic";

/**
 * Server component: resolves the session once so the client never renders a tab
 * the caller isn't allowed to open.
 */
export default async function BookingsPage() {
  const actor = await getActor();

  return (
    <BookingsClient
      session={{
        id: actor.id,
        name: actor.name,
        initials: actor.initials,
        jobTitle: actor.jobTitle,
        role: actor.role,
        avatarUrl: avatarDataUri(actor.colorToken),
        canViewApprovalTab: canViewApprovalTab(actor),
      }}
    />
  );
}
