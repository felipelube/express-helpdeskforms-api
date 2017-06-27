"use strict";
const
  express = require("express"),
  Router = express.Router,
  servicesController = require("../controllers/servicesController");

const routes = function() {
  let servicesRouter = express.Router();

  servicesRouter
    .route("/")
      .get(servicesController.listAll)
      .post([
        servicesController.validate, 
        servicesController.insert
      ]);

  servicesRouter
    .route("/:machine_name")
      .all([
        servicesController.validateMachineName, 
        servicesController.getByMachineName
      ])
      .put([
        servicesController.validateUpdate, 
        servicesController.update
      ])
      .get(servicesController.view)
      .delete(servicesController.remove);

  return servicesRouter;
}

module.exports = routes();