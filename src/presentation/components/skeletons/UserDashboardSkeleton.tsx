import { SkeletonBlock } from '../SkeletonBlock';

export const UserDashboardSkeleton = () => (
  <div className="dashboard-grid">
    {Array.from({ length: 3 }).map((_, index) => (
      <div key={`store-skeleton-${index}`} className="card">
        <div className="card-header">
          <SkeletonBlock style={{ width: '60%', height: '1.2rem' }} />
          <SkeletonBlock style={{ width: '30%', height: '1rem' }} />
        </div>
        <SkeletonBlock style={{ width: '40%', height: '0.9rem' }} />
      </div>
    ))}
  </div>
);
