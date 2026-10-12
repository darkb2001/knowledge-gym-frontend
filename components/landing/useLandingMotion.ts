"use client";

import { useEffect, type RefObject } from "react";

/** Event-driven DOM motion: no per-frame React updates, polling, or ambient loops. */
export function useLandingMotion(rootRef: RefObject<HTMLDivElement | null>, locale: string) {
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
    const fine = window.matchMedia("(hover: hover) and (pointer: fine)");
    const animations = new Set<Animation>();
    let frame = 0;
    let pointer: { x: number; y: number; target: Element | null } | null = null;
    let magnetic: HTMLElement | null = null;
    let scrollDirty = true;
    const neutral = () => {
      root.dataset.pointer = "false";
      root.style.setProperty("--tilt-x", "0deg"); root.style.setProperty("--tilt-y", "0deg");
      magnetic?.style.removeProperty("--magnet-x"); magnetic?.style.removeProperty("--magnet-y"); magnetic = null;
    };
    const sync = () => {
      frame = 0;
      if (document.hidden) return;
      if (scrollDirty) {
        const range = document.documentElement.scrollHeight - window.innerHeight;
        root.style.setProperty("--reading-progress", `${range > 0 ? Math.min(1, Math.max(0, window.scrollY / range)) : 0}`);
        const paths = root.querySelector<HTMLElement>(".landing-paths");
        const travel = paths ? Math.max(-1, Math.min(1, (paths.getBoundingClientRect().top - window.innerHeight / 2) / window.innerHeight)) : 0;
        root.style.setProperty("--path-travel", `${reduced.matches ? 0 : travel * 28}px`);
        scrollDirty = false;
      }
      if (!pointer || reduced.matches || !fine.matches) { neutral(); return; }
      const { x, y, target } = pointer;
      root.style.setProperty("--pointer-x", `${x}px`); root.style.setProperty("--pointer-y", `${y}px`);
      root.dataset.pointer = "true";
      root.dataset.pointerFocus = target?.closest("a, button, [role='button'], [data-motion-target]") ? "true" : "false";
      const art = target?.closest<HTMLElement>(".landing-hero-art");
      if (art) {
        const box = art.getBoundingClientRect();
        root.style.setProperty("--tilt-x", `${-(y - box.top - box.height / 2) / box.height * 5}deg`);
        root.style.setProperty("--tilt-y", `${(x - box.left - box.width / 2) / box.width * 6}deg`);
      } else { root.style.setProperty("--tilt-x", "0deg"); root.style.setProperty("--tilt-y", "0deg"); }
      const next = target?.closest<HTMLElement>(".landing-primary") ?? null;
      if (next !== magnetic) { magnetic?.style.removeProperty("--magnet-x"); magnetic?.style.removeProperty("--magnet-y"); magnetic = next; }
      if (magnetic) {
        const box = magnetic.getBoundingClientRect();
        magnetic.style.setProperty("--magnet-x", `${Math.max(-4, Math.min(4, (x - box.left - box.width / 2) * .07))}px`);
        magnetic.style.setProperty("--magnet-y", `${Math.max(-3, Math.min(3, (y - box.top - box.height / 2) * .07))}px`);
      }
    };
    const request = () => { if (!frame && !document.hidden) frame = requestAnimationFrame(sync); };
    const move = (event: PointerEvent) => {
      if (document.querySelector(".landing-reader-dialog[open]")) { leave(); return; }
      if (event.pointerType !== "mouse" || reduced.matches || !fine.matches) return;
      pointer = { x: event.clientX, y: event.clientY, target: event.target instanceof Element ? event.target : null }; request();
    };
    const leave = () => { pointer = null; neutral(); };
    const scroll = () => { scrollDirty = true; pointer = null; neutral(); request(); };
    const preference = () => { if (reduced.matches) { animations.forEach(animation => animation.cancel()); leave(); } scroll(); };
    const visibility = () => { if (document.hidden) { if (frame) cancelAnimationFrame(frame); frame = 0; animations.forEach(animation => animation.cancel()); leave(); } else scroll(); };
    const seen = new WeakSet<Element>();
    const observer = typeof IntersectionObserver === "undefined" ? null : new IntersectionObserver(entries => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        observer?.unobserve(entry.target);
        if (reduced.matches || document.hidden || typeof entry.target.animate !== "function") continue;
        const element = entry.target;
        const frames = element.matches(".landing-english-art") ? [{ opacity: .8, clipPath: "inset(0 0 10% 0)" }, { opacity: 1, clipPath: "inset(0)" }]
          : element.matches(".landing-topic-map") ? [{ opacity: .8, transform: "scale(.94) rotate(-2deg)" }, { opacity: 1, transform: "none" }]
          : element.matches(".landing-method-row") ? [{ opacity: .8, transform: "translateX(22px)" }, { opacity: 1, transform: "none" }]
          : [{ opacity: .8, transform: "translateY(16px)" }, { opacity: 1, transform: "none" }];
        const animation = element.animate(frames, { duration: 650, easing: "cubic-bezier(.16,1,.3,1)" });
        animations.add(animation); void animation.finished.then(() => animations.delete(animation), () => animations.delete(animation));
      }
    }, { threshold: .16 });
    const observe = () => root.querySelectorAll(".landing-method-row, .landing-topic-map, .landing-english-art, .landing-article, .landing-closing h2").forEach(element => {
      if (!seen.has(element)) { seen.add(element); observer?.observe(element); }
    });
    observe();
    const mutations = new MutationObserver(() => { observe(); scrollDirty = true; request(); });
    mutations.observe(root, { childList: true, subtree: true });
    root.addEventListener("pointermove", move, { passive: true }); root.addEventListener("pointerleave", leave);
    window.addEventListener("scroll", scroll, { passive: true }); window.addEventListener("resize", scroll, { passive: true });
    reduced.addEventListener("change", preference); fine.addEventListener("change", preference); document.addEventListener("visibilitychange", visibility);
    request();
    return () => {
      if (frame) cancelAnimationFrame(frame);
      animations.forEach(animation => animation.cancel()); observer?.disconnect(); mutations.disconnect(); neutral();
      root.removeEventListener("pointermove", move); root.removeEventListener("pointerleave", leave);
      window.removeEventListener("scroll", scroll); window.removeEventListener("resize", scroll);
      reduced.removeEventListener("change", preference); fine.removeEventListener("change", preference); document.removeEventListener("visibilitychange", visibility);
    };
  }, [rootRef, locale]);
}
