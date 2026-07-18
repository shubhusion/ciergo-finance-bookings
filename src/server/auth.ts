import { prisma } from "./db";

export class HttpError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = "HttpError";
  }
}

/**
 * Stubbed session.
 *
 * Round 1 has no auth requirement and no auth spec, so rather than invent one
 * this resolves the caller from CURRENT_USER_ID (or an x-user-id header, which
 * makes the permission model easy to exercise with curl). Everything downstream
 * takes an `actor` argument, so swapping this for a real session — NextAuth, a
 * JWT, whatever Ciergo already uses — touches this file only.
 */
export type Actor = {
  id: string;
  name: string;
  initials: string;
  colorToken: string;
  /** Display title shown in the topbar — distinct from `role` (permissions). */
  jobTitle: string | null;
  role: "ADMIN" | "MANAGER" | "MEMBER";
  canViewAllApprovals: boolean;
  /** Ids of users whose bookings this actor may approve. */
  approvesForUserIds: string[];
};

export async function getActor(headers?: Headers): Promise<Actor> {
  const id = headers?.get("x-user-id") ?? process.env.CURRENT_USER_ID ?? "u-yash";

  const user = await prisma.user.findUnique({
    where: { id },
    include: { approvesFor: { select: { subjectId: true } } },
  });

  if (!user) throw new HttpError(401, `Unknown user "${id}".`);

  return {
    id: user.id,
    name: user.name,
    initials: user.initials,
    colorToken: user.colorToken,
    jobTitle: user.jobTitle,
    role: user.role as Actor["role"],
    canViewAllApprovals: user.canViewAllApprovals,
    approvesForUserIds: user.approvesFor.map((a: { subjectId: string }) => a.subjectId),
  };
}

/** The Waiting for Approval tab is visible to admins, users who can see all
 *  approvals, and anyone who is an approver for at least one other user. */
export function canViewApprovalTab(actor: Actor): boolean {
  return (
    actor.role === "ADMIN" ||
    actor.canViewAllApprovals ||
    actor.approvesForUserIds.length > 0
  );
}
