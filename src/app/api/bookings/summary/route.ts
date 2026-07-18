import { getActor } from "@/server/auth";
import { handleError, json } from "@/server/http";
import { getSummary } from "@/server/services/bookings";
import { parseQuery } from "@/server/validation/bookings";

export const dynamic = "force-dynamic";

/** GET /api/bookings/summary -> the Net / You Give / You Get pills. */
export async function GET(req: Request) {
  try {
    await getActor(req.headers);
    return json(await getSummary(parseQuery(req.url)));
  } catch (err) {
    return handleError(err);
  }
}
