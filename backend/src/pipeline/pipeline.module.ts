import { Module } from '@nestjs/common'
import { PipelineController } from './pipeline.controller'
import { PipelineService } from './pipeline.service'
import { EmailModule } from '../email/email.module'

@Module({
  imports: [EmailModule],          // Pour déclencher emails Brevo sur changement de stage
  controllers: [PipelineController],
  providers: [PipelineService],
  exports: [PipelineService],      // Exporté pour le DashboardModule
})
export class PipelineModule {}
