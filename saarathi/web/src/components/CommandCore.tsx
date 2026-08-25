"use client";

import { useEffect, useRef, useState } from "react";
import type { MeshBasicMaterial } from "three";

// The Saarathi command core, rendered in real 3D with WebGL (three.js).
// All three.js is loaded inside the effect so nothing touches the server.
// Respects prefers-reduced-motion by drawing a single static frame.

export default function CommandCore({ health = 100 }: { health?: number }) {
  const ref = useRef<HTMLCanvasElement>(null);
  // If WebGL is unavailable or initialisation fails, show a static ring
  // instead of a blank area. Bug 6 fix.
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    let cleanup = () => {};
    let cancelled = false;

    (async () => {
     try {
      const THREE = await import("three");
      const { EffectComposer } = await import("three/addons/postprocessing/EffectComposer.js");
      const { RenderPass } = await import("three/addons/postprocessing/RenderPass.js");
      const { UnrealBloomPass } = await import("three/addons/postprocessing/UnrealBloomPass.js");
      if (cancelled) return;

      const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      renderer.setSize(window.innerWidth, window.innerHeight);
      renderer.setClearColor(0x05080c, 1);

      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(34, window.innerWidth / window.innerHeight, 0.1, 100);
      camera.position.set(0, 0, 9.2);
      camera.lookAt(0, 0, 0);

      const TEAL = new THREE.Color(0x33e2c6);
      const core = new THREE.Group();
      core.rotation.x = -1.0;
      scene.add(core);

      const ring = (r: number, tube: number, opacity: number, seg = 260) =>
        new THREE.Mesh(
          new THREE.TorusGeometry(r, tube, 12, seg),
          new THREE.MeshBasicMaterial({ color: TEAL, transparent: true, opacity })
        );
      const arc = (r: number, tube: number, opacity: number, len: number) =>
        new THREE.Mesh(
          new THREE.TorusGeometry(r, tube, 12, 240, len),
          new THREE.MeshBasicMaterial({ color: TEAL, transparent: true, opacity })
        );

      core.add(ring(3.4, 0.006, 0.3));
      core.add(ring(3.15, 0.004, 0.16));

      const tickRing = new THREE.Group();
      for (let i = 0; i < 72; i++) {
        const big = i % 6 === 0;
        const h = big ? 0.15 : 0.07;
        const m = new THREE.Mesh(
          new THREE.PlaneGeometry(0.013, h),
          new THREE.MeshBasicMaterial({ color: TEAL, transparent: true, opacity: big ? 0.55 : 0.28, side: THREE.DoubleSide })
        );
        const a = (i / 72) * Math.PI * 2;
        m.position.set(Math.cos(a) * 2.96, Math.sin(a) * 2.96, 0);
        m.rotation.z = a + Math.PI / 2;
        tickRing.add(m);
      }
      core.add(tickRing);

      const ratio = Math.max(0, Math.min(1, health / 100));
      const prog = arc(2.55, 0.022, 0.98, Math.PI * 2 * ratio);
      prog.rotation.z = Math.PI / 2;
      core.add(prog);
      core.add(ring(2.55, 0.004, 0.1));

      const segRing = new THREE.Group();
      for (let i = 0; i < 12; i++) {
        const s = arc(3.0, 0.012, 0.34, Math.PI / 6 - 0.14);
        s.rotation.z = i * (Math.PI / 6);
        segRing.add(s);
      }
      core.add(segRing);

      const inner = new THREE.Group();
      for (let i = 0; i < 3; i++) {
        const s = arc(2.0, 0.015, 0.62, Math.PI / 3.2);
        s.rotation.z = i * ((Math.PI * 2) / 3);
        inner.add(s);
      }
      core.add(inner);
      core.add(ring(1.5, 0.004, 0.42));

      const coreSphere = new THREE.Mesh(
        new THREE.SphereGeometry(0.085, 24, 24),
        new THREE.MeshBasicMaterial({ color: 0x8fe6d8, transparent: true, opacity: 0.85 })
      );
      core.add(coreSphere);
      core.add(ring(0.55, 0.02, 0.9));
      const halo2 = arc(0.82, 0.011, 0.7, Math.PI * 1.3);
      core.add(halo2);

      const N = 260;
      const pos = new Float32Array(N * 3);
      for (let i = 0; i < N; i++) {
        pos[i * 3] = (Math.random() - 0.5) * 22;
        pos[i * 3 + 1] = (Math.random() - 0.5) * 14;
        pos[i * 3 + 2] = -2 - Math.random() * 11;
      }
      const pg = new THREE.BufferGeometry();
      pg.setAttribute("position", new THREE.BufferAttribute(pos, 3));
      scene.add(new THREE.Points(pg, new THREE.PointsMaterial({ color: TEAL, size: 0.02, transparent: true, opacity: 0.45 })));

      const composer = new EffectComposer(renderer);
      composer.addPass(new RenderPass(scene, camera));
      composer.addPass(new UnrealBloomPass(new THREE.Vector2(window.innerWidth, window.innerHeight), 0.95, 0.5, 0.14));

      let raf = 0;
      let t0: number | null = null;
      const frame = (ts: number) => {
        if (t0 === null) t0 = ts;
        const t = (ts - t0) / 1000;
        tickRing.rotation.z = t * 0.05;
        segRing.rotation.z = -t * 0.12;
        inner.rotation.z = t * 0.22;
        halo2.rotation.z = -t * 0.5;
        const p = 0.5 + 0.5 * Math.sin(t * 1.6);
        coreSphere.scale.setScalar(1 + p * 0.3);
        (coreSphere.material as MeshBasicMaterial).opacity = 0.8 + 0.2 * p;
        camera.position.x = Math.sin(t * 0.15) * 0.28;
        camera.position.y = Math.cos(t * 0.12) * 0.16;
        camera.lookAt(0, 0, 0);
        composer.render();
        raf = requestAnimationFrame(frame);
      };

      const onResize = () => {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
        composer.setSize(window.innerWidth, window.innerHeight);
      };
      window.addEventListener("resize", onResize);

      if (reduce) {
        composer.render();
      } else {
        raf = requestAnimationFrame(frame);
      }

      cleanup = () => {
        cancelAnimationFrame(raf);
        window.removeEventListener("resize", onResize);
        renderer.dispose();
      };
     } catch {
       // WebGL not available or init failed: fall back to a static ring.
       if (!cancelled) setFailed(true);
     }
    })();

    return () => {
      cancelled = true;
      cleanup();
    };
  }, [health]);

  return (
    <>
      {failed && (
        <div className="core-fallback" aria-hidden="true">
          <div className="ring" />
        </div>
      )}
      <canvas id="gl" ref={ref} aria-hidden="true" style={failed ? { display: "none" } : undefined} />
    </>
  );
}
