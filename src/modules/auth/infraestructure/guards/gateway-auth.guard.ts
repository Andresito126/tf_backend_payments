import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import type { Request } from 'express';

export interface AuthenticatedUser {
  id: string;
  userType: 'citizen' | 'establishment';
}

export interface AuthenticatedRequest extends Request {
  user: AuthenticatedUser;
}

@Injectable()
export class GatewayAuthGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    const userId = request.headers['x-user-id'];
    const userType = request.headers['x-user-type'];

    if (typeof userId !== 'string' || typeof userType !== 'string') {
      throw new UnauthorizedException('Faltan headers de autenticación del Gateway.');
    }

    // El gateway solo emite 'citizen' | 'establishment' en este header; los
    // casos de uso de payments tipan ese union, así que lo estrechamos aquí.
    (request as Request & { user: AuthenticatedUser }).user = {
      id: userId,
      userType: userType as 'citizen' | 'establishment',
    };
    return true;
  }
}
