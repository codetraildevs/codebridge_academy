import { SidebarProvider, SidebarInset } from '@components/ui/sidebar';
import { SidebarComponent } from '@components/layout/sidebar';
import { Header } from '@components/layout/header';
import { Outlet } from 'react-router-dom';
import { useServerErrorToasts } from '@hooks/use-server-error-toasts';

export function MainLayout() {
  useServerErrorToasts();

  return (
    <SidebarProvider>
      <SidebarComponent />
      <SidebarInset>
        <Header />
        <main className="flex-1 overflow-y-auto bg-[#ffff] p-6">
          <Outlet />
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}

export default MainLayout;