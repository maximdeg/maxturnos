/**
 * Script para probar la configuración de email
 * Ejecutar con: node scripts/test-email.js
 */

require('dotenv').config({ path: '.env.local' });
const nodemailer = require('nodemailer');

const SMTP_HOST = process.env.SMTP_HOST || 'smtp.gmail.com';
const SMTP_PORT = parseInt(process.env.SMTP_PORT || '587');
const SMTP_SECURE = process.env.SMTP_SECURE === 'true';
const SMTP_USER = process.env.SMTP_USER || process.env.EMAIL_USER;
const SMTP_PASS = process.env.SMTP_PASS || process.env.EMAIL_PASS;
const SMTP_FROM = process.env.SMTP_FROM || SMTP_USER;

console.log('=== Configuración de Email ===');
console.log('SMTP_HOST:', SMTP_HOST);
console.log('SMTP_PORT:', SMTP_PORT);
console.log('SMTP_SECURE:', SMTP_SECURE);
console.log('SMTP_USER:', SMTP_USER ? `${SMTP_USER.substring(0, 5)}...` : 'NO CONFIGURADO');
console.log('SMTP_PASS:', SMTP_PASS ? '***CONFIGURADO***' : 'NO CONFIGURADO');
console.log('SMTP_FROM:', SMTP_FROM);
console.log('');

if (!SMTP_USER || !SMTP_PASS) {
  console.error('❌ ERROR: SMTP_USER o SMTP_PASS no están configurados');
  console.error('Por favor, configura EMAIL_USER y EMAIL_PASS en .env.local');
  process.exit(1);
}

const transporter = nodemailer.createTransport({
  host: SMTP_HOST,
  port: SMTP_PORT,
  secure: SMTP_SECURE,
  auth: {
    user: SMTP_USER,
    pass: SMTP_PASS,
  },
});

async function testEmail() {
  try {
    console.log('Verificando conexión SMTP...');
    await transporter.verify();
    console.log('✅ Conexión SMTP verificada correctamente');
    console.log('');

    console.log('Enviando email de prueba...');
    const testEmail = SMTP_USER; // Enviar a la misma cuenta
    const info = await transporter.sendMail({
      from: `"MaxTurnos Test" <${SMTP_FROM}>`,
      to: testEmail,
      subject: 'Test de Email - MaxTurnos',
      html: `
        <h1>Test de Email</h1>
        <p>Si recibes este email, la configuración está correcta.</p>
        <p>Fecha: ${new Date().toLocaleString()}</p>
      `,
      text: 'Test de Email - Si recibes este email, la configuración está correcta.',
    });

    console.log('✅ Email enviado correctamente');
    console.log('Message ID:', info.messageId);
    console.log('Response:', info.response);
    console.log('');
    console.log(`📧 Revisa tu bandeja de entrada (y spam) en: ${testEmail}`);
  } catch (error) {
    console.error('❌ ERROR al enviar email:');
    console.error('Mensaje:', error.message);
    console.error('Código:', error.code);
    console.error('Comando:', error.command);
    console.error('Respuesta:', error.response);
    console.error('');
    
    if (error.code === 'EAUTH') {
      console.error('💡 SUGERENCIA: Verifica que:');
      console.error('   1. La contraseña de aplicación de Google sea correcta');
      console.error('   2. No tenga espacios extra al inicio o final');
      console.error('   3. Tengas habilitada la autenticación de 2 factores en Google');
      console.error('   4. Hayas generado una "Contraseña de aplicación" específica para esta app');
    }
    
    process.exit(1);
  }
}

testEmail();
