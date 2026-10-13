import { useCallback, useEffect, useState } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as ScreenOrientation from 'expo-screen-orientation';
import { StatusBar } from 'expo-status-bar';
import { bootstrapApp } from './src/App.bootstrap';
import { RootNavigator } from './src/navigation/RootNavigator';
import { StartupAnimation } from './src/components/StartupAnimation';
import { saveStartupVideoOnce } from './src/services/brandVideo';

export default function App() {
  const [isBootstrapped, setIsBootstrapped] = useState(false);
  const [isSplashDone, setIsSplashDone] = useState(false);

  useEffect(() => {
    if (Platform.OS !== 'web') {
      ScreenOrientation.unlockAsync();
    }
    bootstrapApp()
      .catch((error) => console.error('Failed to initialize BPD Capture:', error))
      .finally(() => setIsBootstrapped(true));
  }, []);

  const handleSplashFinish = useCallback(() => setIsSplashDone(true), []);

  // After the splash, so the gallery permission prompt lands on the dashboard.
  useEffect(() => {
    if (!isBootstrapped || !isSplashDone) return;
    saveStartupVideoOnce().catch((error) => console.warn('Could not save the startup video:', error));
  }, [isBootstrapped, isSplashDone]);

  if (!isBootstrapped || !isSplashDone) {
    return <StartupAnimation onFinish={handleSplashFinish} />;
  }

  return (
    <GestureHandlerRootView style={styles.flex}>
      <SafeAreaProvider>
        <RootNavigator />
        <StatusBar style="auto" />
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
});
