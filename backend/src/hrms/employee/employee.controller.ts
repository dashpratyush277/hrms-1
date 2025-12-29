import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Query,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { EmployeeService } from './employee.service';
import { CreateEmployeeDto, UpdateEmployeeDto } from './dto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { TenantId } from '../../common/decorators/tenant.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Role } from '@prisma/client';

@ApiTags('Employees')
@Controller('employees')
@UseGuards(JwtAuthGuard, TenantGuard, RolesGuard)
@ApiBearerAuth()
export class EmployeeController {
  constructor(private readonly employeeService: EmployeeService) {}

  @Post()
  @Roles(Role.HR_ADMIN, Role.TENANT_ADMIN)
  @ApiOperation({ summary: 'Create employee' })
  create(
    @Body() createEmployeeDto: CreateEmployeeDto,
    @TenantId() tenantId: string,
    @CurrentUser() user: any,
  ) {
    return this.employeeService.create(createEmployeeDto, tenantId, user.id);
  }

  @Get()
  @Roles(Role.HR_ADMIN, Role.TENANT_ADMIN, Role.MANAGER, Role.EMPLOYEE)
  @ApiOperation({ summary: 'Get all employees' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'search', required: false, type: String })
  findAll(
    @TenantId() tenantId: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
  ) {
    return this.employeeService.findAll(
      tenantId,
      page ? parseInt(page) : 1,
      limit ? parseInt(limit) : 10,
      search,
    );
  }

  @Get(':id')
  @Roles(Role.HR_ADMIN, Role.TENANT_ADMIN, Role.MANAGER, Role.EMPLOYEE)
  @ApiOperation({ summary: 'Get employee by ID' })
  findOne(@Param('id') id: string, @TenantId() tenantId: string) {
    return this.employeeService.findOne(id, tenantId);
  }

  @Patch(':id')
  @Roles(Role.HR_ADMIN, Role.TENANT_ADMIN)
  @ApiOperation({ summary: 'Update employee' })
  update(
    @Param('id') id: string,
    @Body() updateEmployeeDto: UpdateEmployeeDto,
    @TenantId() tenantId: string,
    @CurrentUser() user: any,
  ) {
    return this.employeeService.update(id, updateEmployeeDto, tenantId, user.id);
  }

  @Delete(':id')
  @Roles(Role.HR_ADMIN, Role.TENANT_ADMIN)
  @ApiOperation({ summary: 'Delete employee' })
  remove(
    @Param('id') id: string,
    @TenantId() tenantId: string,
    @CurrentUser() user: any,
  ) {
    return this.employeeService.remove(id, tenantId, user.id);
  }

  @Get('departments/list')
  @Roles(Role.HR_ADMIN, Role.TENANT_ADMIN, Role.MANAGER)
  @ApiOperation({ summary: 'Get all departments' })
  getDepartments(@TenantId() tenantId: string) {
    return this.employeeService.getDepartments(tenantId);
  }

  @Get('designations/list')
  @Roles(Role.HR_ADMIN, Role.TENANT_ADMIN, Role.MANAGER)
  @ApiOperation({ summary: 'Get all designations' })
  getDesignations() {
    return this.employeeService.getDesignations();
  }

  @Get('managers/list')
  @Roles(Role.HR_ADMIN, Role.TENANT_ADMIN, Role.MANAGER)
  @ApiOperation({ summary: 'Get all managers for reporting manager dropdown' })
  getManagers(@TenantId() tenantId: string) {
    return this.employeeService.getManagers(tenantId);
  }

  @Post('departments')
  @Roles(Role.HR_ADMIN, Role.TENANT_ADMIN)
  @ApiOperation({ summary: 'Create department' })
  createDepartment(
    @Body() createDepartmentDto: { name: string; code: string },
    @TenantId() tenantId: string,
  ) {
    return this.employeeService.createDepartment(createDepartmentDto, tenantId);
  }

  @Post('designations')
  @Roles(Role.HR_ADMIN, Role.TENANT_ADMIN)
  @ApiOperation({ summary: 'Create designation' })
  createDesignation(@Body() createDesignationDto: { name: string; level?: number }) {
    return this.employeeService.createDesignation(createDesignationDto);
  }
}

