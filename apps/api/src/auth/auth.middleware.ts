import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { prisma } from '../prisma';

export interface AuthRequest extends Request {
  user?: {
    id: number;
    role: string;
    email: string;
  };
}

export const requireAuth = async (req: AuthRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized: No token provided' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'supersecretjwtkey123') as any;
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Unauthorized: Invalid token' });
  }
};

export const requireRole = (role: 'PASSENGER' | 'DRIVER') => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user || req.user.role !== role) {
      return res.status(403).json({ error: 'Forbidden: Insufficient permissions' });
    }
    next();
  };
};

export const requireResourceOwner = (resourceUserIdField: string) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    // Assuming the resource's user ID is passed in req.params or req.body
    const resourceUserId = req.params[resourceUserIdField] || req.body[resourceUserIdField];
    if (req.user && resourceUserId && req.user.id !== parseInt(resourceUserId, 10)) {
      return res.status(403).json({ error: 'Forbidden: You can only access your own data' });
    }
    next();
  };
};
