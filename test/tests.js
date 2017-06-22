"use strict";

/** Bibliotecas */
const
  Boom = require("boom"),
  mongoose = require("mongoose"),
  chai = require('chai'),
  chaiHttp = require('chai-http'),
  should = chai.should(),
  _ = require("underscore"),
  Promise = require("bluebird"),
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

const clearDB = () => {
  const removalPromises = [
    Service.remove().exec(),
    Request.remove().exec(),
  ]

  return Promise.all(removalPromises);
}

describe('Testes com Serviços', () => {
  describe('Listagem', () => {

  });
  describe('Criação', () => { //CREATE
    beforeEach(() => {
      return clearDB();
    });

    it('Deve aceitar a criação de um serviço gerado corretamente', (done) => {
      mockObjects.getValidService()
        .then((generatedService) => {
          chai.request(server)
            .post(API_SERVICES_BASE_URL)
            .send(generatedService)
            .end((err, res) => {
              res.should.have.status(201);
              done();
            });
        });
    });

    it('Não deve aceitar um serviço inválido', (done) => {
      chai.request(server)
        .post(API_SERVICES_BASE_URL)
        .send(mockObjects.getInvalidService())
        .end((err, res) => {
          res.should.have.status(400);
          done();
        });
    });

    it('Não deve aceitar um serviço vazio', (done) => {
      chai.request(server)
        .post(API_SERVICES_BASE_URL)
        .send({})
        .end((err, res) => {
          res.should.have.status(400);
          done();
        });
    });

    it('Deve validar as propriedades antes de inserir', (done) => {
      const dataToUpdate = {
        'name': '    ',
      };

      mockObjects.getValidService()
        .then((generatedService) => {
          generatedService.name = '    ';
          chai.request(server)
            .post(`${API_SERVICES_BASE_URL}`)
            .send(generatedService)
            .end((err, res) => {
              res.should.have.status(400);
              res.body.status.should.eql("fail");
              let validationErrors = res.body.data.body;
              validationErrors.should.be.an('array');
              validationErrors.length.should.gt(0);
              done();
            });
        });
    });

  });

  describe('Visualização', () => { //READ
    beforeEach(() => {
      return clearDB();
    });

    it('Deve retornar corretamente um serviço criado', (done) => {
      mockObjects.createValidService()
        .then((insertedService) => {
          chai.request(server)
            .get(`${API_SERVICES_BASE_URL}/${insertedService.machine_name}`)
            .end((err, res) => {
              res.should.have.status(200);
              res.body.status.should.eql("success");
              let serviceCreated = res.body.data;
              serviceCreated.should.be.an("object");

              /* CAMPOS OBRIGATÓRIOS */
              serviceCreated.should.have.property('machine_name', insertedService.machine_name);
              serviceCreated.should.have.property('name', insertedService.name);
              serviceCreated.should.have.property('category', insertedService.category);
              serviceCreated.should.have.property('published', insertedService.published);
              serviceCreated.should.have.property('sa_category', insertedService.sa_category);

              /* CAMPOS OPCIONAIS */
              if (insertedService.description) {
                serviceCreated.should.have.property('description', insertedService.description);
              }

              /* TIMESTAMPS */
              Date.parse(serviceCreated.updatedAt).should.be.eql(insertedService.updatedAt.getTime());
              Date.parse(serviceCreated.createdAt).should.be.eql(insertedService.createdAt.getTime());

              /* CAMPOS QUE NÃO DEVEM SER EXIBIDOS */
              serviceCreated.should.not.have.property('_id');
              serviceCreated.should.not.have.property('id');
              serviceCreated.should.not.have.property('__v');

              done();
            });
        });
    });

    it('Deve retornar um NotFound para nomes de serviço inválidos', (done) => {
      chai.request(server)
        .get(`${API_SERVICES_BASE_URL}/abacate!!!`)
        .end((err, res) => {
          res.should.have.status(404);
          done()
        });
    });

    it('Deve retornar um NotFound para nomes de serviço válidos, mas não existentes', (done) => {
      chai.request(server)
        .get(`${API_SERVICES_BASE_URL}/abacate_magico`)
        .end((err, res) => {
          res.should.have.status(404);
          done()
        });
    });

  });

  describe('Atualização', () => { //UPDATE
    beforeEach(() => {
      return clearDB();
    });
    it('Se tudo estiver OK, deve atualizar', (done) => {
      const dataToUpdate = {
        'category': 'Banco de dados',
        'sa_category': 'Banco de dados.Manutenção'
      };

      mockObjects.createValidService()
        .then((insertedService) => {
          chai.request(server)
            .put(`${API_SERVICES_BASE_URL}/${insertedService.machine_name}`)
            .send(dataToUpdate)
            .end((err, res) => {
              res.should.have.status(200);
              res.body.status.should.eql("success");
              let serviceUpdated = res.body.data;
              serviceUpdated.should.be.an("object");

              /* CAMPOS INDIFERENTES À ATUALIZAÇÃO */
              if (insertedService.description) {
                serviceUpdated.should.have.property('description', insertedService.description);
              }
              serviceUpdated.should.have.property('machine_name', insertedService.machine_name);
              serviceUpdated.should.have.property('name', insertedService.name);
              serviceUpdated.should.have.property('published', insertedService.published);

              /* CAMPOS QUE DEVEM SER ATUALIZADOS */
              serviceUpdated.should.have.property('category', dataToUpdate.category);
              serviceUpdated.should.have.property('sa_category', dataToUpdate.sa_category);

              /* TIMESTAMPS */
              Date.parse(serviceUpdated.updatedAt).should.be.gt(insertedService.updatedAt.getTime());
              Date.parse(serviceUpdated.createdAt).should.be.eql(insertedService.createdAt.getTime());

              /* CAMPOS QUE NÃO DEVEM SER EXIBIDOS */
              serviceUpdated.should.not.have.property('_id');
              serviceUpdated.should.not.have.property('id');
              serviceUpdated.should.not.have.property('__v');

              done();
            });
        });
    });

    it('Deve atualizar somente propriedades atualizáveis e ignorar as não atualizáveis', (done) => {
      const dataToUpdate = {
        'category': 'Banco de dados',
        'sa_category': 'Banco de dados.Manutenção',
        'machine_name': 'bd_maintenance',
      };

      mockObjects.createValidService()
        .then((insertedService) => {
          chai.request(server)
            .put(`${API_SERVICES_BASE_URL}/${insertedService.machine_name}`)
            .send(dataToUpdate)
            .end((err, res) => {
              res.should.have.status(200);
              res.body.status.should.eql("success");
              let serviceUpdated = res.body.data;
              serviceUpdated.should.be.an("object");

              /* CAMPOS INDIFERENTES À ATUALIZAÇÃO */
              if (insertedService.description) {
                serviceUpdated.should.have.property('description', insertedService.description);
              }

              serviceUpdated.should.have.property('name', insertedService.name);
              serviceUpdated.should.have.property('published', insertedService.published);

              /* CAMPOS QUE DEVEM SER ATUALIZADOS */
              serviceUpdated.should.have.property('category', dataToUpdate.category);
              serviceUpdated.should.have.property('sa_category', dataToUpdate.sa_category);

              /* CAMPOS QUE NÃO DEVEM SER ATUALIZADOS */
              serviceUpdated.should.have.property('machine_name', insertedService.machine_name);
              
              /* TIMESTAMPS */
              Date.parse(serviceUpdated.updatedAt).should.be.gt(insertedService.updatedAt.getTime());
              Date.parse(serviceUpdated.createdAt).should.be.eql(insertedService.createdAt.getTime());

              /* CAMPOS QUE NÃO DEVEM SER EXIBIDOS */
              serviceUpdated.should.not.have.property('_id');
              serviceUpdated.should.not.have.property('id');
              serviceUpdated.should.not.have.property('__v');

              done();
            });
        });
    });

    it('Deve retornar um BadRequest se a tentativa de atualização for somente composta por propriedades não atualizáveis', (done) => {
      const dataToUpdate = {
        'machine_name': 'bd_maintenance',
      };

      mockObjects.createValidService()
        .then((insertedService) => {
          chai.request(server)
            .put(`${API_SERVICES_BASE_URL}/${insertedService.machine_name}`)
            .send(dataToUpdate)
            .end((err, res) => {
              res.should.have.status(400);
              res.body.status.should.eql("fail");

              done();
            });
        });
    });

    it('Deve validar as propriedades antes de atualizar', (done) => {
      const dataToUpdate = {
        'name': '    ',
      };

      mockObjects.createValidService()
        .then((insertedService) => {
          chai.request(server)
            .put(`${API_SERVICES_BASE_URL}/${insertedService.machine_name}`)
            .send(dataToUpdate)
            .end((err, res) => {
              res.should.have.status(400);
              res.body.status.should.eql("fail");

              done();
            });
        });
    });

  });

  describe('Remoção', () => { //DELETE
    beforeEach(() => {
      return clearDB();
    });

    it('Deve apagar um serviço já inserido e retornar OK', () => {
      return mockObjects.createValidService()
        .then((insertedService) => {
          chai.request(server)
            .delete(`${API_SERVICES_BASE_URL}/${insertedService.machine_name}`)
            .end((err, res) => {
              res.should.have.status(200);
            });
        });
    });
  });
});

describe('Testes com Requisições', () => {
  describe('Listagem', () => {

  });

  describe('Criação', () => { //CREATE

  });

  describe('Visualização', () => { //READ

  });

  describe('Atualização', () => { //UPDATE

  });

  describe('Remoção', () => { //DELETE

  });
});