// Parte 2: a sala isométrica (escritório em miniatura) desenhada em SVG.
// A ordem de desenho importa: o que está mais ao fundo vem primeiro.
(() => {
  const { el, g, poly, tom, linha, caixa, noX, noY, noZ, ret, circ, cilindro, elipseZ, sorteio, P, U, C } = ISO;
  const svg = document.getElementById('sala');

  // medidas da sala (unidades do mundo)
  const L = 10;    // largura e profundidade do piso
  const H = 7;     // altura das paredes
  const E = 0.5;   // espessura das paredes

  // paleta base (cada quarto troca as paredes pelo seu tema)
  const COR_BASE = {
    paredeEsq: '#f6c9a8',  // pêssego
    paredeDir: '#b5cdb0',  // verde-sálvia
    borda: '#fbf7f1',      // bordas brancas
    piso: '#e6c49c',       // madeira clara
    juntas: '#c49a6c',
    base: '#e8692f',       // laje laranja
    mesa: '#e8742f',
    madeira: '#b9804f',
    preto: '#24242c',
    creme: '#efe4cf',
    terracota: '#d9683a',
    cacto: '#4f9a5a',
    cactoClaro: '#62ad69',
    tapeteBase: '#f3e7cc',
    tapeteVermelho: '#c8463a',
    tapeteVerde: '#7fa58a',  // verde-sálvia mais fechado, para contrastar no creme
  };

  // ---------- defs: gradientes e filtros ----------
  const defs = el('defs', {}, svg);
  const grad = (id, tipo, attrs, paradas) => {
    const gr = el(tipo, { id, ...attrs }, defs);
    for (const [off, cor, op = 1] of paradas) el('stop', { offset: off, 'stop-color': cor, 'stop-opacity': op }, gr);
  };
  grad('cilindro', 'linearGradient', { x1: 0, x2: 1, y1: 0, y2: 0 },
    [[0, '#fff', 0.22], [0.4, '#fff', 0], [0.75, '#000', 0.08], [1, '#000', 0.28]]);
  grad('luzParede', 'radialGradient', {}, [[0, '#ffe2b0', 0.95], [0.35, '#ffc88a', 0.5], [1, '#ffc078', 0]]);
  grad('luzNucleo', 'radialGradient', {}, [[0, '#fff1d6', 0.9], [1, '#ffd7a0', 0]]);
  grad('luzChao', 'radialGradient', {}, [[0, '#ffd59a', 0.5], [1, '#ffd59a', 0]]);
  grad('luzTela', 'radialGradient', {}, [[0, '#9cc4ff', 0.45], [1, '#9cc4ff', 0]]);
  grad('sombraFundo', 'radialGradient', {}, [[0, '#05081a', 0.7], [1, '#05081a', 0]]);
  grad('tela', 'linearGradient', { x1: 0, x2: 0, y1: 0, y2: 1 }, [[0, '#26304a'], [1, '#161c2c']]);
  grad('metal', 'linearGradient', { x1: 0, x2: 0, y1: 0, y2: 1 }, [[0, '#f4f6f8'], [0.5, '#b9bfc7'], [1, '#7d848e']]);
  grad('terra', 'radialGradient', {}, [[0, '#7a5638'], [1, '#4e3424']]);
  // gradiente do piso: do canto iluminado (perto da mesa) para a frente, mais escura
  const [gx1, gy1] = P(0.5, 3.5, 0), [gx2, gy2] = P(L, L, 0);
  grad('luzPiso', 'linearGradient', { gradientUnits: 'userSpaceOnUse', x1: gx1, y1: gy1, x2: gx2, y2: gy2 },
    [[0, '#fff3dc', 0.28], [0.55, '#fff3dc', 0], [1, '#5a3418', 0.16]]);

  const filtro = (id, desvio) => {
    const f = el('filter', { id, x: '-50%', y: '-50%', width: '200%', height: '200%' }, defs);
    el('feGaussianBlur', { stdDeviation: desvio }, f);
  };
  filtro('desfoque', 5);       // sombras projetadas suaves
  filtro('contato', 1.6);      // sombra de contato, bem junto do chão
  filtro('oclusao', 9);        // ambient occlusion nos cantos
  const fBrilho = el('filter', { id: 'brilho', x: '-100%', y: '-100%', width: '300%', height: '300%' }, defs);
  el('feGaussianBlur', { in: 'SourceGraphic', stdDeviation: 2.5, result: 'b' }, fBrilho);
  const m = el('feMerge', {}, fBrilho);
  el('feMergeNode', { in: 'b' }, m); el('feMergeNode', { in: 'SourceGraphic' }, m);

  // recortes: parede da esquerda (luz não vaza) e piso (oclusão não vaza)
  poly(el('clipPath', { id: 'recorteEsq' }, defs), noX(0, ret(0, L, 0, H)), '#000');
  poly(el('clipPath', { id: 'recortePiso' }, defs), noZ(0, ret(0, L, 0, L)), '#000');
  poly(el('clipPath', { id: 'recorteTela' }, defs), noX(0.77, ret(2.42, 5.08, 3.47, 5.03)), '#000');

  // ================= UM QUARTO (molde) =================
  // Desenha um quarto completo com o seu robô dentro de "pai" e devolve { robo, telaMonitor }.
  // Todos os quartos usam as mesmas coordenadas; quem posiciona é o transform do grupo "pai".
  // tema: cores das paredes deste quarto | topo: camada por cima de tudo (balão do robô)
  let nClip = 0;   // ids únicos dos recortes do cacto (um par por quarto)
  function criaSala(pai, tema, topo) {
  const COR = { ...COR_BASE, ...tema };
  const cena = g(pai);

  // ---------- sombra da sala flutuando no fundo azul ----------
  const [cx0, cy0] = P(L / 2, L / 2, -1.6);
  el('ellipse', { cx: cx0, cy: cy0 + 30, rx: 330, ry: 120, fill: 'url(#sombraFundo)' }, cena);

  // ---------- base laranja + piso de madeira ----------
  caixa(cena, [-E, L + 0.25], [-E, L + 0.25], [-0.8, -0.3], COR.base, { topo: tom(COR.base, 0.1) });
  caixa(cena, [-E, L], [-E, L], [-0.3, 0], COR.piso, { esq: tom(COR.piso, -0.12), dir: tom(COR.piso, -0.25) });

  // tábuas (item 2): cada tábua é um polígono com um de 4 tons de madeira e junta fina
  const TONS_MADEIRA = [COR.piso, tom(COR.piso, 0.06), tom(COR.piso, -0.05), tom(COR.piso, -0.1)];
  const tabuas = g(cena);
  const LARG = 1.0;
  for (let i = 0; i * LARG < L; i++) {
    const emendas = [0];
    for (let x = (i % 3) * 1.4 + 1.1; x < L - 0.3; x += 4.2) emendas.push(x);
    emendas.push(L);
    for (let k = 0; k < emendas.length - 1; k++) {
      const tomTabua = TONS_MADEIRA[Math.floor(sorteio(i * 7 + k) * TONS_MADEIRA.length)];
      poly(tabuas, noZ(0, ret(emendas[k], emendas[k + 1], i * LARG, (i + 1) * LARG)), tomTabua,
        { stroke: COR.juntas, 'stroke-width': 0.7 });
    }
  }
  // luz geral do piso: claro no canto da mesa, mais escuro na frente
  poly(cena, noZ(0, ret(0, L, 0, L)), 'url(#luzPiso)', { stroke: 'none' });

  // ---------- paredes ----------
  const paredes = g(cena);
  poly(paredes, noX(0, ret(0, L, 0, H)), COR.paredeEsq);
  poly(paredes, noY(0, ret(0, L, 0, H)), COR.paredeDir);
  // rodapés
  poly(paredes, noX(0.01, ret(0, L, 0, 0.25)), tom(COR.paredeEsq, 0.35));
  poly(paredes, noY(0.01, ret(0, L, 0, 0.25)), tom(COR.paredeDir, 0.35));
  // bordas brancas grossas: topo e pontas
  poly(paredes, [[-E, -E, H], [-E, L, H], [0, L, H], [0, 0, H]], COR.borda);
  poly(paredes, [[-E, -E, H], [L, -E, H], [L, 0, H], [0, 0, H]], COR.borda);
  poly(paredes, noY(L, ret(-E, 0, 0, H)), tom(COR.borda, -0.06));
  poly(paredes, noX(L, ret(-E, 0, 0, H)), tom(COR.borda, -0.14));

  // ambient occlusion (item 5): escurece suavemente o canto vertical e o encontro parede-piso
  const oclusao = g(cena, { fill: '#3a1d10', stroke: 'none', filter: 'url(#oclusao)' });
  poly(oclusao, noY(0.01, ret(0, 0.5, 0, H - 0.3)), '#3a1d10', { opacity: 0.16, stroke: 'none' });
  poly(oclusao, noX(0.01, ret(0, 0.5, 0, H - 0.3)), '#3a1d10', { opacity: 0.12, stroke: 'none' });
  const aoPiso = g(cena, { 'clip-path': 'url(#recortePiso)' });
  const aoPisoBlur = g(aoPiso, { filter: 'url(#oclusao)', opacity: 0.2 });
  poly(aoPisoBlur, noZ(0, ret(0, L, -0.2, 0.45)), '#3a1d10', { stroke: 'none' });
  poly(aoPisoBlur, noZ(0, ret(-0.2, 0.45, 0, L)), '#3a1d10', { stroke: 'none' });

  // luz (item 4): glow quente grande atrás do monitor + reflexo suave na parede pêssego
  const luz = g(cena, { 'clip-path': 'url(#recorteEsq)', class: 'respira' });
  const [lx, ly] = P(0, 3.8, 4.3);
  el('ellipse', { cx: lx, cy: ly + 10, rx: 260, ry: 230, fill: 'url(#luzParede)' }, luz);   // reflexo amplo
  el('ellipse', { cx: lx, cy: ly, rx: 105, ry: 95, fill: 'url(#luzNucleo)' }, luz);         // núcleo atrás da tela

  // ---------- quadro na parede sálvia ----------
  const quadro = g(cena);
  poly(quadro, noY(0.02, ret(3.5, 5.9, 3.6, 5.5)).map(([x, y, z]) => [x + 0.12, y, z - 0.12]), '#000', { opacity: 0.12, stroke: 'none', filter: 'url(#desfoque)' });
  caixa(quadro, [3.4, 5.8], [0, 0.12], [3.7, 5.6], COR.borda);
  const yq = 0.125;
  poly(quadro, noY(yq, ret(3.6, 5.6, 3.9, 5.4)), '#f6cf98');
  poly(quadro, noY(yq, circ(5.0, 4.95, 0.2)), '#ef8a4a');
  poly(quadro, noY(yq, [[3.6, 3.9], [4.35, 4.85], [5.15, 3.9]]), '#3f7f78');
  poly(quadro, noY(yq, [[4.55, 3.9], [5.15, 4.5], [5.6, 4.15], [5.6, 3.9]]), '#d9683a');

  // ---------- quadro com o nome da etapa (parede pêssego; preenchido por placa() no pipeline) ----------
  const quadroNome = g(cena);

  // ---------- tapete geométrico (item 3) ----------
  const tap = g(cena);
  const [tx0, tx1, ty0, ty1] = [3.0, 8.8, 2.8, 8.6];
  const T = (u, v) => [tx0 + u * (tx1 - tx0), ty0 + v * (ty1 - ty0)];
  const naTapete = (uv) => noZ(0.02, uv.map(([u, v]) => T(u, v)));
  // franjas nas duas pontas (bordas em u = 0 e u = 1), desenhadas antes do tapete
  const franjas = g(tap, { stroke: '#efe2c4', 'stroke-width': 1.3, 'stroke-linecap': 'round' });
  for (let v = 0.03; v < 0.98; v += 0.032) {
    for (const [u0, u1] of [[0, -0.035], [1, 1.035]]) {
      const [a, b] = T(u0, v), [c, d] = T(u1, v);
      linha(franjas, [a, b, 0.02], [c, d, 0.02]);
    }
  }
  // borda dupla: vermelho, creme, vermelho fino, creme, verde, creme
  const faixas = [
    [0, COR.tapeteVermelho], [0.035, COR.tapeteBase], [0.05, COR.tapeteVermelho],
    [0.065, COR.tapeteBase], [0.09, COR.tapeteVerde], [0.105, COR.tapeteBase],
  ];
  for (const [d, cor] of faixas) poly(tap, naTapete(ret(d, 1 - d, d, 1 - d)), cor);
  // losangos aninhados: vermelho > creme > verde > creme > vermelho (alternando a ordem)
  const losango = (u, v, a, b, cor) => poly(tap, naTapete([[u - a, v], [u, v - b], [u + a, v], [u, v + b]]), cor);
  for (let i = 0; i < 4; i++) {
    const u = 0.225 + i * 0.183;
    const [c1, c2] = i % 2 ? [COR.tapeteVerde, COR.tapeteVermelho] : [COR.tapeteVermelho, COR.tapeteVerde];
    losango(u, 0.5, 0.085, 0.21, c1);
    losango(u, 0.5, 0.062, 0.152, COR.tapeteBase);
    losango(u, 0.5, 0.045, 0.11, c2);
    losango(u, 0.5, 0.026, 0.064, COR.tapeteBase);
    losango(u, 0.5, 0.012, 0.03, c1);
  }
  // fileiras de triângulos (zigue-zague) perto das bordas
  for (const [v, s] of [[0.16, 1], [0.84, -1]]) {
    for (let u = 0.15; u < 0.85; u += 0.07) {
      poly(tap, naTapete([[u, v - 0.035 * s], [u + 0.035, v + 0.035 * s], [u + 0.07, v - 0.035 * s]]), COR.tapeteVermelho);
    }
  }

  // ---------- sombras no chão (item 5) ----------
  // projetadas: largas e suaves
  const sombras = g(cena, { opacity: 0.2, filter: 'url(#desfoque)' });
  poly(sombras, noZ(0.03, ret(0, 2.75, 1.5, 6.55)), '#4a2412', { stroke: 'none' });
  poly(sombras, noZ(0.03, ret(0.35, 2.35, 6.45, 7.65)), '#4a2412', { stroke: 'none' });
  elipseZ(sombras, 3.45, 4.1, 0, 0.85, { fill: '#4a2412' });
  elipseZ(sombras, 3.75, 1.15, 0, 0.8, { fill: '#4a2412' });
  // de contato: estreitas e mais escuras, coladas na base de cada objeto
  const contato = g(cena, { opacity: 0.4, filter: 'url(#contato)', fill: '#2e140a' });
  poly(contato, noZ(0.03, ret(0.1, 2.38, 1.66, 2.0)), '#2e140a', { stroke: 'none' });   // painel da mesa
  poly(contato, noZ(0.03, ret(0.1, 2.38, 4.26, 6.16)), '#2e140a', { stroke: 'none' });  // gaveteiro
  poly(contato, noZ(0.03, ret(0.38, 2.06, 6.52, 7.42)), '#2e140a', { stroke: 'none' }); // gabinete
  elipseZ(contato, 3.6, 1.0, 0.02, 0.62, { fill: '#2e140a' });                          // vaso
  for (let k = 0; k < 5; k++) {                                                          // rodinhas da cadeira
    const a = (k / 5) * Math.PI * 2 + 0.3;
    elipseZ(contato, 3.35 + 0.7 * Math.cos(a), 4.0 + 0.7 * Math.sin(a), 0.02, 0.09, { fill: '#2e140a' });
  }

  // poça de luz quente no chão perto da mesa
  elipseZ(cena, 2.3, 4.0, 0, 2.6, { fill: 'url(#luzChao)', class: 'respira' });

  // ---------- mesa laranja com gavetas ----------
  const mesa = g(cena);
  caixa(mesa, [0.1, 2.3], [1.7, 1.95], [0, 2.6], COR.mesa);         // painel lateral
  caixa(mesa, [0.1, 2.3], [4.3, 6.1], [0, 2.6], COR.mesa);          // gaveteiro
  for (const [z0, z1] of [[1.78, 2.48], [0.98, 1.68], [0.18, 0.88]]) {
    poly(mesa, noX(2.31, ret(4.42, 5.98, z0, z1)), tom(COR.mesa, -0.08), { stroke: tom(COR.mesa, -0.3), 'stroke-width': 1 });
    // realce na borda de cima da frente da gaveta
    linha(mesa, [2.315, 4.44, z1 - 0.02], [2.315, 5.96, z1 - 0.02], { stroke: tom(COR.mesa, 0.3), 'stroke-width': 0.8, opacity: 0.8 });
    // puxador metálico (item 6): barra com gradiente e dois apoios
    const zm = (z0 + z1) / 2;
    poly(mesa, noX(2.32, ret(4.97, 5.03, zm - 0.06, zm + 0.02)), '#6d737c', { 'stroke-width': 0.4 });
    poly(mesa, noX(2.32, ret(5.37, 5.43, zm - 0.06, zm + 0.02)), '#6d737c', { 'stroke-width': 0.4 });
    poly(mesa, noX(2.36, ret(4.92, 5.48, zm - 0.02, zm + 0.05)), 'url(#metal)', { stroke: '#8b929c', 'stroke-width': 0.4 });
  }
  caixa(mesa, [0, 2.4], [1.6, 6.2], [2.6, 2.85], COR.mesa);          // tampo

  // ---------- caixinhas de som de madeira ----------
  const caixaSom = (y0, y1) => {
    const gr = g(cena);
    caixa(gr, [0.35, 0.85], [y0, y1], [2.85, 3.7], COR.madeira);
    const yc = (y0 + y1) / 2;
    poly(gr, noX(0.86, circ(yc, 3.15, 0.15)), '#3a2a22');
    poly(gr, noX(0.87, circ(yc, 3.15, 0.07)), '#5b4434');
    poly(gr, noX(0.86, circ(yc, 3.5, 0.08)), '#3a2a22');
  };
  caixaSom(1.8, 2.2);

  // ---------- monitor com código ----------
  const mon = g(cena);
  caixa(mon, [0.45, 1.05], [3.4, 4.1], [2.85, 2.92], '#3a3a44');      // pé
  caixa(mon, [0.55, 0.7], [3.65, 3.85], [2.92, 3.45], '#3a3a44');     // haste
  caixa(mon, [0.5, 0.75], [2.3, 5.2], [3.35, 5.15], COR.preto);       // corpo
  poly(mon, noX(0.76, ret(2.42, 5.08, 3.47, 5.03)), 'url(#tela)');    // tela
  // tela viva (igual à ideia do projeto original, site/js/moveis.js):
  //   um "arquivo" de código feito de barras coloridas (sem texto), com marcas de número de linha,
  //   indentação que varia e linhas em branco. No "trabalhando" ele ROLA para cima com velocidade
  //   variável (rajadas, como quem digita e desce o arquivo); no "pensando" para e o brilho pulsa.
  // Truque: na projeção, subir em z vira só um deslocamento vertical na tela, então rolar é um
  // translate(0, y). O conteúdo é desenhado duas vezes, um embaixo do outro, para o loop não ter emenda.
  const TELA = { y: [2.42, 5.08], z: [3.47, 5.03] };
  const CORES_COD = ['#ff8a5c', '#9db4ff', '#7fd1b9', '#c9d1e0', '#f6d36b', '#c39bff'];
  const PASSO = 0.15, N_LINHAS = 26;                    // altura de cada linha (mundo) e linhas do arquivo
  const ALTURA_ARQ = PASSO * N_LINHAS * U;              // altura do arquivo na tela (px)
  // na tela do monitor, y maior fica à ESQUERDA de quem olha: espelha(v) inverte para o código ler da esquerda p/ direita
  const espelha = (v) => TELA.y[0] + TELA.y[1] - v;
  const telaViva = g(mon, { 'clip-path': 'url(#recorteTela)' });
  const rolo = g(telaViva);
  for (const copia of [0, 1]) {
    const arq = g(rolo, { transform: `translate(0 ${copia * ALTURA_ARQ})` });
    let ind = 0;
    for (let i = 0; i < N_LINHAS; i++) {
      const z = TELA.z[1] - 0.1 - i * PASSO;
      // número da linha: barrinha cinza na margem
      poly(arq, noX(0.775, ret(espelha(2.5), espelha(2.6), z - 0.05, z)), '#4a4560', { 'stroke-width': 0.3 });
      if (sorteio(i * 3.1) < 0.1) { ind = Math.max(0, ind - 1); continue; }   // linha em branco
      const r = sorteio(i * 7.7);
      ind = Math.max(0, Math.min(4, ind + (r < 0.3 ? 1 : r < 0.55 ? -1 : 0)));
      let y = 2.7 + ind * 0.14;
      const n = 1 + Math.floor(sorteio(i * 5.3) * 4);
      for (let k = 0; k < n && y < TELA.y[1] - 0.15; k++) {
        const w = 0.12 + sorteio(i * 11 + k) * 0.5;
        const cor = CORES_COD[Math.floor(sorteio(i * 13 + k * 3) * CORES_COD.length)];
        poly(arq, noX(0.775, ret(espelha(y), espelha(Math.min(y + w, TELA.y[1] - 0.1)), z - 0.055, z)), cor, { 'stroke-width': 0.4, opacity: 0.92 });
        y += w + 0.06;
      }
    }
  }
  // controle da tela: o loop de animação chama telaMonitor.update(dt, estadoDoRobo)
  const telaMonitor = (() => {
    let t = 0, desloca = 0;
    return {
      update(dt, estado) {
        t += dt;
        if (estado === 'trabalhando') {
          // velocidade variável: base + ondas lentas + rajadas curtas
          const vel = 10 * (0.6 + 0.4 * Math.sin(t * 0.7) ** 2 + (Math.sin(t * 2.3) > 0.6 ? 1.2 : 0));
          desloca = (desloca + vel * dt) % ALTURA_ARQ;
        }
        rolo.setAttribute('transform', `translate(0 ${(-desloca).toFixed(2)})`);
        // pensando: código parado, brilho pulsando devagar
        // ocioso: tela mais escura (ele largou o código e pegou o celular)
        telaViva.setAttribute('opacity', estado === 'pensando' ? (0.8 + 0.12 * Math.sin(t * 1.6)).toFixed(3) : estado === 'ocioso' ? '0.45' : '1');
      },
    };
  })();

  // ---------- teclado mecânico e mouse ----------
  const tec = g(cena);
  caixa(tec, [1.3, 1.85], [2.85, 4.85], [2.85, 2.95], '#2c2c36');
  for (let r = 0; r < 4; r++) {
    for (let c = 0; c < 14; c++) {
      const x = 1.35 + r * 0.12, y = 2.9 + c * 0.139;
      const base = (r === 3 && c > 4 && c < 10) ? COR.creme : (r === 0 && c === 0) || (r === 1 && c === 13) ? '#ee7d32' : '#e7dfd2';
      // variação leve de tom por tecla (item 6)
      const k = tom(base, (sorteio(r * 31 + c) - 0.5) * 0.08);
      caixa(tec, [x, x + 0.09], [y, y + 0.11], [2.95, 3.0], k, { esq: tom(k, -0.15), dir: tom(k, -0.28), brilho: false });
    }
  }
  // luz azulada fraca da tela sobre o teclado (item 4)
  elipseZ(tec, 1.45, 3.85, 3.0, 1.1, { fill: 'url(#luzTela)', class: 'respira', style: 'mix-blend-mode: screen' });
  poly(tec, noZ(2.86, ret(1.25, 2.15, 5.0, 5.75)), '#33333d');
  const [mx, my] = P(1.65, 5.35, 2.9);
  el('ellipse', { cx: mx, cy: my, rx: 7, ry: 4.5, fill: '#e7dfd2' }, tec);
  el('ellipse', { cx: mx - 1.5, cy: my - 1.5, rx: 3, ry: 1.5, fill: '#fff', opacity: 0.6 }, tec);

  caixaSom(5.85, 6.15);

  // ---------- gabinete preto com luzes ----------
  const pc = g(cena);
  caixa(pc, [0.4, 2.0], [6.55, 7.35], [0, 2.3], '#1d1d24', { topo: '#2c2c35', esq: '#26262e', dir: '#18181e' });
  const ventoinha = (zc, cor, atraso) => {
    const gr = g(pc, { filter: 'url(#brilho)', class: 'pulsa' + (atraso ? ' atraso' : '') });
    poly(gr, noX(2.01, circ(6.95, zc, 0.27)), 'none', { stroke: cor, 'stroke-width': 2.2 });
    poly(gr, noX(2.01, circ(6.95, zc, 0.09)), cor, { stroke: 'none' });
  };
  ventoinha(1.6, '#ff9d57', false);
  ventoinha(0.85, '#5fd6c4', true);
  poly(g(pc, { filter: 'url(#brilho)', class: 'pulsa' }), noX(2.01, ret(6.62, 6.67, 0.2, 2.1)), '#ffb36b', { stroke: 'none' });

  // ---------- cacto ao lado da mesa (item 1) — depois da mesa ----------
  const [KX, KY] = [3.6, 1.0];
  const cacto = g(cena);
  const [bx, by] = P(KX, KY, 1.3);
  const W = 28; // largura do corpo na tela

  // corpo em gomos: faixas verticais alternando 2 verdes, recortadas no formato arredondado
  const corpo = (topo, altura, raio) => {
    const id = 'gomos' + nClip++;
    el('rect', { x: bx - W / 2, y: topo, width: W, height: altura, rx: raio },
      el('clipPath', { id }, defs));
    const gr = g(cacto, { 'clip-path': `url(#${id})` });
    const n = 6, w = W / n;
    for (let i = 0; i < n; i++) {
      el('rect', { x: bx - W / 2 + i * w, y: topo, width: w + 0.3, height: altura, fill: i % 2 ? COR.cactoClaro : COR.cacto }, gr);
    }
    el('rect', { x: bx - W / 2, y: topo, width: W, height: altura, fill: 'url(#cilindro)' }, gr);  // curvatura
    return gr;
  };
  // espinhos: pontinhos claros ao longo das divisões dos gomos
  const espinhos = (x0, y0, y1, colunas) => {
    for (const dx of colunas) {
      for (let y = y0; y < y1; y += 9) {
        el('circle', { cx: x0 + dx, cy: y + (dx % 2 ? 4 : 0), r: 0.9, fill: '#f3f7da', opacity: 0.85 }, cacto);
      }
    }
  };
  // braços arredondados: contorno escuro, verde, e brilho fino (linecap round)
  const braco = (d) => {
    el('path', { d, fill: 'none', stroke: tom(COR.cacto, -0.25), 'stroke-width': 19, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }, cacto);
    el('path', { d, fill: 'none', stroke: COR.cacto, 'stroke-width': 17, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }, cacto);
    el('path', { d, fill: 'none', stroke: COR.cactoClaro, 'stroke-width': 6, 'stroke-linecap': 'round', 'stroke-linejoin': 'round', transform: 'translate(-3,0)' }, cacto);
    el('path', { d, fill: 'none', stroke: '#e4f2c8', 'stroke-width': 1.4, 'stroke-linecap': 'round', opacity: 0.5, transform: 'translate(-5,0)' }, cacto);
  };
  braco(`M${bx},${by - 52} h-22 v-32`);
  braco(`M${bx},${by - 74} h21 v-24`);
  espinhos(bx - 24, by - 82, by - 56, [-3, 3]);
  espinhos(bx + 19, by - 96, by - 76, [-3, 3]);
  el('rect', { x: bx - W / 2 - 1, y: by - 113, width: W + 2, height: 120, rx: 15, fill: tom(COR.cacto, -0.25) }, cacto); // contorno
  corpo(by - 112, 118, 14);
  espinhos(bx - W / 2, by - 104, by - 8, [W / 6, (2 * W) / 6, (3 * W) / 6, (4 * W) / 6, (5 * W) / 6]);
  // florzinha no topo
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2;
    el('circle', { cx: bx + Math.cos(a) * 4, cy: by - 114 + Math.sin(a) * 3, r: 3.6, fill: '#ff9a6a' }, cacto);
  }
  el('circle', { cx: bx, cy: by - 114, r: 2.4, fill: '#ffd36b' }, cacto);

  // vaso de terracota: corpo, borda superior mais larga e terra visível
  cilindro(cacto, KX, KY, 0, 1.15, 0.6, COR.terracota);
  cilindro(cacto, KX, KY, 1.05, 1.38, 0.69, tom(COR.terracota, 0.06), { tampa: tom(COR.terracota, 0.22) });
  elipseZ(cacto, KX, KY, 1.38, 0.57, { fill: 'url(#terra)' });
  for (let i = 0; i < 9; i++) {                       // grãozinhos de terra
    const a = sorteio(i + 50) * Math.PI * 2, r = 0.15 + sorteio(i + 80) * 0.35;
    const [sx, sy] = P(KX + Math.cos(a) * r, KY + Math.sin(a) * r, 1.38);
    el('circle', { cx: sx, cy: sy, r: 1, fill: '#9a7352', opacity: 0.8 }, cacto);
  }
  // base do caule por cima da terra (mesmos gomos)
  corpo(by - 22, 24, 6);

  // ---------- cadeira preta e creme ----------
  const cad = g(cena);
  const [ccx, ccy] = [3.35, 4.0];
  const pe = g(cad, { stroke: COR.preto, 'stroke-width': 5, 'stroke-linecap': 'round' });
  for (let k = 0; k < 5; k++) {
    const a = (k / 5) * Math.PI * 2 + 0.3;
    const fim = [ccx + 0.7 * Math.cos(a), ccy + 0.7 * Math.sin(a), 0.22];
    linha(pe, [ccx, ccy, 0.3], fim);
    const [rx, ry] = P(fim[0], fim[1], 0.1);
    el('circle', { cx: rx, cy: ry, r: 3.2, fill: '#3a3a44', stroke: 'none' }, cad);
  }
  const [c1x, c1y] = P(ccx, ccy, 0.3), [, c2y] = P(ccx, ccy, 1.45);
  el('rect', { x: c1x - 3.5, y: c2y, width: 7, height: c1y - c2y, rx: 3, fill: '#4a4a55' }, cad);
  const bracoCad = (y0, y1) => {
    caixa(cad, [3.35, 3.45], [y0 + 0.02, y1 - 0.02], [1.6, 2.3], COR.preto, { brilho: false });
    caixa(cad, [2.85, 3.6], [y0, y1], [2.3, 2.42], COR.preto);
  };
  bracoCad(3.28, 3.42);
  caixa(cad, [2.7, 3.9], [3.4, 4.6], [1.4, 1.6], COR.preto);
  caixa(cad, [2.75, 3.85], [3.45, 4.55], [1.6, 1.82], COR.creme);

  // ---------- robô agente sentado, digitando (js/robo.js) ----------
  // fica entre o assento e o encosto: o encosto (mais perto de quem vê) cobre as costas dele
  const robo = ROBO.sentado(svg, cad, [3.3, 4.0, 1.82], [[1.95, 3.45, 3.05], [1.95, 4.25, 3.05]], { paleta: tema.robo, topo });

  // encosto mais baixo (meia altura) para os ombros e a cabeça do robô aparecerem
  caixa(cad, [3.8, 3.95], [3.9, 4.1], [1.5, 2.0], COR.preto, { brilho: false });
  caixa(cad, [3.85, 4.1], [3.45, 4.55], [1.95, 3.2], COR.preto);
  poly(cad, noX(4.11, ret(3.5, 4.5, 2.2, 2.45)), COR.creme);
  for (let i = 1; i < 6; i++) poly(cad, noX(4.11, ret(3.5 + i * 0.17, 3.52 + i * 0.17, 2.55, 3.1)), '#34343e', { stroke: 'none' });
  bracoCad(4.58, 4.72);

  // ---------- subagentes (js/subagente.js): sentados no tapete com um laptop ----------
  // ficam na frente de tudo do quarto (mais perto de quem vê), então entram por último no grupo
  // até 4 lugares no tapete, espaçados na tela para um não cobrir o outro nem a cadeira
  const LUGARES_SUB = [[6.3, 6.5, 0.02], [8.0, 4.6, 0.02], [4.6, 7.6, 0.02], [8.5, 6.6, 0.02]];
  const subs = [];
  const adicionaSub = () => {
    if (subs.length >= LUGARES_SUB.length) return false;
    const sub = SUB.cria(svg, cena, topo, LUGARES_SUB[subs.length], tema.robo || ROBO.PALETAS[0], 0.85);
    sub.setEstado(robo.estado);   // trabalha como o agente principal: mesmo estado
    sub.profundidade = LUGARES_SUB[subs.length][0] + LUGARES_SUB[subs.length][1];
    subs.push(sub);
    // ordem de desenho: quem está mais perto de quem vê (x + y maior) vai por último
    [...subs].sort((a, b) => a.profundidade - b.profundidade).forEach((s) => cena.appendChild(s.no));
    return true;
  };
  const removeSub = () => { const s = subs.pop(); if (!s) return false; s.remove(); return true; };

  return { robo, telaMonitor, subs, adicionaSub, removeSub, quadroNome, maxSubs: LUGARES_SUB.length };
  }

  // ================= COLMEIA: vários quartos, um por agente =================
  // Cada quarto novo encaixa embaixo e na diagonal do anterior (alternando para a direita e para a
  // esquerda), como cubos empilhados. No mundo: desloca L+0.8 em x OU em y e desce H+1 em z.
  // Na tela isso é só um translate do grupo do quarto (a projeção é linear).
  const TEMAS = [
    { paredeEsq: '#f6c9a8', paredeDir: '#b5cdb0', robo: ROBO.PALETAS[0] },   // pêssego e sálvia, robô branco
    { paredeEsq: '#f2b3a8', paredeDir: '#f7cdc3', robo: ROBO.PALETAS[1] },   // rosa, robô coral
    { paredeEsq: '#dedad6', paredeDir: '#ebe7e3', robo: ROBO.PALETAS[2] },   // cinza claro, robô menta
    { paredeEsq: '#d5c9ee', paredeDir: '#e4dcf6', robo: ROBO.PALETAS[3] },   // lavanda, robô lavanda
    { paredeEsq: '#bfe1d1', paredeDir: '#d4eee2', robo: ROBO.PALETAS[4] },   // menta, robô céu
    { paredeEsq: '#bcd6ee', paredeDir: '#d3e5f5', robo: ROBO.PALETAS[5] },   // céu, robô amarelo
  ];
  const MAX_SALAS = TEMAS.length;
  const PASSO_XY = L + 0.8, PASSO_Z = H + 1;
  const camadaSalas = g(svg);          // quartos (em ordem: o mais novo fica na frente)
  const camadaTopo = g(svg);           // balões, sempre por cima de todos os quartos
  const salas = [];
  let estadoAtual = 'trabalhando';

  // posição do quarto i no mundo: alterna +x e +y a cada quarto e desce um andar
  const origem = (i) => {
    let x = 0, y = 0;
    for (let k = 1; k <= i; k++) { if (k % 2) x += PASSO_XY; else y += PASSO_XY; }
    return [x, y, -i * PASSO_Z];
  };

  // quadro na parede pêssego (plano x = 0) com o nome da etapa do pipeline
  function placa(gr, texto) {
    const [y0, y1, z0, z1] = [6.0, 9.6, 4.1, 6.1];
    poly(gr, noX(0.02, ret(y0 + 0.1, y1 + 0.1, z0 - 0.1, z1 - 0.1)).map(([x, y, z]) => [x, y + 0.12, z - 0.12]), '#000',
      { opacity: 0.12, stroke: 'none', filter: 'url(#desfoque)' });                  // sombra
    caixa(gr, [0, 0.12], [y0, y1], [z0, z1], '#fbf7f1');                              // moldura
    poly(gr, noX(0.125, ret(y0 + 0.18, y1 - 0.18, z0 + 0.18, z1 - 0.18)), '#fff');    // fundo branco
    // texto "colado" na parede: eixo horizontal segue -y na tela (C, -0.5), vertical segue z
    const [cx, cy] = P(0.13, (y0 + y1) / 2, (z0 + z1) / 2);
    const t = el('text', {
      class: 'placa', 'text-anchor': 'middle', 'dominant-baseline': 'central',
      transform: `translate(${cx.toFixed(1)} ${cy.toFixed(1)}) matrix(${C.toFixed(4)} -0.5 0 1 0 0)`,
    }, gr);
    t.textContent = texto;
    const cabe = (y1 - y0 - 0.6) * U;                // largura útil do quadro, em px ao longo da parede
    const w = t.getComputedTextLength();
    if (w > cabe) t.style.fontSize = (22 * cabe / w).toFixed(1) + 'px';   // nome longo: diminui até caber
  }

  function adiciona(nome) {
    if (salas.length >= MAX_SALAS) return false;
    const i = salas.length;
    const [sx, sy] = P(...origem(i));
    const pos = `translate(${sx.toFixed(1)} ${sy.toFixed(1)})`;
    const grupo = g(camadaSalas, { transform: pos, class: 'sala-nova' });
    const topo = g(camadaTopo, { transform: pos });
    const sala = criaSala(grupo, TEMAS[i], topo);
    sala.grupo = grupo; sala.topo = topo;
    if (nome) placa(sala.quadroNome, nome);
    sala.robo.setEstado(estadoAtual);
    salas.push(sala);
    ajustaCamera();
    return true;
  }
  // pipeline: refaz a colmeia com um quarto (agente) por etapa, cada um com o nome da etapa
  function define(nomes) {
    nomes = nomes.slice(0, MAX_SALAS);
    if (!nomes.length) return false;
    for (const sala of salas.splice(0)) { sala.grupo.remove(); sala.topo.remove(); }
    for (const nome of nomes) adiciona(nome);
    return true;
  }
  function remove() {
    if (salas.length <= 1) return false;
    const sala = salas.pop();
    sala.grupo.remove(); sala.topo.remove();
    ajustaCamera();
    return true;
  }

  // câmera: o viewBox vai suavemente até caber todos os quartos
  const VB_SALA = [-350, -290, 700, 700];      // enquadramento de um quarto sozinho
  let vb = [...VB_SALA], vbAlvo = [...VB_SALA];
  function ajustaCamera() {
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    salas.forEach((_, i) => {
      const [sx, sy] = P(...origem(i));
      x0 = Math.min(x0, VB_SALA[0] + sx); y0 = Math.min(y0, VB_SALA[1] + sy);
      x1 = Math.max(x1, VB_SALA[0] + VB_SALA[2] + sx); y1 = Math.max(y1, VB_SALA[1] + VB_SALA[3] + sy);
    });
    vbAlvo = [x0, y0, x1 - x0, y1 - y0];
  }

  // controle exposto para js/tela.js (botões) e para testes no console
  // subagentes entram no quarto mais novo (o último da colmeia)
  const adicionaSub = () => salas[salas.length - 1].adicionaSub();
  const removeSub = () => { for (let i = salas.length - 1; i >= 0; i--) if (salas[i].removeSub()) return true; return false; };
  window.__escritorio = {
    adiciona: () => adiciona(), remove, define, adicionaSub, removeSub,
    get nSubs() { return salas.reduce((n, s) => n + s.subs.length, 0); },
    get podeSub() { const s = salas[salas.length - 1]; return s.subs.length < s.maxSubs; },   // quarto mais novo ainda tem lugar?
    get n() { return salas.length; },
    get max() { return MAX_SALAS; },
  };
  // os botões de estado valem para todos os robôs
  window.__robo = {
    get estado() { return estadoAtual; },
    get estados() { return salas[0].robo.estados; },
    setEstado(e) {
      if (!salas[0].robo.setEstado(e)) return false;
      estadoAtual = e;
      for (const s of salas) { s.robo.setEstado(e); for (const sub of s.subs) sub.setEstado(e); }
      return true;
    },
  };

  adiciona();      // começa com um quarto...
  adicionaSub();   // ...e um subagente com laptop trabalhando nele
  vb = [...vbAlvo];

  // loop de animação: dt em segundos, limitado para não "pular" ao voltar de uma aba escondida
  const reduzMovimento = matchMedia('(prefers-reduced-motion: reduce)').matches;
  let antes = performance.now();
  const anima = (agora) => {
    const dt = Math.min(0.1, (agora - antes) / 1000);
    for (const s of salas) {
      s.robo.update(dt);
      for (const sub of s.subs) sub.update(dt);
      if (!reduzMovimento) s.telaMonitor.update(dt, s.robo.estado);   // código rolando no monitor
    }
    vb = vb.map((v, k) => reduzMovimento ? vbAlvo[k] : ISO.amort(v, vbAlvo[k], 5, dt));
    svg.setAttribute('viewBox', vb.map((v) => v.toFixed(1)).join(' '));
    antes = agora;
    requestAnimationFrame(anima);
  };
  requestAnimationFrame(anima);
})();
