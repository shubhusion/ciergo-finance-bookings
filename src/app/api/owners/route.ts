import { prisma } from "@/server/db";
import { getActor } from "@/server/auth";
import { handleError, json } from "@/server/http";

export const dynamic = "force-dynamic";

/** GET /api/owners?q= -> feeds the Booking Owner multi-select. */
export async function GET(req: Request) {
  try {
    await getActor(req.headers);
    const q = new URL(req.url).searchParams.get("q")?.trim() ?? "";

    const users = await prisma.user.findMany({
      where: q ? { name: { contains: q } } : undefined,
      orderBy: { name: "asc" },
      select: { id: true, name: true, initials: true, colorToken: true },
      take: 50,
    });
    return json(users);
  } catch (err) {
    return handleError(err);
  }
}
