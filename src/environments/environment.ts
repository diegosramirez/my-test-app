export const environment = {
  production: false,
  posthog: {
    key: 'phc_REPLACE_WITH_DEV_KEY_FROM_POSTHOG_PROJECT',
    host: 'https://app.posthog.com',
    enabled: true,
    debug: true
  }
};

export interface Environment {
  production: boolean;
  posthog: {
    key: string;
    host: string;
    enabled: boolean;
    debug?: boolean;
  };
}