# Site Celli Cruz - Assessoria Imobiliária

Site de imobiliária para Celli Cruz em Feira de Santana. Plataforma completa com página pública e painel administrativo.

## O que é este projeto?

É um site de imobiliária com duas partes principais:

1. **Website Público** - Página para clientes verem imóveis e informações
2. **Painel Administrativo** - Área para gerenciar imóveis, banners e usuários

## Estrutura do Projeto

```
cellicruz/
├── index.html              # Página inicial (home)
├── server.js               # Servidor Node.js (IMPORTANTE!)
├── package.json            # Configuração do Node.js
├── pages/
│   ├── admin.html         # Painel administrativo
│   ├── login.html         # Tela de login
│   ├── imoveis.html       # Lista de imóveis
│   └── imovel-detalhe.html # Detalhes de um imóvel
├── css/
│   └── styles.css         # Todos os estilos do site
├── js/
│   ├── main.js            # JavaScript da página pública
│   ├── admin.js           # JavaScript do painel admin
│   └── admin-auth.js      # Autenticação/login
├── api/
│   ├── upload.php         # (Legado - não usado mais)
│   └── save.php           # (Legado - não usado mais)
├── data/
│   └── imoveis.json       # Banco de dados (armazena tudo)
└── assets/
    ├── logo.png           # Logo da empresa
    └── uploads/           # Imagens dos imóveis
```

## Como começar

### Requisitos
- Node.js 12+ (baixar em https://nodejs.org)
- Um navegador moderno (Chrome, Firefox, Safari, Edge)

### Instalação Local

1. Clone o repositório:
```bash
git clone https://github.com/valnasio/Site_Celli_Cruz.git
cd Site_Celli_Cruz
```

2. Rode o servidor Node.js:
```bash
node server.js
```

3. Abra no navegador: `http://localhost:7070`

Pronto! O servidor está rodando e os dados são salvos automaticamente.

## Como usar

### Acessar o Painel Administrativo

1. Vá para `pages/login.html`
2. Digite seu usuário e senha
3. Clique em "Entrar"

Para testar, você pode adicionar um usuário manualmente no arquivo `data/imoveis.json` na seção `adminUsers`.

### Adicionar um Imóvel

1. Entre no painel admin (pages/login.html)
2. Clique em "Imóveis" no menu lateral
3. Clique em "Novo Imóvel"
4. Preencha todos os campos com as informações
5. Clique em "Salvar Imóvel"

### Criar um Banner/Slide

1. Entre no painel admin
2. Clique em "Carrossel" no menu lateral
3. Clique em "Novo Slide"
4. Preencha o título e selecione as imagens:
   - Imagem Desktop: 1240x420 pixels
   - Imagem Mobile: 768x300 pixels (aparece em celulares)
5. Clique em "Salvar Slide"

### Editar Configurações do Site

1. Entre no painel admin
2. Clique em "Configurações"
3. Mude os dados da empresa (telefone, email, etc)
4. Clique em "Salvar Configurações"

## Arquivos Importantes

### data/imoveis.json
Arquivo que armazena TODOS os dados:
- Configurações do site
- Lista de imóveis
- Banners do carrossel
- Usuários do admin

Este arquivo é atualizado automaticamente quando você salva algo no admin.

### server.js
Servidor Node.js que:
- Recebe requisições POST para `/api/save` e salva os dados
- Recebe upload de imagens em `/api/upload`
- Serve todos os arquivos HTML, CSS e JS

Este é o arquivo principal que mantém tudo funcionando!

### css/styles.css
Um único arquivo com TODOS os estilos do site (alinhado com a marca Celli Cruz).

Cores principais:
- Azul escuro: #1a2a3a
- Vermelho: #243447
- Cinza de fundo: #f5f6f8

### js/main.js
Controla a página pública:
- Carregamento de imóveis
- Filtros de imóveis
- Carrossel de banners
- Abrir/fechar menu mobile

### js/admin.js
Controla o painel administrativo:
- Adicionar/editar imóveis
- Adicionar/editar banners
- Gerenciar usuários
- Salvar dados

### js/admin-auth.js
Controla o login:
- Valida usuário/senha
- Cria sessão do usuário
- Faz logout

## Recursos Especiais

### Hero Section com Zoom
A seção hero (parte de cima com "O lar que acompanha...") aparece com 150% de zoom para destacar.

### Carousel Responsivo
O carrossel de banners automaticamente exibe:
- No desktop: imagem grande (1240x420)
- No celular: imagem otimizada (768x300)

As duas imagens nunca aparecem ao mesmo tempo.

### Filtros de Imóveis
Na página de imóveis, você pode filtrar por:
- Status (Lançamento, Pronto para Morar)
- Preço
- Localização

## Dados de Teste

Para testar o sistema, aqui está um exemplo de usuário admin:

```json
{
  "id": 1,
  "name": "Admin Celli",
  "username": "admin",
  "password": "123456"
}
```

Adicione isso em `data/imoveis.json` na seção `adminUsers`.

## Como Funcionam os Dados

### Salvamento Automático
Quando você faz qualquer alteração no painel administrativo (adiciona imóvel, banner, muda configurações), os dados são **salvos automaticamente** no arquivo `data/imoveis.json`.

Não precisa fazer nada manual - basta clicar em "Salvar" e pronto!

### Onde os Dados Ficam
Todos os dados estão em um único arquivo: `data/imoveis.json`

Ele contém:
- Configurações da empresa
- Lista de imóveis
- Banners do carrossel
- Usuários do admin

### Como Isso Funciona Tecnicamente
1. Você preenche um formulário no admin
2. Clica em "Salvar"
3. O JavaScript envia os dados via POST para `/api/save`
4. O servidor Node.js recebe e salva automaticamente em `data/imoveis.json`
5. A página pública automaticamente carrega os novos dados

## Problemas Comuns

### "Upload não funciona"
- Verifique se tem um servidor PHP rodando
- Certifique-se que a pasta `assets/uploads/` existe
- Verifique permissões de escrita na pasta

### "Dados não salvam"
- Verifique se o servidor Node.js está rodando (`node server.js`)
- Confirme que está acessando `http://localhost:7070` (não `file://`)
- Abra o DevTools (F12) e veja se há erros no console
- Certifique-se que a pasta `data/` existe e tem permissão de escrita

### "Página fica em branco"
- Abra o DevTools (F12) e veja os erros no console
- Confirme que os caminhos dos arquivos CSS e JS estão corretos
- Teste em outro navegador

## Desenvolvimento

### Modificar Estilos
Todos os estilos estão em `css/styles.css`. Procure pela seção que deseja mudar:
- `.hero` - seção principal
- `.carousel` - carrossel de banners
- `.imovel-card` - card de imóvel
- `.btn` - botões

### Adicionar Novas Páginas
1. Crie um novo arquivo HTML em `pages/`
2. Copie a estrutura do `index.html`
3. Importe o CSS: `<link rel="stylesheet" href="../css/styles.css">`
4. Importe o JS do admin se precisar: `<script src="../js/admin.js"></script>`

### Mudar Cores da Marca
Abra `css/styles.css` e procure por:
```css
:root {
  --azul-escuro: #1a2a3a;
  --azul-medio: #243447;
  --vermelho: #243447;
  --cinza-bg: #f5f6f8;
  ...
}
```

Mude as cores conforme necessário.

## Fazer Deploy (colocar online)

### Opção 1: Servidor com Node.js (Recomendado)

1. Faça upload de TODOS os arquivos para seu servidor
2. Instale Node.js no servidor
3. Rode:
```bash
node server.js
```
4. Acesse seu domínio na porta 7070 (ou mude a porta no server.js)

Tudo funcionará: uploads, salvamento automático, tudo!

### Opção 2: Plataforma de Hosting Node.js Gratuita

Hosts que suportam Node.js:
- **Heroku** (https://heroku.com)
- **Render** (https://render.com)
- **Railway** (https://railway.app)
- **Replit** (https://replit.com)

1. Faça fork do repositório
2. Conecte ao hosting
3. Defina a porta como 7070 em variáveis de ambiente
4. Deploy e pronto!

### Opção 3: Servidor VPS (DigitalOcean, AWS, etc)

1. Configure um VPS Ubuntu/Linux
2. Instale Node.js
3. Use uma ferramenta como PM2 para manter o servidor rodando
4. Configure um reverse proxy com Nginx

## Licença

Proprietário - Celli Cruz Assessoria Imobiliária

## Suporte

Para dúvidas ou problemas, abra uma issue no GitHub.
