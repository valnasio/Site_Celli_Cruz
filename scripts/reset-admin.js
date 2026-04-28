const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const DATA_PATH = path.join(__dirname, '..', 'data', 'imoveis.json');

function hashPassword(password, salt) {
  return crypto.createHash('sha256').update(password + salt).digest('hex');
}

const username = process.argv[2] || 'admin';
const password = process.argv[3];
const name = process.argv[4] || 'Administrador';

if (!password) {
  console.log('Uso: node scripts/reset-admin.js <usuario> <senha> [nome]');
  console.log('Exemplo: node scripts/reset-admin.js admin admin123 "Admin Principal"');
  process.exit(1);
}

try {
  if (!fs.existsSync(DATA_PATH)) {
    console.log('Criando novo arquivo imoveis.json...');
    const initialData = {
      config: {},
      about: {},
      carousel: [],
      adminUsers: [],
      imoveis: [],
      whatsappOptions: []
    };
    if (!fs.existsSync(path.dirname(DATA_PATH))) {
        fs.mkdirSync(path.dirname(DATA_PATH), { recursive: true });
    }
    fs.writeFileSync(DATA_PATH, JSON.stringify(initialData, null, 2));
  }

  const data = JSON.parse(fs.readFileSync(DATA_PATH, 'utf8'));
  const salt = crypto.randomBytes(16).toString('hex');
  const passwordHash = hashPassword(password, salt);

  if (!data.adminUsers) data.adminUsers = [];

  const userIndex = data.adminUsers.findIndex(u => u.username === username);
  const newUser = {
    id: userIndex >= 0 ? data.adminUsers[userIndex].id : Date.now(),
    username,
    name,
    passwordHash,
    salt
  };

  if (userIndex >= 0) {
    data.adminUsers[userIndex] = newUser;
    console.log(`Usuario "${username}" atualizado com sucesso.`);
  } else {
    data.adminUsers.push(newUser);
    console.log(`Usuario "${username}" criado com sucesso.`);
  }

  fs.writeFileSync(DATA_PATH, JSON.stringify(data, null, 2), 'utf8');
  console.log('Arquivo imoveis.json salvo.');

} catch (error) {
  console.error('Erro ao resetar admin:', error.message);
  process.exit(1);
}
