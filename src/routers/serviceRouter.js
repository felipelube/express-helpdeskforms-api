const
  express = require("express"),
  Router = express.Router,
  serviceController = require("../controllers/serviceController");

const routes = function() {
  let serviceRouter = express.Router();

  serviceRouter
    .route("/")
      .get(serviceController.listAll)
      .post(serviceController.validate, serviceController.insert);

  serviceRouter
    .route("/:machine_name")
      .all(serviceController.validateServiceMachineName)
      .all(serviceController.getByMachineName)
      .get(serviceController.view)
      .put(serviceController.update)
      .delete(serviceController.remove);

  return serviceRouter;
}

module.exports = routes();