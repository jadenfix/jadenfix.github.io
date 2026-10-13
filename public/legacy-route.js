/**
 * Convert an old path-based GitHub Pages URL into the HashRouter URL used by
 * the portfolio. Query parameters remain part of the client-side route.
 */
export function legacyHashUrl({ origin, pathname, search = '' }) {
  const normalizedPath = `/${pathname.split('/').filter(Boolean).join('/')}`;
  const route = normalizedPath === '/' ? '/' : normalizedPath.replace(/\/$/, '');

  return `${origin}/#${route}${search}`;
}

export function redirectLegacyRoute(location) {
  const target = legacyHashUrl(location);
  location.replace(target);
  return target;
}
