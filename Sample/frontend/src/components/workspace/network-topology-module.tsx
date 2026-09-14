import { useState } from 'react';
import type { ModuleComponentProps } from './workspace-engine';
import { Button } from '@components/ui/button';
import { Card } from '@components/ui/card';
import { Badge } from '@components/ui/badge';
import { Network, Plus, Trash2, Monitor, Server, Wifi, Shield, HardDrive, Radio } from 'lucide-react';

const DEVICE_ICONS: Record<string, { icon: typeof Monitor; color: string }> = {
  router: { icon: Radio, color: 'text-blue-600' },
  switch: { icon: Monitor, color: 'text-green-600' },
  firewall: { icon: Shield, color: 'text-red-600' },
  server: { icon: Server, color: 'text-purple-600' },
  workstation: { icon: HardDrive, color: 'text-gray-600' },
  access_point: { icon: Wifi, color: 'text-cyan-600' },
  modem: { icon: Radio, color: 'text-orange-600' },
};

interface Device {
  id: string;
  name: string;
  type: string;
  ipAddress: string;
  x: number;
  y: number;
}

export function NetworkTopologyModule({ moduleKey, config, readOnly }: ModuleComponentProps) {
  const rawDeviceTypes = config['deviceTypes'];
  const deviceTypes: string[] = Array.isArray(rawDeviceTypes) ? (rawDeviceTypes as string[]) : ['router', 'switch', 'firewall', 'server', 'workstation'];
  const maxDevices: number = (config['maxDevices'] as number) || 30;
  const [devices, setDevices] = useState<Device[]>([]);

  const addDevice = (type: string) => {
    if (devices.length >= maxDevices) return;
    const deviceIconConfig = DEVICE_ICONS[type] || DEVICE_ICONS.workstation;
    setDevices([...devices, {
      id: `device-${Date.now()}`,
      name: `${type.charAt(0).toUpperCase() + type.slice(1)}-${devices.length + 1}`,
      type,
      ipAddress: `192.168.1.${devices.length + 1}`,
      x: 50 + Math.random() * 60,
      y: 10 + Math.random() * 60,
    }]);
  };

  const removeDevice = (deviceId: string) => {
    setDevices(devices.filter((d) => d.id !== deviceId));
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Network className="h-5 w-5 text-primary-600" />
          <span className="text-sm font-medium text-text-primary">Network Topology</span>
          <Badge size="sm" variant="info">{devices.length}/{maxDevices} devices</Badge>
        </div>
      </div>

      {/* Device Palette */}
      {!readOnly && (
        <div className="flex gap-2 flex-wrap">
          {deviceTypes.map((type) => {
            const entry = DEVICE_ICONS[type];
            const safeEntry = entry || DEVICE_ICONS.workstation!;
            const Icon = safeEntry.icon;
            return (
              <Button
                key={type}
                variant="secondary"
                size="sm"
                onClick={() => addDevice(type)}
                disabled={devices.length >= maxDevices}
                icon={<Icon className={`h-4 w-4 ${safeEntry.color}`} />}
              >
                Add {type.replace(/_/g, ' ')}
              </Button>
            );
          })}
        </div>
      )}

      {/* Canvas */}
      <div className="relative min-h-[300px] bg-surface-secondary border-2 border-border rounded-xl overflow-hidden">
        {/* Grid background */}
        <svg className="absolute inset-0 w-full h-full" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
              <path d="M 20 0 L 0 0 0 20" fill="none" stroke="currentColor" className="text-border/50" strokeWidth="0.5" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid)" />
        </svg>

        {/* Devices */}
        {devices.map((device) => {
          const entry = DEVICE_ICONS[device.type];
          const safeEntry = entry || DEVICE_ICONS.workstation!;
          const Icon = safeEntry.icon;
          return (
            <div
              key={device.id}
              className="absolute flex flex-col items-center cursor-move group"
              style={{ left: `${device.x}%`, top: `${device.y}%`, transform: 'translate(-50%, -50%)' }}
            >
              <div className="w-14 h-14 rounded-xl bg-white border-2 border-border flex items-center justify-center shadow-sm group-hover:shadow-md transition-shadow">
                <Icon className={`h-7 w-7 ${safeEntry.color}`} />
              </div>
              <span className="mt-1 text-[10px] font-medium text-text-primary text-center leading-tight max-w-[80px] truncate">
                {device.name}
              </span>
              <span className="text-[8px] text-text-tertiary">{device.ipAddress}</span>
              {!readOnly && (
                <button
                  onClick={() => removeDevice(device.id)}
                  className="absolute -top-2 -right-2 p-0.5 bg-error text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              )}
            </div>
          );
        })}

        {devices.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center">
            <p className="text-sm text-text-tertiary">Add devices from the palette above to build your topology</p>
          </div>
        )}
      </div>

      {/* Device List */}
      {devices.length > 0 && (
        <div className="space-y-1">
          <span className="text-xs font-medium text-text-tertiary">Device Inventory</span>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {devices.map((d) => (
              <div key={d.id} className="flex items-center gap-2 px-2 py-1.5 bg-surface-secondary rounded-lg text-xs">
                <span className="text-text-primary truncate flex-1">{d.name}</span>
                <span className="text-text-tertiary">{d.ipAddress}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default NetworkTopologyModule;
