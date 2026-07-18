import { getActor } from "@/server/auth";
import { handleError, json } from "@/server/http";
import { softDeleteBooking } from "@/server/services/bookings";

export const dynamic = "force-dynamic";

/** DELETE /api/bookings/:id -> soft delete, lands in the Deleted tab. */
export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const actor = await getActor(req.headers);
    const { id } = await params;
    return json(await softDeleteBooking(id, actor));
  } catch (err) {
    return handleError(err);
  }
}
