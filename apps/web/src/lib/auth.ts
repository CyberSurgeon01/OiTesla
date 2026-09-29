import { NextRequest } from 'next/server';
import jwt from 'jsonwebtoken';

export const getAuthUser = (req: NextRequest) => {
  const authHeader = req.headers.get('authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'supersecretjwtkey123') as any;
    return decoded;
  } catch (error) {
    return null;
  }
};
