import { Environment } from './environment';

export const environment: Environment = {
  production: true,
  posthog: {
    key: 'phc_REPLACE_WITH_PROD_KEY_FROM_POSTHOG_PROJECT',
    host: 'https://app.posthog.com',
    enabled: true,
    debug: false
  }
};