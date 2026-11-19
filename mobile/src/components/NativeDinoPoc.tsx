import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Canvas, useFrame } from '@react-three/fiber/native';
import * as Haptics from 'expo-haptics';
import * as THREE from 'three';

interface NativeDinoPocProps {
  onBackToWebView: () => void;
}

interface TelemetryState {
  fps: number;
  minFps: number;
  frameMs: number;
  heapMb: string;
}

interface RunnerSceneProps {
  jumpSignalRef: React.MutableRefObject<number>;
  onTelemetry: (telemetry: TelemetryState) => void;
}

function getHeapMb(): string {
  const perf = globalThis.performance as
    | (Performance & { memory?: { usedJSHeapSize?: number } })
    | undefined;
  const bytes = perf?.memory?.usedJSHeapSize;
  if (typeof bytes === 'number' && bytes > 0) {
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }
  return 'N/D (Hermes)';
}

function VoxelDino({
  jumpSignalRef,
}: {
  jumpSignalRef: React.MutableRefObject<number>;
}) {
  const groupRef = useRef<THREE.Group>(null);
  const leftLegRef = useRef<THREE.Mesh>(null);
  const rightLegRef = useRef<THREE.Mesh>(null);
  const stateRef = useRef({
    y: 0,
    vy: 0,
    lastJumpSignal: 0,
    runPhase: 0,
  });

  useFrame((_, delta) => {
    const dt = Math.min(delta, 0.05);
    const st = stateRef.current;

    if (jumpSignalRef.current !== st.lastJumpSignal) {
      st.lastJumpSignal = jumpSignalRef.current;
      if (st.y <= 0.02) {
        st.vy = 9.5;
      }
    }

    st.vy -= 26 * dt;
    st.y += st.vy * dt;
    if (st.y < 0) {
      st.y = 0;
      st.vy = 0;
    }

    st.runPhase += dt * 14;
    if (groupRef.current) {
      groupRef.current.position.y = st.y;
    }
    if (leftLegRef.current && rightLegRef.current) {
      const swing = st.y > 0.05 ? 0.35 : Math.sin(st.runPhase) * 0.55;
      leftLegRef.current.rotation.x = swing;
      rightLegRef.current.rotation.x = -swing;
    }
  });

  return (
    <group ref={groupRef} position={[-1.8, 0, 0]}>
      {/* Tronco */}
      <mesh position={[0, 0.9, 0]}>
        <boxGeometry args={[0.7, 0.75, 0.5]} />
        <meshStandardMaterial color="#10b981" roughness={0.6} />
      </mesh>
      {/* Cabeça */}
      <mesh position={[0.35, 1.5, 0]}>
        <boxGeometry args={[0.62, 0.48, 0.44]} />
        <meshStandardMaterial color="#34d399" roughness={0.55} />
      </mesh>
      {/* Focinho */}
      <mesh position={[0.72, 1.42, 0]}>
        <boxGeometry args={[0.28, 0.28, 0.36]} />
        <meshStandardMaterial color="#34d399" roughness={0.55} />
      </mesh>
      {/* Olho */}
      <mesh position={[0.52, 1.6, 0.23]}>
        <boxGeometry args={[0.09, 0.09, 0.04]} />
        <meshStandardMaterial color="#09090b" />
      </mesh>
      {/* Cauda */}
      <mesh position={[-0.58, 0.85, 0]} rotation={[0, 0, -0.25]}>
        <boxGeometry args={[0.65, 0.26, 0.28]} />
        <meshStandardMaterial color="#059669" roughness={0.65} />
      </mesh>
      {/* Perna esquerda */}
      <mesh ref={leftLegRef} position={[0.1, 0.32, 0.16]}>
        <boxGeometry args={[0.2, 0.56, 0.16]} />
        <meshStandardMaterial color="#047857" />
      </mesh>
      {/* Perna direita */}
      <mesh ref={rightLegRef} position={[-0.1, 0.32, -0.16]}>
        <boxGeometry args={[0.2, 0.56, 0.16]} />
        <meshStandardMaterial color="#047857" />
      </mesh>
    </group>
  );
}

function ScrollingObstacles() {
  const c1Ref = useRef<THREE.Group>(null);
  const c2Ref = useRef<THREE.Group>(null);

  useFrame((_, delta) => {
    const dt = Math.min(delta, 0.05);
    const speed = 6.2;

    for (const ref of [c1Ref, c2Ref]) {
      if (!ref.current) continue;
      ref.current.position.x -= speed * dt;
      if (ref.current.position.x < -7) {
        ref.current.position.x = 7 + Math.random() * 3.5;
      }
    }
  });

  return (
    <>
      <group ref={c1Ref} position={[5, 0, 0]}>
        <mesh position={[0, 0.55, 0]}>
          <boxGeometry args={[0.35, 1.1, 0.35]} />
          <meshStandardMaterial color="#d97706" roughness={0.7} />
        </mesh>
        <mesh position={[0, 0.65, 0.25]}>
          <boxGeometry args={[0.2, 0.45, 0.2]} />
          <meshStandardMaterial color="#b45309" roughness={0.7} />
        </mesh>
      </group>

      <group ref={c2Ref} position={[11, 0, 0]}>
        <mesh position={[0, 0.45, 0]}>
          <boxGeometry args={[0.32, 0.9, 0.32]} />
          <meshStandardMaterial color="#f59e0b" roughness={0.7} />
        </mesh>
      </group>
    </>
  );
}

function RunnerScene({ jumpSignalRef, onTelemetry }: RunnerSceneProps) {
  const samplesRef = useRef<number[]>([]);
  const minFpsRef = useRef<number>(999);
  const lastReportRef = useRef<number>(0);

  useFrame(({ clock }, delta) => {
    const safeDelta = Math.max(delta, 0.0001);
    const instFps = 1 / safeDelta;
    samplesRef.current.push(instFps);
    if (samplesRef.current.length > 30) {
      samplesRef.current.shift();
    }

    const elapsed = clock.getElapsedTime();
    if (elapsed - lastReportRef.current >= 0.4) {
      lastReportRef.current = elapsed;
      const sum = samplesRef.current.reduce((acc, v) => acc + v, 0);
      const avgFps = Math.round(sum / samplesRef.current.length);
      if (avgFps > 0 && avgFps < minFpsRef.current) {
        minFpsRef.current = avgFps;
      }
      onTelemetry({
        fps: avgFps,
        minFps: minFpsRef.current === 999 ? avgFps : minFpsRef.current,
        frameMs: Number((safeDelta * 1000).toFixed(1)),
        heapMb: getHeapMb(),
      });
    }
  });

  return (
    <>
      <color attach="background" args={['#1c0f08']} />
      <ambientLight intensity={0.7} />
      <directionalLight position={[4, 8, 5]} intensity={1.1} color="#fde68a" />

      {/* Pista */}
      <mesh position={[0, -0.25, 0]}>
        <boxGeometry args={[18, 0.5, 3.2]} />
        <meshStandardMaterial color="#451a03" roughness={0.9} />
      </mesh>

      <VoxelDino jumpSignalRef={jumpSignalRef} />
      <ScrollingObstacles />
    </>
  );
}

export function NativeDinoPoc({ onBackToWebView }: NativeDinoPocProps) {
  const jumpSignalRef = useRef<number>(0);
  const [telemetry, setTelemetry] = useState<TelemetryState>({
    fps: 0,
    minFps: 0,
    frameMs: 0,
    heapMb: 'N/D',
  });

  useEffect(() => {
    setTelemetry((prev) => ({ ...prev, heapMb: getHeapMb() }));
  }, []);

  const handleTapJump = useCallback(() => {
    jumpSignalRef.current += 1;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
  }, []);

  return (
    <View style={styles.container}>
      <Pressable style={styles.canvasWrapper} onPress={handleTapJump}>
        <Canvas camera={{ position: [0.5, 2.3, 6.2], fov: 48 }}>
          <RunnerScene
            jumpSignalRef={jumpSignalRef}
            onTelemetry={setTelemetry}
          />
        </Canvas>
      </Pressable>

      <View style={styles.hudTop} pointerEvents="box-none">
        <View style={styles.telemetryCard}>
          <Text style={styles.telemetryTitle}>
            ETAPA B — PoC Nativa (expo-gl + R3F)
          </Text>
          <Text style={styles.telemetryLine}>
            FPS: {telemetry.fps} (min {telemetry.minFps}) | Frame: {telemetry.frameMs} ms
          </Text>
          <Text style={styles.telemetryLine}>
            JS Heap: {telemetry.heapMb} | Toque na tela para pular
          </Text>
        </View>

        <Pressable style={styles.backButton} onPress={onBackToWebView}>
          <Text style={styles.backButtonText}>Voltar WebView (Etapa A)</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1c0f08',
  },
  canvasWrapper: {
    flex: 1,
  },
  hudTop: {
    position: 'absolute',
    top: 14,
    left: 14,
    right: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 10,
  },
  telemetryCard: {
    flex: 1,
    backgroundColor: 'rgba(20, 11, 6, 0.84)',
    borderColor: 'rgba(16, 185, 129, 0.45)',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  telemetryTitle: {
    color: '#6ee7b7',
    fontSize: 12,
    fontWeight: '800',
    marginBottom: 3,
  },
  telemetryLine: {
    color: '#e4e4e7',
    fontSize: 11,
    fontWeight: '600',
  },
  backButton: {
    backgroundColor: '#f59e0b',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  backButtonText: {
    color: '#140b06',
    fontSize: 12,
    fontWeight: '800',
  },
});
