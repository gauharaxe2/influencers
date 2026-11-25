import { ExceptionFilter, HttpException, Injectable, Logger } from '@nestjs/common';
import type { ArgumentsHost } from '@nestjs/common';
import type { Response } from 'express';

@Injectable()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const context = host.switchToHttp();
    const response = context.getResponse<Response>();

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const body = exception.getResponse();
      response.status(status).json(
        typeof body === 'string'
          ? { statusCode: status, message: body }
          : { ...body, statusCode: status },
      );
      return;
    }

    this.logger.error(
      'Unhandled API request error',
      process.env.NODE_ENV === 'production'
        ? undefined
        : exception instanceof Error
          ? exception.stack
          : String(exception),
    );
    response.status(500).json({
      statusCode: 500,
      message: 'Internal server error',
    });
  }
}
