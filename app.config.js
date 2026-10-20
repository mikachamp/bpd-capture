/**
 * Build variants. app.json describes the real app; APP_VARIANT picks a test
 * build with its own Android package, so it installs alongside the real app
 * with its own data and never replaces it.
 *
 *   APP_VARIANT=next  -> "BPD Capture Next"  (Ink & ember redesign)
 *   APP_VARIANT=floor -> "BPD Capture Floor" (Floor Mode: workshop-floor design)
 *
 *   APP_VARIANT=floor npx expo prebuild --platform android --clean
 */
const BARLOW = './assets/fonts/barlow/';

/** Floor Mode embeds Barlow (text) and Barlow Condensed (labels, big step names) instead of Outfit. */
const floorFontPlugin = [
  'expo-font',
  {
    android: {
      fonts: [
        {
          fontFamily: 'Barlow',
          fontDefinitions: [
            { path: `${BARLOW}Barlow-Regular.ttf`, weight: 400 },
            { path: `${BARLOW}Barlow-Medium.ttf`, weight: 500 },
            { path: `${BARLOW}Barlow-SemiBold.ttf`, weight: 600 },
            { path: `${BARLOW}Barlow-Bold.ttf`, weight: 700 },
          ],
        },
        {
          fontFamily: 'Barlow Condensed',
          fontDefinitions: [
            { path: `${BARLOW}BarlowCondensed-Medium.ttf`, weight: 500 },
            { path: `${BARLOW}BarlowCondensed-SemiBold.ttf`, weight: 600 },
            { path: `${BARLOW}BarlowCondensed-Bold.ttf`, weight: 700 },
          ],
        },
      ],
    },
    ios: {
      fonts: [
        `${BARLOW}Barlow-Regular.ttf`,
        `${BARLOW}Barlow-Medium.ttf`,
        `${BARLOW}Barlow-SemiBold.ttf`,
        `${BARLOW}Barlow-Bold.ttf`,
        `${BARLOW}BarlowCondensed-Medium.ttf`,
        `${BARLOW}BarlowCondensed-SemiBold.ttf`,
        `${BARLOW}BarlowCondensed-Bold.ttf`,
      ],
    },
  },
];

const VARIANTS = {
  next: { name: 'BPD Capture Next', suffix: 'next' },
  floor: { name: 'BPD Capture Floor', suffix: 'floor' },
};

module.exports = ({ config }) => {
  const variant = VARIANTS[process.env.APP_VARIANT];
  if (!variant) return config;
  const plugins =
    process.env.APP_VARIANT === 'floor'
      ? config.plugins.map((p) => (Array.isArray(p) && p[0] === 'expo-font' ? floorFontPlugin : p))
      : config.plugins;
  return {
    ...config,
    name: variant.name,
    slug: config.slug,
    plugins,
    android: {
      ...config.android,
      package: `${config.android.package}.${variant.suffix}`,
    },
    extra: { ...(config.extra ?? {}), variant: variant.suffix },
  };
};
