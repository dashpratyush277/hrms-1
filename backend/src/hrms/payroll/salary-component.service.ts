import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { AuditService } from '../../security/audit/audit.service';
import { ComponentType, CalculationType, AuditAction } from '@prisma/client';

export interface CreateComponentDto {
  name: string;
  code: string;
  type: ComponentType;
  calculationType?: CalculationType;
  amount?: number;
  percentage?: number;
  percentageOf?: string;
  isTaxable?: boolean;
  isStatutory?: boolean;
  statutoryType?: string;
  prorated?: boolean;
  applicableRules?: any;
  displayOrder?: number;
}

@Injectable()
export class SalaryComponentService {
  constructor(
    private prisma: PrismaService,
    private auditService: AuditService,
  ) {}

  async create(dto: CreateComponentDto, tenantId: string, userId: string) {
    // Check if code already exists
    const existing = await this.prisma.salaryComponent.findFirst({
      where: {
        code: dto.code,
        tenantId,
      },
    });

    if (existing) {
      throw new BadRequestException(`Component with code "${dto.code}" already exists`);
    }

    const component = await this.prisma.salaryComponent.create({
      data: {
        ...dto,
        tenantId,
        calculationType: dto.calculationType || CalculationType.FIXED,
        isTaxable: dto.isTaxable !== false,
        prorated: dto.prorated !== false,
      },
    });

    await this.auditService.log(AuditAction.CREATE, 'SalaryComponent', {
      tenantId,
      userId,
      entityId: component.id,
      newValues: component,
    });

    return component;
  }

  async findAll(tenantId: string, type?: ComponentType) {
    const where: any = { tenantId, isActive: true };
    if (type) where.type = type;

    return this.prisma.salaryComponent.findMany({
      where,
      orderBy: [{ type: 'asc' }, { displayOrder: 'asc' }],
    });
  }

  async findOne(id: string, tenantId: string) {
    const component = await this.prisma.salaryComponent.findFirst({
      where: { id, tenantId },
    });

    if (!component) {
      throw new NotFoundException('Salary component not found');
    }

    return component;
  }

  async update(id: string, dto: Partial<CreateComponentDto>, tenantId: string, userId: string) {
    const existing = await this.findOne(id, tenantId);

    // Check code uniqueness if updating
    if (dto.code && dto.code !== existing.code) {
      const codeExists = await this.prisma.salaryComponent.findFirst({
        where: {
          code: dto.code,
          tenantId,
          id: { not: id },
        },
      });

      if (codeExists) {
        throw new BadRequestException(`Component with code "${dto.code}" already exists`);
      }
    }

    const updated = await this.prisma.salaryComponent.update({
      where: { id },
      data: dto,
    });

    await this.auditService.log(AuditAction.UPDATE, 'SalaryComponent', {
      tenantId,
      userId,
      entityId: id,
      oldValues: existing,
      newValues: updated,
    });

    return updated;
  }

  async delete(id: string, tenantId: string, userId: string) {
    const component = await this.findOne(id, tenantId);

    // Check if component is used in templates
    const templateUsage = await this.prisma.salaryTemplateItem.findFirst({
      where: { componentId: id },
    });

    if (templateUsage) {
      throw new BadRequestException('Cannot delete component that is used in salary templates');
    }

    await this.prisma.salaryComponent.update({
      where: { id },
      data: { isActive: false },
    });

    await this.auditService.log(AuditAction.DELETE, 'SalaryComponent', {
      tenantId,
      userId,
      entityId: id,
      oldValues: component,
    });

    return { message: 'Salary component deleted successfully' };
  }
}

