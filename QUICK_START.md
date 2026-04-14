# ⚡ Quick Start

## � Opção 1: Docker (Recomendado)

### 3 Passos

```bash
# 1. Build
docker compose up --build -d

# 2. Aguardar health check (~30s)
docker compose ps

# 3. Abrir no navegador
# Site: http://localhost
# Admin: http://localhost/pages/admin.html
```

**Benefícios:**
- ✅ 2 replicas (alta disponibilidade)
- ✅ Load balancer automático
- ✅ Auto-restart
- ✅ Zero downtime

[Documentação completa](DOCKER_SETUP.md)

---

## 🚀 Opção 2: Node.js Local

### 1. Instalar Dependências
```bash
npm install
```

### 2. Iniciar Servidor

**Windows:**
```bash
start.bat
```

**Linux/Mac:**
```bash
bash start.sh
```

**Ou manualmente:**
```bash
node server.js
```

### 3. Abrir no Navegador
- **Site**: http://localhost:8000
- **Admin**: http://localhost:8000/pages/admin.html

---

## ✨ O Que Mudou?

| Feature | Status |
|---------|--------|
| Salvamento JSON Automático | ✅ Funciona com Node.js |
| Upload de Imagens | ✅ Agora mais rápido |
| Carrossel Desktop | ✅ 1240x420px |
| Carrossel Mobile | ✅ Novo! 600x400px |
| Responsividade | ✅ Melhorada |
| Backend | ✅ Migrado para Node.js |

---

## 📁 Estrutura

```
cellicruz/
├── server.js          ← Servidor principal (Node.js)
├── package.json       ← Dependências
├── pages/
│   └── admin.html     ← Painel administrativo
├── data/
│   └── imoveis.json   ← Banco de dados
├── assets/uploads/    ← Imagens enviadas
└── README.md          ← Documentação completa
```

---

## 🎯 Próximos Passos

1. **Cadastrar um Slide:**
   - Vá para Admin → Carrossel
   - Clique em "+ Novo Slide"
   - Envie uma imagem de Desktop (1240x420)
   - Opcionalmente, envie de Mobile (600x400)
   - Clique em "Salvar Slide"

2. **Salvar Dados:**
   - Clique em "💾 Salvar Alterações"
   - Dados salvos em `data/imoveis.json`

3. **Ver no Site:**
   - Acesse http://localhost:8000
   - O carrossel aparecerá responsivo

---

## 🐛 Problemas Comuns

**Erro: "Cannot find module express"**
```bash
npm install
```

**Porta 8000 ocupada?**
```bash
PORT=3000 npm start
```

**Erro de permissão ao salvar?**
```bash
# Windows
icacls cellicruz /grant:r %username%:F /t

# Linux/Mac
chmod 755 cellicruz
```

---

## 💡 Dicas

- ✅ Admin salva em JSON local (não precisa banco de dados)
- ✅ Imagens são armazenadas em `assets/uploads/`
- ✅ Compatível com exportar/importar dados
- ✅ Sem necessidade de configuração extra

---

## 📞 Suporte

Dúvidas? Veja o `README.md` para documentação completa! 📚
