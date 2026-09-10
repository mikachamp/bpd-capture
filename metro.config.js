const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// expo-sqlite's web implementation loads a WASM binary; Metro needs to know
// to treat .wasm as a bundleable asset rather than trying to parse it as JS.
config.resolver.assetExts.push('wasm');

module.exports = config;
