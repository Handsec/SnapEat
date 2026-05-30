import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from "@nestjs/common";
import type { Request, Response } from "express";

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = "Internal server error";
    let code = "INTERNAL_ERROR";

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const res = exception.getResponse();

      if (typeof res === "string") {
        message = res;
      } else if (typeof res === "object" && res !== null) {
        const obj = res as Record<string, unknown>;
        const objMsg = obj["message"];
        if (typeof objMsg === "string") {
          message = objMsg;
        } else if (Array.isArray(objMsg)) {
          message = objMsg.join("; ");
        }
        const objCode = obj["code"];
        if (typeof objCode === "string") {
          code = objCode;
        } else if (obj["error"]) {
          code = String(obj["error"]);
        }
      }
      code = `HTTP_${status}`;
    } else if (exception instanceof Error) {
      message = exception.message;
      this.logger.error(message, exception.stack);
    }

    response.status(status).json({
      success: false,
      error: { code, message },
      path: request.url,
      timestamp: new Date().toISOString(),
    });
  }
}
