import { Outlet } from 'react-router-dom';

export function SettingsLayout() {
  return (
    <div className="space-y-6 animate-fade-in">
      <Outlet />
    </div>
  );
}

export default SettingsLayout;