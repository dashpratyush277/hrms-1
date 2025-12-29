import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { AuditService } from '../../security/audit/audit.service';
import { AuditAction } from '@prisma/client';

export interface CreateCampaignDto {
  name: string;
  description?: string;
  startDate: string;
  endDate: string;
}

@Injectable()
export class CampaignService {
  constructor(
    private prisma: PrismaService,
    private auditService: AuditService,
  ) {}

  async create(dto: CreateCampaignDto, tenantId: string, userId: string) {
    const campaign = await this.prisma.campaign.create({
      data: {
        ...dto,
        tenantId,
        startDate: new Date(dto.startDate),
        endDate: new Date(dto.endDate),
      },
    });

    await this.auditService.log(AuditAction.CREATE, 'Campaign', {
      tenantId,
      userId,
      entityId: campaign.id,
      newValues: campaign,
    });

    return campaign;
  }

  async findAll(tenantId: string, isActive?: boolean) {
    const where: any = { tenantId };
    if (isActive !== undefined) where.isActive = isActive;

    return this.prisma.campaign.findMany({
      where,
      orderBy: { startDate: 'desc' },
    });
  }

  async findOne(id: string, tenantId: string) {
    const campaign = await this.prisma.campaign.findFirst({
      where: { id, tenantId },
    });

    if (!campaign) {
      throw new NotFoundException('Campaign not found');
    }

    return campaign;
  }
}

