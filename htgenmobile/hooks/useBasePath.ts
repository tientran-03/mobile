import { useSegments } from 'expo-router';

/** Returns base path for current route: /customer or /staff */
export function useBasePath(): string {
  const segments = useSegments();
  const first = segments[0];
  if (first === 'customer') return '/customer';
  if (first === 'staff') return '/staff';
  return '';
}
