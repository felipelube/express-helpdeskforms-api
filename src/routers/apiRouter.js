const util = require('util');
const express = require('express');

const router = express.Router;
const requestsRouter = require('./requestsRouter');
const servicesRouter = require('./servicesRouter');

const routes = () => {
  const apiRouter = router();

  const mockUser = util.deprecate((req, res, next) => {
    req.user = {
      uid: 655548,
      name: 'João Silva',
    };
    next();
  }, 'REMOVER mockUser (fazer subsistema de usuários)');

  apiRouter.use(mockUser);

  apiRouter.use('/services', servicesRouter);
  apiRouter.use('/requests', requestsRouter);

  return apiRouter;
};

module.exports = routes();
