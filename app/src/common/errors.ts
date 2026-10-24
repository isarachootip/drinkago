import { ArgumentsHost, Catch, ExceptionFilter, HttpException } from '@nestjs/common';
import { Response } from 'express';
import { ZodError } from 'zod';
import { TransitionError } from '../orders/order-state-machine';

export class DomainError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
  ) {
    super(message);
  }
}

const TRANSITION_STATUS: Record<TransitionError['code'], number> = {
  INVALID_TRANSITION: 409,
  FORBIDDEN_ROLE: 403,
  NOT_ASSIGNED_RIDER: 403,
  EVIDENCE_REQUIRED: 422,
};

@Catch()
export class ErrorFilter implements ExceptionFilter {
  catch(err: unknown, host: ArgumentsHost) {
    const res = host.switchToHttp().getResponse<Response>();
    if (err instanceof TransitionError) {
      return res.status(TRANSITION_STATUS[err.code]).json({ code: err.code, message: err.message });
    }
    if (err instanceof DomainError) {
      return res.status(err.status).json({ code: err.code, message: err.message });
    }
    if (err instanceof ZodError) {
      return res.status(400).json({ code: 'VALIDATION', message: 'ข้อมูลไม่ถูกต้อง', issues: err.issues });
    }
    if (err instanceof HttpException) {
      const body = err.getResponse();
      return res.status(err.getStatus()).json(typeof body === 'string' ? { message: body } : body);
    }
    console.error(err);
    return res.status(500).json({ code: 'INTERNAL', message: 'เกิดข้อผิดพลาดในระบบ' });
  }
}
