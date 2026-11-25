// Robô agente (visual de personagem/robo-amarelo.html), sentado à mesa, com estados.
//
// Geometria: corpo e cabeça são BLOCOS ISOMÉTRICOS no mesmo mundo da sala (P(x, y, z)),
// então o robô acompanha a diagonal da cena. Ele fica de lado para nós, virado para o monitor
// (a frente dele aponta para -x). Faces visíveis de cada bloco: topo, +y (lateral, do lado de cá)
// e +x (costas). Os braços também são calculados no mundo (ombro -> cotovelo -> mão).
//
// Como anima (mesma ideia do projeto original, site/js/robo.js):
//   1. cada estado tem uma POSE-ALVO (giro da cabeça, inclinação, posição das mãos...)
//   2. a cada quadro a pose atual se aproxima da pose-alvo com amort() -> trocas sempre suaves
//   3. por cima da pose entra o movimento procedural (senos): digitar, acenar, pular, respirar
//   4. visual: cabeça e tronco de plástico branco arredondado, visor preto, orelhas pretas
//   5. detalhes: piscada aleatória, antena com mola, luz de estado, balão e confete
const ROBO = (() => {
  const { el, g, P, amort, limita, tom } = ISO;
  const COR = {
    // plástico branco (cabeça e tronco): lateral, costas (sombra azulada), topo (luz), moldura do visor
    plastico: '#F1F4F8', plasticoSombra: '#C6CEDA', plasticoLuz: '#FFFFFF', plasticoFundo: '#D3DAE4',
    amarelo: '#F8C630', amareloEscuro: '#D8930E',
    olho: '#F0F8FF', olhoBrilho: '#5AB8FF', ciano: '#5FE6F2',
    escuro: '#2A2B31', visor: '#101219',
    cinza: '#CBD0D8', cinzaEscuro: '#9199A5',
  };
  // cor da luz de estado (LED na lateral do tronco)
  const LUZ = { trabalhando: '#ff8a52', pensando: '#ffc45e', esperando: '#ff7fc0', terminou: '#62e08a', finalizou: '#62e08a', ocioso: '#a39a92' };

  // poses-alvo por estado
  //   giro: 0 = cabeça olhando o monitor (vemos a lateral, com a borda do visor e um olho)
  //         1 = cabeça virada para quem olha a sala (o visor passa para a face do lado de cá)
  //         o corpo fica sempre de lado, virado para a mesa
  //   vira: 0 = corpo de lado para a mesa | 1 = corpo inteiro girado para o usuário, olhando na
  //         diagonal do quarto, direto para a "câmera" (desenhado de frente, reto na tela)
  //   flutua: 0 = sentado | 1 = flutuando acima do assento, subindo e descendo devagar
  //   inclina: graus da cabeça (negativo = tomba para a esquerda)
  //   cabeca: 'nuca' usa a cabeça de costas em 3/4 (trabalhando e pensando); sem o campo, a cabeça segue o giro
  //   cabeca: 'frente' (com giro 1) usa a cabeça de frente do esperando mesmo com o corpo de lado
  //   olhoCanto: false esconde o cantinho do visor (vidro preto + olho ciano) ao lado da orelha
  //   maos: 'teclado' ou [mão de lá, mão de cá], cada uma 'teclado' ou posição no mundo relativa ao assento [dx, dy, dz]
  //   balao: null, 'pontos' (...), 'pergunta' (?) ou 'ok' (✓)
  const POSES = {
    // trabalhando: mesma cabeça (casco) do esperando, vista de costas em 3/4; sem o olho no canto do visor
    trabalhando: { giro: 0, vira: 0, flutua: 0, inclina: 3, cabeca: 'nuca', olhoCanto: false, maos: 'teclado', balao: null },
    // pensando: de costas em 3/4 para o monitor, cabeça levemente inclinada; garra de cá encostada na
    // lateral da cabeça (como quem segura um celular junto à orelha) e a mão de lá parada no teclado
    pensando:    { giro: 0, vira: 0, flutua: 0, inclina: -6, cabeca: 'nuca', olhoCanto: false, maos: ['teclado', [0.05, 0.76, 1.78]], balao: 'pontos' },
    esperando:   { giro: 0, vira: 1, flutua: 1, inclina: 3, maos: [[0.2, 0.6, 0.75], [0.8, -0.35, 2.4]], balao: 'pergunta' },  // flutua, vira para o usuário e acena
    // terminou: sentado, corpo de lado; a cabeça gira e usa a MESMA cabeça de frente do esperando
    terminou:    { giro: 1, vira: 0, flutua: 0, inclina: -3, cabeca: 'frente', maos: [[0.05, -0.85, 2.7], [0.05, 0.9, 2.7]], balao: 'ok' },     // braços para cima
    // finalizou: mesma pose do "esperando" (flutuando, de frente para o usuário) com a comemoração do "terminou"
    finalizou:   { giro: 0, vira: 1, flutua: 1, inclina: -3, maos: [[-0.45, 0.45, 2.7], [0.45, -0.45, 2.7]], balao: 'ok' },  // braços para cima, de frente
    // ocioso (só o agente principal): mesma posição do trabalhando, mas para de digitar e pega o
    // celular — a mão de cá segura o aparelho à frente do peito, a cabeça baixa para olhar a tela dele
    ocioso:      { giro: 0, vira: 0, flutua: 0, inclina: 9, cabeca: 'nuca', olhoCanto: false, celular: true, maos: ['teclado', [-0.78, 0.4, 1.3]], balao: null },   // mão (e celular) um pouco mais à frente do corpo
  };
  const ALTURA_VOO = 0.7;   // quanto ele sobe ao flutuar (unidades do mundo)

  // paletas do plástico (cabeça e tronco): cada robô novo recebe uma (luz, base, sombra)
  const PALETAS = [
    { nome: 'branco',  luz: '#FFFFFF', base: '#F1F4F8', sombra: '#CBD3DE' },
    { nome: 'coral',   luz: '#FFE6DD', base: '#FFBCA6', sombra: '#E58E76' },
    { nome: 'menta',   luz: '#E6FFF5', base: '#ABE8D0', sombra: '#6FC2A2' },
    { nome: 'lavanda', luz: '#F3ECFF', base: '#D0C1F5', sombra: '#9F8BD6' },
    { nome: 'céu',     luz: '#E8F5FF', base: '#ADD6F5', sombra: '#73ACD9' },
    { nome: 'amarelo', luz: '#FFF7D9', base: '#FFDB70', sombra: '#E0AA2A' },
  ];
  let nRobos = 0;

  const reduzido = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const f = (n) => n.toFixed(2);
  const lerp = (a, b, k) => a + (b - a) * k;
  const fmt = (pts) => pts.map((p) => P(...p).map(f).join(',')).join(' ');
  let prontos = false;

  // gradientes do robô (criados uma única vez no <defs> do svg)
  function defs(svg) {
    if (prontos) return;
    prontos = true;
    const d = svg.querySelector('defs') || el('defs', {}, svg);
    const grad = (id, tipo, attrs, paradas) => {
      const gr = el(tipo, { id, ...attrs }, d);
      for (const [off, cor, op = 1] of paradas) el('stop', { offset: off, 'stop-color': cor, 'stop-opacity': op }, gr);
    };
    grad('roboAmarelo', 'radialGradient', { cx: 0.3, cy: 0.25, r: 0.9 }, [[0, '#FFE07A'], [0.5, COR.amarelo], [1, COR.amareloEscuro]]);
    grad('roboCinza', 'linearGradient', { x1: 0, y1: 0, x2: 1, y2: 1 }, [[0, '#EEF1F5'], [0.5, COR.cinza], [1, COR.cinzaEscuro]]);
    grad('roboEscuro', 'radialGradient', { cx: 0.35, cy: 0.3, r: 0.8 }, [[0, '#5A6170'], [1, COR.escuro]]);
    grad('roboVidro', 'linearGradient', { x1: 0, y1: 0, x2: 0, y2: 1 }, [[0, '#1E2436'], [1, '#06080E']]);
    grad('roboFrente', 'linearGradient', { x1: 0, y1: 0, x2: 0.4, y2: 1 }, [[0, '#FFFFFF'], [0.5, '#F1F4F8'], [1, '#CDD5E0']]);
    grad('roboCiano', 'radialGradient', { cx: 0.42, cy: 0.4, r: 0.65 }, [[0, '#E6FDFF'], [0.45, COR.ciano], [1, '#22B8CC']]);
    grad('roboCasco', 'linearGradient', { x1: 0, y1: 0, x2: 0.3, y2: 1 }, [[0, '#FFFFFF'], [0.45, '#F1F4F8'], [1, '#CBD3DE']]);
    const suave = el('filter', { id: 'roboSuave', x: '-20%', y: '-20%', width: '140%', height: '140%' }, d);
    el('feGaussianBlur', { stdDeviation: 1.6 }, suave);
    const sombra = el('filter', { id: 'roboBalaoSombra', x: '-30%', y: '-30%', width: '160%', height: '180%' }, d);
    el('feDropShadow', { dx: 0, dy: 1.5, stdDeviation: 1.5, 'flood-color': '#1b2240', 'flood-opacity': 0.35 }, sombra);
  }

  // polígono no mundo; o traço da mesma cor (largo e redondo) arredonda as quinas, como plástico
  const face = (pai, pts, cor, raio = 0, attrs = {}) =>
    el('polygon', { points: fmt(pts), fill: cor, stroke: cor, 'stroke-width': raio * 2 || 0.8, 'stroke-linejoin': 'round', ...attrs }, pai);

  // bloco arredondado ("travesseiro" de plástico):
  //   1. silhueta inteira com traço largo e redondo -> contorno macio, sem quinas
  //   2. por cima, as faces de costas (+x, sombra) e topo (luz) encolhidas e também arredondadas;
  //      a lateral (+y) é a própria cor da silhueta
  //   3. brilho suave no alto da lateral
  function bloco(pai, [x0, x1], [y0, y1], [z0, z1], cor, raio = 2.5, o = {}) {
    const gr = g(pai);
    const r = raio / ISO.U;                   // encolhe o bloco para o traço não engordar a peça
    x0 += r; x1 -= r; y0 += r; y1 -= r; z0 += r; z1 -= r;
    const lateral = o.lateral ?? cor, costas = o.costas ?? tom(cor, -0.2), topo = o.topo ?? tom(cor, 0.25);
    face(gr, [[x0, y0, z1], [x1, y0, z1], [x1, y0, z0], [x1, y1, z0], [x0, y1, z0], [x0, y1, z1]], lateral, raio);  // silhueta
    const m = r * 0.35;                        // as faces internas ficam um tico para dentro: a borda vira um chanfro macio
    face(gr, [[x1, y0 + m, z0 + m], [x1, y1 - m, z0 + m], [x1, y1 - m, z1 - m], [x1, y0 + m, z1 - m]], costas, raio * 0.6);   // +x
    face(gr, [[x0 + m, y0 + m, z1], [x1 - m, y0 + m, z1], [x1 - m, y1 - m, z1], [x0 + m, y1 - m, z1]], topo, raio * 0.6);    // topo
    // brilho suave no alto da lateral (luz vinda de cima)
    face(gr, [[x0 + 0.08, y1 + 0.004, z1 - 0.06], [x1 - 0.12, y1 + 0.004, z1 - 0.06], [x1 - 0.12, y1 + 0.004, z1 - 0.12], [x0 + 0.08, y1 + 0.004, z1 - 0.12]], '#fff', raio * 0.4, { opacity: 0.28 });
    return gr;
  }

  // elipse deitada no plano z (sombra no assento/chão)
  const elipseMundo = (pai, x, y, z, r, attrs) => { const [sx, sy] = P(x, y, z); return el('ellipse', { cx: f(sx), cy: f(sy), rx: f(r * Math.SQRT2 * ISO.C * ISO.U), ry: f(r * Math.SQRT2 * 0.5 * ISO.U), ...attrs }, pai); };

  // casco liso de plástico (mesmo acabamento da cabeça de frente), para a cabeça em 3/4:
  //   1. silhueta inteira bem arredondada, pintada com um gradiente suave (luz em cima, sombra embaixo)
  //   2. a face de costas (+x) e o topo entram só como sombra/luz difusas (desfocadas), sem arestas duras
  //   3. brilho branco curto no alto da frente, como o brilho do casco de frente
  function casco(pai, [x0, x1], [y0, y1], [z0, z1], raio = 12, exato = false, pal) {
    const gr = g(pai);
    const r = raio / ISO.U;
    // exato: compensa o traço de raio px -> largura e altura finais na tela = as da caixa
    const rw = exato ? raio / (2 * ISO.C * ISO.U) : r, rz = exato ? r - rw : r;
    x0 += rw; x1 -= rw; y0 += rw; y1 -= rw; z0 += rz; z1 -= rz;
    const silhueta = [[x0, y0, z1], [x1, y0, z1], [x1, y0, z0], [x1, y1, z0], [x0, y1, z0], [x0, y1, z1]];
    face(gr, silhueta, pal.contorno, raio + 0.8);                     // contorno fino (um tico maior por baixo)
    face(gr, silhueta, `url(#${pal.gradCasco})`, raio);                   // casco com gradiente (traço redondo também no gradiente)
    const sombraCostas = g(gr, { filter: 'url(#roboSuave)', opacity: 0.45 });
    face(sombraCostas, [[x1, y0 + 0.08, z0], [x1, y1 - 0.02, z0], [x1, y1 - 0.02, z1 - 0.08], [x1, y0 + 0.08, z1 - 0.08]], '#A9B4C3', raio * 0.7);
    const luzTopo = g(gr, { filter: 'url(#roboSuave)', opacity: 0.8 });
    face(luzTopo, [[x0 + 0.06, y0 + 0.08, z1], [x1 - 0.12, y0 + 0.08, z1], [x1 - 0.12, y1 - 0.06, z1], [x0 + 0.06, y1 - 0.06, z1]], '#FFFFFF', raio * 0.6);
    // brilho no alto da frente (+y), perto da aresta de cima
    el('path', { d: 'M' + [[x0 + 0.12, y1 + r, z1 + r * 0.3], [x1 - 0.22, y1 + r, z1 + r * 0.3]].map((p) => P(...p).map(f).join(',')).join(' L'), stroke: '#fff', 'stroke-width': 3, opacity: 0.85, 'stroke-linecap': 'round' }, gr);
    return gr;
  }

  // oval no plano y = constante (centro em x, z; raios em x e z), e arco "^" no mesmo plano
  const ovalY = (y, cxw, czw, rx, rz, n = 18) =>
    Array.from({ length: n }, (_, i) => { const a = (i / n) * Math.PI * 2; return [cxw + rx * Math.cos(a), y, czw + rz * Math.sin(a)]; });
  const ovalX = (x, cyw, czw, ry, rz, n = 18) =>
    Array.from({ length: n }, (_, i) => { const a = (i / n) * Math.PI * 2; return [x, cyw + ry * Math.cos(a), czw + rz * Math.sin(a)]; });
  const arcoY = (y, cxw, czw, r, cima = true, n = 9) => {
    const pts = Array.from({ length: n }, (_, i) => { const a = Math.PI * (i / (n - 1)); return [cxw - r * Math.cos(a), y, czw + (cima ? 1 : -1) * r * 0.8 * Math.sin(a)]; });
    return 'M' + pts.map((p) => P(...p).map(f).join(',')).join(' L');
  };

  // antena: base escura, haste cinza e bola amarela. (ax, ay) = ponto da tela onde encosta no crânio
  function antena(pai, ax, ay) {
    const gr = g(pai);
    el('ellipse', { cx: ax, cy: ay, rx: 7, ry: 3.5, fill: 'url(#roboEscuro)' }, gr);
    el('rect', { x: ax - 1.6, y: ay - 11, width: 3.2, height: 11, rx: 1.5, fill: COR.escuro }, gr);
    el('circle', { cx: ax, cy: ay - 13, r: 5.5, fill: 'url(#roboAmarelo)', stroke: COR.amareloEscuro, 'stroke-width': 0.6 }, gr);
    el('circle', { cx: ax - 2, cy: ay - 15, r: 1.6, fill: '#fff', opacity: 0.8 }, gr);
    return { g: gr, ax, ay };
  }

  /**
   * Desenha o robô sentado e devolve o controle dele.
   * base: [x, y, z] do centro do assento | maos: [[x, y, z], [x, y, z]] no teclado (mão de lá, mão de cá)
   * Retorno: { estado, estados, setEstado(nome), update(dt) }
   */
  function sentado(svg, pai, base, maos, opcoes = {}) {
    defs(svg);
    // paleta deste robô + gradientes próprios (ids únicos), derivados das 3 cores
    const id = nRobos++;
    const cores = opcoes.paleta || PALETAS[id % PALETAS.length];
    const pal = {
      luz: cores.luz, base: cores.base, sombra: cores.sombra,
      contorno: tom(cores.sombra, -0.1), rebaixo: cores.sombra, fundo: tom(cores.sombra, 0.25),
      gradCasco: `roboCasco${id}`, gradFrente: `roboFrente${id}`,
    };
    {
      const d = svg.querySelector('defs');
      const grad = (gid, attrs, paradas) => {
        const gr = el('linearGradient', { id: gid, ...attrs }, d);
        for (const [off, cor] of paradas) el('stop', { offset: off, 'stop-color': cor }, gr);
      };
      grad(pal.gradCasco, { x1: 0, y1: 0, x2: 0.3, y2: 1 }, [[0, pal.luz], [0.45, pal.base], [1, pal.sombra]]);
      grad(pal.gradFrente, { x1: 0, y1: 0, x2: 0.4, y2: 1 }, [[0, pal.luz], [0.5, pal.base], [1, pal.sombra]]);
    }
    const [bx, by, bz] = base;
    const raiz = g(pai, { class: 'robo' });

    // medidas no mundo (unidades da sala)
    const TR = { x: [bx - 0.3, bx + 0.3], y: [by - 0.36, by + 0.36], z: [bz + 0.3, bz + 1.18] };   // tronco
    const CB = { x: [bx - 0.42, bx + 0.42], y: [by - 0.55, by + 0.55], z: [bz + 1.34, bz + 2.46] }; // cabeça
    const czc = (CB.z[0] + CB.z[1]) / 2;                     // altura do meio da cabeça
    const [hcx, hcy] = P(bx, by, czc);                        // centro da cabeça na tela
    const pescoco = P(bx, by, bz + 1.3);

    // ================= BRAÇOS (no mundo) =================
    // braço 0 = do lado de lá (atrás do tronco) | braço 1 = do lado de cá (na frente do tronco)
    // sombra de contato da base no assento (desfocada); some quando ele flutua
    const sombraAssento = elipseMundo(raiz, bx + 0.05, by + 0.05, bz + 0.01, 0.42, { fill: '#1b1410', opacity: 0.3, filter: 'url(#roboSuave)' });
    const camadaTras = g(raiz);
    const bracos = [0, 1].map((i) => {
      const gr = g(i === 0 ? camadaTras : null);
      const lado = i === 0 ? -1 : 1;
      const tracos = () => [
        el('path', { stroke: COR.cinzaEscuro, 'stroke-width': 8, 'stroke-linecap': 'round', fill: 'none' }, gr),
        el('path', { stroke: COR.cinza, 'stroke-width': 6, 'stroke-linecap': 'round', fill: 'none' }, gr),
        el('path', { stroke: '#fff', 'stroke-width': 1.4, 'stroke-linecap': 'round', fill: 'none', opacity: 0.7, transform: 'translate(-1,-1.5)' }, gr),
      ];
      // ombro de lado (perfil) e de frente para o usuário (um de cada lado, alinhados na horizontal da tela)
      const b = { g: gr, lado, ombroLado: [bx, by + lado * 0.42, bz + 1.0], ombroFrente: [bx + lado * 0.36, by - lado * 0.36, bz + 1.0], braco: tracos(), ante: tracos() };
      b.ombro = el('circle', { r: 4.5, fill: 'url(#roboEscuro)' }, gr);
      b.cotovelo = el('circle', { r: 3.8, fill: 'url(#roboEscuro)' }, gr);
      b.punho = el('rect', { width: 11, height: 8, rx: 3.5, fill: COR.escuro }, gr);
      b.mao = el('circle', { r: 3.6, fill: 'url(#roboAmarelo)', stroke: COR.amareloEscuro, 'stroke-width': 0.6 }, gr);
      b.garra = el('path', { stroke: COR.cinzaEscuro, 'stroke-width': 2.2, 'stroke-linecap': 'round', fill: 'none' }, gr);
      return b;
    });
    // mão no mundo -> cotovelo no mundo (dobra para baixo no teclado, para fora quando levanta) -> tela
    function poeBraco(b, mw, off, giro, dyCorpo, dyMao, vira) {
      const [sx, sy, sz] = [0, 1, 2].map((k) => lerp(b.ombroLado[k], b.ombroFrente[k], vira));
      // cotovelo dobra "para fora": de lado é ao longo de y; de frente é ao longo da horizontal da tela (x - y)
      const fora = b.lado * lerp(0.1, 0.3, giro);
      const ew = [(sx + mw[0]) / 2 + fora * 0.7 * vira, (sy + mw[1]) / 2 + fora * (1 - vira) - fora * 0.7 * vira, (sz + mw[2]) / 2 - lerp(0.3, 0.05, giro)];
      const [ox, oy0] = P(sx, sy, sz), [ex, ey0] = P(...ew), [mx0, my0] = P(...mw);
      const oy = oy0 + dyCorpo, ey = ey0 + (dyCorpo + dyMao) / 2;
      const mx = mx0 + off[0], my = my0 + off[1] + dyMao;
      const d1 = `M${f(ox)},${f(oy)} L${f(ex)},${f(ey)}`, d2 = `M${f(ex)},${f(ey)} L${f(mx)},${f(my)}`;
      for (const p of b.braco) p.setAttribute('d', d1);
      for (const p of b.ante) p.setAttribute('d', d2);
      b.ombro.setAttribute('cx', f(ox)); b.ombro.setAttribute('cy', f(oy));
      b.cotovelo.setAttribute('cx', f(ex)); b.cotovelo.setAttribute('cy', f(ey));
      const px = mx + (ex - mx) * 0.32, py = my + (ey - my) * 0.32;
      const ang = Math.atan2(my - ey, mx - ex) * 180 / Math.PI;
      b.punho.setAttribute('x', f(px - 5.5)); b.punho.setAttribute('y', f(py - 4));
      b.punho.setAttribute('transform', `rotate(${f(ang)} ${f(px)} ${f(py)})`);
      b.mao.setAttribute('cx', f(mx)); b.mao.setAttribute('cy', f(my));
      // a garra aponta para o lado oposto ao cotovelo (para baixo no teclado, para cima no aceno)
      const s = my < ey ? -1 : 1;
      b.garra.setAttribute('d', `M${f(mx - 2)},${f(my + s)} q-2.5,${3 * s} -1,${5.5 * s} M${f(mx + 2)},${f(my + s)} q2.5,${3 * s} 1,${5.5 * s}`);
      return [mx, my];
    }

    // ================= CORPO (sobe e desce junto: respiração, pulos) =================
    const corpo = g(raiz);
    const PLASTICO = { lateral: pal.base, costas: pal.sombra, topo: pal.luz };
    // tronco de lado (isométrico): base, tronco, pescoço e LED de estado na lateral
    const troncoLado = g(corpo);
    bloco(troncoLado, [bx - 0.27, bx + 0.27], [by - 0.31, by + 0.31], [bz, bz + 0.38], COR.cinza, 4);          // base cinza
    bloco(troncoLado, TR.x, TR.y, TR.z, pal.base, 7, PLASTICO);                                           // tronco branco
    bloco(troncoLado, [bx - 0.13, bx + 0.13], [by - 0.13, by + 0.13], [TR.z[1] - 0.05, CB.z[0] + 0.05], COR.escuro, 2); // pescoço
    const yl = TR.y[1] + 0.005;
    face(troncoLado, [[bx - 0.2, yl, bz + 0.78], [bx + 0.02, yl, bz + 0.78], [bx + 0.02, yl, bz + 0.96], [bx - 0.2, yl, bz + 0.96]], COR.escuro, 2.5);
    const luzLado = face(troncoLado, [[bx - 0.16, yl + 0.01, bz + 0.85], [bx - 0.02, yl + 0.01, bz + 0.85], [bx - 0.02, yl + 0.01, bz + 0.9], [bx - 0.16, yl + 0.01, bz + 0.9]], '#fff', 1.2, { filter: 'url(#brilho)' });

    // tronco DE FRENTE para o usuário (olhando na diagonal do quarto, direto para a "câmera"):
    // na projeção isométrica, uma face que aponta para a câmera aparece reta, sem inclinação.
    // Por isso aqui o desenho é direto na tela: retângulos arredondados simétricos.
    const troncoFrente = g(corpo);
    const [tcx, tcy] = P(bx, by, (TR.z[0] + TR.z[1]) / 2);
    const [, baseY] = P(bx, by, bz + 0.19);
    const [, pescY] = P(bx, by, TR.z[1] + 0.1);
    el('rect', { x: tcx - 15, y: baseY - 8, width: 30, height: 16, rx: 7, fill: 'url(#roboCinza)', stroke: COR.cinzaEscuro, 'stroke-width': 0.8 }, troncoFrente);  // base
    el('rect', { x: tcx - 6, y: pescY - 6, width: 12, height: 10, rx: 3, fill: 'url(#roboEscuro)' }, troncoFrente);                                               // pescoço
    el('rect', { x: tcx - 20, y: tcy - 16, width: 40, height: 32, rx: 11, fill: `url(#${pal.gradFrente})`, stroke: pal.contorno, 'stroke-width': 0.8 }, troncoFrente);        // tronco
    el('path', { d: `M${f(tcx - 16)},${f(tcy + 4)} L${f(tcx - 16)},${f(tcy - 6)} Q${f(tcx - 16)},${f(tcy - 13)} ${f(tcx - 9)},${f(tcy - 13)}`, stroke: '#fff', 'stroke-width': 1.6, opacity: 0.9, fill: 'none', 'stroke-linecap': 'round' }, troncoFrente);
    el('circle', { cx: tcx, cy: tcy, r: 7, fill: 'url(#roboEscuro)' }, troncoFrente);                                                                              // botão do peito
    const luzPeito = el('circle', { cx: tcx, cy: tcy, r: 4.3, fill: '#fff', filter: 'url(#brilho)' }, troncoFrente);

    // ================= CABEÇA =================
    // cabeca: inclina em torno do pescoço | giro: achata em scaleX no meio da virada
    const cabeca = g(corpo);
    const giro = g(cabeca);
    const yf = CB.y[1] + 0.006;   // plano da lateral do lado de cá
    const xf = CB.x[1] + 0.006;   // plano das costas
    const olhos = [];
    // orelha: disco preto com aro e brilho, no plano y (lateral) ou x (costas)
    const orelhaY = (pai, cxw) => {
      face(pai, ovalY(yf, cxw, czc, 0.27, 0.3), COR.escuro, 1.5);
      face(pai, ovalY(yf + 0.004, cxw - 0.03, czc + 0.04, 0.17, 0.19), '#3C3E46', 0, { stroke: 'none' });
      face(pai, ovalY(yf + 0.008, cxw - 0.08, czc + 0.13, 0.06, 0.05), '#fff', 0, { opacity: 0.45, stroke: 'none' });
    };
    const orelhaX = (pai, cyw) => {
      face(pai, ovalX(xf, cyw, czc, 0.27, 0.3), COR.escuro, 1.5);
      face(pai, ovalX(xf + 0.004, cyw - 0.03, czc + 0.04, 0.17, 0.19), '#3C3E46', 0, { stroke: 'none' });
    };

    // --- olhando o monitor: o visor fica na frente (virado para a tela), então NÃO vemos olho;
    //     da lateral aparecem só o plástico branco e a orelha preta ---
    const lado = g(giro);
    bloco(lado, CB.x, CB.y, CB.z, pal.base, 11, PLASTICO);
    orelhaY(lado, bx + 0.08);
    const antenaLado = antena(lado, ...P(bx, by, CB.z[1]));

    // --- PENSANDO: de costas em 3/4, olhando o monitor. Mesmo casco/tamanho/posição das outras cabeças.
    //     Aparecem: as duas orelhas (a de lá espiando atrás), antena, nuca com emenda e painel cinza,
    //     um cantinho do visor com o olho ciano brilhando e um reflexo azulado do monitor na lateral ---
    // caixa da cabeça de costas: mesma largura na tela da cabeça de frente (~58 px) e mesmo centro;
    // um pouco mais baixa que CB porque, em 3/4, o topo também aparece
    const NB = { x: [bx - 0.38, bx + 0.38], y: [by - 0.6, by + 0.6], z: [czc - 0.3, czc + 0.3] };
    const yfN = NB.y[1] + 0.006;
    const nuca = g(giro);
    let olhoCanto;
    {
      const [ox, oy] = P(bx + 0.05, NB.y[0] - 0.02, czc);           // orelha do lado de lá, espiando atrás do casco
      el('ellipse', { cx: f(ox), cy: f(oy), rx: 5.5, ry: 10, fill: COR.escuro }, nuca);
      casco(nuca, NB.x, NB.y, NB.z, 12, true, pal);
      const x0 = NB.x[0], xs = NB.x[1] - 0.02;                       // frente e costas (plano das costas)
      // reflexo azulado do monitor na lateral, mais forte perto da frente
      const reflexo = g(nuca, { filter: 'url(#roboSuave)', opacity: 0.35 });
      face(reflexo, [[x0 + 0.06, yfN, NB.z[0] + 0.18], [x0 + 0.34, yfN, NB.z[0] + 0.18], [x0 + 0.34, yfN, NB.z[1] - 0.18], [x0 + 0.06, yfN, NB.z[1] - 0.18]], '#8EC9FF', 6);
      // cantinho do visor (vidro escuro) na quina da frente, com o olho ciano brilhando.
      // Fica num grupo próprio para sumir inteiro no "trabalhando" (olhoCanto: false)
      olhoCanto = g(nuca);
      face(olhoCanto, [[x0 + 0.05, yfN + 0.003, NB.z[0] + 0.22], [x0 + 0.13, yfN + 0.003, NB.z[0] + 0.22], [x0 + 0.13, yfN + 0.003, NB.z[1] - 0.22], [x0 + 0.05, yfN + 0.003, NB.z[1] - 0.22]], 'url(#roboVidro)', 3, { stroke: '#0B0E16' });
      face(olhoCanto, ovalY(yfN + 0.006, x0 + 0.095, czc + 0.02, 0.028, 0.085), '#7FE8EE', 0, { stroke: 'none', filter: 'url(#brilho)' });
      // orelha do lado de cá
      face(nuca, ovalY(yfN, bx + 0.1, czc, 0.24, 0.24), COR.escuro, 1.5);
      face(nuca, ovalY(yfN + 0.004, bx + 0.07, czc + 0.03, 0.15, 0.15), '#3C3E46', 0, { stroke: 'none' });
      face(nuca, ovalY(yfN + 0.008, bx + 0.02, czc + 0.12, 0.05, 0.045), '#fff', 0, { opacity: 0.45, stroke: 'none' });
      // nuca: linha de emenda e painel cinza com frestas, nas costas da cabeça (+x)
      el('path', { d: 'M' + [[xs, NB.y[0] + 0.12, czc - 0.24], [xs, NB.y[1] - 0.12, czc - 0.24]].map((p) => P(...p).map(f).join(',')).join(' L'), stroke: '#AEB8C6', 'stroke-width': 1, 'stroke-linecap': 'round' }, nuca);
      face(nuca, [[xs, by - 0.2, czc - 0.06], [xs, by + 0.2, czc - 0.06], [xs, by + 0.2, czc + 0.24], [xs, by - 0.2, czc + 0.24]], pal.rebaixo, 3);
      for (const dz of [0.02, 0.09, 0.16]) {
        el('path', { d: 'M' + [[xs + 0.002, by - 0.13, czc + dz], [xs + 0.002, by + 0.13, czc + dz]].map((p) => P(...p).map(f).join(',')).join(' L'), stroke: '#9AA4B2', 'stroke-width': 1.3, 'stroke-linecap': 'round' }, nuca);
      }
    }
    const antenaNuca = antena(nuca, ...P(bx, by, NB.z[1]));

    // --- virado para quem olha a sala (cabeça em 3/4): mesmo acabamento da cabeça de frente —
    //     casco de uma peça, visor embutido (rebaixo sombreado + luz na borda de baixo),
    //     vidro escuro com reflexos e olhos brancos pequenos, sem borda; a orelha passa para as costas ---
    const rosto = g(giro);
    casco(rosto, CB.x, CB.y, CB.z, 12, false, pal);
    orelhaX(rosto, by);
    const vx0 = CB.x[0] + 0.09, vx1 = CB.x[1] - 0.09, vz0 = CB.z[0] + 0.19, vz1 = CB.z[1] - 0.19;
    const naFrente = (pts, d = 0) => pts.map(([x, z]) => [x, yf + d, z]);
    face(rosto, naFrente([[vx0 - 0.04, vz0 - 0.04], [vx1 + 0.04, vz0 - 0.04], [vx1 + 0.04, vz1 + 0.04], [vx0 - 0.04, vz1 + 0.04]]), pal.rebaixo, 6);   // rebaixo
    el('path', { d: 'M' + naFrente([[vx0 + 0.06, vz0 - 0.06], [vx1 - 0.06, vz0 - 0.06]], 0.002).map((p) => P(...p).map(f).join(',')).join(' L'), stroke: '#fff', 'stroke-width': 1.4, opacity: 0.9, 'stroke-linecap': 'round' }, rosto); // luz na borda de baixo
    face(rosto, naFrente([[vx0, vz0], [vx1, vz0], [vx1, vz1], [vx0, vz1]], 0.003), 'url(#roboVidro)', 5, { stroke: '#0B0E16' });                       // vidro
    // reflexos: faixa diagonal suave e brilho pequeno no canto
    face(rosto, naFrente([[vx0 + 0.05, vz1 - 0.05], [vx0 + 0.2, vz1 - 0.05], [vx0 + 0.07, vz0 + 0.06], [vx0 + 0.03, vz0 + 0.06]], 0.006), '#ffffff', 0, { opacity: 0.08, stroke: 'none' });
    el('path', { d: 'M' + naFrente([[vx1 - 0.16, vz1 - 0.05], [vx1 - 0.06, vz1 - 0.07], [vx1 - 0.05, vz1 - 0.16]], 0.006).map((p) => P(...p).map(f).join(',')).join(' L'), stroke: '#fff', 'stroke-width': 1.4, opacity: 0.45, fill: 'none', 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }, rosto);
    for (const ex of [bx - 0.16, bx + 0.16]) {
      const olho = g(rosto);
      const aberto = g(olho);
      face(aberto, ovalY(yf + 0.008, ex, czc + 0.02, 0.075, 0.09), COR.olho, 0, { stroke: 'none' });   // olho branco, sem halo/borda
      const feliz = el('path', { d: arcoY(yf + 0.008, ex, czc - 0.01, 0.075), stroke: COR.olho, 'stroke-width': 2.2, fill: 'none', 'stroke-linecap': 'round' }, olho);
      const [ox, oy] = P(ex, yf, czc + 0.02);
      olhos.push({ g: olho, aberto, feliz, x: ox, y: oy });
    }
    const antenaRosto = antena(rosto, ...P(bx, by, CB.z[1]));

    // --- girado para o usuário, olhando na diagonal do quarto (direto para a "câmera"):
    //     cabeça DE FRENTE, desenhada reta na tela: faixa do topo, frente arredondada,
    //     visor centralizado com os dois olhos e as duas orelhas, uma de cada lado ---
    const verso = g(giro);
    {
      const hx = hcx, hy = hcy;
      for (const lx of [-1, 1]) {                                         // orelhas
        el('ellipse', { cx: hx + lx * 30, cy: hy + 1, rx: 5.5, ry: 10.5, fill: COR.escuro }, verso);
        el('ellipse', { cx: hx + lx * 30.5, cy: hy + 1, rx: 3, ry: 7, fill: '#3C3E46' }, verso);
      }
      // casco: uma peça só, bem arredondada (sem faixa de topo separada)
      el('rect', { x: hx - 29, y: hy - 24, width: 58, height: 47, rx: 17, fill: `url(#${pal.gradFrente})`, stroke: pal.contorno, 'stroke-width': 0.8 }, verso);
      el('rect', { x: hx - 19, y: hy - 22.5, width: 30, height: 3.2, rx: 1.6, fill: '#fff', opacity: 0.85 }, verso);   // brilho no alto do casco
      // visor embutido: o casco "afunda" em volta do vidro (borda fina e sombreada, sem moldura de outra cor)
      el('rect', { x: hx - 24.5, y: hy - 17, width: 49, height: 35, rx: 12, fill: pal.rebaixo }, verso);                 // rebaixo (sombra interna)
      el('path', { d: `M${f(hx - 20)},${f(hy + 18.2)} L${f(hx + 20)},${f(hy + 18.2)}`, stroke: '#fff', 'stroke-width': 1.4, opacity: 0.9, 'stroke-linecap': 'round' }, verso); // luz na borda de baixo
      el('rect', { x: hx - 23, y: hy - 15.5, width: 46, height: 32, rx: 11, fill: 'url(#roboVidro)' }, verso);         // vidro preto
      // reflexos no vidro: faixa diagonal suave e um brilho pequeno no canto
      el('path', { d: `M${f(hx - 19)},${f(hy - 13)} L${f(hx - 9)},${f(hy - 13)} L${f(hx - 17)},${f(hy + 13)} L${f(hx - 21)},${f(hy + 13)} L${f(hx - 21)},${f(hy - 9)} Z`, fill: '#fff', opacity: 0.08 }, verso);
      el('path', { d: `M${f(hx + 12)},${f(hy - 13)} Q${f(hx + 19)},${f(hy - 13)} ${f(hx + 20)},${f(hy - 7)}`, stroke: '#fff', 'stroke-width': 1.6, opacity: 0.45, fill: 'none', 'stroke-linecap': 'round' }, verso);
      for (const lx of [-1, 1]) {
        const ex = hx + lx * 9.5, ey = hy + 1;
        const olho = g(verso);
        const aberto = g(olho);
        el('circle', { cx: ex, cy: ey, r: 4.2, fill: COR.olho }, aberto);   // olho branco, sem halo/borda
        const feliz = el('path', { d: `M${f(ex - 3.8)},${f(ey + 2.1)} Q${f(ex)},${f(ey - 3.8)} ${f(ex + 3.8)},${f(ey + 2.1)}`, stroke: COR.olho, 'stroke-width': 2.2, fill: 'none', 'stroke-linecap': 'round' }, olho);
        olhos.push({ g: olho, aberto, feliz, x: ex, y: ey });
      }
    }
    const antenaVerso = antena(verso, hcx, hcy - 24);

    // braço do lado de cá: entra depois do corpo, para ficar na frente dele
    raiz.appendChild(bracos[1].g);

    // celular (estado ocioso): aparelho escuro na garra de cá, com a tela acesa virada para o robô
    // e um brilho azulado; desenhado em volta de (0, 0) e levado até a mão a cada quadro
    const celular = g(bracos[1].g, { style: 'display:none' });
    {
      const aparelho = g(celular, { transform: 'rotate(-18)' });
      el('rect', { x: -4.2, y: -7.5, width: 8.4, height: 15, rx: 2, fill: '#1d2030', stroke: '#0b0d14', 'stroke-width': 0.6 }, aparelho);
      el('rect', { x: -3.1, y: -6.3, width: 6.2, height: 12, rx: 1.2, fill: '#7fd8ff', opacity: 0.85 }, aparelho);
      el('rect', { x: -2.2, y: -4.8, width: 4.4, height: 1.2, rx: 0.6, fill: '#fff', opacity: 0.8 }, aparelho);   // "notificação"
      el('rect', { x: -2.2, y: -2.6, width: 3.2, height: 1, rx: 0.5, fill: '#fff', opacity: 0.55 }, aparelho);
      el('ellipse', { cx: 0, cy: -2, rx: 9, ry: 7, fill: '#8EC9FF', opacity: 0.35, filter: 'url(#roboSuave)' }, aparelho);  // brilho da tela
    }

    // ================= BALÃO + CONFETE (camada por cima de toda a cena) =================
    const topo = g(opcoes.topo || svg, { 'pointer-events': 'none' });   // camada do balão (por cima da cena)
    const [balX, balY] = (([x, y]) => [x + 22, y])(P(bx, by, CB.z[1] + 0.95));
    const balao = g(topo);
    const balaoFundo = g(balao, { filter: 'url(#roboBalaoSombra)' });
    const balaoCaixa = el('rect', { x: -16, y: -12, width: 32, height: 22, rx: 11, fill: '#fffaf4' }, balaoFundo);
    const balaoBico = el('path', { d: 'M-7,8 L-1,8 L-11,16 Z', fill: '#fffaf4' }, balaoFundo);
    const conteudo = { pontos: g(balao), pergunta: g(balao), ok: g(balao) };
    const pontos = [-7, 0, 7].map((x) => el('circle', { cx: x, cy: -1, r: 2.4, fill: '#8c7a70' }, conteudo.pontos));
    el('text', { x: 0, y: 5, 'text-anchor': 'middle', 'font-size': 16, 'font-weight': 800, fill: '#c2478a', 'font-family': 'inherit' }, conteudo.pergunta).textContent = '?';
    el('path', { d: 'M-6.5,-1 L-2,3.5 L6.5,-5', stroke: '#fff', 'stroke-width': 3, fill: 'none', 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }, conteudo.ok);
    const confetes = [];
    const CORES_CONFETE = ['#F8C630', '#5FE6F2', '#ff7fc0', '#62e08a', '#ff8a52', '#fffaf4'];
    function soltaConfete() {
      if (reduzido) return;
      for (let i = 0; i < 18; i++) {
        const a = -Math.PI / 2 + (Math.random() - 0.5) * 2.2, v = 60 + Math.random() * 70;
        confetes.push({
          el: el('rect', { width: 3, height: 5, rx: 1, fill: CORES_CONFETE[i % CORES_CONFETE.length] }, topo),
          x: balX, y: balY, vx: Math.cos(a) * v, vy: Math.sin(a) * v, rot: Math.random() * 360, vr: (Math.random() - 0.5) * 720, vida: 1.6,
        });
      }
    }

    // ================= ESTADO E ANIMAÇÃO =================
    const robo = { estado: null, estados: Object.keys(POSES), setEstado, update };
    let t = Math.random() * 20;
    // pose atual (persegue a pose-alvo). As mãos ficam em coordenadas do mundo
    // solta: 0 = mãos no teclado (paradas) | 1 = mãos soltas, acompanhando o corpo
    const pose = { giro: 0, vira: 0, flutua: 0, solta: [0, 0], inclina: 0, maos: maos.map((p) => [...p]), balao: 0 };
    let viradoAntes = null;
    let antV = 0, antA = 0;                        // mola da antena
    let pisca = 2 + Math.random() * 3, olhoY = 1;  // piscada
    let festa = 0;                                 // segundos desde que terminou (a comemoração acalma)

    const noTeclado = (e, i) => POSES[e].maos === 'teclado' || POSES[e].maos[i] === 'teclado';
    const alvoMaos = (e) => [0, 1].map((i) => noTeclado(e, i) ? maos[i] : ((([dx, dy, dz]) => [bx + dx, by + dy, bz + dz])(POSES[e].maos[i])));

    function setEstado(e) {
      if (!POSES[e]) return false;
      if (e === robo.estado) return true;
      robo.estado = e;
      luzLado.setAttribute('fill', LUZ[e]); luzLado.setAttribute('stroke', LUZ[e]);
      luzPeito.setAttribute('fill', LUZ[e]);
      antV += 3;                                   // estalinho na antena a cada troca
      festa = 0;
      // balão: troca o conteúdo e o fundo (verde no ✓); a escala "estoura" a partir do zero
      const tipo = POSES[e].balao;
      for (const k in conteudo) conteudo[k].style.display = k === tipo ? '' : 'none';
      const fundo = tipo === 'ok' ? '#3f9d5e' : '#fffaf4';
      balaoCaixa.setAttribute('fill', fundo); balaoBico.setAttribute('fill', fundo);
      pose.balao = 0;
      if (e === 'terminou' || e === 'finalizou') soltaConfete();
      if (reduzido) {                              // sem transição para quem pede menos movimento
        pose.giro = POSES[e].giro; pose.inclina = POSES[e].inclina;
        pose.vira = POSES[e].vira; pose.flutua = POSES[e].flutua; pose.solta = [0, 1].map((i) => noTeclado(e, i) ? 0 : 1);
        pose.maos = alvoMaos(e).map((p) => [...p]); pose.balao = tipo ? 1 : 0;
      }
      return true;
    }

    function update(dt) {
      const e = robo.estado, alvo = POSES[e];
      if (!reduzido) {
        t += dt; festa += dt;
        pose.giro = amort(pose.giro, alvo.giro, 6, dt);
        pose.vira = amort(pose.vira, alvo.vira, 4, dt);       // giro de 180° do corpo, mais lento
        pose.flutua = amort(pose.flutua, alvo.flutua, 3, dt);  // sobe devagar
        pose.solta = pose.solta.map((v, i) => amort(v, noTeclado(e, i) ? 0 : 1, 6, dt));
        pose.inclina = amort(pose.inclina, alvo.inclina, 6, dt);
        alvoMaos(e).forEach((m, i) => { for (let k = 0; k < 3; k++) pose.maos[i][k] = amort(pose.maos[i][k], m[k], 8, dt); });
        pose.balao = amort(pose.balao, alvo.balao ? 1 : 0, 9, dt);
      }

      // ---------- movimento procedural por cima da pose ----------
      let inclina = pose.inclina, dy = 0, olharX = 0, olharY = 0, abre = 1, feliz = false;
      const offs = [[0, 0], [0, 0]];
      if (!reduzido) {
        dy += Math.sin(t * 1.7) * 0.6;                                   // respiração
        if (e === 'trabalhando') {
          // digitar: tremor rápido e alternado das mãos (dois senos -> não fica repetitivo)
          const r1 = Math.sin(t * 17) * Math.sin(t * 2.3 + 1), r2 = Math.sin(t * 15.3 + 2) * Math.cos(t * 1.9);
          offs[0] = [r1 * 1.2, -Math.abs(r1) * 2.2];
          offs[1] = [r2 * 1.2, -Math.abs(r2) * 2.2];
          inclina += Math.sin(t * 0.45) * 2.5 * Math.sin(t * 0.13) + Math.sin(t * 2.1) * 0.8;
          antV += (r1 + r2) * dt * 4;                                    // a antena treme um tico
        } else if (e === 'ocioso') {
          // rolando o feed no celular: a mão sobe e desce um tico; a cabeça balança devagar
          offs[1] = [Math.sin(t * 0.9) * 0.6, Math.sin(t * 2.2) * 0.8];
          inclina += Math.sin(t * 0.5) * 1.5;
        } else if (e === 'pensando') {
          // mãos paradas no teclado (sem digitar); só a cabeça balança devagar, pensativa
          inclina += Math.sin(t * 0.8) * 2.5;
        } else if (e === 'esperando') {
          // flutuando de frente para o usuário: acena com o braço levantado e balança no ar
          offs[1] = [Math.sin(t * 5.2) * 6, Math.cos(t * 5.2) * 2];
          inclina += Math.sin(t * 1.3) * 2;
          abre = 1.18;
          antV += Math.sin(t * 5.2) * dt * 6;
        } else if (e === 'terminou' || e === 'finalizou') {
          // comemora pulando com os braços para cima; depois de ~5 s vai acalmando
          const k = limita(1 - (festa - 5) / 1.5, 0.25, 1);
          const pulo = Math.abs(Math.sin(t * 6.2)) * k;
          dy -= pulo * 4;
          offs[0] = [Math.sin(t * 6.2) * 4 * k, -pulo * 2];
          offs[1] = [-Math.sin(t * 6.2) * 4 * k, -pulo * 2];
          inclina += Math.sin(t * 6.2) * 4 * k;
          antV += Math.sin(t * 6.2) * dt * 20 * k;
          feliz = true;
        }
      } else if (e === 'terminou' || e === 'finalizou') feliz = true;

      // flutuar: sobe ALTURA_VOO e oscila devagar no ar (a respiração continua por cima)
      dy -= pose.flutua * (ALTURA_VOO * ISO.U + (reduzido ? 0 : Math.sin(t * 2) * 3));

      // ---------- corpo e cabeça ----------
      corpo.setAttribute('transform', `translate(0 ${f(dy)})`);
      sombraAssento.setAttribute('opacity', f(0.3 * (1 - pose.flutua)));
      // giro de 180°: o robô inteiro "achata" (scaleX) no meio da volta e troca de lado
      const virado = pose.vira > 0.5;
      const sv = Math.max(0.12, Math.abs(2 * pose.vira - 1));
      raiz.setAttribute('transform', `translate(${f(hcx)} 0) scale(${f(sv)} 1) translate(${f(-hcx)} 0)`);
      troncoLado.style.display = virado ? 'none' : '';
      troncoFrente.style.display = virado ? '' : 'none';
      cabeca.setAttribute('transform', `rotate(${f(inclina)} ${f(pescoco[0])} ${f(pescoco[1])})`);
      // giro: no meio da virada a cabeça "achata" (scaleX em torno do centro dela) e troca de face
      const deFrente = pose.giro > 0.5;
      const s = Math.max(0.12, Math.abs(2 * pose.giro - 1));
      giro.setAttribute('transform', `translate(${f(hcx)} 0) scale(${f(s)} 1) translate(${f(-hcx)} 0)`);
      const usaNuca = alvo.cabeca === 'nuca' && pose.giro < 0.5;
      lado.style.display = !virado && !deFrente && !usaNuca ? '' : 'none';
      nuca.style.display = !virado && usaNuca ? '' : 'none';
      olhoCanto.style.display = alvo.olhoCanto === false ? 'none' : '';
      const usaFrente = virado || (deFrente && alvo.cabeca === 'frente');
      rosto.style.display = !virado && deFrente && !usaFrente ? '' : 'none';
      verso.style.display = usaFrente ? '' : 'none';

      // ---------- braços: no teclado as mãos ficam paradas; nos outros estados acompanham o corpo ----------
      // virado, as duas mãos ficam à frente do corpo (do lado do usuário): o braço de lá passa para a frente
      if (virado !== viradoAntes) {
        viradoAntes = virado;
        if (virado) raiz.insertBefore(bracos[0].g, bracos[1].g);
        else camadaTras.appendChild(bracos[0].g);
      }
      const maosTela = bracos.map((b, i) => poeBraco(b, pose.maos[i], offs[i], pose.solta[i], dy, dy * pose.solta[i], pose.vira));
      // celular: aparece quando a mão já saiu do teclado; acompanha a garra de cá
      const comCelular = alvo.celular && pose.solta[1] > 0.6;
      celular.style.display = comCelular ? '' : 'none';
      if (comCelular) celular.setAttribute('transform', `translate(${f(maosTela[1][0] - 1)} ${f(maosTela[1][1] - 7)})`);

      // ---------- antena com mola (amortecida) ----------
      if (!reduzido) {
        antV += (-antA * 60 - antV * 5) * dt;
        antA += antV * dt;
      }
      const ang = limita(antA, -0.6, 0.6) * 57.3;
      for (const a of [antenaLado, antenaRosto, antenaVerso, antenaNuca]) a.g.setAttribute('transform', `rotate(${f(ang)} ${f(a.ax)} ${f(a.ay)})`);

      // ---------- olhos: piscada aleatória, direção do olhar e olhos felizes ----------
      if (!reduzido) {
        pisca -= dt;
        let fecha = 1;
        if (pisca < 0) { fecha = Math.abs(pisca + 0.07) / 0.07; if (pisca < -0.14) pisca = 1.8 + Math.random() * 3.5; }
        olhoY = amort(olhoY, abre * Math.min(1, fecha), 30, dt);
      } else olhoY = 1;
      const sy = Math.max(0.08, olhoY);
      for (const o of olhos) {
        o.aberto.style.display = feliz ? 'none' : '';
        o.feliz.style.display = feliz ? '' : 'none';
        o.g.setAttribute('transform', `translate(${f(olharX)} ${f(olharY)}) translate(${f(o.x)} ${f(o.y)}) scale(1 ${f(feliz ? 1 : sy)}) translate(${f(-o.x)} ${f(-o.y)})`);
      }

      // ---------- balão: estoura com a escala; pontos pulam; "?" pisca ----------
      const escB = pose.balao;
      balao.style.display = escB < 0.02 ? 'none' : '';
      balao.setAttribute('transform', `translate(${f(balX)} ${f(balY + dy)}) scale(${f(escB)})`);
      pontos.forEach((p, i) => p.setAttribute('cy', f(-1 - (reduzido ? 0 : Math.max(0, Math.sin(t * 6 - i * 0.9)) * 3))));
      conteudo.pergunta.setAttribute('opacity', reduzido ? 1 : f(0.65 + 0.35 * Math.sin(t * 6)));

      // ---------- confete: gravidade, giro e some ----------
      for (let i = confetes.length - 1; i >= 0; i--) {
        const c = confetes[i];
        c.vida -= dt; c.vy += 160 * dt; c.x += c.vx * dt; c.y += c.vy * dt; c.rot += c.vr * dt;
        if (c.vida <= 0) { c.el.remove(); confetes.splice(i, 1); continue; }
        c.el.setAttribute('transform', `translate(${f(c.x)} ${f(c.y)}) rotate(${f(c.rot)})`);
        c.el.setAttribute('opacity', f(Math.min(1, c.vida / 0.5)));
      }
    }

    setEstado('trabalhando');
    pose.balao = 0;
    update(0);
    return robo;
  }

  return { sentado, LUZ, PALETAS };
})();
