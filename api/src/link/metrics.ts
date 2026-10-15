import { metrics } from '@opentelemetry/api';

const meter = metrics.getMeter('portal-dos-links');

/** Incremented every time a short link is successfully created. */
export const linksCreatedCounter = meter.createCounter('links.created', {
  description: 'Number of short links created',
});

/** Incremented every time a short link is successfully resolved and redirected. */
export const linksRedirectedCounter = meter.createCounter('links.redirected', {
  description: 'Number of successful redirects',
});

/** Incremented every time a redirect attempt is made on an expired link. */
export const linksExpiredCounter = meter.createCounter('links.expired', {
  description: 'Number of redirect attempts on expired links',
});
