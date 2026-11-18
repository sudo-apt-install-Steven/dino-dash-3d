import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Platform,
  Pressable,
  Share,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import * as Network from 'expo-network';
import {
  WebView,
  type WebViewMessageEvent,
  type WebViewProps,
} from 'react-native-webview';
import { ENV, isSupabaseConfigured } from '../config/env';
import { scheduleDailyChallengeReminder } from '../services/notifications';
import { applyOrientation } from '../services/orientation';
import {
  loadGameSnapshot,
  saveCustomGameUrl,
  saveGameSnapshot,
} from '../services/secureStorage';
import { getSupabaseClient } from '../services/supabase';
import type {
  DeepLinkPayload,
  ExpoToWebMessage,
  HapticStyle,
  OrientationMode,
  WebToExpoMessage,
} from '../types/bridge';
import { OfflineFallback } from './OfflineFallback';

interface WebViewGameProps {
  gameUrl: string;
  deepLink: DeepLinkPayload | null;
  onChangeGameUrl: (url: string) => void;
  onSwitchToNativePoc: () => void;
}

const INJECTED_BRIDGE_SCRIPT = `
  (function() {
    window.__DINO_NATIVE_HOST__ = true;
    window.__DINO_NATIVE_PLATFORM__ = ${JSON.stringify(Platform.OS)};
    true;
  })();
`;

interface WebViewHandle {
  injectJavaScript: (script: string) => void;
}

const SafeWebView = WebView as unknown as React.ComponentType<
  WebViewProps & { ref?: React.Ref<WebViewHandle> }
>;

export function WebViewGame({
  gameUrl,
  deepLink,
  onChangeGameUrl,
  onSwitchToNativePoc,
}: WebViewGameProps) {
  const webViewRef = useRef<WebViewHandle>(null);
  const [isOnline, setIsOnline] = useState<boolean>(true);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [webViewKey, setWebViewKey] = useState<number>(0);
  const [menuOpen, setMenuOpen] = useState<boolean>(false);
  const [draftUrl, setDraftUrl] = useState<string>(gameUrl);
  const [lastBridgeEvent, setLastBridgeEvent] = useState<string>('Aguardando WebView...');
  const [authStatus, setAuthStatus] = useState<string>(
    isSupabaseConfigured() ? 'Supabase configurado' : 'Supabase não configurado',
  );

  useEffect(() => {
    setDraftUrl(gameUrl);
  }, [gameUrl]);

  const postToWeb = useCallback((message: ExpoToWebMessage) => {
    if (!webViewRef.current) return;
    const serialized = JSON.stringify(message);
    const js = `
      (function() {
        try {
          var msg = ${serialized};
          window.postMessage(JSON.stringify(msg), '*');
          window.dispatchEvent(new CustomEvent('dino-native-message', { detail: msg }));
        } catch (e) {}
      })();
      true;
    `;
    webViewRef.current.injectJavaScript(js);
  }, []);

  // Monitora conectividade e envia OFFLINE_STATUS para o jogo web
  useEffect(() => {
    let mounted = true;

    Network.getNetworkStateAsync()
      .then((state) => {
        if (!mounted) return;
        const online = Boolean(state.isConnected && state.isInternetReachable !== false);
        setIsOnline(online);
      })
      .catch(() => {});

    const subscription = Network.addNetworkStateListener((state) => {
      const online = Boolean(state.isConnected && state.isInternetReachable !== false);
      setIsOnline(online);
      postToWeb({ type: 'OFFLINE_STATUS', payload: { online } });
    });

    return () => {
      mounted = false;
      subscription.remove();
    };
  }, [postToWeb]);

  // Verifica sessão Supabase no SecureStore quando configurado
  useEffect(() => {
    const supabase = getSupabaseClient();
    if (!supabase) return;
    supabase.auth
      .getSession()
      .then(({ data }) => {
        if (data.session?.user) {
          setAuthStatus(`Logado: ${data.session.user.email ?? data.session.user.id.slice(0, 8)}`);
        } else {
          setAuthStatus('Supabase pronto (sem sessão ativa)');
        }
      })
      .catch(() => setAuthStatus('Supabase indisponível'));
  }, []);

  // Encaminha deep links recebidos para o WebView
  useEffect(() => {
    if (deepLink) {
      postToWeb({ type: 'DEEP_LINK', payload: deepLink });
      setLastBridgeEvent(`DEEP_LINK: room=${deepLink.room ?? '-'}`);
    }
  }, [deepLink, postToWeb]);

  const handleLoadEnd = useCallback(async () => {
    setIsLoading(false);
    const restoredSnapshot = await loadGameSnapshot();
    postToWeb({
      type: 'NATIVE_READY',
      payload: {
        platform: Platform.OS,
        appVersion: ENV.appVersion,
        restoredSnapshot,
      },
    });
    postToWeb({
      type: 'OFFLINE_STATUS',
      payload: { online: isOnline },
    });
    if (deepLink) {
      postToWeb({ type: 'DEEP_LINK', payload: deepLink });
    }
  }, [deepLink, isOnline, postToWeb]);

  const triggerHaptic = useCallback(async (style: HapticStyle) => {
    const map: Record<HapticStyle, Haptics.ImpactFeedbackStyle> = {
      light: Haptics.ImpactFeedbackStyle.Light,
      medium: Haptics.ImpactFeedbackStyle.Medium,
      heavy: Haptics.ImpactFeedbackStyle.Heavy,
    };
    await Haptics.impactAsync(map[style] ?? Haptics.ImpactFeedbackStyle.Medium);
  }, []);

  const handleWebMessage = useCallback(
    async (event: WebViewMessageEvent) => {
      try {
        const parsed = JSON.parse(event.nativeEvent.data) as WebToExpoMessage;
        if (!parsed || typeof parsed.type !== 'string') return;

        setLastBridgeEvent(parsed.type);

        switch (parsed.type) {
          case 'HAPTIC_IMPACT': {
            const rawStyle =
              typeof parsed.payload === 'string'
                ? parsed.payload
                : parsed.payload?.style ?? 'medium';
            await triggerHaptic(rawStyle);
            break;
          }

          case 'SHARE_SCORE': {
            const score = parsed.payload?.score ?? 0;
            const biome = parsed.payload?.biome ? ` no bioma ${parsed.payload.biome}` : '';
            await Share.share({
              message: `Fiz ${score} pontos${biome} no DINO DASH 3D! Jogue também: ${ENV.gameUrl}`,
            });
            break;
          }

          case 'SAVE_SYNC': {
            if (parsed.payload?.snapshot && typeof parsed.payload.snapshot === 'object') {
              await saveGameSnapshot(parsed.payload.snapshot);
            }
            break;
          }

          case 'SCHEDULE_DAILY_REMINDER': {
            const hour = parsed.payload?.hour ?? 19;
            const minute = parsed.payload?.minute ?? 0;
            await scheduleDailyChallengeReminder(hour, minute);
            break;
          }

          case 'SET_ORIENTATION': {
            const mode: OrientationMode =
              typeof parsed.payload === 'string'
                ? parsed.payload
                : parsed.payload?.mode ?? 'auto';
            await applyOrientation(mode);
            break;
          }
        }
      } catch {
        // Ignora mensagens malformadas que não seguem o contrato JSON do bridge
      }
    },
    [triggerHaptic],
  );

  const handleRetry = useCallback(() => {
    setLoadError(null);
    setIsLoading(true);
    setWebViewKey((prev) => prev + 1);
  }, []);

  const handleApplyUrl = useCallback(
    async (nextUrl: string) => {
      const cleaned = nextUrl.trim();
      if (!cleaned) return;
      await saveCustomGameUrl(cleaned);
      onChangeGameUrl(cleaned);
      setLoadError(null);
      setIsLoading(true);
      setWebViewKey((prev) => prev + 1);
      setMenuOpen(false);
    },
    [onChangeGameUrl],
  );

  const source = useMemo(() => ({ uri: gameUrl }), [gameUrl]);

  if (!isOnline && loadError) {
    return (
      <OfflineFallback
        currentUrl={gameUrl}
        errorMessage={loadError}
        onRetry={handleRetry}
        onApplyUrl={handleApplyUrl}
        onOpenNativePoc={onSwitchToNativePoc}
      />
    );
  }

  if (loadError) {
    return (
      <OfflineFallback
        currentUrl={gameUrl}
        errorMessage={loadError}
        onRetry={handleRetry}
        onApplyUrl={handleApplyUrl}
        onOpenNativePoc={onSwitchToNativePoc}
      />
    );
  }

  return (
    <View style={styles.container}>
      <SafeWebView
        key={webViewKey}
        ref={webViewRef}
        source={source}
        style={styles.webview}
        injectedJavaScriptBeforeContentLoaded={INJECTED_BRIDGE_SCRIPT}
        onMessage={handleWebMessage}
        onLoadEnd={handleLoadEnd}
        onError={(syntheticEvent) => {
          setIsLoading(false);
          setLoadError(
            syntheticEvent.nativeEvent.description || 'Falha ao carregar o jogo na WebView.',
          );
        }}
        onHttpError={(syntheticEvent) => {
          if (syntheticEvent.nativeEvent.statusCode >= 500) {
            setLoadError(`Erro HTTP ${syntheticEvent.nativeEvent.statusCode} no servidor.`);
          }
        }}
        javaScriptEnabled
        domStorageEnabled
        allowsInlineMediaPlayback
        mediaPlaybackRequiresUserAction={false}
        allowsFullscreenVideo
        bounces={false}
        overScrollMode="never"
        showsHorizontalScrollIndicator={false}
        showsVerticalScrollIndicator={false}
        setBuiltInZoomControls={false}
      />

      {isLoading ? (
        <View style={styles.loadingOverlay} pointerEvents="none">
          <ActivityIndicator size="large" color="#f59e0b" />
          <Text style={styles.loadingText}>Carregando DINO DASH 3D...</Text>
        </View>
      ) : null}

      <Pressable
        style={styles.floatingPill}
        onPress={() => setMenuOpen(true)}
        accessibilityLabel="Abrir menu nativo Expo"
      >
        <View style={[styles.statusDot, isOnline ? styles.dotOnline : styles.dotOffline]} />
        <Text style={styles.pillText}>Expo</Text>
      </Pressable>

      <Modal
        visible={menuOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setMenuOpen(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>DINO DASH 3D — Host Expo</Text>
            <Text style={styles.modalMeta}>
              Rede: {isOnline ? 'Online' : 'Offline'} | Bridge: {lastBridgeEvent}
            </Text>
            <Text style={styles.modalMeta}>{authStatus}</Text>

            <Text style={styles.fieldLabel}>URL do Jogo</Text>
            <TextInput
              style={styles.input}
              value={draftUrl}
              onChangeText={setDraftUrl}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="url"
              placeholderTextColor="#71717a"
            />

            <View style={styles.row}>
              <Pressable
                style={styles.btnPrimary}
                onPress={() => handleApplyUrl(draftUrl)}
              >
                <Text style={styles.btnPrimaryText}>Carregar URL</Text>
              </Pressable>
              <Pressable
                style={styles.btnSecondary}
                onPress={() => {
                  setMenuOpen(false);
                  handleRetry();
                }}
              >
                <Text style={styles.btnSecondaryText}>Recarregar</Text>
              </Pressable>
            </View>

            <Text style={styles.fieldLabel}>Testes Rápidos do Bridge</Text>
            <View style={styles.row}>
              <Pressable
                style={styles.btnChip}
                onPress={() => triggerHaptic('heavy')}
              >
                <Text style={styles.btnChipText}>Haptic</Text>
              </Pressable>
              <Pressable
                style={styles.btnChip}
                onPress={() => applyOrientation('landscape')}
              >
                <Text style={styles.btnChipText}>Paisagem</Text>
              </Pressable>
              <Pressable
                style={styles.btnChip}
                onPress={() => applyOrientation('auto')}
              >
                <Text style={styles.btnChipText}>Auto</Text>
              </Pressable>
            </View>

            <Pressable
              style={styles.btnPoc}
              onPress={() => {
                setMenuOpen(false);
                onSwitchToNativePoc();
              }}
            >
              <Text style={styles.btnPocText}>
                Alternar para Etapa B: PoC Nativa (expo-gl)
              </Text>
            </Pressable>

            <Pressable
              style={styles.btnClose}
              onPress={() => setMenuOpen(false)}
            >
              <Text style={styles.btnCloseText}>Fechar</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#140b06',
  },
  webview: {
    flex: 1,
    backgroundColor: '#140b06',
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#140b06',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  loadingText: {
    color: '#fde68a',
    fontSize: 14,
    fontWeight: '700',
  },
  floatingPill: {
    position: 'absolute',
    top: 12,
    right: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(20, 11, 6, 0.78)',
    borderColor: 'rgba(245, 158, 11, 0.35)',
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  statusDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  dotOnline: {
    backgroundColor: '#10b981',
  },
  dotOffline: {
    backgroundColor: '#ef4444',
  },
  pillText: {
    color: '#fafafa',
    fontSize: 11,
    fontWeight: '700',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.72)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  modalCard: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: '#1c120c',
    borderColor: '#3f281a',
    borderWidth: 1,
    borderRadius: 16,
    padding: 18,
  },
  modalTitle: {
    color: '#fafafa',
    fontSize: 17,
    fontWeight: '800',
    marginBottom: 6,
  },
  modalMeta: {
    color: '#a1a1aa',
    fontSize: 12,
    marginBottom: 4,
  },
  fieldLabel: {
    color: '#d4d4d8',
    fontSize: 12,
    fontWeight: '700',
    marginTop: 12,
    marginBottom: 6,
  },
  input: {
    backgroundColor: '#0e0704',
    borderColor: '#3f281a',
    borderWidth: 1,
    borderRadius: 10,
    color: '#fafafa',
    fontSize: 13,
    paddingHorizontal: 12,
    paddingVertical: 9,
    marginBottom: 10,
  },
  row: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 6,
  },
  btnPrimary: {
    flex: 1,
    backgroundColor: '#f59e0b',
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
  },
  btnPrimaryText: {
    color: '#140b06',
    fontSize: 13,
    fontWeight: '800',
  },
  btnSecondary: {
    backgroundColor: '#27170e',
    borderColor: '#523421',
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    alignItems: 'center',
  },
  btnSecondaryText: {
    color: '#fde68a',
    fontSize: 13,
    fontWeight: '700',
  },
  btnChip: {
    flex: 1,
    backgroundColor: '#27170e',
    borderColor: '#3f281a',
    borderWidth: 1,
    borderRadius: 8,
    paddingVertical: 8,
    alignItems: 'center',
  },
  btnChipText: {
    color: '#e4e4e7',
    fontSize: 12,
    fontWeight: '600',
  },
  btnPoc: {
    marginTop: 12,
    backgroundColor: 'rgba(16, 185, 129, 0.14)',
    borderColor: 'rgba(16, 185, 129, 0.45)',
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 11,
    alignItems: 'center',
  },
  btnPocText: {
    color: '#6ee7b7',
    fontSize: 13,
    fontWeight: '700',
  },
  btnClose: {
    marginTop: 10,
    paddingVertical: 9,
    alignItems: 'center',
  },
  btnCloseText: {
    color: '#a1a1aa',
    fontSize: 13,
    fontWeight: '600',
  },
});
