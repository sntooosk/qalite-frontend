import type { CSSProperties } from 'react';

interface SkeletonBlockProps {
  className?: string;
  style?: CSSProperties;
}

export const SkeletonBlock = ({ className, style }: SkeletonBlockProps) => (
  <span className={['skeleton', className].filter(Boolean).join(' ')} style={style} />
);
