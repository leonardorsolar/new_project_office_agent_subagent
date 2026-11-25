// Ajudantes de projeção isométrica para SVG.
// Mundo: x vai para a direita-baixo, y para a esquerda-baixo, z para cima.
// A parede da esquerda fica no plano x = 0 e a da direita no plano y = 0.
const ISO = (() => {
  const NS = 'http://www.w3.org/2000/svg';
  const C = Math.cos(Math.PI / 6); // cos 30°
  const U = 34;                    // pixels por unidade do mundo

  // ponto 3D -> ponto 2D na tela
  const P = (x, y, z = 0) => [(x - y) * C * U, (x + y) * 0.5 * U - z * U];
  const fmt = (pts) => pts.map((p) => P(...p).map((n) => n.toFixed(1)).join(',')).join(' ');

  function el(tag, attrs = {}, pai) {
    const e = document.createElementNS(NS, tag);
    for (const k in attrs) e.setAttribute(k, attrs[k]);
    if (pai) pai.appendChild(e);
    return e;
  }
  const g = (pai, attrs = {}) => el('g', attrs, pai);

  // traço da mesma cor fecha as frestas entre faces vizinhas
  const fecha = (cor) => ({ stroke: cor, 'stroke-width': 0.8, 'stroke-linejoin': 'round' });
  const poly = (pai, pts, fill, attrs = {}) => el('polygon', { points: fmt(pts), fill, ...fecha(fill), ...attrs }, pai);

  // clareia (k > 0) ou escurece (k < 0) uma cor #rrggbb
  function tom(hex, k) {
    const n = parseInt(hex.slice(1), 16);
    const alvo = k > 0 ? 255 : 0, a = Math.abs(k);
    const c = [n >> 16, (n >> 8) & 255, n & 255].map((v) => Math.round(v + (alvo - v) * a));
    return '#' + ((1 << 24) | (c[0] << 16) | (c[1] << 8) | c[2]).toString(16).slice(1);
  }

  // linha entre dois pontos 3D
  function linha(pai, a, b, attrs = {}) {
    const [x1, y1] = P(...a), [x2, y2] = P(...b);
    return el('line', { x1, y1, x2, y2, ...attrs }, pai);
  }

  // caixa: desenha só as três faces visíveis (topo, frente-esquerda +y, frente-direita +x)
  // o.brilho = false desliga o realce de 1px nas arestas de cima (útil em peças minúsculas)
  function caixa(pai, [x0, x1], [y0, y1], [z0, z1], cor, o = {}) {
    const topo = o.topo ?? tom(cor, 0.14);
    const esq = o.esq ?? cor;
    const dir = o.dir ?? tom(cor, -0.2);
    const gr = g(pai, o.attrs);
    poly(gr, [[x0, y1, z0], [x1, y1, z0], [x1, y1, z1], [x0, y1, z1]], esq);
    poly(gr, [[x1, y0, z0], [x1, y1, z0], [x1, y1, z1], [x1, y0, z1]], dir);
    poly(gr, [[x0, y0, z1], [x1, y0, z1], [x1, y1, z1], [x0, y1, z1]], topo);
    if (o.brilho !== false) {
      // realce: as duas arestas da frente do topo pegam luz (efeito "chanfro" de render 3D)
      const realce = g(gr, { stroke: tom(topo, 0.55), 'stroke-width': 1, 'stroke-linecap': 'round', opacity: 0.7 });
      linha(realce, [x0, y1, z1], [x1, y1, z1]);
      linha(realce, [x1, y0, z1], [x1, y1, z1]);
    }
    return gr;
  }

  // pontos 2D sobre um plano fixo
  const noX = (x, pts) => pts.map(([y, z]) => [x, y, z]);
  const noY = (y, pts) => pts.map(([x, z]) => [x, y, z]);
  const noZ = (z, pts) => pts.map(([x, y]) => [x, y, z]);
  const ret = (a0, a1, b0, b1) => [[a0, b0], [a1, b0], [a1, b1], [a0, b1]];
  const circ = (ca, cb, r, n = 24) =>
    Array.from({ length: n }, (_, i) => { const t = (i / n) * Math.PI * 2; return [ca + r * Math.cos(t), cb + r * Math.sin(t)]; });

  // cilindro em pé: lateral com sombreado arredondado + tampa elíptica
  function cilindro(pai, cx, cy, z0, z1, r, cor, o = {}) {
    const gr = g(pai, o.attrs);
    const rx = r * Math.SQRT2 * C * U, ry = r * Math.SQRT2 * 0.5 * U;
    const [sx, b] = P(cx, cy, z0), [, t] = P(cx, cy, z1);
    const lado = `M${sx - rx},${t} L${sx - rx},${b} A${rx},${ry} 0 0 0 ${sx + rx},${b} L${sx + rx},${t} Z`;
    el('path', { d: lado, fill: cor }, gr);
    el('path', { d: lado, fill: 'url(#cilindro)' }, gr);
    el('ellipse', { cx: sx, cy: t, rx, ry, fill: o.tampa ?? tom(cor, 0.15) }, gr);
    return gr;
  }

  // elipse deitada no plano do chão (ou de qualquer altura z), de raio r no mundo
  const elipseZ = (pai, x, y, z, r, attrs = {}) => {
    const [sx, sy] = P(x, y, z);
    return el('ellipse', { cx: sx, cy: sy, rx: r * Math.SQRT2 * C * U, ry: r * Math.SQRT2 * 0.5 * U, ...attrs }, pai);
  };

  // número pseudoaleatório fixo a partir de uma semente (a cena sai igual a cada carga)
  const sorteio = (s) => { const v = Math.sin(s * 127.1 + 311.7) * 43758.5453; return v - Math.floor(v); };

  // aproxima a de b de forma amortecida, independente do fps (mesma fórmula do projeto original)
  const amort = (a, b, taxa, dt) => a + (b - a) * (1 - Math.exp(-taxa * dt));
  const limita = (v, min, max) => Math.min(max, Math.max(min, v));

  return { NS, C, U, P, el, g, poly, tom, linha, caixa, noX, noY, noZ, ret, circ, cilindro, elipseZ, sorteio, amort, limita };
})();
