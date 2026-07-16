import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { BaseException } from '../exceptions/base.exception';
import { ErrorTypeToHttpMap } from '../exceptions/error-type-to-http.map';

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    if (exception instanceof BaseException) {
      const statusCode = ErrorTypeToHttpMap[exception.type];
      response.status(statusCode).json({
        statusCode,
        error: exception.constructor.name,
        message: exception.message,
        path: request.url,
        timestamp: new Date().toISOString(),
      });
      return;
    }

    if (exception instanceof HttpException) {
      const statusCode = exception.getStatus();
      const exceptionResponse = exception.getResponse();
      const message =
        typeof exceptionResponse === 'string'
          ? exceptionResponse
          : (exceptionResponse as { message?: unknown }).message ??
            exception.message;

      response.status(statusCode).json({
        statusCode,
        error: exception.constructor.name,
        message,
        path: request.url,
        timestamp: new Date().toISOString(),
      });
      return;
    }

    console.error('[GlobalExceptionFilter] Unhandled exception:', exception instanceof Error ? exception.message : String(exception));

    response.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      error: 'InternalServerError',
      message: 'Ha ocurrido un error inesperado.',
      path: request.url,
      timestamp: new Date().toISOString(),
    });
  }
}
