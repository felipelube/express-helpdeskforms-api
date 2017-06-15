const
  express = require("express"),
  Router = express.Router,
  servicesController = require("../controllers/servicesController");

const routes = function() {
  let servicesRouter = express.Router();

  servicesRouter
    .route("/")
      .get(servicesController.listAll)
      .post(servicesController.validate, servicesController.insert);

  servicesRouter
    .route("/:machine_name")
      .all(servicesController.validateServiceMachineName)
      .all(servicesController.getByMachineName)
      .get(servicesController.view)
      .put(servicesController.update)
      .delete(servicesController.remove);

  return servicesRouter;
}

module.exports = routes();