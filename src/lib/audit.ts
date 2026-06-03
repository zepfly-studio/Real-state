import { prisma } from "./prisma";

export async function audit(params: {
  tenantId: string;
  action: string;
  entity: string;
  entityId?: string;
  performedById?: string;
  meta?: Record<string, unknown>;
}) {
  try {
    await prisma.auditLog.create({
      data: {
        tenantId: params.tenantId,
        action: params.action,
        entity: params.entity,
        entityId: params.entityId,
        performedById: params.performedById,
        meta: (params.meta ?? {}) as any,
      },
    });
  } catch {
    // auditing must never break the request
  }
}
