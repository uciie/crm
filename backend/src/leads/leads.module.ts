// ============================================================
// leads/leads.module.ts
// ============================================================

import { Module }        from '@nestjs/common'
import { LeadsController } from './leads.controller'
import { LeadsService }    from './leads.service'
import { EmailModule }     from '../email/email.module'   // NEW

@Module({
  imports:     [EmailModule],   // provides EmailService to LeadsService
  controllers: [LeadsController],
  providers:   [LeadsService],
  exports:     [LeadsService],
})
export class LeadsModule {}