require('dotenv').config();

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Defina SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY no .env');
  process.exit(1);
}

const email = String(process.argv[2] || '').trim().toLowerCase();
const password = String(process.argv[3] || '');
const name = String(process.argv[4] || 'Administrador').trim();

if (!email || !password) {
  console.error('Uso: node scripts/create-admin-user.js <email> <senha> [nome]');
  process.exit(1);
}

async function main() {
  const response = await fetch(`${SUPABASE_URL}/auth/v1/admin/users`, {
    method: 'POST',
    headers: {
      apikey: SUPABASE_SERVICE_ROLE_KEY,
      Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      email,
      password,
      email_confirm: true,
      user_metadata: { name },
    }),
  });

  const payload = await response.json();

  if (!response.ok) {
    throw new Error(payload?.msg || payload?.message || payload?.error_description || payload?.error || 'Falha ao criar usuario.');
  }

  const user = payload.user || payload;
  console.log('Usuario criado com sucesso.');
  console.log(`ID: ${user.id}`);
  console.log(`Email: ${user.email}`);
  console.log(`Nome: ${user.user_metadata?.name || ''}`);
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
