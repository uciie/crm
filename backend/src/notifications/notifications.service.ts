import { Injectable } from '@nestjs/common'
import { db }         from '../database/db.config'
import { sql }        from 'drizzle-orm'

// ── Types ────────────────────────────────────────────────────────────────────

export type NotificationType = 'overdue' | 'due_soon' | 'reminder'

export interface NotificationTask {
  id:       string
  title:    string
  due_date: string | null
  type:     string
}

export interface AppNotification {
  id:         string   // déterministe : `${taskId}-${type}`
  type:       NotificationType
  task:       NotificationTask
  created_at: string
  read:       boolean
}

// ── Service ───────────────────────────────────────────────────────────────────

@Injectable()
export class NotificationsService {
  /**
   * État "lu" persisté en mémoire, par utilisateur.
   * Clé : userId → Set de notification IDs marqués lus.
   *
   * Limite : reset au redémarrage du serveur.
   * Si vous avez besoin de persistance, créez une table `notification_reads(user_id, notif_id)`.
   */
  private readonly readStore = new Map<string, Set<string>>()

  // ── Helpers ─────────────────────────────────────────────────────────────────

  private getReadSet(userId: string): Set<string> {
    if (!this.readStore.has(userId)) {
      this.readStore.set(userId, new Set())
    }
    return this.readStore.get(userId)!
  }

  /** ID déterministe : stable tant que la tâche existe */
  private notifId(taskId: string, type: NotificationType): string {
    return `${taskId}-${type}`
  }

  // ── Lecture ─────────────────────────────────────────────────────────────────

  /**
   * Calcule les notifications à la volée depuis les tâches de l'utilisateur.
   *
   * Règles :
   *  - overdue  : due_date < NOW()  AND status NOT IN ('terminée','annulée')
   *  - due_soon : due_date entre NOW() et NOW() + 24h  AND status NOT IN (...)
   *  - reminder : due_date = CURRENT_DATE (aujourd'hui, non terminée)
   *               → type distinct de due_soon pour les RDV du jour
   */
  async getNotifications(userId: string, role: string): Promise<AppNotification[]> {
    const isAdmin = role === 'admin'

    const result = await db.execute(sql`
      SELECT
        id,
        title,
        due_date,
        type,
        status,
        CASE
          WHEN due_date < NOW()
            AND status NOT IN ('terminée', 'annulée')
          THEN 'overdue'
          WHEN due_date::date = CURRENT_DATE
            AND status NOT IN ('terminée', 'annulée')
          THEN 'reminder'
          WHEN due_date > NOW()
            AND due_date <= NOW() + INTERVAL '24 hours'
            AND status NOT IN ('terminée', 'annulée')
          THEN 'due_soon'
          ELSE NULL
        END AS notif_type
      FROM tasks
      WHERE (${isAdmin} = true OR assigned_to = ${userId})
        AND status NOT IN ('terminée', 'annulée')
        AND due_date IS NOT NULL
        AND due_date <= NOW() + INTERVAL '24 hours'
      ORDER BY due_date ASC
    `)

    const readSet = this.getReadSet(userId)

    return (result.rows as any[])
      .filter(row => row.notif_type !== null)
      .map(row => {
        const type = row.notif_type as NotificationType
        const id   = this.notifId(row.id as string, type)
        return {
          id,
          type,
          task: {
            id:       row.id       as string,
            title:    row.title    as string,
            due_date: row.due_date as string | null,
            type:     row.type     as string,
          },
          created_at: row.due_date as string,  // date de la tâche = date de la notif
          read:       readSet.has(id),
        } satisfies AppNotification
      })
  }

  // ── Marquage ─────────────────────────────────────────────────────────────────

  markRead(userId: string, notifId: string): void {
    this.getReadSet(userId).add(notifId)
  }

  markAllRead(userId: string, notifIds: string[]): void {
    const set = this.getReadSet(userId)
    notifIds.forEach(id => set.add(id))
  }
}