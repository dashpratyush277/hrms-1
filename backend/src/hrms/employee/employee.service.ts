import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { EncryptionService } from '../../security/encryption/encryption.service';
import { AuditService } from '../../security/audit/audit.service';
import { CreateEmployeeDto, UpdateEmployeeDto } from './dto';
import { AuditAction, Role } from '@prisma/client';
import * as bcrypt from 'bcrypt';

@Injectable()
export class EmployeeService {
  constructor(
    private prisma: PrismaService,
    private encryptionService: EncryptionService,
    private auditService: AuditService,
  ) {}

  async create(createEmployeeDto: CreateEmployeeDto, tenantId: string, userId: string) {
    // Encrypt PII fields
    const encryptedData: any = { ...createEmployeeDto };
    if (encryptedData.pan) {
      encryptedData.pan = this.encryptionService.encrypt(encryptedData.pan);
    }
    if (encryptedData.aadhaar) {
      encryptedData.aadhaar = this.encryptionService.encrypt(encryptedData.aadhaar);
    }
    if (encryptedData.pfNumber) {
      encryptedData.pfNumber = this.encryptionService.encrypt(encryptedData.pfNumber);
    }
    if (encryptedData.esiNumber) {
      encryptedData.esiNumber = this.encryptionService.encrypt(encryptedData.esiNumber);
    }
    if (encryptedData.uan) {
      encryptedData.uan = this.encryptionService.encrypt(encryptedData.uan);
    }
    if (encryptedData.bankAccountNumber) {
      encryptedData.bankAccountNumber = this.encryptionService.encrypt(encryptedData.bankAccountNumber);
    }

    // Handle designation: if designation string is provided, find or create it
    let designationId = encryptedData.designationId;
    if (encryptedData.designation && !designationId) {
      const designationName = encryptedData.designation.trim();
      let designation = await this.prisma.designation.findFirst({
        where: {
          name: {
            equals: designationName,
            mode: 'insensitive',
          },
        },
      });

      if (!designation) {
        // Create new designation if it doesn't exist
        designation = await this.prisma.designation.create({
          data: {
            name: designationName,
            level: 1,
          },
        });
      }
      designationId = designation.id;
    }

    // Remove designation string from data, use designationId instead
    delete encryptedData.designation;

    // Check if user with this email already exists
    const existingUser = await this.prisma.user.findFirst({
      where: {
        email: createEmployeeDto.email,
        tenantId: tenantId || null,
      },
    });

    if (existingUser) {
      throw new BadRequestException(`User with email ${createEmployeeDto.email} already exists`);
    }

    // Create user account
    const password = createEmployeeDto.password || 'Welcome@123'; // Default password
    const hashedPassword = await bcrypt.hash(password, 10);
    const userRole = (createEmployeeDto.userRole as Role) || Role.EMPLOYEE;

    const userAccount = await this.prisma.user.create({
      data: {
        email: createEmployeeDto.email,
        passwordHash: hashedPassword,
        role: userRole,
        tenantId,
        isActive: createEmployeeDto.isActive !== false,
      },
    });

    // Remove password and userRole from encryptedData before creating employee
    delete encryptedData.password;
    delete encryptedData.userRole;

    const employee = await this.prisma.employee.create({
      data: {
        ...encryptedData,
        designationId,
        tenantId,
        userId: userAccount.id, // Link user to employee
        dateOfBirth: encryptedData.dateOfBirth ? new Date(encryptedData.dateOfBirth) : null,
        dateOfJoining: new Date(encryptedData.dateOfJoining),
      },
      include: {
        department: true,
        designation: true,
        reportingManager: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            employeeId: true,
          },
        },
        user: {
          select: {
            id: true,
            email: true,
            role: true,
            isActive: true,
          },
        },
      },
    });

    await this.auditService.log(AuditAction.CREATE, 'Employee', {
      tenantId,
      userId,
      entityId: employee.id,
      newValues: this.maskPII(employee),
    });

    await this.auditService.log(AuditAction.CREATE, 'User', {
      tenantId,
      userId,
      entityId: userAccount.id,
      newValues: { email: userAccount.email, role: userAccount.role },
    });

    return this.maskPII(employee);
  }

  async findAll(tenantId: string, page: number = 1, limit: number = 10, search?: string) {
    const skip = (page - 1) * limit;
    const where: any = { tenantId };

    if (search) {
      where.OR = [
        { firstName: { contains: search, mode: 'insensitive' } },
        { lastName: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { employeeId: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [employees, total] = await Promise.all([
      this.prisma.employee.findMany({
        where,
        skip,
        take: limit,
        include: {
          department: true,
          designation: true,
          reportingManager: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              employeeId: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.employee.count({ where }),
    ]);

    return {
      data: employees.map(emp => this.maskPII(emp)),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findOne(id: string, tenantId: string) {
    const employee = await this.prisma.employee.findFirst({
      where: { id, tenantId },
      include: {
        department: true,
        designation: true,
        reportingManager: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            employeeId: true,
          },
        },
        directReports: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            employeeId: true,
          },
        },
      },
    });

    if (!employee) {
      throw new NotFoundException('Employee not found');
    }

    return this.maskPII(employee);
  }

  async update(id: string, updateEmployeeDto: UpdateEmployeeDto, tenantId: string, userId: string) {
    const existing = await this.prisma.employee.findFirst({
      where: { id, tenantId },
    });

    if (!existing) {
      throw new NotFoundException('Employee not found');
    }

    const updateData: any = { ...updateEmployeeDto };
    
    // Encrypt PII if being updated
    if (updateData.pan) {
      updateData.pan = this.encryptionService.encrypt(updateData.pan);
    }
    if (updateData.aadhaar) {
      updateData.aadhaar = this.encryptionService.encrypt(updateData.aadhaar);
    }
    if (updateData.pfNumber) {
      updateData.pfNumber = this.encryptionService.encrypt(updateData.pfNumber);
    }
    if (updateData.esiNumber) {
      updateData.esiNumber = this.encryptionService.encrypt(updateData.esiNumber);
    }
    if (updateData.uan) {
      updateData.uan = this.encryptionService.encrypt(updateData.uan);
    }
    if (updateData.bankAccountNumber) {
      updateData.bankAccountNumber = this.encryptionService.encrypt(updateData.bankAccountNumber);
    }

    if (updateData.dateOfBirth) {
      updateData.dateOfBirth = new Date(updateData.dateOfBirth);
    }
    if (updateData.dateOfJoining) {
      updateData.dateOfJoining = new Date(updateData.dateOfJoining);
    }

    const employee = await this.prisma.employee.update({
      where: { id },
      data: updateData,
      include: {
        department: true,
        designation: true,
        reportingManager: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            employeeId: true,
          },
        },
      },
    });

    await this.auditService.log(AuditAction.UPDATE, 'Employee', {
      tenantId,
      userId,
      entityId: employee.id,
      oldValues: this.maskPII(existing),
      newValues: this.maskPII(employee),
    });

    return this.maskPII(employee);
  }

  async remove(id: string, tenantId: string, userId: string) {
    const employee = await this.prisma.employee.findFirst({
      where: { id, tenantId },
    });

    if (!employee) {
      throw new NotFoundException('Employee not found');
    }

    await this.prisma.employee.delete({
      where: { id },
    });

    await this.auditService.log(AuditAction.DELETE, 'Employee', {
      tenantId,
      userId,
      entityId: id,
      oldValues: this.maskPII(employee),
    });

    return { message: 'Employee deleted successfully' };
  }

  private maskPII(employee: any): any {
    const masked = { ...employee };
    
    if (masked.pan) {
      try {
        masked.pan = this.encryptionService.mask(this.encryptionService.decrypt(masked.pan));
      } catch {
        masked.pan = this.encryptionService.mask(masked.pan);
      }
    }
    
    if (masked.aadhaar) {
      try {
        masked.aadhaar = this.encryptionService.mask(this.encryptionService.decrypt(masked.aadhaar), 4);
      } catch {
        masked.aadhaar = this.encryptionService.mask(masked.aadhaar, 4);
      }
    }
    
    if (masked.pfNumber) {
      try {
        masked.pfNumber = this.encryptionService.mask(this.encryptionService.decrypt(masked.pfNumber), 4);
      } catch {
        masked.pfNumber = this.encryptionService.mask(masked.pfNumber, 4);
      }
    }
    
    if (masked.esiNumber) {
      try {
        masked.esiNumber = this.encryptionService.mask(this.encryptionService.decrypt(masked.esiNumber), 4);
      } catch {
        masked.esiNumber = this.encryptionService.mask(masked.esiNumber, 4);
      }
    }
    
    if (masked.uan) {
      try {
        masked.uan = this.encryptionService.mask(this.encryptionService.decrypt(masked.uan), 4);
      } catch {
        masked.uan = this.encryptionService.mask(masked.uan, 4);
      }
    }
    
    if (masked.bankAccountNumber) {
      try {
        masked.bankAccountNumber = this.encryptionService.mask(this.encryptionService.decrypt(masked.bankAccountNumber), 4);
      } catch {
        masked.bankAccountNumber = this.encryptionService.mask(masked.bankAccountNumber, 4);
      }
    }

    if (masked.email) {
      masked.email = this.encryptionService.maskEmail(masked.email);
    }

    return masked;
  }

  async getDepartments(tenantId: string) {
    return this.prisma.department.findMany({
      where: { tenantId },
      orderBy: { name: 'asc' },
    });
  }

  async getDesignations() {
    return this.prisma.designation.findMany({
      orderBy: { level: 'asc' },
    });
  }

  async getManagers(tenantId: string) {
    return this.prisma.employee.findMany({
      where: {
        tenantId,
        isActive: true,
        OR: [
          { designation: { level: { gte: 3 } } }, // Managers typically level 3+
          { reportingManagerId: null }, // Top-level employees
        ],
      },
      select: {
        id: true,
        employeeId: true,
        firstName: true,
        lastName: true,
        designation: {
          select: {
            name: true,
          },
        },
      },
      orderBy: [
        { designation: { level: 'desc' } },
        { firstName: 'asc' },
      ],
    });
  }

  async createDepartment(data: { name: string; code: string }, tenantId: string) {
    const code = data.code.toUpperCase().trim();
    
    // Check if department code already exists for this tenant
    const existing = await this.prisma.department.findFirst({
      where: {
        code,
        tenantId,
      },
    });

    if (existing) {
      throw new ForbiddenException(`Department with code "${code}" already exists for this tenant`);
    }

    const department = await this.prisma.department.create({
      data: {
        name: data.name.trim(),
        code,
        tenantId,
      },
    });

    await this.auditService.log(AuditAction.CREATE, 'Department', {
      tenantId,
      entityId: department.id,
      newValues: department,
    });

    return department;
  }

  async createDesignation(data: { name: string; level?: number }) {
    const name = data.name.trim();
    
    // Check if designation name already exists
    const existing = await this.prisma.designation.findFirst({
      where: {
        name: {
          equals: name,
          mode: 'insensitive',
        },
      },
    });

    if (existing) {
      throw new ForbiddenException(`Designation "${name}" already exists`);
    }

    const designation = await this.prisma.designation.create({
      data: {
        name,
        level: data.level || 1,
      },
    });

    await this.auditService.log(AuditAction.CREATE, 'Designation', {
      entityId: designation.id,
      newValues: designation,
    });

    return designation;
  }
}

