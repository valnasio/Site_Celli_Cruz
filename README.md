# 🏠 Celli Cruz - Sistema de Gestão de Imóveis

Sistema de admin para gerenciar imóveis com carrossel responsivo, upload de imagens e alta disponibilidade com Docker.

## 🚀 Instalação e Execução

### ⭐ Opção 1: Docker (Recomendado)

Com 2 replicas + load balancer Nginx:

```bash
docker compose up --build -d
```

Acessar:
- **Site**: http://localhost
- **Admin**: http://localhost/pages/admin.html
- **API**: http://localhost/api/*

[Ver documentação completa](DOCKER_SETUP.md)

### Opção 2: Node.js Local

#### 1️⃣ Instalar Dependências

```bash
npm install
```

#### 2️⃣ Iniciar o Servidor

```bash
npm start
```

Ou com:

```bash
node server.js
```

#### 3️⃣ Acessar a Aplicação

- **Site**: http://localhost:8000
- **Painel Admin**: http://localhost:8000/pages/admin.html

## 📋 Funcionalidades

✅ **Gerenciamento de Imóveis**
- Criar, editar e deletar imóveis
- Upload de múltiplas imagens
- Campos de detalhe completos

✅ **Carrossel Responsivo**
- Imagens otimizadas para Desktop e Mobile
- Diferentes resoluções por dispositivo
- Upload automático de imagens

✅ **Salvamento Automático**
- Clique em "💾 Salvar Alterações" para exportar e salvar o JSON
- Arquivo é salvo em `data/imoveis.json`

✅ **Banco de Dados Simples**
- Usa JSON (`data/imoveis.json`)
- Upload de arquivos em `assets/uploads/`

✅ **Alta Disponibilidade (Docker)**
- 2 replicas de app Node.js
- Load balancer Nginx
- Auto-restart em caso de falha
- 0 downtime na atualização
- Volumes compartilhados

## 📂 Estrutura de Pastas

```
cellicruz/
├── server.js              # Servidor Node.js (Express)
├── package.json           # Dependências
├── index.html            # Página principal
├── api/
│   ├── save.php         # (Desativado - substituído por Node.js)
│   └── upload.php       # (Desativado - substituído por Node.js)
├── pages/
│   ├── admin.html       # Painel administrativo
│   ├── imoveis.html     # Página de imóveis
│   └── ...
├── js/
│   ├── admin.js         # Scripts do admin
│   ├── main.js          # Scripts globais
│   └── ...
├── css/
│   └── styles.css       # Estilos globais
├── data/
│   └── imoveis.json     # Banco de dados (criado automaticamente)
└── assets/
    ├── uploads/         # Pasta de uploads de imagens
    └── logo.png         # Logo do site
```

## 🔌 Endpoints da API

### POST `/api/save`
Salva os dados do admin no arquivo `data/imoveis.json`

**Request:**
```json
{
  "imoveis": [...],
  "carousel": [...],
  "config": {...}
}
```

**Response:**
```json
{
  "ok": true,
  "message": "Dados salvos com sucesso"
}
```

### POST `/api/upload`
Upload de arquivos para `assets/uploads/`

**Request:**
- `Content-Type: multipart/form-data`
- Campo: `file` (arquivo de imagem)

**Response:**
```json
{
  "ok": true,
  "path": "assets/uploads/arquivo.jpg"
}
```

## 🛠️ Tecnologias

- **Backend**: Node.js + Express.js
- **File Upload**: Multer
- **Frontend**: HTML5 + CSS3 + JavaScript Vanilla
- **Database**: JSON

## 📝 Notas Importantes

- As pastas `data/` e `assets/uploads/` são criadas automaticamente na primeira execução
- Os arquivos de imagem enviados são sanitizados e renomeados se houver conflito
- O servidor serve estaticamente todos os arquivos do projeto

## 🐛 Troubleshooting

**Erro: "Module not found: express"**
```bash
npm install
```

**Porta 8000 já está em uso?**
```bash
PORT=3000 npm start
```

**Permissão negada ao salvar arquivos?**
- Verifique se a paste `cellicruz/` tem permissão de escrita
- Em Linux/Mac: `chmod 755 cellicruz/`

## 📞 Suporte

Para reportar bugs ou sugerir melhorias, entre em contato 📧
