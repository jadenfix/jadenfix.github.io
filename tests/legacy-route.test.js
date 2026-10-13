import assert from 'node:assert/strict';
import test from 'node:test';

import { legacyHashUrl, redirectLegacyRoute } from '../public/legacy-route.js';

test('recovers the stale /projects deep link for HashRouter', () => {
  assert.equal(
    legacyHashUrl({
      origin: 'https://jadenfix.github.io',
      pathname: '/projects',
      search: '',
    }),
    'https://jadenfix.github.io/#/projects',
  );
});

test('normalizes repeated and trailing slashes while preserving query values', () => {
  assert.equal(
    legacyHashUrl({
      origin: 'https://jadenfix.github.io',
      pathname: '//projects/',
      search: '?category=ai%26ml',
    }),
    'https://jadenfix.github.io/#/projects?category=ai%26ml',
  );
});

test('redirects on the same origin without assigning to href', () => {
  let replacement = '';
  const location = {
    origin: 'https://jadenfix.github.io',
    pathname: '/about',
    search: '',
    replace(value) {
      replacement = value;
    },
  };

  assert.equal(
    redirectLegacyRoute(location),
    'https://jadenfix.github.io/#/about',
  );
  assert.equal(replacement, 'https://jadenfix.github.io/#/about');
});
