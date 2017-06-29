const express = require('express');

const router = express.Router;
const servicesController = require('../controllers/servicesController');

const routes = () => {
  const servicesRouter = router();

  servicesRouter
    .route('/')
    .get(servicesController.listAll)
    .post([
      servicesController.validate,
      servicesController.insert,
    ]);

  servicesRouter
    .route('/:machine_name')
    .all([
      servicesController.validateMachineName,
      servicesController.getByMachineName,
    ])
    .put([
      servicesController.validateUpdate,
      servicesController.update,
    ])
    .get(servicesController.view)
    .delete(servicesController.remove);

  return servicesRouter;
};

module.exports = routes();
