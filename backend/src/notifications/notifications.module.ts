import { Module }                    from '@nestjs/common'
import { NotificationsController }   from './notifications.controller'
import { NotificationsService }      from './notifications.service'

@Module({
  controllers: [NotificationsController],
  providers:   [NotificationsService],
  exports:     [NotificationsService],   // exporté si d'autres modules en ont besoin
})
export class NotificationsModule {}