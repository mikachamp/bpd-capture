// Just enough of react-native for src/services/storage.ts under Node.
export const Platform = { OS: 'android', select: (o) => o.android ?? o.default };
export default { Platform };
