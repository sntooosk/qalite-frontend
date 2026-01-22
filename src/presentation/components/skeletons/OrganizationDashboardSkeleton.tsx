import { SkeletonBlock } from '../SkeletonBlock';

export const OrganizationHeaderSkeleton = () => (
  <div className="card-loading">
    <SkeletonBlock style={{ width: '40%', height: '1.4rem' }} />
    <SkeletonBlock style={{ width: '70%', height: '1rem' }} />
  </div>
);

export const OrganizationMembersSkeleton = () => (
  <div className="card-loading">
    <SkeletonBlock style={{ width: '50%', height: '1rem' }} />
    <SkeletonBlock style={{ width: '60%', height: '1rem' }} />
  </div>
);
