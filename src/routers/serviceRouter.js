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

  return serviceRouter;
}

module.exports = routes();