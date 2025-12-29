import { Controller, Get, UseGuards, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { PayrollService } from './payroll.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { TenantId } from '../../common/decorators/tenant.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Role } from '@prisma/client';

@ApiTags('Payroll')
@Controller('payroll')
@UseGuards(JwtAuthGuard, TenantGuard, RolesGuard)
@ApiBearerAuth()
export class PayrollController {
  constructor(private readonly payrollService: PayrollService) {}

  // TODO: These endpoints will be moved to new services:
  // - SalaryStructureController for salary structure management
  // - PayrollProcessingController for payroll runs and payslip generation
  // Keeping commented for now to maintain API compatibility
  /*
  @Post('salary-structure')
  @Roles(Role.HR_ADMIN, Role.TENANT_ADMIN)
  @ApiOperation({ summary: 'Create salary structure' })
  createSalaryStructure(
    @Body() createDto: CreateSalaryStructureDto,
    @Body('employeeId') employeeId: string,
    @TenantId() tenantId: string,
    @CurrentUser() user: any,
  ) {
    // Will be handled by SalaryStructureService
    throw new NotImplementedException('This endpoint will be moved to salary-structure controller');
  }

  @Post('generate-payslip')
  @Roles(Role.HR_ADMIN, Role.TENANT_ADMIN)
  @ApiOperation({ summary: 'Generate payslip' })
  generatePayslip(
    @Body() generateDto: GeneratePayslipDto,
    @TenantId() tenantId: string,
    @CurrentUser() user: any,
  ) {
    // Will be handled by PayrollProcessingService
    throw new NotImplementedException('This endpoint will be moved to payroll-processing controller');
  }
  */

  @Get('payslips')
  @Roles(Role.HR_ADMIN, Role.TENANT_ADMIN, Role.MANAGER, Role.EMPLOYEE)
  @ApiOperation({ summary: 'Get payslips' })
  @ApiQuery({ name: 'employeeId', required: false })
  @ApiQuery({ name: 'year', required: false, type: Number })
  @ApiQuery({ name: 'month', required: false, type: Number })
  getPayslips(
    @TenantId() tenantId: string,
    @Query('employeeId') employeeId?: string,
    @Query('year') year?: string,
    @Query('month') month?: string,
    @CurrentUser() user?: any,
  ) {
    const empId = user?.role === Role.EMPLOYEE ? user.employeeId : employeeId;
    return this.payrollService.getPayslips(
      tenantId,
      empId,
      year ? parseInt(year) : undefined,
      month ? parseInt(month) : undefined,
    );
  }
}

