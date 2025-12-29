import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Create Super Admin Tenant
  const superTenant = await prisma.tenant.create({
    data: {
      name: 'Super Admin Tenant',
      subdomain: 'super',
      primaryColor: '#1976d2',
    },
  });

  // Create Super Admin User
  const superAdminPassword = await bcrypt.hash('admin123', 10);
  const superAdmin = await prisma.user.create({
    data: {
      email: 'admin@hrms.com',
      passwordHash: superAdminPassword,
      role: 'SUPER_ADMIN',
      tenantId: superTenant.id,
    },
  });

  // Create Demo Tenant
  const demoTenant = await prisma.tenant.create({
    data: {
      name: 'Demo Company',
      subdomain: 'demo',
      primaryColor: '#1976d2',
    },
  });

  // Create Tenant Admin
  const tenantAdminPassword = await bcrypt.hash('tenant123', 10);
  const tenantAdmin = await prisma.user.create({
    data: {
      email: 'tenant@example.com',
      passwordHash: tenantAdminPassword,
      role: 'TENANT_ADMIN',
      tenantId: demoTenant.id,
    },
  });

  // Create Departments
  const salesDept = await prisma.department.create({
    data: {
      name: 'Sales',
      code: 'SALES',
      tenantId: demoTenant.id,
    },
  });

  const hrDept = await prisma.department.create({
    data: {
      name: 'Human Resources',
      code: 'HR',
      tenantId: demoTenant.id,
    },
  });

  // Create Designations
  const managerDesignation = await prisma.designation.create({
    data: {
      name: 'Manager',
      level: 5,
    },
  });

  const employeeDesignation = await prisma.designation.create({
    data: {
      name: 'Field Executive',
      level: 3,
    },
  });

  // Create HR Admin User
  const hrAdminPassword = await bcrypt.hash('hr123', 10);
  const hrAdmin = await prisma.user.create({
    data: {
      email: 'hr@example.com',
      passwordHash: hrAdminPassword,
      role: 'HR_ADMIN',
      tenantId: demoTenant.id,
    },
  });

  // Create Manager Employee
  const managerEmployee = await prisma.employee.create({
    data: {
      employeeId: 'EMP001',
      firstName: 'John',
      lastName: 'Manager',
      email: 'manager@example.com',
      phone: '+1234567890',
      dateOfJoining: new Date('2023-01-01'),
      tenantId: demoTenant.id,
      departmentId: salesDept.id,
      designationId: managerDesignation.id,
      userId: hrAdmin.id,
    },
  });

  // Create Field Employee
  const employeePassword = await bcrypt.hash('emp123', 10);
  const employeeUser = await prisma.user.create({
    data: {
      email: 'employee@example.com',
      passwordHash: employeePassword,
      role: 'EMPLOYEE',
      tenantId: demoTenant.id,
    },
  });

  const fieldEmployee = await prisma.employee.create({
    data: {
      employeeId: 'EMP002',
      firstName: 'Jane',
      lastName: 'Field',
      email: 'employee@example.com',
      phone: '+1234567891',
      dateOfJoining: new Date('2023-02-01'),
      tenantId: demoTenant.id,
      departmentId: salesDept.id,
      designationId: employeeDesignation.id,
      reportingManagerId: managerEmployee.id,
      userId: employeeUser.id,
    },
  });

  // Create Leave Types
  const casualLeave = await prisma.leaveType.create({
    data: {
      name: 'Casual Leave',
      code: 'CL',
      maxDays: 12,
      carryForward: false,
      requiresApproval: true,
      tenantId: demoTenant.id,
    },
  });

  const sickLeave = await prisma.leaveType.create({
    data: {
      name: 'Sick Leave',
      code: 'SL',
      maxDays: 10,
      carryForward: false,
      requiresApproval: true,
      tenantId: demoTenant.id,
    },
  });

  // Create Leave Balances
  await prisma.leaveBalance.create({
    data: {
      employeeId: fieldEmployee.id,
      tenantId: demoTenant.id,
      leaveTypeId: casualLeave.id,
      totalDays: 12,
      usedDays: 0,
      pendingDays: 0,
      year: 2024,
    },
  });

  await prisma.leaveBalance.create({
    data: {
      employeeId: fieldEmployee.id,
      tenantId: demoTenant.id,
      leaveTypeId: sickLeave.id,
      totalDays: 10,
      usedDays: 0,
      pendingDays: 0,
      year: 2024,
    },
  });

  // Create Salary Structure (using new schema)
  await prisma.salaryStructure.create({
    data: {
      employeeId: fieldEmployee.id,
      tenantId: demoTenant.id,
      basicSalary: 30000,
      effectiveFrom: new Date('2023-02-01'),
      isActive: true,
    },
  });

  // Create Sample Doctors
  await prisma.doctor.createMany({
    data: [
      {
        name: 'Dr. Smith',
        specialization: 'Cardiologist',
        clinicName: 'Heart Care Clinic',
        address: '123 Medical Street',
        city: 'Mumbai',
        state: 'Maharashtra',
        pincode: '400001',
        phone: '+91234567890',
        latitude: 19.0760,
        longitude: 72.8777,
        status: 'APPROVED',
        tenantId: demoTenant.id,
      },
      {
        name: 'Dr. Johnson',
        specialization: 'General Physician',
        clinicName: 'Family Health Center',
        address: '456 Health Avenue',
        city: 'Delhi',
        state: 'Delhi',
        pincode: '110001',
        phone: '+91123456789',
        latitude: 28.6139,
        longitude: 77.2090,
        status: 'APPROVED',
        tenantId: demoTenant.id,
      },
    ],
  });

  console.log('✅ Seeding completed!');
  console.log('\n📋 Default Credentials:');
  console.log('Super Admin: admin@hrms.com / admin123');
  console.log('Tenant Admin: tenant@example.com / tenant123');
  console.log('HR Admin: hr@example.com / hr123');
  console.log('Employee: employee@example.com / emp123');
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

