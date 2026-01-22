import { SkeletonBlock } from '../SkeletonBlock';

interface EnvironmentPageSkeletonProps {
  isPublic?: boolean;
}

const buildTableSkeletonRows = (rows: number, columns: number) =>
  Array.from({ length: rows }).map((_, rowIndex) => (
    <tr key={`env-skeleton-row-${rowIndex}`}>
      {Array.from({ length: columns }).map((__, columnIndex) => (
        <td key={`env-skeleton-cell-${rowIndex}-${columnIndex}`}>
          <SkeletonBlock style={{ width: '90%', height: '1rem' }} />
        </td>
      ))}
    </tr>
  ));

export const EnvironmentPageSkeleton = ({ isPublic = false }: EnvironmentPageSkeletonProps) => (
  <section className="page-container environment-page">
    <div className="environment-page__header">
      <div>
        <SkeletonBlock style={{ width: '40%', height: '2rem' }} />
        <SkeletonBlock style={{ width: '30%', height: '1rem' }} />
      </div>
      {!isPublic && (
        <div className="environment-actions">
          <SkeletonBlock style={{ width: '140px', height: '2.5rem' }} />
          <SkeletonBlock style={{ width: '160px', height: '2.5rem' }} />
        </div>
      )}
    </div>

    <div className="environment-summary-grid">
      <div className="summary-card">
        <SkeletonBlock style={{ width: '35%', height: '1.2rem' }} />
        <SkeletonBlock style={{ width: '70%', height: '1rem' }} />
        <SkeletonBlock style={{ width: '60%', height: '1rem' }} />
        <SkeletonBlock style={{ width: '50%', height: '1rem' }} />
      </div>
      {!isPublic && (
        <div className="summary-card">
          <SkeletonBlock style={{ width: '45%', height: '1.2rem' }} />
          <div className="share-actions">
            <SkeletonBlock style={{ width: '140px', height: '2.4rem' }} />
            <SkeletonBlock style={{ width: '140px', height: '2.4rem' }} />
            <SkeletonBlock style={{ width: '120px', height: '2.4rem' }} />
          </div>
        </div>
      )}
    </div>

    <div className="environment-evidence">
      <div className="environment-evidence__header">
        <SkeletonBlock style={{ width: '30%', height: '1.4rem' }} />
      </div>
      <table className="data-table">
        <thead>
          <tr>
            {Array.from({ length: 5 }).map((_, index) => (
              <th key={`env-skeleton-head-${index}`}>
                <SkeletonBlock style={{ width: '80%', height: '0.9rem' }} />
              </th>
            ))}
          </tr>
        </thead>
        <tbody>{buildTableSkeletonRows(4, 5)}</tbody>
      </table>
    </div>

    <div className="environment-bugs">
      <SkeletonBlock style={{ width: '25%', height: '1.2rem' }} />
      <table className="data-table">
        <thead>
          <tr>
            {Array.from({ length: 4 }).map((_, index) => (
              <th key={`env-bug-head-${index}`}>
                <SkeletonBlock style={{ width: '70%', height: '0.9rem' }} />
              </th>
            ))}
          </tr>
        </thead>
        <tbody>{buildTableSkeletonRows(3, 4)}</tbody>
      </table>
    </div>
  </section>
);
