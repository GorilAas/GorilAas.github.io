# O Grimório de Guilherme

Portfolio de Guilherme A. B. Borges (GorilaAs) em forma de grimório medieval em 3D: uma vela para acender, um selo de cera para romper e um livro cujas folhas se viram com a mão. Disponível em português, inglês e espanhol.

Site estático, sem etapa de build: HTML, CSS e módulos JavaScript nativos, com three.js e GSAP carregados de CDN.

## Rodar localmente

Os módulos JavaScript precisam ser servidos por HTTP (abrir o `index.html` direto do disco não funciona). Na pasta do projeto:

```bash
python -m http.server 8080
```

Depois abra http://localhost:8080.

## Editar o conteúdo

Todos os textos do livro, nos três idiomas, ficam em [`src/data/conteudo.js`](src/data/conteudo.js):

- `SITE`: dados que não mudam de idioma (nome, links, jogos, armas do ofício, poema, músicas).
- `TEXT.pt`, `TEXT.en`, `TEXT.es`: textos da interface e das páginas em cada língua.

As posições dos objetos na mesa e das drolleries animadas ficam em [`src/scene/layout.js`](src/scene/layout.js).

## Estrutura

```
index.html                 página única
src/
  main.js                  inicialização
  data/conteudo.js         textos e dados (PT, EN, ES)
  core/
    env.js                 detecção de ambiente e utilidades do DOM
    i18n.js                idioma atual e textos traduzidos
    math.js                ruído e interpolação
    assets.js              carregamento de fontes, texturas, imagens e modelos
  book/
    canvas.js              primitivas de desenho do pergaminho
    pages.js               cada página do livro, a capa e as texturas
  scene/
    world.js               cena 3D, animação, interação e sequências
    materials.js           texturas geradas por código
    layout.js              posições de objetos, folhas e drolleries
  audio/audio.js           efeitos sonoros e playlist medieval
  ui/hud.js                interface, idiomas e acessibilidade
  styles/main.css          estilos
assets/
  audio/                   músicas medievais (MP3)
  fonts/                   fontes textura e lombarda (OFL)
  images/                  manuscritos, retrato e drolleries
  models/                  modelos 3D (GLB)
  textures/                madeira e couro
  lib/draco/               decodificador dos modelos comprimidos
```

## Publicar no GitHub Pages

1. Crie no GitHub um repositório público chamado `GorilAas.github.io`.
2. Envie esta pasta para ele:

   ```bash
   git remote add origin https://github.com/GorilAas/GorilAas.github.io.git
   git push -u origin main
   ```

3. Em **Settings → Pages**, escolha **Deploy from a branch**, branch `main`, pasta `/ (root)`.
4. Em um ou dois minutos o site fica no ar em https://gorilaas.github.io.

Para usar um domínio próprio depois (por exemplo um `.com.br` do registro.br), adicione-o em **Settings → Pages → Custom domain** e aponte o DNS para o GitHub.

## Créditos

Imagens, modelos, músicas e fontes são de domínio público, CC0 ou licenças livres. A lista completa, com links e licenças, está em [CREDITOS.md](CREDITOS.md).
