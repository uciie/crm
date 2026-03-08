import { Test, TestingModule } from '@nestjs/testing';
import { TasksService } from './tasks.service';
import { EmailService } from '../email/email.service';
import { TaskType, TaskStatus, TaskPriority } from '../database/schema';
// Importez l'objet db réel pour pouvoir le mocker
import { db } from '../database/db.config';

// On mocke le module db.config
jest.mock('../database/db.config', () => ({
  db: {
    insert: jest.fn(),
    // On ajoute select, update, delete si besoin
  },
}));

describe('TasksService', () => {
  let service: TasksService;
  const userId = 'user-uuid-123';

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TasksService,
        { provide: EmailService, useValue: { sendTaskAssigned: jest.fn() } },
      ],
    }).compile();

    service = module.get<TasksService>(TasksService);
    jest.clearAllMocks();
  });

  it('doit créer une tâche avec la chaîne de méthodes Drizzle', async () => {
    const dto = {
      title: 'Appel prospect',
      type: 'appel' as TaskType,
      priority: 'haute' as TaskPriority,
    };

    const mockCreatedTask = {
      id: 'task-uuid',
      ...dto,
      assigned_to: userId,
      status: 'à_faire' as TaskStatus,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    // Configuration du mock pour simuler la chaîne : .insert().values().returning()
    const mockReturning = {
      returning: jest.fn().mockResolvedValue([mockCreatedTask]),
    };
    const mockValues = {
      values: jest.fn().mockReturnValue(mockReturning),
    };
    (db.insert as jest.Mock).mockReturnValue(mockValues);

    const result = await service.create(dto, userId);

    // Vérifications
    expect(db.insert).toHaveBeenCalled();
    expect(mockValues.values).toHaveBeenCalledWith(expect.objectContaining({
      title: dto.title,
      assigned_to: userId
    }));
    expect(result.id).toBe('task-uuid');
  });
});