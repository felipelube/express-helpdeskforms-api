const
  express = require("express"),
  Router = express.Router;

const routes = function() {
  let notificationsRouter = express.Router();

  notificationsRouter
    .route("/")
      .get(requestsController.listAll)
      .post(requestsController.validate, requestsController.insert);

  notificationsRouter
    .route("/:machine_name")
      .all(requestsController.validateServiceMachineName)
      .all(requestsController.getByMachineName)
      .get(requestsController.view)
      .put(requestsController.update)
      .delete(requestsController.remove);

  return notificationsRouter;
}

module.exports = routes();