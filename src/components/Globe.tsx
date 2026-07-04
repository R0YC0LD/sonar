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

interface GlobeProps {
  markers?: Marker[];
  arcs?: Arc[];
  className?: string;
  markerColor?: [number, number, number];
  baseColor?: [number, number, number];
  arcColor?: [number, number, number];
  glowColor?: [number, number, number];
  dark?: number;
  mapBrightness?: number;
  markerSize?: number;
  markerElevation?: number;
  arcWidth?: number;
  arcHeight?: number;
  speed?: number;
  theta?: number;
  diffuse?: number;
  mapSamples?: number;
  enableZoom?: boolean;
  minZoom?: number;
  maxZoom?: number;
  onMarkerClick?: (id: string) => void;
}

export function Globe({
  markers = [],
  arcs = [],
  className = "",
  markerColor = [0.13, 0.86, 0.4],
  baseColor = [0.28, 0.32, 0.45],
  arcColor = [0.13, 0.86, 0.4],
  glowColor = [0.13, 0.45, 0.35],
  dark = 1,
  mapBrightness = 11,
  markerSize = 0.04,
  markerElevation = 0.01,
  arcWidth = 0.5,
  arcHeight = 0.3,
  speed = 0.0025,
  theta = 0.25,
  diffuse = 1.6,
  mapSamples = 40000,
  enableZoom = true,
  minZoom = 1,
  maxZoom = 5,
  onMarkerClick,
}: GlobeProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const zoomWrapperRef = useRef<HTMLDivElement>(null);
  const pointerInteracting = useRef<{ x: number; y: number } | null>(null);
  const lastPointer = useRef<{ x: number; y: number; t: number } | null>(null);
  const dragOffset = useRef({ phi: 0, theta: 0 });
  const velocity = useRef({ phi: 0, theta: 0 });
  const phiOffsetRef = useRef(0);
  const thetaOffsetRef = useRef(0);
  const isPausedRef = useRef(false);

  // Zoom
  const zoomRef = useRef(1);
  const pinchingRef = useRef(false);
  const pinchStartDist = useRef(0);
  const pinchStartZoom = useRef(1);

  // Globe HER RENDER'DA yeniden yaratilmasin diye tum degisen veriyi ref'te tutuyoruz;
  // animate dongusu her karede bu ref'ten en guncel degerleri okur.
  const live = useRef({
    markers,
    arcs,
    markerColor,
    baseColor,
    arcColor,
    markerElevation,
    mapBrightness,
    dark,
    speed,
    theta,
  });
  live.current = {
    markers,
    arcs,
    markerColor,
    baseColor,
    arcColor,
    markerElevation,
    mapBrightness,
    dark,
    speed,
    theta,
  };

  const applyZoom = useCallback(
    (next: number) => {
      const clamped = Math.max(minZoom, Math.min(maxZoom, next));
      zoomRef.current = clamped;
      if (zoomWrapperRef.current) {
        zoomWrapperRef.current.style.transform = `scale(${clamped})`;
      }
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
          phi: Math.max(
            -maxVelocity,
            Math.min(maxVelocity, ((e.clientX - lastPointer.current.x) / dt) * 0.3)
          ),
          theta: Math.max(
            -maxVelocity,
            Math.min(maxVelocity, ((e.clientY - lastPointer.current.y) / dt) * 0.08)
          ),
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
      const factor = e.deltaY < 0 ? 1.12 : 1 / 1.12;
      applyZoom(zoomRef.current * factor);
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
        const ratio = dist(e.touches) / pinchStartDist.current;
        applyZoom(pinchStartZoom.current * ratio);
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

  // Globe'u YALNIZCA BIR KEZ olustur; veri guncellemeleri animate icinde ref'ten okunur.
  useEffect(() => {
    if (!canvasRef.current) return;
    const canvas = canvasRef.current;
    let globe: ReturnType<typeof createGlobe> | null = null;
    let animationId: number;
    let phi = 0;

    function init() {
      const width = canvas.offsetWidth;
      if (width === 0 || globe) return;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);

      try {
        globe = createGlobe(canvas, {
          devicePixelRatio: dpr,
          width,
          height: width,
          phi: 0,
          theta: live.current.theta,
          dark: live.current.dark,
          diffuse,
          mapSamples,
          mapBrightness: live.current.mapBrightness,
          baseColor: live.current.baseColor,
          markerColor: live.current.markerColor,
          glowColor,
          markerElevation: live.current.markerElevation,
          markers: live.current.markers.map((m) => ({
            location: m.location,
            size: markerSize,
            id: m.id,
          })),
          arcs: live.current.arcs.map((a) => ({ from: a.from, to: a.to, id: a.id })),
          arcColor: live.current.arcColor,
          arcWidth,
          arcHeight,
          opacity: 0.95,
        });

        function animate() {
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
            const thetaMin = -0.4,
              thetaMax = 0.4;
            if (thetaOffsetRef.current < thetaMin) {
              thetaOffsetRef.current += (thetaMin - thetaOffsetRef.current) * 0.1;
            } else if (thetaOffsetRef.current > thetaMax) {
              thetaOffsetRef.current += (thetaMax - thetaOffsetRef.current) * 0.1;
            }
          }
          globe!.update({
            phi: phi + phiOffsetRef.current + dragOffset.current.phi,
            theta: L.theta + thetaOffsetRef.current + dragOffset.current.theta,
            dark: L.dark,
            mapBrightness: L.mapBrightness,
            markerColor: L.markerColor,
            baseColor: L.baseColor,
            arcColor: L.arcColor,
            markerElevation: L.markerElevation,
            markers: L.markers.map((m) => ({
              location: m.location,
              size: markerSize,
              id: m.id,
            })),
            arcs: L.arcs.map((a) => ({ from: a.from, to: a.to, id: a.id })),
          });
          animationId = requestAnimationFrame(animate);
        }
        animate();
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
      if (animationId) cancelAnimationFrame(animationId);
      if (globe) globe.destroy();
    };
    // Kasitli olarak bos: globe sadece mount'ta bir kez kurulur.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className={`relative aspect-square select-none ${className}`} style={{ overflow: "hidden" }}>
      <div
        ref={zoomWrapperRef}
        style={{
          width: "100%",
          height: "100%",
          transformOrigin: "center center",
          transition: "transform 0.12s ease-out",
          position: "relative",
        }}
      >
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
        {markers.map((m) => (
          <div
            key={m.id}
            onClick={() => onMarkerClick?.(m.id)}
            style={{
              position: "absolute",
              positionAnchor: `--cobe-${m.id}`,
              bottom: "anchor(top)",
              left: "anchor(center)",
              translate: "-50% 0",
              marginBottom: 8,
              padding: "2px 6px",
              background: "#1a1a2e",
              color: "#fff",
              fontFamily: "monospace",
              fontSize: "0.6rem",
              letterSpacing: "0.08em",
              textTransform: "uppercase" as const,
              whiteSpace: "nowrap" as const,
              pointerEvents: onMarkerClick ? ("auto" as const) : ("none" as const),
              cursor: onMarkerClick ? "pointer" : "default",
              opacity: `var(--cobe-visible-${m.id}, 0)`,
              filter: `blur(calc((1 - var(--cobe-visible-${m.id}, 0)) * 8px))`,
              transition: "opacity 0.8s, filter 0.8s",
            }}
          >
            {m.label}
            <span
              style={{
                position: "absolute",
                top: "100%",
                left: "50%",
                transform: "translate3d(-50%, -1px, 0)",
                border: "5px solid transparent",
                borderTopColor: "#1a1a2e",
              }}
            />
          </div>
        ))}
        {arcs
          .filter((a) => a.label)
          .map((a) => (
            <div
              key={a.id}
              style={{
                position: "absolute",
                positionAnchor: `--cobe-arc-${a.id}`,
                bottom: "anchor(top)",
                left: "anchor(center)",
                translate: "-50% 0",
                marginBottom: 8,
                padding: "2px 6px",
                background: "#fff",
                color: "#1a1a2e",
                fontFamily: "monospace",
                fontSize: "0.6rem",
                letterSpacing: "0.08em",
                textTransform: "uppercase" as const,
                whiteSpace: "nowrap" as const,
                pointerEvents: "none" as const,
                boxShadow: "0 1px 4px rgba(0,0,0,0.1)",
                opacity: `var(--cobe-visible-arc-${a.id}, 0)`,
                filter: `blur(calc((1 - var(--cobe-visible-arc-${a.id}, 0)) * 8px))`,
                transition: "opacity 0.8s, filter 0.8s",
              }}
            >
              {a.label}
              <span
                style={{
                  position: "absolute",
                  top: "100%",
                  left: "50%",
                  transform: "translate3d(-50%, -1px, 0)",
                  border: "5px solid transparent",
                  borderTopColor: "#fff",
                }}
              />
            </div>
          ))}
      </div>

      {enableZoom && (
        <div className="absolute bottom-4 right-4 z-20 flex flex-col gap-2">
          <button
            onClick={() => applyZoom(zoomRef.current * 1.25)}
            className="glass flex h-9 w-9 items-center justify-center rounded-full text-lg text-white/90 transition hover:bg-white/10"
            aria-label="Yakinlastir"
          >
            +
          </button>
          <button
            onClick={() => applyZoom(zoomRef.current / 1.25)}
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
