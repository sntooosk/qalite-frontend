import { SkeletonBlock } from '../SkeletonBlock';

const COLUMNS = ['Backlog', 'Em andamento', 'Concluído'];

export const EnvironmentKanbanSkeleton = () => (
  <div className="environment-kanban-columns">
    {COLUMNS.map((label, index) => (
      <div key={`kanban-skeleton-${label}-${index}`} className="environment-kanban-column">
        <div className="environment-kanban-column-header">
          <SkeletonBlock style={{ width: '40%', height: '1rem' }} />
          <SkeletonBlock style={{ width: '24px', height: '1rem' }} />
        </div>
        {Array.from({ length: 2 }).map((_, cardIndex) => (
          <div
            key={`kanban-skeleton-card-${index}-${cardIndex}`}
            className="environment-card"
            aria-hidden="true"
          >
            <SkeletonBlock style={{ width: '60%', height: '1rem' }} />
            <SkeletonBlock style={{ width: '40%', height: '0.9rem' }} />
            <SkeletonBlock style={{ width: '80%', height: '0.9rem' }} />
          </div>
        ))}
      </div>
    ))}
  </div>
);
