import type { ReactNode } from 'react';
import { Toaster } from '@components/ui/sonner';

interface AppProvidersProps {
  children: ReactNode;
}

export function AppProviders({ children }: AppProvidersProps) {
  return (
    <>
      <Toaster position="bottom-right" closeButton richColors />
      {children}
    </>
  );
}

export default AppProviders;