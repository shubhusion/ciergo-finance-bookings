import { getActor } from "@/server/auth";
import { handleError, json } from "@/server/http";
import { duplicateBooking } from "@/server/services/bookings";

export const dynamic = "force-dynamic";

/** POST /api/bookings/:id/duplicate */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const actor = await getActor(req.headers);
    const { id } = await params;
    return json(await duplicateBooking(id, actor), 201);
  } catch (err) {
    return handleError(err);
  }
}
