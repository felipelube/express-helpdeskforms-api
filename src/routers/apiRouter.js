"use strict";
const
  express = require("express"),
  requestsRouter = require("./requestsRouter"),
  servicesRouter = require("./servicesRouter");

const routes = function() {
  const apiRouter = express.Router();

  const mockUser = (req, res, next) => {
    req.user = {
      uid: 655548,
      name: 'João Silva'
    }
    next()
  };

  apiRouter.use(mockUser); /** @todo REMOVER quando fizer subsistema de usuários */

  apiRouter.use('/services', servicesRouter);
  apiRouter.use('/requests', requestsRouter);
  /*apiRouter.use('/notifications', notificationsRouter);*/

  return apiRouter;
}

module.exports = routes();