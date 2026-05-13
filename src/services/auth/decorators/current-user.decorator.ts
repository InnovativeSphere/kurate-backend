import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { Request } from 'express';


export interface JwtUserPayload {
  id: string;
  role: UserRole; 
}

export const CurrentUser = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): JwtUserPayload => {
    const request = ctx.switchToHttp().getRequest<Request>();
    // The JwtAuthGuard already attached the payload to request.user
    return request.user as unknown as JwtUserPayload;
  },
);