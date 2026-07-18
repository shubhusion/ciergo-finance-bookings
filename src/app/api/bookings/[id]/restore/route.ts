import { getActor } from "@/server/auth";
import { handleError, json } from "@/server/http";
import { restoreBooking } from "@/server/services/bookings";

export const dynamic = "force-dynamic";

/** POST /api/bookings/:id/restore */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const actor = await getActor(req.headers);
    const { id } = await params;
    return json(await restoreBooking(id, actor));
  } catch (err) {
    return handleError(err);
  }
}
