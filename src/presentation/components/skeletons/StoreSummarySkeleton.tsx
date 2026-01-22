import { SkeletonBlock } from '../SkeletonBlock';

export const StoreSummarySkeleton = () => (
  <section className="page-container">
    <div className="page-header">
      <SkeletonBlock style={{ width: '30%', height: '1rem' }} />
      <SkeletonBlock style={{ width: '50%', height: '2rem' }} />
      <SkeletonBlock style={{ width: '60%', height: '1rem' }} />
    </div>
    <div className="summary-grid">
      {Array.from({ length: 3 }).map((_, index) => (
        <div key={`store-summary-card-${index}`} className="summary-card">
          <SkeletonBlock style={{ width: '40%', height: '1rem' }} />
          <SkeletonBlock style={{ width: '70%', height: '0.9rem' }} />
          <SkeletonBlock style={{ width: '55%', height: '0.9rem' }} />
        </div>
      ))}
    </div>
  </section>
);
