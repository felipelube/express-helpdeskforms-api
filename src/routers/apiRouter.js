"use strict";
const 
  util = require("util");

const
  express = require("express"),
  requestsRouter = require("./requestsRouter"),
  servicesRouter = require("./servicesRouter");

const routes = function() {
  const apiRouter = express.Router();

  const mockUser = util.deprecate((req, res, next) => {
    req.user = {
      uid: 655548,
      name: 'João Silva'
    }
    next()
  }, 'REMOVER mockUser (fazer subsistema de usuários)');

  apiRouter.use(mockUser);

  apiRouter.use('/services', servicesRouter);
  apiRouter.use('/requests', requestsRouter);  

  return apiRouter;
}

module.exports = routes();