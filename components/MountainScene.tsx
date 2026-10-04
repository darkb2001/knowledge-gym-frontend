"use client";

import { useId } from "react";
import { farSnowPeaks, middleSnowPeaks, snowCapGeometry, type SnowPeak } from "@/lib/landscape";

function SnowCap({ id, definition }: { id: string; definition: SnowPeak }) {
  const geometry = snowCapGeometry(definition);
  return <g><defs><clipPath id={id}><path d={geometry.outline} /></clipPath></defs><path className="scene-snow" d={geometry.outline} /><path className="scene-snow-shadow" d={geometry.facet} clipPath={`url(#${id})`} /></g>;
}

/** Original geometric landscape, inspired by the supplied references; no screenshot pixels or remote assets. */
export function MountainScene({ portrait = false }: { portrait?: boolean }) {
  const key = useId().replace(/:/g, "");
  const sky = `${key}-sky`, light = `${key}-light`, mist = `${key}-mist`, pine = `${key}-pine`, meteor = `${key}-meteor`;
  return <div className={`mountain-scene ${portrait ? "mountain-scene--portrait" : "mountain-scene--global"}`} aria-hidden="true" data-scenic-background>
    <svg viewBox={portrait ? "360 0 720 1000" : "0 0 1440 1000"} preserveAspectRatio="xMidYMid slice" focusable="false">
      <defs>
        <linearGradient id={sky} x2="0" y2="1"><stop className="scene-sky-top" /><stop offset="1" className="scene-sky-bottom" /></linearGradient>
        <radialGradient id={light}><stop stopColor="#f4fcff" stopOpacity=".4" /><stop offset="1" stopColor="#eefaff" stopOpacity="0" /></radialGradient>
        <linearGradient id={mist} x2="0" y2="1"><stop stopColor="#cfedf2" stopOpacity="0" /><stop offset=".7" stopColor="#cfedf2" stopOpacity=".2" /><stop offset="1" stopColor="#cfedf2" stopOpacity="0" /></linearGradient>
        <linearGradient id={meteor} x1="0" y1="1" x2="1" y2="0"><stop stopColor="#e8faff" stopOpacity=".95" /><stop offset="1" stopColor="#e8faff" stopOpacity="0" /></linearGradient>
        <g id={pine}><path d="M0 0 -8 17 -4 16 -13 30 -7 28 -18 44 -10 42 -24 61 24 61 10 42 18 44 7 28 13 30 4 16 8 17Z" /><path d="M-2 56H2V76H-2Z" /></g>
      </defs>
      <path fill={`url(#${sky})`} d="M0 0H1440V1000H0Z" />
      <g className="scene-stars" fill="#e1f4fc">{Array.from({ length: 34 }, (_, i) => <circle key={i} cx={65 + ((i * 193) % 1300)} cy={35 + ((i * 71) % 375)} r={i % 5 === 0 ? 1.8 : .9} opacity={.35 + (i % 4) * .15} />)}<path d="M260 130v14m-7-7h14M1154 93v9m-4.5-4.5h9" stroke="#d9effa" strokeWidth="1" /></g>
      <g className="scene-birds"><g className="scene-flock">{[[620,116,1],[653,133,.8],[684,149,.95],[715,130,.72],[747,111,.85],[778,141,.65]].map(([x,y,scale],i) => <g key={i} transform={`translate(${x} ${y}) scale(${scale})`}><path className={`scene-bird-wing scene-bird-wing--${i % 3}`} d="M-9 1Q-4-5 0 0Q4-5 9 1" fill="none" strokeWidth="1.7" strokeLinecap="round" /></g>)}</g></g>
      <g className="scene-meteors">{[[1120,95],[1340,150]].map(([x,y],i) => <g key={i} transform={`translate(${x} ${y})`}><g className={`scene-meteor scene-meteor--${i}`}><path d="M0 0 140-75" fill="none" stroke={`url(#${meteor})`} strokeWidth="1.6" strokeLinecap="round" /><circle r="1.5" fill="#e8faff" /></g></g>)}</g>
      <g className="scene-orb"><circle cx="934" cy="200" r="130" fill={`url(#${light})`} /><circle cx="934" cy="200" r="39" className="scene-moon" /><g className="scene-craters" fill="#71919e" opacity=".16"><circle cx="923" cy="184" r="9" /><circle cx="948" cy="208" r="12" /><circle cx="918" cy="215" r="5" /></g></g>
      <g className="scene-ridge scene-ridge--far">
        <path className="scene-far" d="M-100 690 90 417 187 514 355 272 532 521 665 389 804 556 995 317 1155 502 1334 263 1550 577V1100H-100Z" />
        <path className="scene-far-facet" d="m355 272-39 319 216-70Zm640 45-22 358 182-173Zm339-54-31 425 247-111Z" />
        {farSnowPeaks.map((definition,i) => <SnowCap key={i} id={`${key}-far-snow-${i}`} definition={definition} />)}
      </g>
      <g className="scene-ridge scene-ridge--middle"><path className="scene-middle" d="M-80 780 121 582 236 670 445 463 659 737 822 555 1035 684 1190 483 1530 742V1100H-80Z" /><path className="scene-middle-facet" d="m445 463-66 354 280-80Zm377 92-9 289 222-160Zm368-72-43 385 383-126Z" /><g opacity=".55">{middleSnowPeaks.map((definition,i) => <SnowCap key={i} id={`${key}-middle-snow-${i}`} definition={definition} />)}</g></g>
      <g className="scene-haze"><path fill={`url(#${mist})`} d="M-200 495Q360 625 850 548T1640 534V840H-200Z" /></g>
      <g className="scene-ridge scene-ridge--near"><path className="scene-near" d="M-80 892 108 747 338 831 565 665 750 814 1019 697 1229 819 1510 652V1100H-80Z" /><path className="scene-near-facet" d="m565 665-42 309 227-160Zm454 32-117 294 327-172Z" /></g>
      <path className="scene-river" d="M827 802q-80 57-24 79t-94 55q-120 39-113 64h221q-95-36 34-72t-25-57q-43-18 1-69Z" />
      <g className="scene-forest scene-forest--back">{Array.from({ length: 42 }, (_, i) => <use key={i} href={`#${pine}`} transform={`translate(${i * 37 - 40} ${765 + Math.sin(i * .77) * 40}) scale(${.46 + (i % 5) * .1})`} />)}</g>
      <path className="scene-ground" d="M-30 943Q150 858 349 943T704 978Q1069 834 1470 921V1100H-30Z" />
      <g className="scene-forest scene-forest--front">{Array.from({ length: 26 }, (_, i) => <use key={i} href={`#${pine}`} transform={`translate(${i * 62 - 35} ${847 + Math.sin(i * .6) * 49}) scale(${.9 + (i % 4) * .24})`} />)}</g>
      <g className="scene-haze scene-haze--low"><path fill={`url(#${mist})`} d="M-200 875Q260 802 699 904T1660 862V1100H-200Z" /></g>
    </svg>
  </div>;
}
