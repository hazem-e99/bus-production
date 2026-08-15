import { Injectable, ExecutionContext } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Reflector } from '@nestjs/core';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { AppException } from '../exceptions/app.exception';
import { ErrorCodes } from '../exceptions/error-codes';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(private reflector: Reflector) {
    super();
  }

  canActivate(context: ExecutionContext) {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) {
      return true;
    }
    return super.canActivate(context);
  }

  handleRequest(err: any, user: any, info: any) {
    if (err || !user) {
      if (err instanceof AppException) {
        throw err;
      }
      if (info?.name === 'TokenExpiredError') {
        throw new AppException(
          401,
          ErrorCodes.AUTH_TOKEN_EXPIRED,
          'Your session has expired. Please sign in again.',
        );
      }
      if (info?.message === 'No auth token') {
        throw new AppException(401, ErrorCodes.AUTH_TOKEN_MISSING, 'Please sign in to continue.');
      }
      throw new AppException(401, ErrorCodes.AUTH_TOKEN_INVALID, 'Your session is no longer valid. Please sign in again.');
    }
    return user;
  }
}
