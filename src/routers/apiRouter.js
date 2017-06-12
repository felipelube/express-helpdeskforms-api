"use strict";
const
  express = require("express"),
  serviceRouter = require("./serviceRouter");

const routes = function() {
  const apiRouter = express.Router();

  apiRouter.use('/services', serviceRouter);

  return apiRouter;
}

module.exports = routes();