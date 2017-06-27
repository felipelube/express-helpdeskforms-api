"use strict";
const
  express = require("express"),
  Router = express.Router,
  requestsController = require("../controllers/requestsController");

const routes = function() {
  let requestsRouter = express.Router();

  requestsRouter
    .route("/")
      .get(requestsController.listAll)
      .post(requestsController.validate, requestsController.insert);

  requestsRouter
    .route("/:id")
      .all(requestsController.validateRequestId)
      .all(requestsController.getById)
      .get(requestsController.view)
      .put(requestsController.update);

  return requestsRouter;
}

module.exports = routes();