import { Response } from 'express';

export interface ApiResponsePayload<T = any> {
  success: boolean;
  message: string;
  data?: T;
  errors?: any;
}

export class ApiResponse {
  static success<T>(res: Response, message: string, data?: T, statusCode: number = 200) {
    return res.status(statusCode).json({
      success: true,
      message,
      data
    });
  }

  static error(res: Response, message: string, errors: any = null, statusCode: number = 400) {
    return res.status(statusCode).json({
      success: false,
      message,
      errors
    });
  }
}
