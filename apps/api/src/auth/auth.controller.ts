import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { prisma } from '../prisma';

const JWT_SECRET = process.env.JWT_SECRET || 'supersecretjwtkey123';

// Send email via Brevo HTTP API (works on Render — no SMTP ports needed)
async function sendEmail(to: string, subject: string, htmlContent: string) {
  const apiKey = process.env.BREVO_API_KEY;
  if (!apiKey) {
    console.log(`\n[MOCK EMAIL] To: ${to} | Subject: ${subject}\n`);
    return;
  }

  const res = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: {
      'api-key': apiKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      sender: { name: 'OiTesla', email: process.env.BREVO_SENDER || to },
      to: [{ email: to }],
      subject,
      htmlContent,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Brevo API error: ${res.status} ${err}`);
  }
}

export const signup = async (req: Request, res: Response) => {
  try {
    const { email, password, name, role } = req.body;
    
    if (!email || !password || !name || !role) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    if (role !== 'PASSENGER' && role !== 'DRIVER') {
      return res.status(400).json({ error: 'Invalid role' });
    }

    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      if (existingUser.is_verified) {
        return res.status(400).json({ error: 'User with this email already exists' });
      }
      // If user exists but is NOT verified, we will overwrite their data with the new attempt
    }

    const password_hash = await bcrypt.hash(password, 10);
    const verify_code = Math.floor(100000 + Math.random() * 900000).toString(); // 6-digit code
    console.log(`\n🔑 [OTP GENERATED] for ${email}: ${verify_code}\n`);
    const verify_expires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    const userData = {
      email,
      name,
      password_hash,
      role,
      is_verified: false,
      verify_code,
      verify_expires,
      wallet_balance: role === 'PASSENGER' ? 100000 : 50000,
    };

    let user;
    if (existingUser) {
      user = await prisma.user.update({
        where: { email },
        data: userData,
      });
    } else {
      user = await prisma.user.create({
        data: userData,
      });
    }

    // Send OTP email via Brevo HTTP API
    const emailHtml = `
      <div style="font-family: system-ui, -apple-system, sans-serif; max-width: 500px; margin: 0 auto; padding: 30px; border: 1px solid #e5e7eb; border-radius: 16px; background-color: #ffffff;">
        <h2 style="color: #0A0D0B; margin-top: 0; font-size: 24px;">Welcome to OiTesla</h2>
        <p style="color: #4b5563; font-size: 16px; line-height: 1.5;">Please use the verification code below to complete your registration. This code will expire in 10 minutes.</p>
        <div style="background-color: #0A0D0B; padding: 24px; border-radius: 12px; text-align: center; margin: 32px 0;">
          <span style="font-size: 36px; font-weight: 700; letter-spacing: 8px; color: #10B981; margin-left: 8px;">${verify_code}</span>
        </div>
        <p style="color: #6b7280; font-size: 14px; text-align: center; margin-bottom: 0;">If you didn't request this, you can safely ignore this email.</p>
      </div>
    `;

    sendEmail(email, 'Verify your OiTesla Account', emailHtml)
      .then(() => console.log(`✅ Email sent to ${email}`))
      .catch(err => console.error('❌ Email failed:', err.message));

    res.status(201).json({ message: 'Verification code sent to email', requiresVerification: true, email, role });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const verifyEmail = async (req: Request, res: Response) => {
  try {
    const { email, code } = req.body;
    
    if (!email || !code) {
      return res.status(400).json({ error: 'Missing parameters' });
    }

    const user = await prisma.user.findUnique({ where: { email } });
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (user.is_verified) {
      return res.status(400).json({ error: 'Email already verified' });
    }

    if (user.verify_code !== code) {
      return res.status(400).json({ error: 'Invalid verification code' });
    }

    if (!user.verify_expires || user.verify_expires < new Date()) {
      return res.status(400).json({ error: 'Verification code has expired' });
    }

    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: {
        is_verified: true,
        verify_code: null,
        verify_expires: null
      }
    });

    const token = jwt.sign({ id: updatedUser.id, email: updatedUser.email, role: updatedUser.role }, JWT_SECRET, {
      expiresIn: '7d',
    });

    res.status(200).json({ token, user: { id: updatedUser.id, name: updatedUser.name, role: updatedUser.role, email: updatedUser.email } });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const login = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    if (!user.is_verified) {
      return res.status(403).json({ error: 'Please verify your email first', requiresVerification: true });
    }

    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = jwt.sign({ id: user.id, email: user.email, role: user.role }, JWT_SECRET, {
      expiresIn: '7d',
    });

    res.status(200).json({ token, user: { id: user.id, name: user.name, role: user.role, email: user.email } });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const me = async (req: any, res: Response) => {
  res.json({ user: req.user });
};
