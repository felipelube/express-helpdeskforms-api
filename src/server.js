"use strict";
const
  express = require("express"),
  bodyParser = require("body-parser"),
  
  validatorConfig = require("./config/expressValidator"),
  morgan = require('morgan'),
  mongoose = require('mongoose'),
  apiResponses = require("./util/apiResponses"),
  logger = require("./util/apiUtil").logger,
  apiRouter = require("./routers/apiRouter"),
  jsend = require("jsend"),
  config = require("config");

global.Promise = require("bluebird"); //melhor debug do que promessas nativas

const
  PORT = process.env.PORT || 3000,
  app = express();

logger.level = config.logLevel;

//Middleware
app.use(bodyParser.urlencoded({extended: true}));
app.use(bodyParser.json());

app.use(jsend.middleware);

//Routing
app.use('/api/v1', apiRouter);

if (process.env.NODE_ENV != 'test') {
  app.use(morgan('tiny'));
}

//Tudo começa com uma conexão ao banco de dados...
mongoose.Promise = Promise;
mongoose
  .connect(config.dbUri)
  .then((db) => {
    logger.info(`Banco de dados conectado em ${config.dbUri}`);
    
    app.use(apiResponses.exceptionToJsendResponse); //nosso tratador de erros 
    app.use("*", apiResponses.default404Response); //faz-tudo para 404s
    
    app.listen(PORT, function () {
      logger.info(`Servidor escutando na porta ${PORT}`);
    });
  })
  .catch((err) => {
    console.error(err);
    process.exit(-1);
  });

module.exports = app; //para testes