import 'express';
import { JwtPayload } from 'jsonwebtoken';
import { UserRole } from '../types/index';

declare module 'express-serve-static-core' {
  interface Request {
    user?: JwtPayload & {
      id: number;
      email: string;
      role: UserRole;
      rut?: string;
    };
  }
}
