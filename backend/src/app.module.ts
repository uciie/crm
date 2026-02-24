import { Module } from '@nestjs/common'
import { APP_GUARD } from '@nestjs/core'
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler'
import { ConfigModule }      from '@nestjs/config'
import { AuthModule }        from './auth/auth.module'
import { ContactsModule }    from './contacts/contacts.module'
//import { LeadsModule }       from './leads/leads.module'
import { PipelineModule }    from './pipeline/pipeline.module'
import { TasksModule }       from './tasks/tasks.module'
import { CommunicationsModule } from './communications/communications.module'
//import { EmailModule }       from './email/email.module'
//import { DashboardModule }   from './dashboard/dashboard.module'
//
@Module({
  imports: [
    ThrottlerModule.forRoot([{ ttl: 60000, limit: 20 }]),
    ConfigModule.forRoot({ isGlobal: true }),
    AuthModule,           //← enregistre JwtAuthGuard et RolesGuard globalement
    ContactsModule,
    //CompaniesModule,
    //LeadsModule,
    PipelineModule,
    TasksModule,
    CommunicationsModule,
    //EmailModule,
    //DashboardModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard, // OBLIGATOIRE pour activer le rate limiting
    },
  ],
})
export class AppModule {}