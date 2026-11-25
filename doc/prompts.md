
# Parte 1:  sala
Prompt para o estilo "isometric room diorama"


✨ Prompt principal (inglês)

Isometric 3D cutaway room diorama, a single cozy home office floating on a solid dark navy blue background. Two walls visible (left wall warm peach, right wall soft sage green) with thick white wall edges, light wood plank floor, and a thin orange base slab under the floor. A bright orange wooden desk with drawers in the corner, a modern computer monitor showing code on screen, a mechanical keyboard, two small wooden bookshelf speakers, a black PC tower on the floor with glowing speaker details, a black and cream ergonomic office chair. A large potted cactus with an orange terracotta pot next to the desk, a small framed picture on the wall, and a geometric Southwestern-style rug with red, cream and green diamond patterns. Warm glowing light radiating from the desk area onto the peach wall. Soft shadows, rounded forms, clean smooth materials, stylized 3D render, cozy game aesthetic, Blender-style, miniature diorama, high detail, centered composition, 1:1 aspect ratio.


🚫 Negative prompt (opcional)
photorealistic, messy, cluttered, text, watermark, people, perspective distortion, dark lighting, harsh shadows, low quality, blurry


🧩 Fórmula para reutilizar o estilo

Troque só o miolo entre colchetes e mantenha o resto:
Isometric 3D cutaway room diorama, [TIPO DE QUARTO], floating on a solid [COR] background. Two walls visible ([COR PAREDE ESQUERDA] and [COR PAREDE DIREITA]), thick white wall edges, light wood floor, thin orange base slab. Furniture: [MÓVEIS E OBJETOS]. Warm glowing light, soft shadows, rounded forms, stylized 3D render, cozy game aesthetic, miniature diorama, high detail, 1:1.


Melhorias:

Você é um dev front-end especialista em SVG e ilustração isométrica.

CONTEXTO
Tenho uma sala isométrica 100% SVG gerada por JavaScript (sem imagens, sem libs 3D):
- js/iso.js: P(x,y,z) = [(x - y) * cos30° * U, (x + y) * 0.5 * U - z * U], com U = 34. Piso 0–10, paredes com altura 7.
- Helpers: caixa() (3 faces: topo claro, esquerda média, direita escura), noX()/noY()/noZ() (formas planas sobre faces), cilindro() (lateral com arco de elipse + tampa elíptica).
- js/sala.js desenha na ordem (painter's algorithm): base, piso, paredes, luz, quadro, tapete, sombras, mesa, monitor, gabinete, cacto, cadeira.
- Luz e sombra com radialGradient, feGaussianBlur e clipPath; animações só com CSS @keyframes.

OBJETIVO
Aproximar o resultado do estilo "cozy 3D render" da imagem de referência anexa, mantendo tudo vetorial e leve, sem quebrar a ordem de desenho nem a geometria atual.

AJUSTES PEDIDOS
1. Cacto: desenhar com corpo em gomos (faixas verticais com 2 tons de verde), braços arredondados com stroke-linecap round, pontinhos claros como espinhos e gradiente lateral para dar curvatura. Vaso terracota com borda superior e terra visível.
2. Piso: tábuas com variação sutil de tom (3 a 4 tons de madeira), juntas finas e leve gradiente do canto iluminado para o escuro.
3. Tapete: acrescentar borda dupla, franjas nas duas pontas e losangos aninhados nas cores vermelho, creme e verde-sálvia.
4. Luz: glow quente maior atrás do monitor, reflexo suave na parede pêssego e luz azulada fraca do monitor sobre o teclado.
5. Sombras: sombra de contato com blur sob a mesa, a cadeira, o gabinete e o vaso, mais ambient occlusion nos cantos das paredes.
6. Acabamento: stroke-linejoin round nos polígonos, highlight de 1px nas arestas superiores das caixas, gaveta da mesa com puxadores metálicos e teclas do teclado com leve variação de tom.
7. Paleta: laranja #E8742F (mesa), pêssego #F6C9A8, verde-sálvia #B5CDB0, azul-marinho de fundo #1B2240, madeira #E6C49C.

REGRAS
- Não usar imagens, canvas, WebGL nem bibliotecas externas.
- Reutilizar P(), caixa(), noX/noY/noZ e cilindro(); criar novos helpers só se necessário.
- Respeitar a ordem de desenho e deixar o cacto depois da mesa.
- Manter as animações CSS existentes (luz respirando, ventoinhas, cursor).
- Entregar apenas os trechos alterados de js/iso.js e js/sala.js, comentados em português.


# Parte 2:  robô

🎨 Prompt no estilo do robô

Este é o estilo do robô que acabamos de criar: personagem fofo, estilo brinquedo 3D, com materiais lisos e brilhantes, em branco, amarelo e ciano 🤖💛

✨ Prompt principal (inglês, para geradores de imagem)
Cute friendly AI robot mascot character, front view, full upper body, stylized 3D toy render. Big rounded rectangular head in glossy white plastic with soft gradient shading, a large black glass visor face with two big round glowing cyan eyes with white highlights and a small cyan smile. Short antenna on top with a yellow ball and a dark base. Yellow rounded ear pieces on both sides of the head. Rounded yellow torso with a glowing cyan round button on the chest, light gray base underneath. Floating gray articulated arms with dark round joints, yellow wrist cuffs, and small claw-style hands with two fingers, positioned in front as if typing on a keyboard. Smooth glossy materials, soft studio lighting from the top left, subtle rim light, soft contact shadow below, clean rounded shapes, toy-like proportions with an oversized head, vibrant but harmonious palette (white, sunny yellow, cyan, dark gray). Isolated on a plain flat dark navy blue background, centered, high detail, 1:1.

Negative: realistic human, text, watermark, logo, thin or sharp shapes, scary or aggressive look, messy background, dark moody lighting, low quality, blurry, extra limbs.
🧩 Fórmula do estilo (para reutilizar em outros personagens)
Cute [TIPO DE PERSONAGEM], stylized 3D toy render, oversized rounded head, glossy smooth plastic materials, [COR 1] and [COR 2] with [COR DE DESTAQUE] glowing details, soft studio lighting from top left, subtle rim light, soft contact shadow, clean rounded shapes, friendly expression, isolated on flat [COR DE FUNDO] background, centered, high detail, 1:1.
🖼️ Versão para combinar com a sala isométrica

Para o robô ficar coerente com o quarto, troque o fim do prompt:

...seated pose at a desk seen from an isometric 3/4 angle, hands on a keyboard, matching a cozy isometric room diorama with orange, peach and sage green tones, warm soft lighting, stylized 3D render.
🛠️ Versão para pedir o SVG ao Claude (estilo vetorial)
Desenhe em SVG puro um robô mascote fofo no estilo "brinquedo 3D": cabeça grande arredondada branca com gradiente, visor preto com olhos ciano brilhantes e sorriso, antena com bolinha amarela, orelhas amarelas, tronco amarelo com botão ciano, braços cinza articulados com punhos amarelos e mãos de garra. Use linearGradient e radialGradient para volume, feGaussianBlur para brilho e sombra, stroke-linecap round, e reflexos brancos semitransparentes. Organize em grupos nomeados (antena, cabeca, visor, olho-esq, olho-dir, boca, tronco, braco-esq, braco-dir, mao-esq, mao-dir) com transform-origin nas articulações, sem animação por enquanto.