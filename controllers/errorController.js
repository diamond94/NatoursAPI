const AppError = require('../utils/appError');

const handleCastErrorDB = err => {
  const message = `Invalid ${err.path} : ${err.value}.`;
  return new AppError(message, 400);
};
const handleDuplicatFieldDB = err => {
  //const value = err.errmsg.match(/"(.*?)"/)[1];                   // we can do it with regex also
  //const value = err.errmsg.match(/"((?:\\.|[^"\\])*)"/)[0];       // we can do it with regex also
  const value = err.keyValue.name;
  const message = `Duplicate field value: '${value}' . please use another value`;
  return new AppError(message, 400);
};

// const handleValidationErrorDB = err => {
//   const errors = Object.values(err.errors).map(el => el.message);
//   const message = `Invalid input data: ${errors.join('. ')}`;
//   return new AppError(message, 400);
// };

const handleValidationErrorDB = err => {
  const newMessage = err.message;
  return new AppError(newMessage, 400);
};

const handleJWTError = () => {
  const message = `Invalid Token! Please LogIn again`;
  return new AppError(message, 401);
};

const handleJWTExpire = () => {
  const message = `Your Token has benn Expired! Please LogIn again`;
  return new AppError(message, 401);
};

const sendErrorDev = (err, res) => {
  res.status(err.statusCode).json({
    status: err.status,
    error: err,
    message: err.message,
    stack: err.stack
  });
};

const sendErrorProd = (err, res) => {
  if (err.isOperational) {
    res.status(err.statusCode).json({
      status: err.status,
      message: err.message
    });
  } else {
    // eslint-disable-next-line no-console
    console.error(`ERROR💥`, err);
    res.status(500).json({
      status: 'error',
      message: `somethimg went very wrong!`
    });
  }
};

module.exports = (err, req, res, next) => {
  //console.log(err.stack);
  err.statusCode = err.statusCode || 500;
  err.status = err.status || 'error';

  if (process.env.NODE_ENV === 'development') {
    sendErrorDev(err, res);
  } else if (process.env.NODE_ENV === 'production') {
    let error = Object.create(err);
    if (error.name === 'CastError') error = handleCastErrorDB(error);
    if (error.code === 11000) error = handleDuplicatFieldDB(error);
    if (error.name === 'ValidationError') error = handleValidationErrorDB(error);
    if (error.name === 'JsonWebTokenError') error = handleJWTError();
    if (error.name === 'TokenExpiredError') error = handleJWTExpire();
    sendErrorProd(error, res);
  }
};
