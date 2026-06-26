import type { ReactNode } from 'react';
import { useSmartBack } from '../navigation/useSmartBack';

interface Props {
  fallback: string;
  className?: string;
  children: ReactNode;
}

export function BackLink({ fallback, className, children }: Props) {
  const goBack = useSmartBack(fallback);
  return (
    <button type="button" onClick={goBack} className={className}>
      {children}
    </button>
  );
}
