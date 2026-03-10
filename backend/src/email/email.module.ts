import { Module }          from '@nestjs/common'
import { ScheduleModule }  from '@nestjs/schedule'
import { EmailService }    from './email.service'
import { EmailController } from './email.controller'

@Module({
  imports: [
    ScheduleModule.forRoot(), // ← active le scheduler pour les @Cron()
  ],
  controllers: [EmailController],
  providers:   [EmailService],
  exports:     [EmailService],
})
export class EmailModule {}