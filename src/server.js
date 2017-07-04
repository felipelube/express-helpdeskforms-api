const config = require('config');
const express = require('express');
const bodyParser = require('body-parser');
const morgan = require('morgan');
const mongoose = require('mongoose');
const jsend = require('jsend');

global.Promise = require('bluebird');

const { exceptionToJsendResponse, default404Response } = require('./util/apiResponses');
const { logger } = require('./util/apiUtil');
const apiRouter = require('./routers/apiRouter');

if (process.env.NODE_ENV === 'test') {
  global.Promise.longStackTraces();
}

const PORT = process.env.PORT || 3000;
const app = express();
// Middleware
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(jsend.middleware);
// API Router
app.use('/api/v1', apiRouter);

if (process.env.NODE_ENV !== 'test') {
  app.use(morgan('dev'));
}

mongoose.Promise = Promise;

mongoose
  .connect(config.dbUri)
  .then(() => {
    logger.info(`Banco de dados conectado em ${config.dbUri}`);

    app.use(exceptionToJsendResponse); // nosso tratador de erros
    app.use('*', default404Response); // faz-tudo para 404s

    app.listen(PORT, () => {
      logger.info(`Servidor escutando na porta ${PORT}`);
    });
  })
  .catch((err) => {
    console.error(err);
    process.exit(-1);
  });

module.exports = app; // para testes
