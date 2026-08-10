/**
 * A stable per-browser identifier sent with every sign-in.
 *
 * Purely cosmetic — it populates the "your devices" list so a user can tell one
 * session from another. It is never used for an authorisation decision, which is
 * why generating it client-side is safe.
 */

const DEVICE_ID_KEY = 'samudaysetu.admin.deviceId';

function generateId(): string {
  if (typeof crypto?.randomUUID === 'function') return crypto.randomUUID();

  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}

export interface DeviceInfo {
  deviceId: string;
  deviceName: string;
  platform: 'web';
}

export function getDeviceInfo(): DeviceInfo {
  let deviceId: string | null = null;

  try {
    deviceId = window.localStorage.getItem(DEVICE_ID_KEY);
    if (!deviceId) {
      deviceId = generateId();
      window.localStorage.setItem(DEVICE_ID_KEY, deviceId);
    }
  } catch {
    // Storage unavailable: a fresh id per load is still a valid, if less useful, label.
    deviceId = generateId();
  }

  return { deviceId, deviceName: 'Admin Console (Web)', platform: 'web' };
}
