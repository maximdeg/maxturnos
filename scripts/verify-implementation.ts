/**
 * Script de Verificación de Implementación
 * 
 * Verifica que todas las mejoras estén correctamente implementadas:
 * - Rate Limiting
 * - Transacciones
 * - Caché
 * - Logging
 * 
 * Ejecutar con: npx tsx scripts/verify-implementation.ts
 */

import { existsSync } from 'fs';
import { join } from 'path';

interface CheckResult {
  name: string;
  status: 'ok' | 'warning' | 'error';
  message: string;
}

const checks: CheckResult[] = [];

// Verificar variables de entorno
function checkEnvVars() {
  const requiredVars = [
    'UPSTASH_REDIS_REST_URL',
    'UPSTASH_REDIS_REST_TOKEN',
    'LOG_LEVEL',
  ];

  const optionalVars = [
    'POSTGRESQL_HOST',
    'POSTGRESQL_DATABASE',
    'JWT_SECRET',
  ];

  requiredVars.forEach(varName => {
    if (!process.env[varName]) {
      checks.push({
        name: `Variable de entorno: ${varName}`,
        status: 'error',
        message: `Falta la variable de entorno requerida: ${varName}`,
      });
    } else {
      checks.push({
        name: `Variable de entorno: ${varName}`,
        status: 'ok',
        message: `✓ Configurada`,
      });
    }
  });

  optionalVars.forEach(varName => {
    if (!process.env[varName]) {
      checks.push({
        name: `Variable de entorno: ${varName}`,
        status: 'warning',
        message: `⚠ No configurada (opcional pero recomendada)`,
      });
    } else {
      checks.push({
        name: `Variable de entorno: ${varName}`,
        status: 'ok',
        message: `✓ Configurada`,
      });
    }
  });
}

// Verificar archivos de implementación
function checkImplementationFiles() {
  const files = [
    'lib/db-transactions.ts',
    'lib/rate-limit.ts',
    'lib/cache.ts',
    'lib/logger.ts',
    'lib/db.ts',
  ];

  files.forEach(file => {
    const filePath = join(process.cwd(), file);
    if (existsSync(filePath)) {
      checks.push({
        name: `Archivo: ${file}`,
        status: 'ok',
        message: '✓ Existe',
      });
    } else {
      checks.push({
        name: `Archivo: ${file}`,
        status: 'error',
        message: '✗ No encontrado',
      });
    }
  });
}

// Verificar endpoints actualizados
function checkEndpoints() {
  const endpoints = [
    'app/api/appointments/create/route.ts',
    'app/api/auth/register/route.ts',
    'app/api/auth/login/route.ts',
    'app/api/available-times/[date]/route.ts',
    'app/api/health-insurance/route.ts',
    'app/api/provider/[username]/work-schedule/route.ts',
    'app/api/auth/verify-email/route.ts',
    'app/api/appointments/[id]/cancel/route.ts',
  ];

  endpoints.forEach(endpoint => {
    const filePath = join(process.cwd(), endpoint);
    if (existsSync(filePath)) {
      checks.push({
        name: `Endpoint: ${endpoint}`,
        status: 'ok',
        message: '✓ Existe',
      });
    } else {
      checks.push({
        name: `Endpoint: ${endpoint}`,
        status: 'warning',
        message: '⚠ No encontrado',
      });
    }
  });
}

// Verificar dependencias en package.json
function checkDependencies() {
  try {
    const packageJson = require(join(process.cwd(), 'package.json'));
    const requiredDeps = [
      '@upstash/ratelimit',
      '@upstash/redis',
      'pino',
      'pino-pretty',
      'lru-cache',
    ];

    requiredDeps.forEach(dep => {
      if (packageJson.dependencies?.[dep] || packageJson.devDependencies?.[dep]) {
        checks.push({
          name: `Dependencia: ${dep}`,
          status: 'ok',
          message: `✓ Instalada`,
        });
      } else {
        checks.push({
          name: `Dependencia: ${dep}`,
          status: 'error',
          message: `✗ No instalada. Ejecutar: npm install ${dep}`,
        });
      }
    });
  } catch (error) {
    checks.push({
      name: 'Verificación de dependencias',
      status: 'error',
      message: '✗ No se pudo leer package.json',
    });
  }
}

// Ejecutar todas las verificaciones
checkEnvVars();
checkImplementationFiles();
checkEndpoints();
checkDependencies();

// Mostrar resultados
console.log('\n🔍 Verificación de Implementación de Mejores Prácticas\n');
console.log('='.repeat(60));

const okCount = checks.filter(c => c.status === 'ok').length;
const warningCount = checks.filter(c => c.status === 'warning').length;
const errorCount = checks.filter(c => c.status === 'error').length;

checks.forEach(check => {
  const icon = check.status === 'ok' ? '✓' : check.status === 'warning' ? '⚠' : '✗';
  const color = check.status === 'ok' ? '\x1b[32m' : check.status === 'warning' ? '\x1b[33m' : '\x1b[31m';
  console.log(`${color}${icon}\x1b[0m ${check.name}: ${check.message}`);
});

console.log('='.repeat(60));
console.log(`\nResumen:`);
console.log(`  ✓ Correctos: ${okCount}`);
console.log(`  ⚠ Advertencias: ${warningCount}`);
console.log(`  ✗ Errores: ${errorCount}`);

if (errorCount === 0) {
  console.log(`\n✅ Todas las verificaciones críticas pasaron!\n`);
  process.exit(0);
} else {
  console.log(`\n❌ Hay ${errorCount} error(es) que deben corregirse.\n`);
  process.exit(1);
}
