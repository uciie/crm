import {
  Controller,
  Get,
  Patch,
  Param,
  Body,
  Request,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common'
import { JwtAuthGuard }          from '../auth/jwt-auth.guard'
import { NotificationsService }  from './notifications.service'

@Controller('notifications')
@UseGuards(JwtAuthGuard)
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  /**
   * GET /notifications
   *
   * Retourne les notifications calculées à la volée depuis les tâches
   * de l'utilisateur connecté :
   *   - overdue  : tâches dont l'échéance est dépassée
   *   - reminder : tâches dues aujourd'hui
   *   - due_soon : tâches dues dans les 24 prochaines heures
   *
   * Format de réponse : AppNotification[]
   * (compatible avec le hook useNotifications du frontend)
   */
  @Get()
  async getNotifications(@Request() req: any) {
    return this.notificationsService.getNotifications(
      req.user.id,
      req.user.role,
    )
  }

  /**
   * PATCH /notifications/:id/read
   *
   * Marque une notification individuelle comme lue.
   * L'ID est déterministe : `${taskId}-${notificationType}`
   *
   * Exemple : PATCH /notifications/3f8a1b2c-...-overdue/read
   */
  @Patch(':id/read')
  @HttpCode(HttpStatus.OK)
  async markRead(
    @Request()      req: any,
    @Param('id')    id:  string,
  ) {
    this.notificationsService.markRead(req.user.id, id)
    return { success: true }
  }

  /**
   * PATCH /notifications/read-all
   *
   * Marque toutes les notifications non lues comme lues.
   * Attend un body { ids: string[] } pour éviter une requête DB supplémentaire
   * (le frontend connaît déjà les IDs depuis le dernier GET).
   *
   * Exemple body : { "ids": ["3f8a-...-overdue", "4a2b-...-due_soon"] }
   */
  @Patch('read-all')
  @HttpCode(HttpStatus.OK)
  async markAllRead(
    @Request()           req:  any,
    @Body('ids')         ids?: string[],
  ) {
    if (ids?.length) {
      this.notificationsService.markAllRead(req.user.id, ids)
    }
    return { success: true }
  }
}