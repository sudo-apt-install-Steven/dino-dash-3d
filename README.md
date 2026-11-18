# 🦖 DINO DASH 3D

**Proprietário e Idealizador:** Steven Tayllon teixeira Jerônimo De Melos  
**Licença:** Proprietária (`UNLICENSED` — Todos os direitos reservados)  
**Produção Oficial:** [https://dino-dash-3d-six.vercel.app](https://dino-dash-3d-six.vercel.app)

Releitura voxel procedural em 3D (Three.js + WebAudio API) do clássico corredor infinito, com **37 dinossauros** (terrestres, aquáticos, híbridos e voadores), **19 biomas**, **14 bosses em 3 fases**, **17 modos de jogo**, Gacha 3D, editor de híbridos DNA, **multiplayer local (mesmo teclado), LAN Wi-Fi e Online Global (Supabase Realtime)**, controle remoto via celular por QR Code, PWA offline e app mobile **Expo Go (`/mobile`)**.

---

## 🚀 Como Rodar Localmente (Web + LAN)

```bash
# 1. Instalar dependências
npm install

# 2. Rodar em modo desenvolvimento (Vite :5173)
npm run dev

# 3. (Opcional) Subir servidor LAN WebSocket (:5174) para multiplayer em rede local
npm run host

# 4. Build de produção + verificação de testes e orçamento de performance
npm run test:unit
npm run build
npm run test:budget
```

### Rotas & Atalhos Úteis
- **Jogo Principal:** `http://localhost:5173/`
- **Galeria 3D de Modelos (37 Dinos, 14 Bosses, Props & Triângulos):** `http://localhost:5173/debug/models` (ou `/?debug=models`)

---

## 📱 App Mobile (Expo Go — `/mobile`)

O diretório [`/mobile`](./mobile/README.md) contém o aplicativo **Expo SDK 58 + TypeScript** compatível com **Expo Go** (Android e iOS):
- **Etapa A (WebView + Bridge Nativo):** Haptics, persistência criptografada (`expo-secure-store`), compartilhamento nativo, notificações locais do Desafio Diário, orientação paisagem e fallback offline.
- **Etapa B (PoC Nativa `expo-gl`):** Cena 3D experimental com comparativo de FPS/memória em [`mobile/POC_COMPARATIVO.md`](./mobile/POC_COMPARATIVO.md).

```bash
cd mobile
npm install
npx expo start
```

---

## 📚 Documentação Técnica & Segurança

- [Arquitetura & Guia de Extensão (`docs/ARQUITETURA.md`)](./docs/ARQUITETURA.md)
- [Guia de Estilo Voxel & Orçamento 3D (`docs/ARTE.md`)](./docs/ARTE.md)
- [Conteúdo Data-Driven (`docs/CONTEUDO.md`)](./docs/CONTEUDO.md)
- [Relatório de Segurança (`docs/SEGURANCA.md`)](./docs/SEGURANCA.md) e [Política (`SECURITY.md`)](./SECURITY.md)
- [Auditoria Baseline (`docs/AUDIT.md`)](./docs/AUDIT.md), [Plano (`docs/PLANO.md`)](./docs/PLANO.md) e [Decisões (`docs/DECISOES.md`)](./docs/DECISOES.md)
- [Relatório Final de Release (`docs/RELATORIO_FINAL.md`)](./docs/RELATORIO_FINAL.md) e [Changelog (`CHANGELOG.md`)](./CHANGELOG.md)
