import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { TaskService } from './task.service';
import { CreateTaskDto, UpdateTaskDto } from './dto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { TenantId } from '../../common/decorators/tenant.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Role } from '@prisma/client';

@ApiTags('Tasks')
@Controller('tasks')
@UseGuards(JwtAuthGuard, TenantGuard, RolesGuard)
@ApiBearerAuth()
export class TaskController {
  constructor(private readonly taskService: TaskService) {}

  @Post()
  @Roles(Role.MANAGER, Role.HR_ADMIN, Role.TENANT_ADMIN)
  @ApiOperation({ summary: 'Create task' })
  create(
    @Body() createDto: CreateTaskDto,
    @TenantId() tenantId: string,
    @CurrentUser() user: any,
  ) {
    return this.taskService.create(createDto, tenantId, user.id);
  }

  @Get()
  @Roles(Role.EMPLOYEE, Role.MANAGER, Role.HR_ADMIN, Role.TENANT_ADMIN)
  @ApiOperation({ summary: 'Get all tasks' })
  @ApiQuery({ name: 'employeeId', required: false })
  @ApiQuery({ name: 'status', required: false })
  findAll(
    @TenantId() tenantId: string,
    @Query('employeeId') employeeId?: string,
    @Query('status') status?: string,
    @CurrentUser() user?: any,
  ) {
    const empId = user?.role === Role.EMPLOYEE ? user.employeeId : employeeId;
    return this.taskService.findAll(tenantId, empId, status);
  }

  @Get(':id')
  @Roles(Role.EMPLOYEE, Role.MANAGER, Role.HR_ADMIN, Role.TENANT_ADMIN)
  @ApiOperation({ summary: 'Get task by ID' })
  findOne(@Param('id') id: string, @TenantId() tenantId: string) {
    return this.taskService.findOne(id, tenantId);
  }

  @Patch(':id')
  @Roles(Role.EMPLOYEE, Role.MANAGER, Role.HR_ADMIN, Role.TENANT_ADMIN)
  @ApiOperation({ summary: 'Update task' })
  update(
    @Param('id') id: string,
    @Body() updateDto: UpdateTaskDto,
    @TenantId() tenantId: string,
    @CurrentUser() user: any,
  ) {
    return this.taskService.update(id, updateDto, tenantId, user.id);
  }

  @Delete(':id')
  @Roles(Role.MANAGER, Role.HR_ADMIN, Role.TENANT_ADMIN)
  @ApiOperation({ summary: 'Delete task' })
  remove(
    @Param('id') id: string,
    @TenantId() tenantId: string,
    @CurrentUser() user: any,
  ) {
    return this.taskService.remove(id, tenantId, user.id);
  }
}

