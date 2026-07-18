import { getActor } from "@/server/auth";
import { handleError, json } from "@/server/http";
import { listBookings } from "@/server/services/bookings";
import { parseQuery } from "@/server/validation/bookings";

export const dynamic = "force-dynamic";

/**
 * GET /api/bookings
 *
 * Filtering, sorting and pagination all happen in SQL — the client never
 * receives rows it isn't showing. See src/server/validation/bookings.ts for the
 * full query contract.
 */
export async function GET(req: Request) {
  try {
    const actor = await getActor(req.headers);
    const query = parseQuery(req.url);
    return json(await listBookings(query, actor));
  } catch (err) {
    return handleError(err);
  }
}
