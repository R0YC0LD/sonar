"use client";

import { useEffect, useRef, useCallback } from "react";
import createGlobe from "cobe";

interface Marker {
  id: string;
  location: [number, number];
  label: string;
}

interface Arc {
  id: string;
  from: [number, number];
  to: [number, number];
  label?: string;
}

export interface GlobeView {
  phi: number;
  theta: number;
  zoom: number;
}

interface GlobeProps {
  markers?: Marker[];
  /** Not: cobe 0.6.x kavis (arc) desteklemez; bu prop yalnizca API uyumu icin durur. */
  arcs?: Arc[];
  className?: string;
  markerColor?: [number, number, number];
  baseColor?: [number, number, number];
  glowColor?: [number, number, number];
  dark?: number;
  mapBrightness?: number;
  markerSize?: number;
  speed?: number;
  theta?: number;
  diffuse?: number;
  mapSamples?: number;
  enableZoom?: boolean;
  minZoom?: number;
  maxZoom?: number;
  onMarkerClick?: (id: string) => void;
  onZoomChange?: (zoom: number) => void;
  onViewChange?: (view: GlobeView) => void;
}

export function Globe({
  markers = [],
  className = "",
  markerColor = [0.13, 0.86, 0.4],
  baseColor = [0.28, 0.32, 0.45],
  glowColor = [0.13, 0.45, 0.35],
  dark = 1,
  mapBrightness = 13,
  markerSize = 0.045,
  speed = 0.0025,
  theta = 0.25,
  diffuse = 1.85,
  mapSamples = 110000,
  enableZoom = true,
  minZoom = 1,
  maxZoom = 8,
  onMarkerClick,
  onZoomChange,
  onViewChange,
}: GlobeProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const pointerInteracting = useRef<{ x: number; y: number } | null>(null);
  const lastPointer = useRef<{ x: number; y: number; t: number } | null>(null);
  const dragOffset = useRef({ phi: 0, theta: 0 });
  const velocity = useRef({ phi: 0, theta: 0 });
  const phiOffsetRef = useRef(0);
  const thetaOffsetRef = useRef(0);
  const isPausedRef = useRef(false);
  const onZoomChangeRef = useRef(onZoomChange);
  const onViewChangeRef = useRef(onViewChange);
  const lastViewEmitRef = useRef(0);
  onZoomChangeRef.current = onZoomChange;
  onViewChangeRef.current = onViewChange;

  // Zoom (cobe'un native "scale" uniform'u ile)
  const zoomRef = useRef(1);
  const pinchingRef = useRef(false);
  const pinchStartDist = useRef(0);
  const pinchStartZoom = useRef(1);

  // Degisen veriyi ref'te tut; onRender her karede buradan okur (globe yeniden yaratilmaz).
  const live = useRef({ markers, markerColor, baseColor, glowColor, mapBrightness, dark, speed, theta });
  live.current = { markers, markerColor, baseColor, glowColor, mapBrightness, dark, speed, theta };

  const applyZoom = useCallback(
    (next: number) => {
      zoomRef.current = Math.max(minZoom, Math.min(maxZoom, next));
      onZoomChangeRef.current?.(zoomRef.current);
    },
    [minZoom, maxZoom]
  );

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    if (pinchingRef.current) return;
    pointerInteracting.current = { x: e.clientX, y: e.clientY };
    if (canvasRef.current) canvasRef.current.style.cursor = "grabbing";
    isPausedRef.current = true;
  }, []);

  const handlePointerMove = useCallback((e: PointerEvent) => {
    if (pinchingRef.current) return;
    if (pointerInteracting.current !== null) {
      const deltaX = e.clientX - pointerInteracting.current.x;
      const deltaY = e.clientY - pointerInteracting.current.y;
      dragOffset.current = { phi: deltaX / 300, theta: deltaY / 1000 };
      const now = Date.now();
      if (lastPointer.current) {
        const dt = Math.max(now - lastPointer.current.t, 1);
        const maxVelocity = 0.15;
        velocity.current = {
          phi: Math.max(-maxVelocity, Math.min(maxVelocity, ((e.clientX - lastPointer.current.x) / dt) * 0.3)),
          theta: Math.max(-maxVelocity, Math.min(maxVelocity, ((e.clientY - lastPointer.current.y) / dt) * 0.08)),
        };
      }
      lastPointer.current = { x: e.clientX, y: e.clientY, t: now };
    }
  }, []);

  const handlePointerUp = useCallback(() => {
    if (pointerInteracting.current !== null) {
      phiOffsetRef.current += dragOffset.current.phi;
      thetaOffsetRef.current += dragOffset.current.theta;
      dragOffset.current = { phi: 0, theta: 0 };
      lastPointer.current = null;
    }
    pointerInteracting.current = null;
    if (canvasRef.current) canvasRef.current.style.cursor = "grab";
    isPausedRef.current = false;
  }, []);

  useEffect(() => {
    window.addEventListener("pointermove", handlePointerMove, { passive: true });
    window.addEventListener("pointerup", handlePointerUp, { passive: true });
    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
    };
  }, [handlePointerMove, handlePointerUp]);

  // Wheel (masaustu) + pinch (mobil) zoom
  useEffect(() => {
    if (!enableZoom) return;
    const el = canvasRef.current;
    if (!el) return;

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      applyZoom(zoomRef.current * (e.deltaY < 0 ? 1.18 : 1 / 1.18));
    };
    const dist = (t: TouchList) =>
      Math.hypot(t[0].clientX - t[1].clientX, t[0].clientY - t[1].clientY);
    const onTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 2) {
        pinchingRef.current = true;
        pointerInteracting.current = null;
        isPausedRef.current = true;
        pinchStartDist.current = dist(e.touches);
        pinchStartZoom.current = zoomRef.current;
      }
    };
    const onTouchMove = (e: TouchEvent) => {
      if (pinchingRef.current && e.touches.length === 2) {
        e.preventDefault();
        applyZoom(pinchStartZoom.current * (dist(e.touches) / pinchStartDist.current));
      }
    };
    const onTouchEnd = (e: TouchEvent) => {
      if (e.touches.length < 2) {
        pinchingRef.current = false;
        isPausedRef.current = false;
      }
    };

    el.addEventListener("wheel", onWheel, { passive: false });
    el.addEventListener("touchstart", onTouchStart, { passive: false });
    el.addEventListener("touchmove", onTouchMove, { passive: false });
    el.addEventListener("touchend", onTouchEnd, { passive: false });
    return () => {
      el.removeEventListener("wheel", onWheel);
      el.removeEventListener("touchstart", onTouchStart);
      el.removeEventListener("touchmove", onTouchMove);
      el.removeEventListener("touchend", onTouchEnd);
    };
  }, [enableZoom, applyZoom]);

  // Globe'u YALNIZCA BIR KEZ olustur; guncellemeler onRender icinde ref'ten okunur.
  useEffect(() => {
    if (!canvasRef.current) return;
    const canvas = canvasRef.current;
    let globe: ReturnType<typeof createGlobe> | null = null;
    let phi = 0;

    function init() {
      const width = canvas.offsetWidth;
      if (width === 0 || globe) return;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);

      try {
        globe = createGlobe(canvas, {
          devicePixelRatio: dpr,
          width: width * dpr,
          height: width * dpr,
          phi: 0,
          theta: live.current.theta,
          dark: live.current.dark,
          diffuse,
          mapSamples,
          mapBrightness: live.current.mapBrightness,
          baseColor: live.current.baseColor,
          markerColor: live.current.markerColor,
          glowColor: live.current.glowColor,
          opacity: 0.95,
          scale: 1,
          markers: live.current.markers.map((m) => ({ location: m.location, size: markerSize })),
          onRender: (state: Record<string, any>) => {
            const L = live.current;
            if (!isPausedRef.current) {
              phi += L.speed;
              if (
                Math.abs(velocity.current.phi) > 0.0001 ||
                Math.abs(velocity.current.theta) > 0.0001
              ) {
                phiOffsetRef.current += velocity.current.phi;
                thetaOffsetRef.current += velocity.current.theta;
                velocity.current.phi *= 0.95;
                velocity.current.theta *= 0.95;
              }
              const thetaMin = -0.5,
                thetaMax = 0.5;
              if (thetaOffsetRef.current < thetaMin) {
                thetaOffsetRef.current += (thetaMin - thetaOffsetRef.current) * 0.1;
              } else if (thetaOffsetRef.current > thetaMax) {
                thetaOffsetRef.current += (thetaMax - thetaOffsetRef.current) * 0.1;
              }
            }
            const renderPhi = phi + phiOffsetRef.current + dragOffset.current.phi;
            const renderTheta = L.theta + thetaOffsetRef.current + dragOffset.current.theta;
            state.phi = renderPhi;
            state.theta = renderTheta;
            state.scale = zoomRef.current;
            state.dark = L.dark;
            state.mapBrightness = L.mapBrightness;
            state.baseColor = L.baseColor;
            state.markerColor = L.markerColor;
            state.glowColor = L.glowColor;
            state.markers = L.markers.map((m) => ({
              location: m.location,
              size: markerSize,
              color: L.markerColor,
            }));
            const now = performance.now();
            if (now - lastViewEmitRef.current > 120) {
              lastViewEmitRef.current = now;
              onViewChangeRef.current?.({
                phi: renderPhi,
                theta: renderTheta,
                zoom: zoomRef.current,
              });
            }
          },
        });
        setTimeout(() => canvas && (canvas.style.opacity = "1"));
      } catch (err) {
        console.warn("Globe (cobe) baslatilamadi:", err);
      }
    }

    if (canvas.offsetWidth > 0) {
      init();
    } else {
      const ro = new ResizeObserver((entries) => {
        if (entries[0]?.contentRect.width > 0) {
          ro.disconnect();
          init();
        }
      });
      ro.observe(canvas);
    }

    return () => {
      if (globe) globe.destroy();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className={`relative aspect-square select-none ${className}`} style={{ overflow: "hidden" }}>
      <canvas
        ref={canvasRef}
        onPointerDown={handlePointerDown}
        style={{
          width: "100%",
          height: "100%",
          cursor: "grab",
          opacity: 0,
          transition: "opacity 1.2s ease",
          borderRadius: "50%",
          touchAction: "none",
        }}
      />

      {enableZoom && (
        <div className="absolute bottom-4 right-4 z-20 flex flex-col gap-2">
          <button
            onClick={() => applyZoom(zoomRef.current * 1.35)}
            className="glass flex h-9 w-9 items-center justify-center rounded-full text-lg text-white/90 transition hover:bg-white/10"
            aria-label="Yakinlastir"
          >
            +
          </button>
          <button
            onClick={() => applyZoom(zoomRef.current / 1.35)}
            className="glass flex h-9 w-9 items-center justify-center rounded-full text-lg text-white/90 transition hover:bg-white/10"
            aria-label="Uzaklastir"
          >
            −
          </button>
        </div>
      )}
    </div>
  );
}
