class AppError extends Error {
  constructor(message, statusCode, { details, code } = {}) {
    super(message);
    this.name = "AppError";
    this.statusCode = statusCode || 500;
    this.details = details;
    this.code = code;
  }
}

export { AppError };
