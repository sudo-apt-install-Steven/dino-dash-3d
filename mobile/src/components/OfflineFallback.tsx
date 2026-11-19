import React, { useState } from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

interface OfflineFallbackProps {
  currentUrl: string;
  errorMessage?: string | null;
  onRetry: () => void;
  onApplyUrl: (url: string) => void;
  onOpenNativePoc: () => void;
}

export function OfflineFallback({
  currentUrl,
  errorMessage,
  onRetry,
  onApplyUrl,
  onOpenNativePoc,
}: OfflineFallbackProps) {
  const [urlInput, setUrlInput] = useState(currentUrl);

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>OFFLINE / CONEXÃO</Text>
        </View>

        <Text style={styles.title}>DINO DASH 3D</Text>
        <Text style={styles.subtitle}>
          Não foi possível carregar o jogo web neste momento. Verifique sua conexão ou aponte para o servidor LAN local.
        </Text>

        {errorMessage ? (
          <View style={styles.errorBox}>
            <Text style={styles.errorText} numberOfLines={3}>
              {errorMessage}
            </Text>
          </View>
        ) : null}

        <Text style={styles.label}>URL do Jogo (Vercel ou LAN)</Text>
        <TextInput
          style={styles.input}
          value={urlInput}
          onChangeText={setUrlInput}
          placeholder="http://192.168.0.10:5174"
          placeholderTextColor="#71717a"
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="url"
        />

        <View style={styles.actions}>
          <Pressable style={styles.primaryButton} onPress={onRetry}>
            <Text style={styles.primaryButtonText}>Tentar Novamente</Text>
          </Pressable>

          <Pressable
            style={styles.secondaryButton}
            onPress={() => onApplyUrl(urlInput)}
          >
            <Text style={styles.secondaryButtonText}>Aplicar URL</Text>
          </Pressable>
        </View>

        <View style={styles.divider} />

        <Pressable style={styles.pocButton} onPress={onOpenNativePoc}>
          <Text style={styles.pocButtonText}>
            Abrir PoC Nativa 3D Offline (expo-gl)
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#140b06',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  card: {
    width: '100%',
    maxWidth: 440,
    backgroundColor: '#1c120c',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#3f281a',
    padding: 22,
  },
  badge: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(245, 158, 11, 0.14)',
    borderColor: 'rgba(245, 158, 11, 0.4)',
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginBottom: 12,
  },
  badgeText: {
    color: '#fbbf24',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.8,
  },
  title: {
    color: '#fafafa',
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  subtitle: {
    color: '#a1a1aa',
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 16,
  },
  errorBox: {
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
    borderColor: 'rgba(239, 68, 68, 0.35)',
    borderWidth: 1,
    borderRadius: 10,
    padding: 10,
    marginBottom: 14,
  },
  errorText: {
    color: '#fca5a5',
    fontSize: 12,
    lineHeight: 17,
  },
  label: {
    color: '#d4d4d8',
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 6,
  },
  input: {
    backgroundColor: '#0e0704',
    borderColor: '#3f281a',
    borderWidth: 1,
    borderRadius: 10,
    color: '#fafafa',
    fontSize: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 14,
  },
  actions: {
    flexDirection: 'row',
    gap: 10,
  },
  primaryButton: {
    flex: 1,
    backgroundColor: '#f59e0b',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
  },
  primaryButtonText: {
    color: '#140b06',
    fontSize: 14,
    fontWeight: '800',
  },
  secondaryButton: {
    backgroundColor: '#27170e',
    borderColor: '#523421',
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
    alignItems: 'center',
  },
  secondaryButtonText: {
    color: '#fde68a',
    fontSize: 14,
    fontWeight: '700',
  },
  divider: {
    height: 1,
    backgroundColor: '#311f14',
    marginVertical: 16,
  },
  pocButton: {
    backgroundColor: 'rgba(16, 185, 129, 0.14)',
    borderColor: 'rgba(16, 185, 129, 0.4)',
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
  },
  pocButtonText: {
    color: '#6ee7b7',
    fontSize: 13,
    fontWeight: '700',
  },
});
