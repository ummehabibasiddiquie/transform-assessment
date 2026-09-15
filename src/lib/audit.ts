import { prisma } from "@/lib/db";

export async function audit(input: {
  actorId?: string | null;
  action: string;
  entity: string;
  entityId: string;
  metadata?: Record<string, unknown>;
}) {
  await prisma.auditEvent.create({
    data: {
      actorId: input.actorId ?? null,
      action: input.action,
      entity: input.entity,
      entityId: input.entityId,
      metadata: JSON.stringify(input.metadata ?? {}),
    },
  });
}
