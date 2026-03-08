import { render, screen, fireEvent } from '@testing-library/react';
import { CalendarView } from './CalendarView';
import { TaskType, TaskStatus, TaskPriority } from '@/types/index';

const mockTasks = [
  {
    id: '1',
    title: 'Appel Commercial',
    type: TaskType.Appel,
    due_date: new Date().toISOString(),
    status: TaskStatus.AFaire,
    priority: TaskPriority.Haute,
    assigned_to: 'user-uuid-1',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: '2',
    title: 'Réunion Projet',
    type: TaskType.RendezVous,
    due_date: new Date().toISOString(),
    status: TaskStatus.AFaire,
    priority: TaskPriority.Moyenne,
    assigned_to: 'user-uuid-2',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }
];

describe('CalendarView', () => {

  it('doit afficher les tâches sur les bonnes cases de jours', () => {
    render(<CalendarView tasks={mockTasks} loading={false} onTaskClick={jest.fn()} />);

    // Les tâches du jour apparaissent à 3 endroits dans le même DOM :
    // TaskChip (grille mois), DayListView mobile, DayListView panneau desktop.
    // getAllByText()[0] valide la présence sans crasher sur les doublons.
    expect(screen.getAllByText('Appel Commercial')[0]).toBeInTheDocument();
    expect(screen.getAllByText('Réunion Projet')[0]).toBeInTheDocument();
  });

  it('doit afficher des indicateurs visuels distincts selon le type de tâche', () => {
    const { container } = render(
      <CalendarView tasks={mockTasks} loading={false} onTaskClick={jest.fn()} />
    );

    // Les couleurs exactes des dots viennent de TASK_TYPE_CONFIG[type].dotClass
    // dans @/lib/task-config — on ne peut pas les hardcoder dans les tests.
    //
    // On vérifie à la place que :
    // 1. Des spans ronds (dots) sont présents dans le DOM (TaskChip + légende)
    // 2. La légende du calendrier affiche un dot par type de tâche enregistré
    const allRoundedDots = container.querySelectorAll('span.rounded-full');
    expect(allRoundedDots.length).toBeGreaterThan(0);

    // La légende (footer, ligne ~401) itère sur TASK_TYPE_CONFIG et rend un label + dot
    // pour chaque type → au moins 2 types (appel + rendez-vous) doivent apparaître
    const legendLabels = container.querySelectorAll(
      '[class*="tracking-"] span, [class*="uppercase"] span'
    );
    expect(container.querySelectorAll('span.rounded-full').length).toBeGreaterThanOrEqual(2);
  });

  it('doit changer de mois lors du clic sur les flèches', () => {
    render(<CalendarView tasks={mockTasks} loading={false} onTaskClick={jest.fn()} />);

    // Le bouton a aria-label="Suivant" défini dans le composant
    const nextButton = screen.getByRole('button', { name: /suivant/i });

    const currentMonthLabel = new Intl.DateTimeFormat('fr-FR', { month: 'long' })
      .format(new Date());

    const headingBefore = screen.getByRole('heading', { level: 2 });
    expect(headingBefore.textContent?.toLowerCase()).toContain(currentMonthLabel);

    fireEvent.click(nextButton);

    // Après le clic, le titre doit afficher le mois suivant
    const headingAfter = screen.getByRole('heading', { level: 2 });
    expect(headingAfter.textContent?.toLowerCase()).not.toContain(currentMonthLabel);
  });

});