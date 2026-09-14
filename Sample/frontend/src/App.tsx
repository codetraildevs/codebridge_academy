import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AppRouter } from '@app/router';
import { AppProviders } from '@app/providers';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60, // 1 minute
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter
        future={{
          // Opt in early to React Router v7 behavior (silences the dev warnings)
          v7_startTransition: true,
          v7_relativeSplatPath: true,
        }}
      >
        <AppProviders>
          <AppRouter />
        </AppProviders>
      </BrowserRouter>
    </QueryClientProvider>
  );
}

export default App;
