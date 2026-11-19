# NetBlox 3D — Laboratório de Redes

Jogo educativo 3D feito com HTML, CSS, JavaScript e Three.js. Projeto estático, preparado para GitHub Pages.

## Publicar no GitHub Pages
1. Extraia o ZIP.
2. Envie o conteúdo desta pasta diretamente para a raiz do repositório (o `index.html` deve ficar na raiz).
3. Em Settings → Pages, escolha Deploy from a branch, branch `main` e pasta `/(root)`.

## Recursos
- Ambiente 3D com visual de campus corporativo.
- Tutorial inicial com instruções e exemplos de topologias.
- Sete topologias de referência: Ponto a Ponto cabeado, Bluetooth, Estrela, Barramento, Anel, Malha e Árvore híbrida.
- Criação de topologia do zero: adicione computadores, roteadores, switches e servidores; clique em dois equipamentos para conectá-los.
- Avatar com rosto, animação, troca de skin e controles WASD, espaço e Shift.
- Teste de conectividade, simulação de falhas e reparo de enlaces.
- Missões com mensagem final “Parabéns!” e bônus de pontuação.
- Música ambiente original gerada pelo navegador (ativada pelo botão para respeitar a política de autoplay).
- Interface responsiva para desktop e dispositivos móveis.

## Estrutura
```text
netBlox/
├── index.html
├── README.md
├── .nojekyll
├── css/style.css
└── js/
    ├── game.js
    └── topologies.js
```

A biblioteca Three.js é carregada por CDN; é necessária conexão com a internet.
