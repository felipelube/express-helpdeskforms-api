"use strict";
const
  jwt = require('jsonwebtoken'),
  winston = require("winston"),
  secrets = require('../config/secrets/secrets');

const
  HTTP_STATUS = require("http").STATUS_CODES;

const apiUtil = function () {
  const jwtCreateToken = function(account) {
    return new Promise((resolve, reject)=>{
        jwt.sign({
          sub: account.username,
          id: account._id,
          name: account.realName
        }, secrets.JWTSecret, {
          expiresIn: '1h'
        }, function (err, token) {
          if (err) {
            return reject(err);
          }
          resolve(token);
        });
    });
  }

  const logger = new winston.Logger({
    transports: [
      /** @todo create a formater that play nice with stack traces */
      new winston.transports.Console()
    ]
  });

  return {
    logger,
    jwtCreateToken
  }
}

module.exports = apiUtil();