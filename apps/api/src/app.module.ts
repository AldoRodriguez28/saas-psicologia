import { Module } from '@nestjs/common';
import { AuthModule } from './auth/auth.module';
import { PatientsModule } from './patients/patients.module';
import { NotesModule } from './notes/notes.module';
import { UsageModule } from './usage/usage.module';
import { PrismaModule } from './prisma/prisma.module';
import { HealthController } from './health.controller';

@Module({
  imports: [PrismaModule, AuthModule, PatientsModule, NotesModule, UsageModule],
  controllers: [HealthController],
})
export class AppModule {}
