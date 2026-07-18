import { canViewApprovalTab, getActor } from "@/server/auth";
import { handleError, json } from "@/server/http";
import { avatarDataUri } from "@/lib/avatar";

export const dynamic = "force-dynamic";

/** GET /api/session -> who am I, and may I see the approval tab? */
export async function GET(req: Request) {
  try {
    const actor = await getActor(req.headers);
    return json({
      id: actor.id,
      name: actor.name,
      initials: actor.initials,
      jobTitle: actor.jobTitle,
      role: actor.role,
      avatarUrl: avatarDataUri(actor.colorToken),
      canViewApprovalTab: canViewApprovalTab(actor),
    });
  } catch (err) {
    return handleError(err);
  }
}
