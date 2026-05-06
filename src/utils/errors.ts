export class BadRequestError extends Error {
  statusCode: number;
  constructor(message: string) {
    super(message);
    this.statusCode = 400;
    Error.captureStackTrace(this, this.constructor);
  }
}

export class NotFoundError extends Error {
  statusCode: number;
  constructor(message = 'Resource not found') {
    super(message);
    this.statusCode = 404;
    Error.captureStackTrace(this, this.constructor);
  }
}

export class UnauthorizedError extends Error {
  statusCode: number;
  constructor(message = 'Unauthorized') {
    super(message);
    this.statusCode = 401;
    Error.captureStackTrace(this, this.constructor);
  }
}

export class ForbiddenError extends Error {
  statusCode: number;
  constructor(message = 'Forbidden') {
    super(message);
    this.statusCode = 403;
    Error.captureStackTrace(this, this.constructor);
  }
}