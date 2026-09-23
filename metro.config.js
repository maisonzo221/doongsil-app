const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// expo-sqlite's web backend loads a .wasm module (needed for `npx expo start --web`).
config.resolver.assetExts.push('wasm');

module.exports = config;
