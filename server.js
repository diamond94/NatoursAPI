/* eslint-disable no-console */
// set threadpool in npm script ===>  set UV_THREADPOOL_SIZE=120 && nodemon server.js

const mongoose = require('mongoose');
const dotenv = require('dotenv');

process.on('uncaughtException', err => {
  console.log('uncaughtException!! shutting down...');
  console.log(err.name, err.message);
  process.exit(1);
});

dotenv.config({ path: './config.env' });
const app = require('./app');

const DB = process.env.DATABASE.replace('<PASSWORD>', process.env.DATABASE_PASSWORD);

mongoose
  .connect(DB, {
    useNewUrlParser: true,
    useCreateIndex: true,
    useFindAndModify: false,
    useUnifiedTopology: true
  })
  .then(() => {
    console.log('DB Connection successful');
  });

const port = process.env.PORT || 3000;
const ip = '127.0.0.1';

const server = app.listen(port, ip, () => {
  console.log(`APP Running on ${ip} IP & Port ${port}...`);
});

process.on('unhandledRejection', err => {
  console.log(err.name, err.message);
  console.log('unhandledRejection!! shutting down...');
  server.close(() => {
    process.exit(1);
  });
});
