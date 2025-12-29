import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { AuditAction } from '@prisma/client';

@Injectable()
export class AuditService {
  constructor(private prisma: PrismaService) {}

  async log(
    action: AuditAction,
    entityType: string,
    options: {
      tenantId?: string;
      userId?: string;
      employeeId?: string;
      entityId?: string;
      oldValues?: any;
      newValues?: any;
      ipAddress?: string;
      userAgent?: string;
      metadata?: any;
    },
  ) {
    try {
      await this.prisma.auditLog.create({
        data: {
          action,
          entityType,
          tenantId: options.tenantId,
          userId: options.userId,
          employeeId: options.employeeId,
          entityId: options.entityId,
          oldValues: options.oldValues ? JSON.parse(JSON.stringify(options.oldValues)) : null,
          newValues: options.newValues ? JSON.parse(JSON.stringify(options.newValues)) : null,
          ipAddress: options.ipAddress,
          userAgent: options.userAgent,
          metadata: options.metadata ? JSON.parse(JSON.stringify(options.metadata)) : null,
        },
      });
    } catch (error) {
      // Don't fail the main operation if audit logging fails
      console.error('Audit log error:', error);
    }
  }
}

