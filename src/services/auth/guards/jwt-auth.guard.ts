import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Request } from 'express';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private readonly jwtService: JwtService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const token = this.extractTokenFromCookie(request);
    if (!token) {
      throw new UnauthorizedException('Access token is missing');
    }

    try {
      const payload = this.jwtService.verify(token);
      // Attach user to request for later use (controllers, other guards)
      request.user = { id: payload.sub, role: payload.role };
      return true;
    } catch (err) {
      throw new UnauthorizedException('Invalid or expired access token');
    }
  }

  private extractTokenFromCookie(request: Request): string | null {
    return request.cookies?.access_token || null;
  }
}