const ApiError = require("../erorrs/ApiError");
const handleValidationError = require("../erorrs/handleValidationError");
const handleValidation = require("../erorrs/handleValidationError");

const globalErrorHandler = (error, req, res, next) => {
  let statusCode = 500;
  let message = "Something went wrong";
  let errorMessages = [];

  if (error?.name === "ValidationError") {
    const simplifiedError = handleValidationError(error);
    statusCode = simplifiedError.statusCode;
    message = simplifiedError.message;
    errorMessages = simplifiedError.errorMessages;
  } else if (error instanceof Error) {
    (message = error?.message),
      (errorMessages = error?.message
        ? [
            {
              path: "",
              message: error?.message,
            },
          ]
        : []);
  } else if (error instanceof ApiError) {
    statusCode = error?.statusCode;
    (message = error?.message),
      (errorMessages = error?.message
        ? [
            {
              path: "",
              message: error?.message,
            },
          ]
        : []);
  }

  res.status(statusCode).json({
    success: false,
    message,
    errorMessages,
    stack: process.env.NODE_ENV === "development" ? error?.stack : undefined,
  });
};

module.exports = globalErrorHandler;
