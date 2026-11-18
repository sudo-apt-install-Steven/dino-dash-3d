import React, { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import * as Linking from 'expo-linking';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { NativeDinoPoc } from './src/components/NativeDinoPoc';
import { WebViewGame } from './src/components/WebViewGame';
import { ENV } from './src/config/env';
import { parseDinoDeepLink } from './src/services/deepLink';
import { configureNotificationHandler } from './src/services/notifications';
import { loadCustomGameUrl } from './src/services/secureStorage';
import type { DeepLinkPayload } from './src/types/bridge';

SplashScreen.preventAutoHideAsync().catch(() => {});
configureNotificationHandler();

export default function App() {
  const [mode, setMode] = useState<'webview' | 'native-poc'>('webview');
  const [gameUrl, setGameUrl] = useState<string>(ENV.gameUrl);
  const [deepLink, setDeepLink] = useState<DeepLinkPayload | null>(null);
  const [ready, setReady] = useState<boolean>(false);

  useEffect(() => {
    let mounted = true;

    async function bootstrap() {
      try {
        const savedUrl = await loadCustomGameUrl();
        if (mounted && savedUrl) {
          setGameUrl(savedUrl);
        }

        const initialUrl = await Linking.getInitialURL();
        const parsed = parseDinoDeepLink(initialUrl);
        if (mounted && parsed) {
          setDeepLink(parsed);
        }
      } finally {
        if (mounted) {
          setReady(true);
          SplashScreen.hideAsync().catch(() => {});
        }
      }
    }

    bootstrap();

    const subscription = Linking.addEventListener('url', ({ url }) => {
      const parsed = parseDinoDeepLink(url);
      if (parsed) {
        setDeepLink(parsed);
      }
    });

    return () => {
      mounted = false;
      subscription.remove();
    };
  }, []);

  if (!ready) {
    return <View style={styles.root} />;
  }

  return (
    <View style={styles.root}>
      <StatusBar hidden style="light" />
      {mode === 'webview' ? (
        <WebViewGame
          gameUrl={gameUrl}
          deepLink={deepLink}
          onChangeGameUrl={setGameUrl}
          onSwitchToNativePoc={() => setMode('native-poc')}
        />
      ) : (
        <NativeDinoPoc onBackToWebView={() => setMode('webview')} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#140b06',
  },
});
