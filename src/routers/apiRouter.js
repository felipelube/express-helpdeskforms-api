"use strict";
const
  express = require("express"),
  servicesRouter = require("./servicesRouter");

const routes = function() {
  const apiRouter = express.Router();

  apiRouter.use('/services', servicesRouter);
  /*apiRouter.use('/requests', requestsRouter);
  apiRouter.use('/notifications', notificationsRouter);*/

  return apiRouter;
}

module.exports = routes();