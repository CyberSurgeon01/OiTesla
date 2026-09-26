import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import nodemailer from 'nodemailer';
import { prisma } from '../prisma';

const JWT_SECRET = process.env.JWT_SECRET || 'supersecretjwtkey123';

// Configure nodemailer for testing or real SMTP
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.ethereal.email',
  port: parseInt(process.env.SMTP_PORT || '587'),
  auth: {
    user: process.env.SMTP_USER || 'test@ethereal.email',
    pass: process.env.SMTP_PASS || 'pass'
  }
});

export const signup = async (req: Request, res: Response) => {
  try {
    const { email, password, name, role } = req.body;
    
    if (!email || !password || !name || !role) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    if (role !== 'PASSENGER' && role !== 'DRIVER') {
      return res.status(400).json({ error: 'Invalid role' });
    }

    const existingUser = await prisma.user.findUnique({ where: { email_role: { email, role } } });
    if (existingUser) {
      return res.status(400).json({ error: `You already have an account as a ${role.toLowerCase()} with this email` });
    }

    const password_hash = await bcrypt.hash(password, 10);
    const verify_code = Math.floor(100000 + Math.random() * 900000).toString(); // 6-digit code
    const verify_expires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    const user = await prisma.user.create({
      data: {
        email,
        name,
        password_hash,
        role,
        is_verified: false,
        verify_code,
        verify_expires,
        wallet_balance: role === 'PASSENGER' ? 100000 : 50000,
      },
    });

    // Send the email (In development, this will just log if SMTP isn't valid, or use a console log)
    try {
      if (process.env.SMTP_HOST) {
await transporter.sendMail({
          from: '"OiTesla" <noreply@oitesla.com>',
          to: email,
          subject: 'Verify your OiTesla Account',
          text: `Your verification code is: ${verify_code}`,
          html: `
            <div style="font-family: system-ui, -apple-system, sans-serif; max-width: 500px; margin: 0 auto; padding: 30px; border: 1px solid #e5e7eb; border-radius: 16px; background-color: #ffffff;">
              <h2 style="color: #0A0D0B; margin-top: 0; font-size: 24px;">Welcome to OiTesla</h2>
              <p style="color: #4b5563; font-size: 16px; line-height: 1.5;">Please use the verification code below to complete your registration. This code will expire in 10 minutes.</p>
              
              <div style="background-color: #0A0D0B; padding: 24px; border-radius: 12px; text-align: center; margin: 32px 0;">
                <span style="font-size: 36px; font-weight: 700; letter-spacing: 8px; color: #10B981; margin-left: 8px;">${verify_code}</span>
              </div>
              
              <p style="color: #6b7280; font-size: 14px; text-align: center; margin-bottom: 0;">If you didn't request this, you can safely ignore this email.</p>
            </div>
          `
        });
      } else {
        console.log(`\n\n[MOCK EMAIL] To: ${email} | Code: ${verify_code}\n\n`);
      }
    } catch (e) {
      console.log('Failed to send email:', e);
      console.log(`[MOCK EMAIL FALLBACK] Code for ${email}: ${verify_code}`);
    }

    res.status(201).json({ message: 'Verification code sent to email', requiresVerification: true, email, role });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const verifyEmail = async (req: Request, res: Response) => {
  try {
    const { email, role, code } = req.body;
    
    if (!email || !role || !code) {
      return res.status(400).json({ error: 'Missing parameters' });
    }

    const user = await prisma.user.findUnique({ where: { email_role: { email, role } } });
    
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
    const { email, password, role } = req.body;

    if (!email || !password || !role) {
      return res.status(400).json({ error: 'Email, password, and role are required' });
    }

    const user = await prisma.user.findUnique({ where: { email_role: { email, role } } });
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials or role' });
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
