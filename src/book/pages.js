import * as THREE from 'three';
import { C, cornerOrn, dropCap, emblem, F_BL, F_IN, F_TX, fitFont, fleuron, folio, font, gloss, goldGrad, head, icon, listJoin, margins, mk, MOTTLE, para, parchment, PH, PW, rule, toRoman, U, UH, vine, waxEmblem } from './canvas.js';
import { ASSETS } from '../core/assets.js';
import { B, fmt } from '../core/i18n.js';
import { SITE } from '../data/conteudo.js';
import { leather } from '../scene/materials.js';
import { ANISO } from '../core/env.js';

export let LINK_RECTS = [], POEM_SPLIT = 0;
export function wrapLines(ctx, text, w) {
  const words = text.split(/\s+/).filter(Boolean), out = []; let line = '';
  for (const wd of words) { const t = line ? line + ' ' + wd : wd; if (ctx.measureText(t).width > w && line) { out.push(line); line = wd; } else line = t; }
  if (line) out.push(line); return out;
}
export const POEM = { size: 30, lh: 41, gap: 20, indent: 30 };
export function stanzaLines(ctx, st, w) { const out = []; for (const l of st) wrapLines(ctx, l, w).forEach((x, k) => out.push([x, k > 0])); return out; }
export function drawStanzas(ctx, from, x, y, w, limit) {
  font(ctx, POEM.size, F_TX, 'italic'); ctx.fillStyle = C.ink;
  const st = SITE.poem.stanzas; let i = from;
  for (; i < st.length; i++) {
    const lines = stanzaLines(ctx, st[i], w - POEM.indent);
    if (y + lines.length * POEM.lh > limit) break;
    for (const [t, cont] of lines) { ctx.fillText(t, x + (cont ? POEM.indent : 0), y); y += POEM.lh; }
    y += POEM.gap;
  }
  return { i, y };
}
export const PAGES = {
  frontis(ctx) {
    ctx.strokeStyle = C.rubric; ctx.lineWidth = 3; ctx.strokeRect(70, 80, 860, 1173); ctx.lineWidth = 1.2; ctx.strokeRect(86, 96, 828, 1141);
    cornerOrn(ctx, 100, 110, 1, 1); cornerOrn(ctx, 900, 110, -1, 1); cornerOrn(ctx, 100, 1223, 1, -1); cornerOrn(ctx, 900, 1223, -1, -1);
    font(ctx, 32, F_TX, '600'); ctx.fillStyle = C.rubric; ctx.textAlign = 'center'; ctx.fillText(B().frontRubric, 500, 380); ctx.textAlign = 'left';
    const name = SITE.name, first = name[0], rest = name.slice(1), by = 600;
    let size = 210; font(ctx, size * 1.1, F_IN); let w1 = ctx.measureText(first).width; font(ctx, size, F_BL); let w2 = ctx.measureText(rest).width;
    if (w1 + w2 > 720) { size *= 720 / (w1 + w2); font(ctx, size * 1.1, F_IN); w1 = ctx.measureText(first).width; font(ctx, size, F_BL); w2 = ctx.measureText(rest).width; }
    const x = 500 - (w1 + w2) / 2;
    font(ctx, size * 1.1, F_IN); ctx.fillStyle = '#4a300c'; ctx.fillText(first, x + 3, by + 3);
    ctx.fillStyle = goldGrad(ctx, x, by - size * 0.8, x + w1, by); ctx.fillText(first, x, by);
    font(ctx, size, F_BL); ctx.fillStyle = C.ink; ctx.fillText(rest, x + w1 + 6, by);
    font(ctx, 34, F_TX, '600'); ctx.fillStyle = C.soft; ctx.textAlign = 'center'; ctx.fillText(SITE.fullName, 500, 680); ctx.textAlign = 'left';
    font(ctx, 34, F_TX, 'italic'); ctx.fillStyle = C.soft; para(ctx, B().tagline, 180, 740, 640, 50, { center: true });
    fleuron(ctx, 500, 880, 300);
    waxEmblem(ctx, 500, 1020, 66, first);
    font(ctx, 27, F_TX, '600'); ctx.fillStyle = C.soft; ctx.textAlign = 'center'; ctx.fillText('Anno Domini ' + SITE.year, 500, 1170); ctx.textAlign = 'left';
  },
  about(ctx) {
    const { x0, x1 } = margins('L'), w = x1 - x0;
    vine(ctx, 70, 150, 1180);
    let y = head(ctx, B().chapter[0], B().titles.about, x0, 190, w) + 10;
    const t = B().about[0];
    dropCap(ctx, t[0], x0, y - 42, 160);
    font(ctx, 34, F_TX); ctx.fillStyle = C.ink;
    y = para(ctx, t.slice(1), x0, y, w, 51, { justify: true, indentLines: 3, indent: 182 });
    y += 16;
    for (const p of B().about.slice(1)) y = para(ctx, p, x0, y, w, 51, { justify: true }) + 16;
    gloss(ctx, B().aboutNote, x0, Math.min(y + 30, 1200), w);
    folio(ctx, 'i');
  },
  sheet(ctx) {
    const { x0, x1 } = margins('R'), w = x1 - x0;
    let y = head(ctx, SITE.fullName, B().titles.sheet, x0, 190, w);
    for (const [k, v] of B().fields) {
      font(ctx, 28, F_TX, '600'); ctx.fillStyle = C.rubric; ctx.fillText(k, x0, y);
      font(ctx, 32, F_TX, 'italic'); ctx.fillStyle = C.ink; para(ctx, v, x0 + 190, y, w - 190, 40); y += 54;
    }
    y += 2; rule(ctx, x0, y, w); y += 74;
    font(ctx, 31, F_TX, '600'); ctx.fillStyle = C.soft; ctx.fillText(B().level, x0, y);
    const lw = ctx.measureText(B().level).width;
    font(ctx, 56, F_TX, '600'); ctx.fillStyle = C.rubric; ctx.fillText(toRoman(SITE.level), x0 + lw + 22, y + 4);
    y += 74;
    font(ctx, 28, F_TX, '600'); ctx.fillStyle = C.rubric; ctx.fillText(B().arms, x0, y);
    y += 54;
    SITE.arms.forEach((a, i) => {
      const cx = x0 + (i % 2) * (w / 2), cy = y + Math.floor(i / 2) * 48;
      ctx.fillStyle = C.gold; ctx.beginPath(); ctx.moveTo(cx + 8, cy - 22); ctx.lineTo(cx + 16, cy - 12); ctx.lineTo(cx + 8, cy - 2); ctx.lineTo(cx, cy - 12); ctx.closePath(); ctx.fill();
      font(ctx, 32, F_TX); ctx.fillStyle = C.ink; ctx.fillText(a, cx + 28, cy);
    });
    y += Math.ceil(SITE.arms.length / 2) * 48;
    gloss(ctx, B().sheetNote, x0, y + 18, w);
    folio(ctx, 'ii');
  },
  works(ctx, side, from, count, withHead, n) {
    const { x0, x1 } = margins(side), w = x1 - x0;
    let y = withHead ? head(ctx, B().chapter[1], B().titles.works, x0, 190, w) + 60 : 230;
    if (withHead) vine(ctx, side === 'L' ? 70 : 930, 150, 520);
    for (let i = from; i < from + count && i < SITE.works.length; i++) {
      const it = { ...SITE.works[i], ...B().works[i] };
      rule(ctx, x0, y - 46, w);
      font(ctx, 40, F_TX, '600'); ctx.fillStyle = C.ink; ctx.fillText(it.title, x0, y);
      if (it.when) { font(ctx, 28, F_TX, '600'); ctx.fillStyle = C.rubric; ctx.textAlign = 'right'; ctx.fillText(it.when, x1, y); ctx.textAlign = 'left'; }
      y += 60; font(ctx, 34, F_TX); ctx.fillStyle = C.ink; y = para(ctx, it.text, x0, y, w, 50);
      if (it.tools.length) {
        font(ctx, 30, F_TX, 'italic'); ctx.fillStyle = C.soft; const lead = B().wrought + ' ';
        ctx.fillText(lead, x0, y + 6); const lw = ctx.measureText(lead).width;
        ctx.fillStyle = C.lapis; font(ctx, 30, F_TX, '600'); para(ctx, listJoin(it.tools), x0 + lw, y + 6, w - lw, 40);
        y += 50;
      }
      y += 96;
    }
    if (!withHead && ASSETS.scribe) {
      const im = ASSETS.scribe, bh = Math.min(560, 1060 - y - 10), bw = bh * im.width / im.height, bx = x0 + (w - bw) / 2, by = y - 30;
      ctx.drawImage(im, bx, by, bw, bh);
      ctx.strokeStyle = C.rubric; ctx.lineWidth = 2; ctx.strokeRect(bx - 12, by - 12, bw + 24, bh + 24); ctx.lineWidth = 0.8; ctx.strokeRect(bx - 20, by - 20, bw + 40, bh + 40);
      font(ctx, 24, F_TX, 'italic'); ctx.fillStyle = C.soft; ctx.textAlign = 'center'; ctx.fillText(B().scribeCaption, x0 + w / 2, by + bh + 52); ctx.textAlign = 'left';
    }
    if (!withHead) gloss(ctx, B().worksNote, x0, Math.max(y + 10, 1150), w);
    folio(ctx, n);
  },
  games(ctx, side, from, count, withHead, n) {
    const { x0, x1 } = margins(side), w = x1 - x0;
    let y = withHead ? head(ctx, B().chapter[2], B().titles.games, x0, 190, w) + 80 : 240;
    for (let i = from; i < from + count && i < SITE.games.length; i++) {
      const g = { ...SITE.games[i], ...B().games[i] };
      rule(ctx, x0, y - 52, w);
      emblem(ctx, g.emblem, x0 + 60, y + 30, 58);
      const tx = x0 + 150, tw = x1 - tx;
      fitFont(ctx, g.name, 44, F_TX, tw, '600'); ctx.fillStyle = C.rubric; ctx.fillText(g.name, tx, y + 12);
      font(ctx, 27, F_TX, '600'); ctx.fillStyle = C.lapis; ctx.fillText(g.kind, tx, y + 54);
      font(ctx, 31, F_TX); ctx.fillStyle = C.ink; const yy = para(ctx, g.text, tx, y + 100, tw, 44);
      const sx = tx + 12, sy = yy - 4, rg = ctx.createRadialGradient(sx - 3, sy - 3, 1, sx, sy, 12);
      rg.addColorStop(0, '#d65244'); rg.addColorStop(1, '#6e1410'); ctx.fillStyle = rg; ctx.beginPath(); ctx.arc(sx, sy, 11, 0, 7); ctx.fill();
      font(ctx, 28, F_TX, 'italic'); ctx.fillStyle = C.soft; ctx.fillText(g.note, tx + 34, yy + 4);
      y = yy + 110;
    }
    folio(ctx, n);
  },
  pastimes(ctx) {
    const { x0, x1 } = margins('L'), w = x1 - x0;
    let y = head(ctx, B().chapter[3], B().titles.pastimes, x0, 190, w);
    B().pastimes.forEach((p, i) => {
      icon(ctx, SITE.pastimes[i], x0, y - 34, 88);
      const tx = x0 + 128, tw = x1 - tx;
      font(ctx, 37, F_TX, '600'); ctx.fillStyle = C.ink; ctx.fillText(p.title, tx, y + 4);
      font(ctx, 31, F_TX); ctx.fillStyle = C.ink; const yy = para(ctx, p.text, tx, y + 50, tw, 44);
      y = Math.max(yy, y + 104) + 28;
      ctx.setLineDash([3, 7]); rule(ctx, x0, y - 30, w, 0.35); ctx.setLineDash([]);
      y += 30;
    });
    folio(ctx, 'vii');
  },
  relics(ctx) {
    const { x0, x1 } = margins('R'), w = x1 - x0, cw = (w - 56) / 2;
    const y0 = head(ctx, B().chapter[4], B().titles.relics, x0, 190, w) + 26;
    const cols = [[0, 2], [1, 3]], ends = [];
    cols.forEach((idx, c) => {
      const x = x0 + c * (cw + 56); let y = y0;
      for (const i of idx) {
        const r = B().relics[i]; if (!r) continue;
        font(ctx, 29, F_TX, '600'); ctx.fillStyle = C.rubric; y = para(ctx, r.title, x, y, cw, 36) - 36;
        ctx.strokeStyle = 'rgba(163,36,28,.4)'; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.moveTo(x, y + 14); ctx.lineTo(x + cw, y + 14); ctx.stroke();
        y += 56;
        for (const it of r.items) {
          ctx.fillStyle = C.gold; ctx.beginPath(); ctx.ellipse(x + 9, y - 10, 9, 4.5, -0.6, 0, 7); ctx.fill();
          font(ctx, 29, F_TX); ctx.fillStyle = C.ink; y = para(ctx, it, x + 30, y, cw - 30, 38) + 8;
        }
        y += 40;
      }
      ends.push(y);
    });
    gloss(ctx, B().relicsNote, x0, Math.max(ends[0] + 10, 1130), w * 0.56);
    folio(ctx, 'viii');
  },
  poem(ctx, part) {
    const side = part === 0 ? 'L' : 'R', { x0, x1 } = margins(side), w = x1 - x0;
    if (part === 0) {
      vine(ctx, 70, 150, 640);
      let y = head(ctx, B().chapter[5], B().titles.poem, x0, 190, w);
      font(ctx, 36, F_TX, '600'); ctx.fillStyle = C.rubric; ctx.fillText(SITE.poem.title, x0, y);
      y += 40;
      if (B().poemNote) { font(ctx, 25, F_TX, 'italic'); ctx.fillStyle = C.soft; ctx.fillText(B().poemNote, x0, y); y += 18; }
      y += 46;
      POEM_SPLIT = drawStanzas(ctx, 0, x0, y, w, 1225).i;
      folio(ctx, 'ix');
    } else {
      const r = drawStanzas(ctx, POEM_SPLIT, x0, 200, w, 1170);
      font(ctx, 28, F_TX, '600'); ctx.fillStyle = C.rubric; ctx.textAlign = 'right'; ctx.fillText(SITE.nick, x1, Math.min(r.y + 24, 1215)); ctx.textAlign = 'left';
      folio(ctx, 'x');
    }
  },
  colophon(ctx) {
    LINK_RECTS = [];
    fleuron(ctx, 500, 160, 320);
    font(ctx, 29, F_TX, '600'); ctx.fillStyle = C.rubric; ctx.textAlign = 'center'; ctx.fillText(B().colophonRubric, 500, 236);
    fitFont(ctx, B().titles.colophon, 90, F_BL, 760); ctx.fillStyle = C.ink; ctx.fillText(B().titles.colophon, 500, 334);
    font(ctx, 34, F_TX, 'italic'); ctx.fillStyle = C.soft;
    let y = 420; for (const l of B().contact) { ctx.fillText(l, 500, y); y += 50; }
    y += 34; font(ctx, 29, F_TX, '600'); ctx.fillStyle = C.rubric; ctx.fillText(B().findMe, 500, y); y += 62;
    for (const l of SITE.links) {
      font(ctx, 37, F_TX, '600'); ctx.fillStyle = C.lapis; ctx.fillText(l.label, 500, y);
      const lw = ctx.measureText(l.label).width;
      ctx.strokeStyle = 'rgba(34,64,138,.55)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(500 - lw / 2, y + 8); ctx.lineTo(500 + lw / 2, y + 8); ctx.stroke();
      LINK_RECTS.push({ x0: 500 - lw / 2 - 16, x1: 500 + lw / 2 + 16, y0: y - 38, y1: y + 16, url: l.url });
      y += 56;
    }
    if (SITE.email) { font(ctx, 32, F_TX, 'italic'); ctx.fillStyle = C.soft; ctx.fillText(SITE.email, 500, y + 10); }
    font(ctx, 27, F_TX, '600'); ctx.fillStyle = C.rubric;
    ctx.fillText(fmt(B().explicit[0]), 500, 1160);
    ctx.fillText(fmt(B().explicit[1]), 500, 1202);
    ctx.textAlign = 'left';
    folio(ctx, 'xi');
  },
  finis(ctx) {
    const lj = ASSETS.lj;
    if (lj) {
      const bw = 470, bh = bw * lj.height / lj.width, bx = 500 - bw / 2, by = 130;
      ctx.save(); ctx.globalCompositeOperation = 'multiply'; ctx.drawImage(lj, bx, by, bw, bh); ctx.restore();
      ctx.strokeStyle = C.rubric; ctx.lineWidth = 2.5; ctx.strokeRect(bx - 22, by - 22, bw + 44, bh + 44); ctx.lineWidth = 1; ctx.strokeRect(bx - 32, by - 32, bw + 64, bh + 64);
      font(ctx, 150, F_BL); ctx.fillStyle = C.rubric; ctx.textAlign = 'center'; ctx.fillText('Finis', 500, by + bh + 190);
      font(ctx, 31, F_TX, 'italic'); ctx.fillStyle = C.soft; ctx.fillText(B().finis, 500, by + bh + 258);
      ctx.textAlign = 'left'; return;
    }
    fleuron(ctx, 500, 470, 360);
    font(ctx, 170, F_BL); ctx.fillStyle = C.rubric; ctx.textAlign = 'center'; ctx.fillText('Finis', 500, 690);
    font(ctx, 32, F_TX, 'italic'); ctx.fillStyle = C.soft; ctx.fillText(B().finis, 500, 780);
    fleuron(ctx, 500, 860, 220); ctx.textAlign = 'left';
  },
  endpaper(ctx) {
    const im = ASSETS.portrait;
    if (!im) return;
    const bh = 1150, bw = bh * im.width / im.height, bx = 500 - bw / 2, by = (UH - bh) / 2 - 10;
    ctx.save(); ctx.shadowColor = 'rgba(40,20,5,.45)'; ctx.shadowBlur = 14; ctx.shadowOffsetY = 4; ctx.drawImage(im, bx, by, bw, bh); ctx.restore();
    ctx.save(); ctx.globalCompositeOperation = 'multiply'; ctx.globalAlpha = 0.35; ctx.drawImage(MOTTLE, bx, by, bw, bh); ctx.restore();
    ctx.strokeStyle = C.rubric; ctx.lineWidth = 2.5; ctx.strokeRect(bx - 16, by - 16, bw + 32, bh + 32); ctx.lineWidth = 1; ctx.strokeRect(bx - 26, by - 26, bw + 52, bh + 52);
  }
};

export const PAGE_TEX = [];
export function paintPage(e) {
  const ctx = e.canvas.getContext('2d');
  ctx.setTransform(U, 0, 0, U, 0, 0); ctx.textBaseline = 'alphabetic'; ctx.textAlign = 'left';
  parchment(ctx, e.side); e.draw(ctx);
  e.tex.needsUpdate = true;
}
export function pageTexture(draw, side, mirror = false) {
  const canvas = mk(PW, PH), tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = ANISO;
  if (mirror) { tex.wrapS = THREE.RepeatWrapping; tex.repeat.x = -1; tex.offset.x = 1; }
  const e = { canvas, tex, draw, side }; PAGE_TEX.push(e); paintPage(e);
  return tex;
}

export const COVER = {};
export function paintCover() {
  const { m, r, b } = COVER.ctx, HH = 1365;
  for (const c of [m, r, b]) { c.setTransform(COVER.sx, 0, 0, COVER.sx, 0, 0); c.globalCompositeOperation = 'source-over'; c.globalAlpha = 1; c.textAlign = 'left'; }
  m.fillStyle = '#3c2015'; m.fillRect(0, 0, 1000, HH);
  m.save(); m.globalCompositeOperation = ASSETS.leatherImg ? 'overlay' : 'multiply'; m.globalAlpha = 0.9;
  m.drawImage(ASSETS.leatherImg || leather(), 0, 0, 1000, HH); m.restore();
  const wear = m.createRadialGradient(500, 600, 200, 500, 680, 820); wear.addColorStop(0, 'rgba(120,70,40,.25)'); wear.addColorStop(1, 'rgba(0,0,0,.45)');
  m.fillStyle = wear; m.fillRect(0, 0, 1000, HH);
  r.fillStyle = 'rgb(0,215,0)'; r.fillRect(0, 0, 1000, HH);
  b.fillStyle = '#b4b4b4'; b.fillRect(0, 0, 1000, HH);
  for (const [i, c] of [[40, 'rgba(0,0,0,.5)'], [118, 'rgba(0,0,0,.4)']]) {
    m.strokeStyle = c; m.lineWidth = 4; m.strokeRect(i, i, 1000 - 2 * i, HH - 2 * i);
    m.strokeStyle = 'rgba(255,210,170,.08)'; m.lineWidth = 2; m.strokeRect(i + 3, i + 3, 1000 - 2 * i, HH - 2 * i);
    b.strokeStyle = '#555'; b.lineWidth = 5; b.strokeRect(i, i, 1000 - 2 * i, HH - 2 * i);
  }
  const gold = (ctx, style) => {
    ctx.save(); ctx.fillStyle = style; ctx.strokeStyle = style; ctx.lineCap = 'round';
    ctx.lineWidth = 7; ctx.strokeRect(72, 72, 856, HH - 144); ctx.lineWidth = 2.6; ctx.strokeRect(92, 92, 816, HH - 184);
    const orn = (x, y, sx2, sy2) => { ctx.save(); ctx.translate(x, y); ctx.scale(sx2, sy2); ctx.lineWidth = 4.5;
      ctx.beginPath(); ctx.moveTo(0, 150); ctx.quadraticCurveTo(0, 0, 150, 0); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(30, 30); ctx.bezierCurveTo(80, 28, 108, 60, 104, 104); ctx.bezierCurveTo(70, 104, 56, 82, 60, 60); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(30, 30); ctx.bezierCurveTo(28, 80, 60, 108, 104, 104); ctx.stroke();
      ctx.beginPath(); ctx.arc(18, 18, 9, 0, 7); ctx.fill(); ctx.restore(); };
    orn(110, 110, 1, 1); orn(890, 110, -1, 1); orn(110, HH - 110, 1, -1); orn(890, HH - 110, -1, -1);
    ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(500, 290); ctx.lineTo(560, 350); ctx.lineTo(500, 410); ctx.lineTo(440, 350); ctx.closePath(); ctx.stroke();
    ctx.beginPath(); ctx.arc(500, 350, 12, 0, 7); ctx.fill();
    ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(300, 350); ctx.lineTo(420, 350); ctx.moveTo(580, 350); ctx.lineTo(700, 350); ctx.stroke();
    fitFont(ctx, SITE.name, 200, F_BL, 700); ctx.textAlign = 'center'; ctx.fillText(SITE.name, 500, 640);
    font(ctx, 40, F_TX, '600'); ctx.fillText(B().cover[0], 500, 735); ctx.fillText(B().cover[1], 500, 790);
    ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(380, 850); ctx.lineTo(620, 850); ctx.stroke();
    font(ctx, 32, F_TX, '600'); ctx.fillText('Anno Domini ' + SITE.year, 500, 1120);
    ctx.restore();
  };
  m.save(); m.shadowColor = 'rgba(0,0,0,.7)'; m.shadowBlur = 3; m.shadowOffsetY = 2; gold(m, goldGrad(m, 0, 200, 1000, 1100)); m.restore();
  gold(r, 'rgb(0,80,255)');
  gold(b, '#3a3a3a');
  if (COVER.tex) for (const t of Object.values(COVER.tex)) t.needsUpdate = true;
}
export function coverTextures() {
  const Wp = PW, Hp = Math.round(PW * 1.365);
  const map = mk(Wp, Hp), rm = mk(Wp, Hp), bump = mk(Wp, Hp);
  COVER.sx = Wp / 1000; COVER.ctx = { m: map.getContext('2d'), r: rm.getContext('2d'), b: bump.getContext('2d') };
  paintCover();
  const mk3 = (c, srgb) => { const t = new THREE.CanvasTexture(c); if (srgb) t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = ANISO; return t; };
  COVER.tex = { map: mk3(map, true), rm: mk3(rm), bump: mk3(bump) };
  return COVER.tex;
}
