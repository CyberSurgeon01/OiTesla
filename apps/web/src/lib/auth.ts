import { NextRequest } from 'next/server';
import jwt from 'jsonwebtoken';
import { getJwtSecret } from './server-config';

export const getAuthUser = (req: NextRequest) => {
  const authHeader = req.headers.get('authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, getJwtSecret(), { algorithms: ['HS256'] });
    if (typeof decoded === 'string' || !Number.isInteger(decoded.id) || decoded.id < 1 ||
        !['DRIVER', 'PASSENGER'].includes(decoded.role) || typeof decoded.email !== 'string') return null;
    return decoded;
  } catch (error) {
    return null;
  }
};
