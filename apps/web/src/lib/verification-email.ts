import { HttpError } from './http-error';

export function checkEmailConfiguration() {
  if (process.env.NODE_ENV === 'production' &&
      (!process.env.BREVO_API_KEY?.trim() || !process.env.BREVO_SENDER?.trim())) {
    throw new HttpError(503, 'Email verification is temporarily unavailable. Please try again later.');
  }
}

export async function sendVerificationEmail(email: string, code: string) {
  checkEmailConfiguration();
  if (!process.env.BREVO_API_KEY) {
    console.info(`[Development only] Verification code for ${email}: ${code}`);
    return;
  }
  try {
    const response = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: { 'api-key': process.env.BREVO_API_KEY, 'Content-Type': 'application/json' },
      signal: AbortSignal.timeout(10000),
      body: JSON.stringify({
        sender: { name: 'OiTesla', email: process.env.BREVO_SENDER },
        to: [{ email }],
        subject: 'Verify your OiTesla Account',
        htmlContent: `<div style="font-family:system-ui;max-width:500px;margin:auto;padding:30px">
          <h2>Welcome to OiTesla</h2><p>Use this code to complete your registration. It expires in 10 minutes.</p>
          <p style="background:#0A0D0B;color:#10B981;padding:24px;font-size:36px;letter-spacing:8px;text-align:center">${code}</p>
          <p>If you didn't request this, you can ignore this email.</p></div>`,
      }),
    });
    if (!response.ok) {
      console.error('Verification email provider returned status', response.status);
      throw new Error('Email delivery failed');
    }
  } catch {
    throw new HttpError(503, 'We could not send your verification code. Please try signing up again.');
  }
}
