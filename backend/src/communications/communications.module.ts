// ============================================================
// communications/communications.module.ts
// ============================================================

import { Module }                    from '@nestjs/common'
import { CommunicationsController }  from './communications.controller'
import { CommunicationsService }     from './communications.service'
import { EmailModule }               from '../email/email.module'

@Module({
  imports:     [EmailModule],
  controllers: [CommunicationsController],
  providers:   [CommunicationsService],
  exports:     [CommunicationsService],
})
export class CommunicationsModule {}