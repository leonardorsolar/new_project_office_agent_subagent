// Parte 1: comportamento da tela. "+" e "−" adicionam e removem quartos (um robô por quarto);
// o contador mostra quantos agentes existem. "+ sub" / "− sub" (ou a tecla s) cuidam dos
// subagentes com laptop. A barra de texto ainda não cria agentes.
(() => {
  const barra = document.getElementById('barra');
  const entrada = document.getElementById('prompt');
  const conta = document.getElementById('conta');
  const mais = document.getElementById('mais');
  const menos = document.getElementById('menos');
  const maisSub = document.getElementById('maisSub');
  const menosSub = document.getElementById('menosSub');
  const esc = window.__escritorio;   // criado em js/sala.js

  // contador e botões refletem quantos quartos existem (mínimo 1, máximo = nº de temas)
  const mostra = () => {
    conta.textContent = esc.n;
    menos.disabled = esc.n <= 1;
    mais.disabled = esc.n >= esc.max;
    menosSub.disabled = esc.nSubs === 0;
    maisSub.disabled = !esc.podeSub;
  };
  mais.addEventListener('click', () => { esc.adiciona(); mostra(); });
  menos.addEventListener('click', () => { esc.remove(); mostra(); });
  // subagentes: entram no quarto mais novo (até 4 por quarto)
  maisSub.addEventListener('click', () => { esc.adicionaSub(); mostra(); });
  menosSub.addEventListener('click', () => { esc.removeSub(); mostra(); });
  mostra();

  // "Criar pipeline" (js/pipeline.js): um agente (quarto com robô) para cada etapa
  addEventListener('pipeline:criado', (e) => {
    esc.define(e.detail.etapas.map((etapa) => etapa.texto));
    mostra();
  });

  barra.addEventListener('submit', (e) => { e.preventDefault(); entrada.value = ''; });

  // botões de estado: valem para todos os robôs; só marcam o botão se o estado for aceito
  const botoes = document.querySelectorAll('.estados button');
  for (const b of botoes) {
    b.addEventListener('click', () => {
      if (!window.__robo || !window.__robo.setEstado(b.dataset.estado)) return;
      for (const o of botoes) o.setAttribute('aria-pressed', String(o === b));
    });
  }

  // "/" foca a barra, Esc sai dela; fora da barra, "+" e "-" também adicionam/removem quartos
  addEventListener('keydown', (e) => {
    if (document.querySelector('dialog[open]')) return;   // modal aberta: atalhos desligados
    const editando = document.activeElement === entrada;
    if (e.key === '/' && !editando) { e.preventDefault(); entrada.focus(); }
    if (e.key === 'Escape' && editando) entrada.blur();
    if (!editando && (e.key === '+' || e.key === '=')) { esc.adiciona(); mostra(); }
    if (!editando && e.key === '-') { esc.remove(); mostra(); }
    if (!editando && e.key === 's') { esc.adicionaSub(); mostra(); }
  });
})();
