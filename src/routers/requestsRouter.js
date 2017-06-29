const express = require('express');

const router = express.Router;
const requestsController = require('../controllers/requestsController');

const routes = () => {
  const requestsRouter = router();

  requestsRouter
    .route('/')
    .get(requestsController.listAll)
    .post(requestsController.validate, requestsController.insert);

  requestsRouter
    .route('/:id')
    .all(requestsController.validateRequestId)
    .all(requestsController.getById)
    .get(requestsController.view)
    .put([requestsController.validateUpdate, requestsController.update]);

  return requestsRouter;
};

module.exports = routes();
