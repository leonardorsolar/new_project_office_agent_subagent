// Subagente: robô menor, sentado de pernas cruzadas no chão com um laptop no colo.
// Trabalha como o agente principal: segue os mesmos estados (trabalhando, pensando, esperando,
// terminou, finalizou), com o mesmo esquema de pose-alvo + amort() + movimento procedural.
//
// Ele fica DE FRENTE para quem olha a sala (direto para a "câmera", na diagonal do quarto),
// então é desenhado reto na tela, como a cabeça de frente do agente principal. A posição vem do
// mundo isométrico: o ponto do chão onde ele senta é projetado com P(x, y, z).
const SUB = (() => {
  const { el, g, P, amort, tom } = ISO;
  const f = (n) => n.toFixed(2);
  const reduzido = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const ESCURO = '#2A2B31', VIDRO = '#0E1118', OLHO = '#F0F8FF';
  const LUZ = { trabalhando: '#ff8a52', pensando: '#ffc45e', esperando: '#ff7fc0', terminou: '#62e08a', finalizou: '#62e08a', ocioso: '#a39a92' };

  // pose-alvo por estado: mãos (x, y em px a partir do ponto do chão), inclinação da cabeça,
  // olhar (dy dos olhos), balão. No teclado do laptop as mãos ficam nas laterais da tampa.
  const POSES = {
    trabalhando: { maoE: [-23, -14], maoD: [23, -14], inclina: 0, olhar: 1.5, balao: null },
    pensando:    { maoE: [-23, -14], maoD: [9, -50], inclina: -8, olhar: -1.5, balao: 'pontos' },   // garra no queixo
    esperando:   { maoE: [-23, -14], maoD: [33, -74], inclina: 5, olhar: 0, balao: 'pergunta' },   // acenando
    terminou:    { maoE: [-33, -80], maoD: [33, -80], inclina: 0, olhar: 0, balao: 'ok' },        // braços para cima
    finalizou:   { maoE: [-33, -80], maoD: [33, -80], inclina: 0, olhar: 0, balao: 'ok' },
  };
  let nSubs = 0;

  /**
   * Cria um subagente.
   * svg: o <svg> da cena | pai: grupo onde ele é desenhado | topo: camada do balão
   * chao: [x, y, z] do ponto do chão onde ele senta | cores: paleta { luz, base, sombra }
   * escala: tamanho relativo (1 = ~70% do agente principal)
   */
  function cria(svg, pai, topo, chao, cores, escala = 1) {
    const id = nSubs++;
    const [ox, oy] = P(...chao);
    const raiz = g(pai, { class: 'subagente', transform: `translate(${f(ox)} ${f(oy)}) scale(${escala})` });

    // gradientes próprios (mesma paleta do agente principal do quarto)
    const d = svg.querySelector('defs');
    const grad = (gid, attrs, paradas) => {
      const gr = el('linearGradient', { id: gid, ...attrs }, d);
      for (const [off, cor] of paradas) el('stop', { offset: off, 'stop-color': cor }, gr);
    };
    const gPl = `subPlastico${id}`, gLap = `subLaptop${id}`;
    grad(gPl, { x1: 0, y1: 0, x2: 0.4, y2: 1 }, [[0, cores.luz], [0.5, cores.base], [1, cores.sombra]]);
    grad(gLap, { x1: 0, y1: 0, x2: 0, y2: 1 }, [[0, '#B7BEC9'], [1, '#7F8896']]);
    const contorno = tom(cores.sombra, -0.1);

    // ---------- sombra no chão ----------
    el('ellipse', { cx: 0, cy: 2, rx: 30, ry: 9, fill: '#1b1410', opacity: 0.28, filter: 'url(#roboSuave)' }, raiz);

    // tudo do corpo sobe junto (pulos ao comemorar)
    const corpo = g(raiz);

    // ---------- pernas cruzadas: anel macio com faixas escuras e os dois pés ----------
    el('rect', { x: -28, y: -16, width: 56, height: 18, rx: 9, fill: `url(#${gPl})`, stroke: contorno, 'stroke-width': 0.8 }, corpo);
    for (const x of [-16, -8, 8, 16]) el('rect', { x: x - 1.5, y: -15, width: 3, height: 16, rx: 1.5, fill: '#5A606C', opacity: 0.55 }, corpo);
    for (const s of [-1, 1]) el('ellipse', { cx: s * 24, cy: -6, rx: 6.5, ry: 5, fill: ESCURO }, corpo);

    // ---------- tronco ----------
    el('rect', { x: -17, y: -46, width: 34, height: 36, rx: 13, fill: `url(#${gPl})`, stroke: contorno, 'stroke-width': 0.8 }, corpo);
    el('path', { d: 'M-13,-20 L-13,-34 Q-13,-42 -6,-42', stroke: '#fff', 'stroke-width': 1.4, opacity: 0.85, fill: 'none', 'stroke-linecap': 'round' }, corpo);
    const luzPeito = el('circle', { cx: 0, cy: -34, r: 2.6, fill: LUZ.trabalhando, filter: 'url(#brilho)' }, corpo);

    // ---------- braços (atrás do laptop): ombro -> mão, recalculados a cada quadro ----------
    const bracos = [-1, 1].map((lado) => {
      const gr = g(corpo);
      const tr = [
        el('path', { stroke: '#7F8896', 'stroke-width': 6, 'stroke-linecap': 'round', fill: 'none' }, gr),
        el('path', { stroke: '#C9D0DA', 'stroke-width': 4.4, 'stroke-linecap': 'round', fill: 'none' }, gr),
      ];
      const ombro = el('circle', { cx: lado * 16, cy: -38, r: 3.6, fill: ESCURO }, gr);
      const mao = el('circle', { r: 3.4, fill: '#C9D0DA', stroke: '#7F8896', 'stroke-width': 0.8 }, gr);
      return { lado, gr, tr, ombro, mao };
    });

    // ---------- laptop no colo (vemos a tampa por trás; a tela ilumina o rosto) ----------
    const laptop = g(corpo);
    el('path', { d: 'M-22,-12 L22,-12 L25,-7 L-25,-7 Z', fill: '#8A92A0', stroke: '#6C7482', 'stroke-width': 0.6, 'stroke-linejoin': 'round' }, laptop);   // base
    el('rect', { x: -21, y: -38, width: 42, height: 27, rx: 3, fill: `url(#${gLap})`, stroke: '#6C7482', 'stroke-width': 0.6 }, laptop);  // tampa
    el('circle', { cx: 0, cy: -25, r: 2.6, fill: '#D9DEE6', opacity: 0.8 }, laptop);                                                     // logo
    el('path', { d: 'M-18,-35 L-6,-35', stroke: '#fff', 'stroke-width': 1.2, opacity: 0.5, 'stroke-linecap': 'round' }, laptop);
    // luz azulada da tela vazando por cima da tampa
    const brilhoTela = el('ellipse', { cx: 0, cy: -40, rx: 20, ry: 5, fill: '#8EC9FF', opacity: 0.45, filter: 'url(#roboSuave)' }, laptop);

    // ---------- cabeça (redonda, como na referência) ----------
    const cabeca = g(corpo);
    for (const s of [-1, 1]) el('ellipse', { cx: s * 25, cy: -66, rx: 4.5, ry: 8.5, fill: ESCURO }, cabeca);        // orelhas
    el('line', { x1: 0, y1: -86, x2: 0, y2: -93, stroke: ESCURO, 'stroke-width': 2.4, 'stroke-linecap': 'round' }, cabeca);  // antena
    el('circle', { cx: 0, cy: -95, r: 3.6, fill: 'url(#roboAmarelo)' }, cabeca);
    el('rect', { x: -25, y: -88, width: 50, height: 42, rx: 19, fill: `url(#${gPl})`, stroke: contorno, 'stroke-width': 0.8 }, cabeca);   // casco
    el('rect', { x: -15, y: -86, width: 22, height: 3, rx: 1.5, fill: '#fff', opacity: 0.8 }, cabeca);                                     // brilho
    el('rect', { x: -19.5, y: -79, width: 39, height: 26, rx: 11, fill: cores.sombra }, cabeca);                                           // rebaixo
    el('rect', { x: -18, y: -77.5, width: 36, height: 23, rx: 10, fill: VIDRO }, cabeca);                                                  // visor
    el('ellipse', { cx: 0, cy: -55, rx: 16, ry: 4, fill: '#8EC9FF', opacity: 0.25, filter: 'url(#roboSuave)' }, cabeca);                 // luz do laptop no queixo
    const olhos = g(cabeca);
    const abertos = g(olhos), felizes = g(olhos, { style: 'display:none' });
    for (const s of [-1, 1]) {
      el('circle', { cx: s * 8, cy: -66, r: 3.6, fill: OLHO }, abertos);
      el('path', { d: `M${s * 8 - 3.2},${-64.5} Q${s * 8},${-69.5} ${s * 8 + 3.2},${-64.5}`, stroke: OLHO, 'stroke-width': 2, fill: 'none', 'stroke-linecap': 'round' }, felizes);
    }

    // ---------- balão pequeno (camada por cima de tudo) ----------
    const balaoBase = g(topo, { transform: `translate(${f(ox + 24 * escala)} ${f(oy - 108 * escala)}) scale(${0.75 * escala})`, 'pointer-events': 'none' });
    const balao = g(balaoBase);
    const caixa = el('rect', { x: -16, y: -12, width: 32, height: 22, rx: 11, fill: '#fffaf4', filter: 'url(#roboBalaoSombra)' }, balao);
    const bico = el('path', { d: 'M-7,8 L-1,8 L-11,16 Z', fill: '#fffaf4' }, balao);
    const conteudo = { pontos: g(balao), pergunta: g(balao), ok: g(balao) };
    const pontos = [-7, 0, 7].map((x) => el('circle', { cx: x, cy: -1, r: 2.4, fill: '#8c7a70' }, conteudo.pontos));
    el('text', { x: 0, y: 5, 'text-anchor': 'middle', 'font-size': 16, 'font-weight': 800, fill: '#c2478a', 'font-family': 'inherit' }, conteudo.pergunta).textContent = '?';
    el('path', { d: 'M-6.5,-1 L-2,3.5 L6.5,-5', stroke: '#fff', 'stroke-width': 3, fill: 'none', 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }, conteudo.ok);

    // ---------- estado e animação ----------
    const sub = { estado: null, setEstado, update, remove, no: raiz };
    let t = Math.random() * 10, festa = 0, pisca = 1 + Math.random() * 3, olhoY = 1;
    const pose = { maoE: [...POSES.trabalhando.maoE], maoD: [...POSES.trabalhando.maoD], inclina: 0, olhar: 1.5, balao: 0 };

    function setEstado(e) {
      if (!POSES[e] || e === sub.estado) return;
      sub.estado = e; festa = 0;
      luzPeito.setAttribute('fill', LUZ[e]);
      const tipo = POSES[e].balao;
      for (const k in conteudo) conteudo[k].style.display = k === tipo ? '' : 'none';
      const fundo = tipo === 'ok' ? '#3f9d5e' : '#fffaf4';
      caixa.setAttribute('fill', fundo); bico.setAttribute('fill', fundo);
      pose.balao = 0;
      if (reduzido) { const a = POSES[e]; pose.maoE = [...a.maoE]; pose.maoD = [...a.maoD]; pose.inclina = a.inclina; pose.olhar = a.olhar; pose.balao = tipo ? 1 : 0; }
    }

    function update(dt) {
      const e = sub.estado, alvo = POSES[e];
      if (!reduzido) {
        t += dt; festa += dt;
        for (const k of ['maoE', 'maoD']) for (let i = 0; i < 2; i++) pose[k][i] = amort(pose[k][i], alvo[k][i], 8, dt);
        pose.inclina = amort(pose.inclina, alvo.inclina, 6, dt);
        pose.olhar = amort(pose.olhar, alvo.olhar, 6, dt);
        pose.balao = amort(pose.balao, alvo.balao ? 1 : 0, 9, dt);
      }
      // movimento procedural por cima da pose
      let dy = reduzido ? 0 : Math.sin(t * 1.9) * 0.5, inclina = pose.inclina, feliz = false;
      const oE = [0, 0], oD = [0, 0];
      if (!reduzido) {
        if (e === 'trabalhando') {
          // digitando no laptop: mãos alternadas, rápido; cabeça acompanha a leitura
          oE[1] = -Math.abs(Math.sin(t * 16)) * 1.8;
          oD[1] = -Math.abs(Math.sin(t * 14.5 + 1.3)) * 1.8;
          inclina += Math.sin(t * 0.6) * 2;
          brilhoTela.setAttribute('opacity', f(0.38 + 0.1 * Math.sin(t * 3.1)));
        } else if (e === 'pensando') {
          inclina += Math.sin(t * 0.8) * 2.5;
          oD[0] = Math.sin(t * 2.6) * 0.6;
        } else if (e === 'esperando') {
          oD[0] = Math.sin(t * 5.2) * 5; oD[1] = Math.cos(t * 5.2) * 1.5;
          dy -= Math.max(0, Math.sin(t * 2.6)) * 1.5;
        } else if (e === 'terminou' || e === 'finalizou') {
          const k = Math.max(0.25, Math.min(1, 1 - (festa - 5) / 1.5));
          const pulo = Math.abs(Math.sin(t * 6.2)) * k;
          dy -= pulo * 4;
          oE[0] = Math.sin(t * 6.2) * 3 * k; oD[0] = -Math.sin(t * 6.2) * 3 * k;
          inclina += Math.sin(t * 6.2) * 3 * k;
          feliz = true;
        }
      } else if (e === 'terminou' || e === 'finalizou') feliz = true;

      corpo.setAttribute('transform', `translate(0 ${f(dy)})`);
      cabeca.setAttribute('transform', `rotate(${f(inclina)} 0 -46)`);
      // braços: ombro fixo no tronco, mão na pose; cotovelo dobra para fora
      bracos.forEach((b) => {
        const [mx0, my0] = b.lado < 0 ? pose.maoE : pose.maoD;
        const [dx, dyM] = b.lado < 0 ? oE : oD;
        const sx = b.lado * 16, sy = -38, mx = mx0 + dx, my = my0 + dyM;
        const ex = (sx + mx) / 2 + b.lado * 5, ey = (sy + my) / 2 + 4;
        const dd = `M${f(sx)},${sy} L${f(ex)},${f(ey)} L${f(mx)},${f(my)}`;
        for (const p of b.tr) { p.setAttribute('d', dd); p.setAttribute('stroke-linejoin', 'round'); }
        b.mao.setAttribute('cx', f(mx)); b.mao.setAttribute('cy', f(my));
      });
      // braços levantados passam para a frente do laptop; digitando ficam atrás da tampa
      for (const b of bracos) {
        const levantado = (b.lado < 0 ? pose.maoE : pose.maoD)[1] < -40;
        if (levantado !== b.naFrente) { b.naFrente = levantado; corpo.insertBefore(b.gr, levantado ? cabeca : laptop); }
      }
      // olhos: piscada, direção do olhar, olhos felizes
      if (!reduzido) {
        pisca -= dt;
        let fecha = 1;
        if (pisca < 0) { fecha = Math.abs(pisca + 0.07) / 0.07; if (pisca < -0.14) pisca = 1.8 + Math.random() * 3.5; }
        olhoY = amort(olhoY, Math.min(1, fecha), 30, dt);
      }
      abertos.style.display = feliz ? 'none' : '';
      felizes.style.display = feliz ? '' : 'none';
      olhos.setAttribute('transform', `translate(0 ${f(pose.olhar)}) translate(0 -66) scale(1 ${f(feliz ? 1 : Math.max(0.08, olhoY))}) translate(0 66)`);
      // balão
      balao.style.display = pose.balao < 0.02 ? 'none' : '';
      balao.setAttribute('transform', `translate(0 ${f(dy)}) scale(${f(pose.balao)})`);
      pontos.forEach((p, i) => p.setAttribute('cy', f(-1 - (reduzido ? 0 : Math.max(0, Math.sin(t * 6 - i * 0.9)) * 3))));
    }

    function remove() { raiz.remove(); balaoBase.remove(); }

    setEstado('trabalhando');
    update(0);
    return sub;
  }

  return { cria };
})();
