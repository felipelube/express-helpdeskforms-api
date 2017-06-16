"use strict";

/** Bibliotecas */
const
  Boom = require("boom"),
  mongoose = require("mongoose"),
  chai = require('chai'),
  chaiHttp = require('chai-http'),
  should = chai.should(),
  expect = chai.expect;

const //o app
  server = require('../src/server');
  

const //modelos
  Service = require("../src/models/serviceModel"),
  Request = require("../src/models/requestModel");

const //funções para retornar objetos mockados
  mockObjects = require("./data/objects");

chai.use(chaiHttp);


const //constantes
  API_BASE_URL = '/api/v1',
  API_SERVICES_BASE_URL = '/api/v1/services',
  API_REQUESTS_BASE_URL = '/api/v1/requests',
  API_NOTIFICATIONS_BASE_URL = '/api/v1/notifications';

var //objetos usados nos testes
  validRequest = {};
var
  validService = {};

/** Funções-promessas para tarefas comuns */
const getRequestsList = () => {
  return new Promise((resolve, reject)=>{
    chai.request(server)
      .get(`${API_BASE_URL}/requests`)
      .end((err, res) => {
        resolve(res);
      });
  });
}

const insertValidRequest = () => {
  return new Promise((resolve, reject)=>{
    chai
      .request(server)
      .post(`${API_BASE_URL}/requests`)
      .send(validRequest)
      .end((err, res) => {
        resolve(res);
      });
  });
}



function clearCollections() {
  const modelsToClear = [
    Service.remove().then(()=>{
      console.log('Serviços excluidos');
    }),
    Request.remove().then(()=>{
      console.log('Requisições excluidos');
    }),
  ];
  let result = Promise.all(modelsToClear);
  return result;
}


function insertMockObjects() {
  const generateMockObjects = [
    mockObjects.getValidService(),
    mockObjects.getValidRequest()
  ]

  return Promise.all(generateMockObjects)
    .then((objects)=>{
      let generatedService = objects[0];
      let generatedRequest = objects[1];
      let newService = new Service(generatedService);
      return newService
        .save()
        .then((newService)=>{
          let newRequest = generatedRequest;
          validService = newService.toJSON();
          newRequest.serviceId = newService.id;
          newRequest = new Request(newRequest);
          return newRequest.save();
        })
        .then((newRequest)=>{
          validRequest = newRequest.toObject();
        })
    })
    .catch((err)=>{
      console.log('falha ao inserir os objetos mock, saindo.')
      expect.fail();
    });
}


/* Limpe o banco de dados antes de iniciar os testes */
before(() => {
  return clearCollections()
    .then(insertMockObjects);
});

describe('Testes com os...',()=>{
  it('should pass', (done)=>{
    done();
  })
});