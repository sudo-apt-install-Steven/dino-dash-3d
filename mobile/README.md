# DINO DASH 3D — App Mobile (Expo Go + TypeScript)

Aplicativo móvel oficial do **DINO DASH 3D** construído com **Expo SDK 58 + TypeScript**, projetado para rodar diretamente no **Expo Go** (Android e iOS) sem módulos nativos customizados.

Inclui:
- **Etapa A (Principal):** `WebView` em tela cheia com *bridge* bidirecional completo (`haptics`, `expo-secure-store`, compartilhamento nativo, notificações locais diárias, orientação de tela, detecção de offline com fallback e deep links `dinodash3d://`).
- **Etapa B (PoC Nativa Medida):** Cena 3D nativa usando `expo-gl` + `three` + `@react-three/fiber/native` com telemetria de FPS, frame time e memória em tempo real (acessível pelo botão flutuante **Expo** no canto superior direito ou pela tela offline).

---

## 1. Como Rodar no Expo Go (QR Code)

### Pré-requisitos
- Node.js 20+
- App **Expo Go** instalado no celular ([Android Play Store](https://play.google.com/store/apps/details?id=host.exp.exponent) / [iOS App Store](https://apps.apple.com/app/expo-go/id982107779))
- Celular e computador na **mesma rede Wi-Fi** (ou usar `--tunnel`)

### Passo a passo
```bash
cd mobile
npm install
cp .env.example .env
npx expo start
```

1. Um **QR Code** aparecerá no terminal.
2. **Android:** abra o app **Expo Go** e escaneie o QR Code.
3. **iOS:** abra a câmera nativa do iPhone e aponte para o QR Code (abrirá no Expo Go).
4. Se estiver em redes diferentes ou Wi-Fi corporativo bloqueando portas, rode:
   ```bash
   npx expo start --tunnel
   ```

### Testando com o servidor Vite local (LAN)
Se quiser testar alterações locais da versão web (`src/`) no celular via Expo Go:
1. Na raiz do repositório, rode `npm run host` (ou `npm run dev`).
2. Anote o IP LAN exibido (ex.: `http://192.168.0.15:5174`).
3. No app Expo, toque na pílula **Expo** (canto superior direito) → informe a URL LAN → toque em **Carregar URL** (ou defina `EXPO_PUBLIC_GAME_URL` no `mobile/.env`).

---

## 2. Variáveis de Ambiente (`/mobile/.env`)

Copie `mobile/.env.example` para `mobile/.env`:

| Variável | Descrição | Padrão |
| --- | --- | --- |
| `EXPO_PUBLIC_GAME_URL` | URL do jogo web carregado na WebView (Vercel ou LAN) | `https://dino-dash-3d-six.vercel.app` |
| `EXPO_PUBLIC_SUPABASE_URL` | URL pública do projeto Supabase | — |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | Chave pública (`anon`) do Supabase | — |

> **Segurança:** nunca coloque `SUPABASE_SERVICE_ROLE_KEY` ou segredos privados em variáveis `EXPO_PUBLIC_*`. A sessão do Supabase Auth no mobile usa um adaptador sobre `expo-secure-store` com chunking automático para valores maiores que 2048 bytes (`mobile/src/services/secureStorage.ts`).

---

## 3. Contrato do WebView Bridge

Definido em `docs/CONTRATOS_SWARM.md` (§2.4) e tipado em `mobile/src/types/bridge.ts`:

### Web → Expo (`window.ReactNativeWebView?.postMessage(JSON.stringify({ type, payload }))`)
- `HAPTIC_IMPACT`: `{ style: 'light' | 'medium' | 'heavy' }` → dispara `expo-haptics`.
- `SHARE_SCORE`: `{ score: number, biome?: string }` → abre `Share.share` nativo.
- `SAVE_SYNC`: `{ snapshot: Record<string, unknown> }` → persiste progresso criptografado via `expo-secure-store`.
- `SCHEDULE_DAILY_REMINDER`: `{ hour: number, minute: number }` → agenda notificação local diária via `expo-notifications`.
- `SET_ORIENTATION`: `{ mode: 'landscape' | 'portrait' | 'auto' }` → controla rotação via `expo-screen-orientation`.

### Expo → Web (via `window.postMessage` e evento `dino-native-message`)
- `NATIVE_READY`: `{ platform, appVersion, restoredSnapshot }`.
- `OFFLINE_STATUS`: `{ online: boolean }`.
- `DEEP_LINK`: `{ room: string | null, transport: string | null }` (ex.: `dinodash3d://join?room=ABCD&transport=ws`).

---

## 4. Comparativo Etapa A vs Etapa B (`expo-gl`)

Veja a análise completa e a recomendação técnica em [`POC_COMPARATIVO.md`](./POC_COMPARATIVO.md).

**Resumo:** a **Etapa A (WebView + Bridge)** é o caminho recomendado para produção por garantir 100% de paridade com o jogo web (13 dinos, 7 bosses, biomas, eventos, multiplayer, PWA) sem duplicar a engine 3D, entregando os recursos nativos essenciais via bridge.

---

## 5. Caminho para EAS Build, Dev Client e Publicação nas Lojas

Quando o projeto sair da fase de testes no **Expo Go** e for empacotado para distribuição (`APK`/`AAB` na Google Play e `IPA` na App Store):

1. **Instalar e autenticar a CLI da EAS:**
   ```bash
   npm install -g eas-cli
   eas login
   cd mobile
   eas build:configure
   ```
2. **Development Client (para depurar fora do Expo Go):**
   ```bash
   eas build --profile development --platform android
   ```
3. **Preview interno (APK instalável direto no Android):**
   ```bash
   eas build --profile preview --platform android
   ```
4. **Produção e Envio para Lojas:**
   ```bash
   eas build --profile production --platform all
   eas submit --platform android
   eas submit --platform ios
   ```
5. **Checklist pré-publicação:**
   - Substituir `mobile/assets/icon.png`, `splash-icon.png` e ícones adaptativos pelos assets finais em alta resolução do DINO DASH 3D.
   - Configurar `associatedDomains` (iOS) e `assetlinks.json` (Android) para Universal Links / App Links em `dino-dash-3d-six.vercel.app`.
   - Configurar variáveis `EXPO_PUBLIC_*` no painel do Expo (`eas env:create`).
