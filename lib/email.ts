/**
 * Utilidades de Email con Nodemailer (Google SMTP)
 * 
 * Funciones para enviar emails de verificación y notificaciones
 * a proveedores.
 */

import nodemailer from 'nodemailer';
import { logger } from './logger';

const SMTP_HOST = process.env.SMTP_HOST || 'smtp.gmail.com';
const SMTP_PORT = parseInt(process.env.SMTP_PORT || '587');
const SMTP_SECURE = process.env.SMTP_SECURE === 'true';
// Soporte para ambos nombres de variables: SMTP_USER/EMAIL_USER y SMTP_PASS/EMAIL_PASS
const SMTP_USER = process.env.SMTP_USER || process.env.EMAIL_USER;
const SMTP_PASS = process.env.SMTP_PASS || process.env.EMAIL_PASS;
const SMTP_FROM = process.env.SMTP_FROM || SMTP_USER;
const SMTP_FROM_NAME = process.env.SMTP_FROM_NAME || 'MaxTurnos';
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || process.env.BACKEND_API_PROD || 'http://localhost:3000';

// Configurar transporter de Nodemailer
const transporter = nodemailer.createTransport({
  host: SMTP_HOST,
  port: SMTP_PORT,
  secure: SMTP_SECURE, // true para puerto 465, false para puerto 587
  auth: SMTP_USER && SMTP_PASS
    ? {
        user: SMTP_USER,
        pass: SMTP_PASS, // Contraseña de aplicación de Google
      }
    : undefined,
});

/**
 * Envía email de verificación a un proveedor
 * 
 * @param email Email del proveedor
 * @param username Username del proveedor
 * @param verificationToken Token de verificación
 * @returns Resultado del envío
 */
export async function sendVerificationEmail(
  email: string,
  username: string,
  verificationToken: string
): Promise<nodemailer.SentMessageInfo> {
  const verificationUrl = `${APP_URL}/${username}/verificar-email?token=${verificationToken}`;

  const mailOptions = {
    from: `"${SMTP_FROM_NAME}" <${SMTP_FROM}>`,
    to: email,
    subject: 'Verifica tu cuenta de MaxTurnos',
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <style>
            body {
              font-family: Arial, sans-serif;
              line-height: 1.6;
              color: #333;
            }
            .container {
              max-width: 600px;
              margin: 0 auto;
              padding: 20px;
            }
            .header {
              background-color: #9e7162;
              color: white;
              padding: 20px;
              text-align: center;
              border-radius: 5px 5px 0 0;
            }
            .content {
              background-color: #f9f9f9;
              padding: 30px;
              border-radius: 0 0 5px 5px;
            }
            .button {
              display: inline-block;
              padding: 12px 24px;
              background-color: #9e7162;
              color: white;
              text-decoration: none;
              border-radius: 5px;
              margin: 20px 0;
            }
            .footer {
              margin-top: 20px;
              font-size: 12px;
              color: #666;
              text-align: center;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Bienvenido a MaxTurnos</h1>
            </div>
            <div class="content">
              <p>Hola,</p>
              <p>Gracias por registrarte en MaxTurnos. Para completar tu registro, por favor verifica tu cuenta haciendo clic en el siguiente enlace:</p>
              <p style="text-align: center;">
                <a href="${verificationUrl}" class="button">Verificar Cuenta</a>
              </p>
              <p>O copia y pega este enlace en tu navegador:</p>
              <p style="word-break: break-all; color: #666;">${verificationUrl}</p>
              <p><strong>Este enlace expira en 24 horas.</strong></p>
              <p>Si no solicitaste esta cuenta, puedes ignorar este email.</p>
            </div>
            <div class="footer">
              <p>MaxTurnos - Sistema de Reserva de Turnos</p>
            </div>
          </div>
        </body>
      </html>
    `,
    text: `
Bienvenido a MaxTurnos

Por favor, verifica tu cuenta haciendo clic en el siguiente enlace:
${verificationUrl}

Este enlace expira en 24 horas.

Si no solicitaste esta cuenta, puedes ignorar este email.
    `,
  };

  // Verificar configuración antes de enviar
  if (!SMTP_USER || !SMTP_PASS) {
    const errorMsg = 'Email no configurado: SMTP_USER o SMTP_PASS faltantes';
    logger.error({ email, username, SMTP_USER: !!SMTP_USER, SMTP_PASS: !!SMTP_PASS }, errorMsg);
    throw new Error(errorMsg);
  }

  try {
    // Verificar conexión antes de enviar
    await transporter.verify();
    logger.info({ email, username }, 'SMTP connection verified');
    
    const info = await transporter.sendMail(mailOptions);
    logger.info({ 
      email, 
      username, 
      messageId: info.messageId,
      response: info.response 
    }, 'Verification email sent successfully');
    return info;
  } catch (error: any) {
    const errorDetails = {
      email,
      username,
      error: error instanceof Error ? error.message : String(error),
      code: error.code,
      command: error.command,
      response: error.response,
      responseCode: error.responseCode,
    };
    logger.error(errorDetails, 'Error sending verification email');
    throw error;
  }
}

/**
 * Envía un email genérico
 * 
 * @param options Opciones del email
 * @returns Resultado del envío
 */
export async function sendEmail(options: {
  to: string;
  subject: string;
  html: string;
  text?: string;
}): Promise<nodemailer.SentMessageInfo> {
  const mailOptions = {
    from: `"${SMTP_FROM_NAME}" <${SMTP_FROM}>`,
    to: options.to,
    subject: options.subject,
    html: options.html,
    text: options.text,
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    logger.info({ to: options.to, subject: options.subject }, 'Email sent successfully');
    return info;
  } catch (error) {
    logger.error({ error, to: options.to, subject: options.subject }, 'Error sending email');
    throw error;
  }
}

/**
 * Verifica la configuración de email
 * 
 * @returns true si está configurado correctamente, false si no
 */
export function isEmailConfigured(): boolean {
  return !!(SMTP_USER && SMTP_PASS);
}
