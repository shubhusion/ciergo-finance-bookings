import { getActor } from "@/server/auth";
import { handleError, json } from "@/server/http";
import { actOnApproval } from "@/server/services/bookings";
import { approvalActionSchema } from "@/server/validation/bookings";

export const dynamic = "force-dynamic";

/** POST /api/bookings/:id/approval  { action: approve | reject | resubmit } */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const actor = await getActor(req.headers);
    const { id } = await params;
    const { action, note } = approvalActionSchema.parse(await req.json());
    return json(await actOnApproval(id, action, actor, note));
  } catch (err) {
    return handleError(err);
  }
}
