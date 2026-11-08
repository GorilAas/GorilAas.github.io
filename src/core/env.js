export const gsap = window.gsap;
export const CALM = matchMedia('(prefers-reduced-motion: reduce)').matches;
export const COARSE = matchMedia('(pointer: coarse)').matches;
export const SMALL = Math.min(innerWidth, innerHeight) < 700;
export const LOW = COARSE || SMALL || (navigator.deviceMemory || 8) <= 4 || (navigator.hardwareConcurrency || 8) <= 4;
export const $ = (s) => document.querySelector(s);
export const wait = (ms) => new Promise((r) => setTimeout(r, ms));

export let ANISO = 8;
export const setAniso = (v) => { ANISO = v; };
