import { ReactNode } from 'react';

interface BottomSheetContainerProps {
  children: ReactNode;
}

export const BottomSheetContainer = ({ children }: BottomSheetContainerProps) => (
  <section className="bottom-sheet">
    <div className="bottom-sheet__handle" aria-hidden="true" />
    <div className="bottom-sheet__scroll">{children}</div>
  </section>
);
