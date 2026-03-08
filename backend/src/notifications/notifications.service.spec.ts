import { Test, TestingModule } from '@nestjs/testing';
import { NotificationsService } from './notifications.service';
import { db } from '../database/db.config';

jest.mock('../database/db.config', () => ({
  db: {
    execute: jest.fn(),
  },
}));

describe('NotificationsService', () => {
  let service: NotificationsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [NotificationsService],
    }).compile();
    service = module.get<NotificationsService>(NotificationsService);
  });

  it('doit marquer une notification comme lue et ne plus la renvoyer comme "non lue"', async () => {
    const userId = 'user-abc';
    const mockTask = {
      id: 'task-123',
      title: 'Email à envoyer',
      due_date: new Date().toISOString(),
      type: 'tache',
      notif_type: 'reminder' 
    };

    // 1. Simuler la réponse de la DB
    (db.execute as jest.Mock).mockResolvedValue({ rows: [mockTask] });

    // 2. Récupérer les notifs (initialement non lue)
    let notifications = await service.getNotifications(userId, 'utilisateur');
    expect(notifications[0].read).toBe(false);

    // 3. Marquer comme lue
    service.markRead(userId, notifications[0].id);

    // 4. Récupérer à nouveau
    notifications = await service.getNotifications(userId, 'utilisateur');
    expect(notifications[0].read).toBe(true);
  });

  it('doit identifier correctement les types overdue via le notif_type SQL', async () => {
    const pastDate = '2020-01-01T10:00:00Z';
    (db.execute as jest.Mock).mockResolvedValue({
      rows: [{
        id: 'late-task',
        title: 'Urgent',
        due_date: pastDate,
        type: 'appel',
        notif_type: 'overdue' // Simule le résultat du CASE WHEN SQL
      }]
    });

    const notifications = await service.getNotifications('user-1', 'admin');
    
    expect(notifications[0].type).toBe('overdue');
    expect(notifications[0].id).toContain('overdue');
  });
});