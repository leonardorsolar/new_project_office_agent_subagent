// Modal "Pipeline": lista de etapas (planejamento, design, implementação...).
// As etapas ficam salvas no localStorage do navegador.
(() => {
  const CHAVE = 'pipeline.etapas';
  const modal = document.getElementById('pipeline');
  const abre = document.getElementById('abrePipeline');
  const fecha = document.getElementById('fechaPipeline');
  const form = document.getElementById('formEtapa');
  const entrada = document.getElementById('novaEtapa');
  const lista = document.getElementById('etapas');
  const vazio = document.getElementById('semEtapas');
  const cria = document.getElementById('criaPipeline');
  const aviso = document.getElementById('limiteEtapas');
  // cada etapa vira um agente na cena, e a colmeia tem no máximo esse número de quartos
  const MAX = (window.__escritorio && window.__escritorio.max) || 6;

  let etapas;
  try { etapas = JSON.parse(localStorage.getItem(CHAVE)) || []; } catch { etapas = []; }
  const salva = () => localStorage.setItem(CHAVE, JSON.stringify(etapas));

  const botao = (classe, texto, rotulo, acao) => {
    const b = document.createElement('button');
    b.type = 'button'; b.className = classe; b.textContent = texto;
    b.setAttribute('aria-label', rotulo); b.title = rotulo;
    b.addEventListener('click', acao);
    return b;
  };

  const desenha = () => {
    lista.replaceChildren();
    etapas.forEach((etapa, i) => {
      const li = document.createElement('li');
      li.classList.toggle('feita', etapa.feita);

      const marca = document.createElement('input');
      marca.type = 'checkbox'; marca.checked = etapa.feita;
      marca.setAttribute('aria-label', `Concluir ${etapa.texto}`);
      marca.addEventListener('change', () => { etapa.feita = marca.checked; salva(); desenha(); });

      const texto = document.createElement('span');
      texto.textContent = etapa.texto;

      const troca = (j) => { [etapas[i], etapas[j]] = [etapas[j], etapas[i]]; salva(); desenha(); };
      const sobe = botao('mover', '↑', 'Subir', () => troca(i - 1));
      const desce = botao('mover', '↓', 'Descer', () => troca(i + 1));
      sobe.disabled = i === 0;
      desce.disabled = i === etapas.length - 1;
      const apaga = botao('apagar', '✕', `Remover ${etapa.texto}`, () => { etapas.splice(i, 1); salva(); desenha(); });

      li.append(marca, texto, sobe, desce, apaga);
      lista.append(li);
    });
    vazio.hidden = etapas.length > 0;
    cria.disabled = etapas.length === 0;
    aviso.hidden = etapas.length < MAX;
  };

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const texto = entrada.value.trim();
    if (!texto) return;
    if (etapas.length >= MAX) { aviso.hidden = false; return; }
    etapas.push({ texto, feita: false });
    salva(); desenha();
    entrada.value = '';
    entrada.focus();
  });

  // "Criar pipeline": avisa o resto da página com as etapas, na ordem, e fecha a modal.
  // Quem quiser reagir escuta: addEventListener('pipeline:criado', e => e.detail.etapas)
  cria.addEventListener('click', () => {
    if (!etapas.length) return;
    dispatchEvent(new CustomEvent('pipeline:criado', { detail: { etapas: etapas.map((e) => ({ ...e })) } }));
    modal.close();
  });

  abre.addEventListener('click', () => { modal.showModal(); entrada.focus(); });
  fecha.addEventListener('click', () => modal.close());
  // clicar fora da caixa (no fundo) fecha a modal; Esc já fecha nativamente
  modal.addEventListener('click', (e) => {
    if (e.target !== modal) return;
    const r = modal.getBoundingClientRect();
    const dentro = e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom;
    if (!dentro) modal.close();
  });

  desenha();
})();
