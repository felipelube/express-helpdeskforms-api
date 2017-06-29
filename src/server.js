const express = require('express');
const bodyParser = require('body-parser');
const morgan = require('morgan');
const mongoose = require('mongoose');
const apiResponses = require('./util/apiResponses');
const logger = require('./util/apiUtil').logger;
const apiRouter = require('./routers/apiRouter');
const jsend = require('jsend');
const config = require('config');

global.Promise = require('bluebird');

if (process.env.NODE_ENV === 'test') {
  global.Promise.longStackTraces();
}

const PORT = process.env.PORT || 3000;
const app = express();

logger.level = config.logLevel;

// Middleware
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(jsend.middleware);

// Routing
app.use('/api/v1', apiRouter);

if (process.env.NODE_ENV !== 'test') {
  app.use(morgan('tiny'));
}

// Tudo começa com uma conexão ao banco de dados...
mongoose.Promise = Promise;
mongoose
  .connect(config.dbUri)
  .then(() => {
    logger.info(`Banco de dados conectado em ${config.dbUri}`);

    app.use(apiResponses.exceptionToJsendResponse); // nosso tratador de erros
    app.use('*', apiResponses.default404Response); // faz-tudo para 404s

    app.listen(PORT, () => {
      logger.info(`Servidor escutando na porta ${PORT}`);
    });
  })
  .catch((err) => {
    console.error(err);
    process.exit(-1);
  });

module.exports = app; // para testes
