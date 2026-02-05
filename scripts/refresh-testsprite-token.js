/**
 * Obtiene un JWT válido haciendo login con el usuario de prueba y actualiza
 * testsprite_tests/tmp/config.json (backendCredential) para TestSprite.
 *
 * Requisitos: app corriendo en BASE_URL (por defecto http://localhost:3000)
 * y usuario de prueba existente (node scripts/create-test-user.js).
 *
 * Uso:
 *   node scripts/refresh-testsprite-token.js
 *   BASE_URL=http://localhost:3000 TEST_USER_EMAIL=test@maxturnos.com TEST_USER_PASSWORD=TestPassword123! node scripts/refresh-testsprite-token.js
 *
 * Opción --print-only: solo imprime el token, no modifica config.json
 */

const fs = require('fs');
const path = require('path');

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';
const TEST_USER_EMAIL = process.env.TEST_USER_EMAIL || 'test@maxturnos.com';
const TEST_USER_PASSWORD = process.env.TEST_USER_PASSWORD || 'TestPassword123!';
const PRINT_ONLY = process.argv.includes('--print-only');

const LOGIN_URL = `${BASE_URL}/api/auth/login`;
const CONFIG_PATH = path.join(__dirname, '..', 'testsprite_tests', 'tmp', 'config.json');

async function getToken() {
  const res = await fetch(LOGIN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: TEST_USER_EMAIL,
      password: TEST_USER_PASSWORD,
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    let err;
    try {
      err = JSON.parse(text);
    } catch {
      err = { error: text };
    }
    throw new Error(
      `Login failed (${res.status}): ${err.error || err.message || text}. ` +
        'Asegúrate de que la app está corriendo y el usuario de prueba existe (node scripts/create-test-user.js).'
    );
  }

  const data = await res.json();
  if (!data.token) {
    throw new Error('La respuesta de login no incluye token.');
  }
  return data.token;
}

async function main() {
  console.log('Obteniendo JWT desde', LOGIN_URL, '...');
  const token = await getToken();
  console.log('Token obtenido correctamente.');

  if (PRINT_ONLY) {
    console.log('\nToken (copiar si necesitas):');
    console.log(token);
    return;
  }

  if (!fs.existsSync(CONFIG_PATH)) {
    console.warn('No existe', CONFIG_PATH, '- solo se imprime el token.');
    console.log('\nToken:');
    console.log(token);
    return;
  }

  const config = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
  config.backendCredential = token;
  fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2), 'utf8');
  console.log('Config actualizado:', CONFIG_PATH);
  console.log('backendCredential reemplazado por el nuevo token.');
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
