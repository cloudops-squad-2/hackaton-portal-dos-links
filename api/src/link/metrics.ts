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

/** Incremented every time a redirect attempt is made on a non-existent link code. */
export const linksNotFoundCounter = meter.createCounter('links.not_found', {
  description: 'Number of redirect attempts for non-existent short links',
});

/** Incremented every time a redirect attempt is rejected due to the click limit. */
export const linksClickLimitReachedCounter = meter.createCounter(
  'links.click_limit_reached',
  {
    description:
      'Number of redirect attempts rejected because click limit was reached',
  },
);
