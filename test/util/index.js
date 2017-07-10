const chai = require('chai');
const chaiHttp = require('chai-http');
const server = require('../../src/server');

global.Promise = require('bluebird');

chai.should();
chai.use(chaiHttp);

/** Constantes */
const API_SERVICES_BASE_URL = '/api/v1/services';
const API_REQUESTS_BASE_URL = '/api/v1/requests';

/** Modelos */
const Service = require('../../src/models/serviceModel');
const Request = require('../../src/models/requestModel');

/** Funções de conveniência usadas nos testes */
const clearDB = () => Promise.all([
  Service.remove().exec(),
  Request.remove().exec(),
]);

const postService = service => chai.request(server)
    .post(API_SERVICES_BASE_URL)
    .send(service);

const getService = serviceName => chai.request(server)
    .get(`${API_SERVICES_BASE_URL}/${serviceName}`);

const putService = (serviceName, data) => chai.request(server)
    .put(`${API_SERVICES_BASE_URL}/${serviceName}`)
    .send(data);

const deleteService = serviceName => chai.request(server)
    .delete(`${API_SERVICES_BASE_URL}/${serviceName}`);

const postRequest = request => chai.request(server)
    .post(API_REQUESTS_BASE_URL)
    .send(request);

const getRequest = requestID => chai.request(server)
    .get(`${API_REQUESTS_BASE_URL}/${requestID}`);

const putRequest = (requestID, data) => chai.request(server)
    .put(`${API_REQUESTS_BASE_URL}/${requestID}`)
    .send(data);

const delay = (timeout = 10000) => new Promise((resolve) => {
  setTimeout(resolve, timeout);
});

module.exports = {
  chai,
  server,
  clearDB,
  postService,
  getService,
  putService,
  deleteService,
  postRequest,
  getRequest,
  putRequest,
  delay,
  API_SERVICES_BASE_URL,
  API_REQUESTS_BASE_URL,
};
