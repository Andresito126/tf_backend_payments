import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ConfigService } from '@nestjs/config';
import { ExtractJwt, Strategy } from 'passport-jwt';

export interface AccessTokenPayload {
  sub: string;
  email: string;
  userType: 'citizen' | 'establishment';
}

export interface AuthenticatedUser {
  id: string;
  email: string;
  userType: 'citizen' | 'establishment';
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(configService: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('AUTH.JWT_ACCESS_SECRET') as string,
    });
  }

  validate(payload: AccessTokenPayload): AuthenticatedUser {
    return { id: payload.sub, email: payload.email, userType: payload.userType };
  }
}
