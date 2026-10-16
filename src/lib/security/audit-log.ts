import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";

export type AuditOutcome = "SUCCESS" | "FAILURE" | "DENIED";

export type WriteAuditLogInput = {
  organizationId?: string | null;
  schoolId?: string | null;
  districtId?: string | null;
  actorUserId?: string | null;
  actorRole?: string | null;
  action: string;
  targetType?: string | null;
  targetId?: string | null;
  outcome?: AuditOutcome;
  correlationId?: string | null;
  ipHint?: string | null;
  metadata?: Record<string, unknown> | null;
};

/** Append-only security audit record. Never store passwords, tokens, or full student payloads. */
export async function writeAuditLog(input: WriteAuditLogInput): Promise<void> {
  try {
    await prisma.securityAuditLog.create({
      data: {
        organizationId: input.organizationId ?? undefined,
        schoolId: input.schoolId ?? undefined,
        districtId: input.districtId ?? undefined,
        actorUserId: input.actorUserId ?? undefined,
        actorRole: input.actorRole ?? undefined,
        action: input.action,
        targetType: input.targetType ?? undefined,
        targetId: input.targetId ?? undefined,
        outcome: input.outcome ?? "SUCCESS",
        correlationId: input.correlationId ?? undefined,
        ipHint: input.ipHint ?? undefined,
        metadata: (input.metadata ?? undefined) as Prisma.InputJsonValue | undefined,
      },
    });
  } catch (err) {
    console.error("[audit] write failed:", err instanceof Error ? err.message : err);
  }
}

export function clientIpHint(request: Request): string | undefined {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]?.trim().slice(0, 64);
  return request.headers.get("x-real-ip")?.slice(0, 64) ?? undefined;
}
