import { HttpStatus } from '@nestjs/common';
import { ErrorType } from './error-type.enum';

export const ErrorTypeToHttpMap: Record<ErrorType, HttpStatus> = {
  [ErrorType.NOT_FOUND]: HttpStatus.NOT_FOUND,
  [ErrorType.CONFLICT]: HttpStatus.CONFLICT,
  [ErrorType.UNAUTHORIZED]: HttpStatus.UNAUTHORIZED,
  [ErrorType.FORBIDDEN]: HttpStatus.FORBIDDEN,
  [ErrorType.BUSINESS_RULE]: HttpStatus.UNPROCESSABLE_ENTITY,
  [ErrorType.INTERNAL]: HttpStatus.INTERNAL_SERVER_ERROR,
};
