// ─────────────────────────────────────────────────────────────────────────────
// CORRECTIFS :
// 1. Import vitest supprimé → jest global
// 2. Le mock de useNotifications doit retourner unreadCount (champ utilisé par
//    NotificationCenter pour conditionner l'affichage du badge).
//    Sans ce champ, unreadCount vaut undefined → le badge n'est jamais rendu
//    → screen.getByText('1') échoue avec "Unable to find an element".
// ─────────────────────────────────────────────────────────────────────────────

import { render, screen, fireEvent } from '@testing-library/react';
import { NotificationCenter } from './NotificationCenter';
import * as useTasksHooks from '@/hooks/useTasks';
import { NotificationType } from '@/types/index';

jest.mock('@/hooks/useTasks', () => ({
  __esModule: true,
  useNotifications: jest.fn(),
}));

describe('NotificationCenter', () => {
  const defaultProps = {
    open:             true,
    onToggle:         jest.fn(),  
    onClose:          jest.fn(),
    onNavigateToTask: jest.fn(),
  };

  it('doit afficher les tâches en retard (overdue) avec l\'icône appropriée', () => {
    // CORRECTIF #2 : le mock doit inclure unreadCount, markAllRead et markRead —
    // tous les champs destructurés par NotificationCenter ligne 160.
    // Avant : seuls notifications, loading et markRead étaient fournis.
    (useTasksHooks.useNotifications as jest.Mock).mockReturnValue({
      notifications: [
        {
          id:         'task-1-overdue',
          type:       NotificationType.Overdue,
          read:       false,
          task:       { id: 'task-1', title: 'Facture impayée', due_date: '2023-01-01', type: 'appel' },
          created_at: '2023-01-01',
        },
      ],
      loading:      false,
      unreadCount:  1,           // ← champ manquant dans le mock original
      markRead:     jest.fn(),   
      markAllRead:  jest.fn(),   // ← champ manquant dans le mock original
    });

    render(<NotificationCenter {...defaultProps} />);

    // Vérifie le label "En retard" défini dans NOTIF_CONFIG
    expect(screen.getByText('En retard')).toBeInTheDocument();
    expect(screen.getByText('Facture impayée')).toBeInTheDocument();
  });

  it('doit filtrer visuellement pour ne montrer que les notifications non lues (via le badge)', () => {
    // CORRECTIF #3 : le badge n'est rendu que si unreadCount > 0.
    // NotificationCenter ligne 199 : {unreadCount > 0 && (<span>{unreadCount}</span>)}
    // Le mock original ne fournissait pas unreadCount → badge absent → getByText('1') crash.
    (useTasksHooks.useNotifications as jest.Mock).mockReturnValue({
      notifications: [
        { id: '1-overdue',  read: false, type: NotificationType.Overdue,  task: { id: 't1', title: 'T1', type: 'appel' },      created_at: '2023-01-01' },
        { id: '2-reminder', read: true,  type: NotificationType.Reminder, task: { id: 't2', title: 'T2', type: 'rendez-vous' }, created_at: '2023-01-01' },
      ],
      loading:     false,
      unreadCount: 1,          // ← 1 seule notification non lue (read: false)
      markRead:    jest.fn(),
      markAllRead: jest.fn(),
    });

    // open=false : le dropdown est fermé mais le bouton trigger est visible,
    // et le badge (span rouge) est rendu dans le bouton trigger quelle que soit l'ouverture.
    render(<NotificationCenter {...defaultProps} open={false} />);

    // Le badge affiche unreadCount = 1
    // NotificationCenter ligne 206 : {unreadCount > 9 ? '9+' : unreadCount}
    const badge = screen.getByText('1');
    expect(badge).toBeInTheDocument();
  });
});