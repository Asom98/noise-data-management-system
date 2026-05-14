/**
 * Role definitions and page access control.
 *
 * Each role maps to a label (shown in Admin page) and the list of routes
 * that role is permitted to navigate to. The Sidebar and AppRoutes both
 * read from this config so access is enforced in one place.
 */

export const ROLES = {
  admin: {
    label: 'Admin',
    description: 'Full access to all pages and user management',
    routes: [
      '/', '/sensor-map', '/live-readings', '/alerts',
      '/sensor-health', '/database', '/reports', '/settings',
      '/notifications', '/system', '/admin',
    ],
  },
  environmental_officer: {
    label: 'Environmental Officer',
    description: 'Access to all monitoring and reporting pages',
    routes: [
      '/', '/sensor-map', '/live-readings', '/alerts',
      '/sensor-health', '/database', '/reports', '/settings',
    ],
  },
  it_staff: {
    label: 'IT Staff',
    description: 'Technical pages: overview, sensor health and database',
    routes: ['/', '/sensor-health', '/database'],
  },
  citizen: {
    label: 'Citizen',
    description: 'Public view: overview and sensor map',
    routes: ['/', '/sensor-map'],
  },
};

/** Returns true if the given role can access the given route. */
export function canAccess(role, route) {
  return ROLES[role]?.routes.includes(route) ?? false;
}
