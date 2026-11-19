# Correção Visual da Água Submersa (B7)

## Causa Raiz
1. **Z-fighting entre `riverMesh` e `surfaceCeiling`:** `riverMesh` usava `BoxGeometry(10.8, 0.22, 210)` com `transparent: true`, `depthWrite: false` e `side: THREE.DoubleSide` ao mesmo tempo em que `surfaceCeiling` (`PlaneGeometry` em `y = 0.02`) era renderizado no mesmo espaço.
2. **Ausência de `renderOrder` explícito:** Os planos transparentes (`surfaceCeiling`, `underwaterGodRays`, `underwaterBubblesMesh`) competiam na fila de transparência (`renderOrder = 0`).
3. **Fog sem transição subaquática:** Ao submergir no rio lateral ou trocar de habitat, `scene.fog.color` e `scene.background` permaneciam com as cores do bioma terrestre (ex.: laranja do deserto), deixando a visão submersa sem névoa azulada.
4. **Lago de Oásis (`TrackChunks.js`):** A lâmina de água do oásis (`y = 0.08`) sobrepunha a caixa de areia (`y = 0.04`, topo `0.08`) sem `depthWrite: false` / `renderOrder`.

## Correções Aplicadas
- `src/world/World.js`:
  - `riverMesh` fica oculto quando `submergedActive` está ativo (`!isSubBiome`), evitando sobreposição com `surfaceCeiling`.
  - `surfaceCeiling` configurado com `DoubleSide`, `depthWrite: false`, `polygonOffset: true` e `renderOrder: 3`; `underwaterGodRays` com `renderOrder: 4` e `underwaterBubblesMesh` com `renderOrder: 5`.
  - `scene.fog` e `scene.background` recebem tom azul subaquático (`#0a4f70` / `#062c49`) quando `submergedActive` está ativo e restauram as cores do bioma de superfície imediatamente ao emergir ou trocar de habitat.
- `src/world/TrackChunks.js`:
  - Água do oásis ajustada para `y = 0.11`, `DoubleSide`, `transparent: true`, `depthWrite: false` e `renderOrder = 2`.
