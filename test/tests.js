"use strict";

/** Bibliotecas */
const
  Boom = require("boom"),
  mongoose = require("mongoose"),
  chai = require('chai'),
  chaiHttp = require('chai-http'),
  should = chai.should(),
  _ = require("underscore"),
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

/** Funções-promessa para tarefas comuns */
const getRequestsList = () => {
  return new Promise((resolve, reject) => {
    chai.request(server)
      .get(`${API_BASE_URL}/requests`)
      .end((err, res) => {
        resolve(res);
      });
  });
}

const insertValidRequest = () => {
  return new Promise((resolve, reject) => {
    chai
      .request(server)
      .post(`${API_BASE_URL}/requests`)
      .send(validRequest)
      .end((err, res) => {
        resolve(res);
      });
  });
}


/**
 * @function Limpa as coleções
 */
const clearCollections = () => {
  const modelsToClear = [
    Service.remove(),
    Request.remove(),
  ];
  let result = Promise.all(modelsToClear);
  return result;
}

const _customizeModel = (modelProperties, model, ModelClass) => {
  return _.extend(model, modelProperties);
}


const insertMockService = (properties = null) => {
  return mockObjects.getValidService()
    .then((generatedService) => {
      _customizeModel(properties, generatedService, Service);
      return new Service(generatedService).save();
    })
    .then((newService) => {
      return newService.toJSON();
    })
    .catch((err) => {
      console.log('falha ao inserir um serviço mock');
      expect.fail();
    });
}

const insertMockRequest = (properties = null, serviceId) => {
  if (!serviceId) {
    throw new Error('É necessário fornecer um serviceId para a Requisição');
  }
  return mockObjects.getValidRequest()
    .then((generatedRequest) => {
      _customizeModel(properties, generatedRequest, Request);
      generatedRequest.serviceId = serviceId;
      return new Request(generatedRequest).save();
    })
    .then((newRequest) => {
      return newRequest.toJSON();
    })
    .catch((err) => {
      console.log('falha ao inserir uma requisição mock');
      expect.fail();
    });
}


/**
 * Insere objetos gerados no banco de dados de teste
 */
const insertMockObjects = (serviceProperties = null, requestProperties = null) => {
  let objectsInserted = [];
  return insertMockService(serviceProperties)
    .then((newService) => {
      objectsInserted.push(newService);
      return insertMockRequest(requestProperties, newService._id);
    })
    .then((newRequest) => {
      objectsInserted.push(newRequest);
      return objectsInserted;
    })
    .catch((err) => {
      console.log('falha ao inserir os objetos mock, saindo.')
      expect.fail();
    });
}




beforeEach(() => {
  return clearCollections();
});

describe('Teste com serviços', () => {
  /* antes de cada suite, limpe o banco de dados */
  /*beforeEach(() => {
    console.log("limpando...");
    return clearCollections();
  });*/

  describe('Listagem', () => {
    it('sem serviços, deve retornar uma lista vazia', (done) => {
      chai.request(server)
        .get(API_SERVICES_BASE_URL)
        .end((err, res) => {
          res.should.have.status(200);
          let services = JSON.parse(res.text).data;
          services.should.be.a('array');
          services.length.should.eql(0);
          done();
        });
    });

    it('depois de inserir um serviço, deve retornar uma lista com 1 serviço', (done) => {
      insertMockService({
          published: true
        })
        .then(() => {
          chai.request(server)
            .get(API_SERVICES_BASE_URL)
            .end((err, res) => {
              res.should.have.status(200);
              let services = JSON.parse(res.text).data;
              services.should.be.a('array');
              services.length.should.eql(1);
              done();
            });
        });
    });
  });

  describe('Inserção', () => {
    it('serviço vazio, deve retornar um 400', (done) => {
      chai.request(server)
        .post(API_SERVICES_BASE_URL)
        .send({})
        .end((err, res) => {
          res.should.have.status(400);
          done();
        })
    });

    it('inválido, deve retornar um 400', (done) => {
      chai.request(server)
        .post(API_SERVICES_BASE_URL)
        .send(mockObjects.getInvalidService())
        .end((err, res) => {
          res.should.have.status(400);
          let validationInfo = JSON.parse(res.text).data.body;
          validationInfo.should.be.a('array');

          let expectedProperties = [
            'request.body.machine_name',
            'request.body.name',
            'request.body.createdAt',
            'request.body.published'
          ];

          validationInfo.forEach((property, propertyIndex, properties) => {
            let removeIndex = expectedProperties.indexOf(properties[propertyIndex].property);
            if (removeIndex > -1) {
              expectedProperties.splice(removeIndex, 1);
            }
          });

          expectedProperties.length.should.eql(0);

          validationInfo[4].should.be.an("object");
          validationInfo[4].should.have.property("property", "request.body");
          validationInfo[4].should.have.property("messages");
          validationInfo[4].messages.length.should.gt(0);
          done();
        });
    });
  });

  describe('Atualização', () => {
    beforeEach(() => {
      return clearCollections();
    });

    it('com propriedades permitidas, deve atualizar', (done) => {
      insertMockService()
        .then((validService) => {
          chai.request(server)
            .put(`${API_SERVICES_BASE_URL}/${validService.machine_name}`)
            .send({
              'sa_category': 'Banco de dados.Manutenção'
            })
            .end((err, res) => {
              res.should.have.status(200);
              let updatedService = res.body.data;
              updatedService.should.be.a('object');
              updatedService.should.have.property('sa_category', 'Banco de dados.Manutenção');
              Date.parse(updatedService.updatedAt).should.be.gt(validService.updatedAt.getTime());
              done();
            });
        });
    });

    it('com apenas propriedades não permitidas, deve retornar um 400', (done) => {
      insertMockService()
        .then((validService) => {
          chai.request(server)
            .put(`${API_SERVICES_BASE_URL}/${validService.machine_name}`)
            .send({
              'machine_name': 'abacate'
            })
            .end((err, res) => {
              res.should.have.status(400);
              done();
            });
        });
    });

    it('em caso misto, deve ignorar quem não é atualizável', (done) => {
      insertMockService()
        .then((validService) => {
          chai.request(server)
            .put(`${API_SERVICES_BASE_URL}/${validService.machine_name}`)
            .send({
              'machine_name': 'abacate',
              'sa_category': 'Manutenção.Banco de dados'
            })
            .end((err, res) => {
              res.should.have.status(200);
              let updatedService = res.body.data;
              updatedService.should.have.property('sa_category', 'Manutenção.Banco de dados');
              updatedService.should.not.have.property('machine_name', 'abacate')

              Date.parse(updatedService.updatedAt).should.be.gt(validService.updatedAt.getTime());

              done();
            })
        });
    });
  });


});