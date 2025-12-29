import { Module } from '@nestjs/common';
import { EncryptionModule } from './encryption/encryption.module';
import { AuditModule } from './audit/audit.module';

@Module({
  imports: [EncryptionModule, AuditModule],
  exports: [EncryptionModule, AuditModule],
})
export class SecurityModule {}

