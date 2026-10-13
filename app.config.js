/**
 * Build variants. app.json describes the real app; setting APP_VARIANT=next
 * at prebuild/build time produces "BPD Capture Next": the redesign test build
 * with its own Android package, so it installs alongside the real app with its
 * own data and never replaces it.
 *
 *   APP_VARIANT=next npx expo prebuild --platform android
 */
module.exports = ({ config }) => {
  if (process.env.APP_VARIANT !== 'next') return config;
  return {
    ...config,
    name: 'BPD Capture Next',
    slug: config.slug,
    android: {
      ...config.android,
      package: `${config.android.package}.next`,
    },
    extra: { ...(config.extra ?? {}), variant: 'next' },
  };
};
