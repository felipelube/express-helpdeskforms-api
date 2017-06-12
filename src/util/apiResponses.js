"use strict";
const
  Boom = require("boom"),
  expressJSONSchema = require("express-jsonschema"),
  logger = require("./apiUtil").logger;

const apiResponses = function () {
  const exceptionToJsendResponse = function(err, req, res, next) {
    if(!err.isBoom) {
      if(err instanceof Error) {
        err = Boom.wrap(err);
      } else if(err instanceof expressJSONSchema.JsonSchemaValidation) {
        err = new Boom.badRequest("Erro na validação dos dados", err.validations);
      }
    }
    res
      .status(err.output.statusCode)
      .set(err.output.headers);
      
    if(err.isServer) {
      logger.error(err);
      res.jsend.error(err.message, {
        code: err.output.statusCode,
        data: err.data
      });
    } else {
      logger.debug(err);
      if (!err.data) {
        res.jsend.fail(err.message);
      } else {
        res.jsend.fail(err.data);
      }
    } 
  };

  const default404Response = function(req, res) {
    let url = req.protocol + '://' + req.get('host') + req.originalUrl;
    let err = new Boom.notFound(`${url} not found`);
    
    logger.debug(err);

    res
      .status(err.output.statusCode)
      .set(err.output.headers)
      .jsend
        .fail(err.message);

  }
  

  return {
    exceptionToJsendResponse,
    default404Response  
  }
}

module.exports = apiResponses();