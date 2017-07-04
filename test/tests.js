const { describe, it, beforeEach } = require('mocha');
const chai = require('chai');
const chaiHttp = require('chai-http');

const server = require('../src/server');

/** Modelos e objetos para testes */
const Service = require('../src/models/serviceModel');
const Request = require('../src/models/requestModel');
const mockObjects = require('./data/objects');

global.Promise = require('bluebird');

chai.should();
chai.use(chaiHttp);

const API_SERVICES_BASE_URL = '/api/v1/services';
const API_REQUESTS_BASE_URL = '/api/v1/requests';
/**
 * @function clearDB
 * @desc limpa as coleções do banco de dados
 */
const clearDB = () => Promise.all([
  Service.remove().exec(),
  Request.remove().exec(),
]);

describe('Testes com Serviços', () => {
  describe('Listagem', () => {

  });
  describe('Criação', () => { // CREATE
    beforeEach(clearDB);

    it('Deve aceitar a criação de um Serviço gerado corretamente', (done) => {
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

    it('Não deve aceitar um Serviço inválido', (done) => {
      chai.request(server)
        .post(API_SERVICES_BASE_URL)
        .send(mockObjects.getInvalidService())
        .end((err, res) => {
          res.should.have.status(400);
          done();
        });
    });

    it('Não deve aceitar um Serviço vazio', (done) => {
      chai.request(server)
        .post(API_SERVICES_BASE_URL)
        .send({})
        .end((err, res) => {
          res.should.have.status(400);
          done();
        });
    });

    it('Deve validar as propriedades antes de inserir', (done) => {
      mockObjects.getValidService()
        .then((generatedService) => {
          const invalidService = generatedService;
          invalidService.name = '    ';
          chai.request(server)
            .post(`${API_SERVICES_BASE_URL}`)
            .send(invalidService)
            .end((err, res) => {
              res.should.have.status(400);
              res.body.status.should.eql('fail');
              const validationErrors = res.body.data.body;
              validationErrors.should.be.an('array');
              validationErrors.length.should.gt(0);
              done();
            });
        });
    });

    it('Não deve aceitar a criação de um serviço com machine_name já em uso', (done) => {
      mockObjects.createValidService()
        .then(() => mockObjects.getValidService())
        .then((generatedService) => {
          chai.request(server)
            .post(API_SERVICES_BASE_URL)
            .send(generatedService)
            .end((err, res) => {
              res.should.have.status(409);
              res.body.status.should.eql('fail');
              const validationErrors = res.body.data.body;
              validationErrors.should.be.an('array');
              validationErrors.length.should.gt(0);
              done();
            });
        })
        .catch((err) => {
          console.error(err);
        });
    });
  });

  describe('Visualização', () => { // READ
    beforeEach(() => clearDB());

    it('Deve retornar corretamente um Serviço criado', (done) => {
      mockObjects.createValidService()
        .then((insertedService) => {
          chai.request(server)
            .get(`${API_SERVICES_BASE_URL}/${insertedService.machine_name}`)
            .end((err, res) => {
              res.should.have.status(200);
              res.body.status.should.eql('success');
              const serviceCreated = res.body.data;
              serviceCreated.should.be.an('object');

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
              Date.parse(serviceCreated.updatedAt).should.be.eql(
                insertedService.updatedAt.getTime());
              Date.parse(serviceCreated.createdAt).should.be.eql(
                insertedService.createdAt.getTime());

              /* CAMPOS QUE NÃO DEVEM SER EXIBIDOS */
              serviceCreated.should.not.have.property('_id');
              serviceCreated.should.not.have.property('id');
              serviceCreated.should.not.have.property('__v');

              done();
            });
        });
    });

    it('Deve retornar um NotFound para nomes de Serviço inválidos', (done) => {
      chai.request(server)
        .get(`${API_SERVICES_BASE_URL}/abacate!!!`)
        .end((err, res) => {
          res.should.have.status(404);
          done();
        });
    });

    it('Deve retornar um NotFound para nomes de Serviço válidos, mas não existentes', (done) => {
      chai.request(server)
        .get(`${API_SERVICES_BASE_URL}/abacate_magico`)
        .end((err, res) => {
          res.should.have.status(404);
          done();
        });
    });
  });

  describe('Atualização', () => { // UPDATE
    beforeEach(() => clearDB());
    it('Se tudo estiver OK, deve atualizar', (done) => {
      const dataToUpdate = {
        category: 'Banco de dados',
        sa_category: 'Banco de dados.Criação',
      };

      mockObjects.createValidService()
        .then((insertedService) => {
          chai.request(server)
            .put(`${API_SERVICES_BASE_URL}/${insertedService.machine_name}`)
            .send(dataToUpdate)
            .end((err, res) => {
              res.should.have.status(200);
              res.body.status.should.eql('success');
              const serviceUpdated = res.body.data;
              serviceUpdated.should.be.an('object');

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
              Date.parse(serviceUpdated.updatedAt).should.be.gt(
                insertedService.updatedAt.getTime());
              Date.parse(serviceUpdated.createdAt).should.be.eql(
                insertedService.createdAt.getTime());

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
        category: 'Banco de dados',
        sa_category: 'Banco de dados.Manutenção',
        machine_name: 'bd_maintenance',
      };

      mockObjects.createValidService()
        .then((insertedService) => {
          chai.request(server)
            .put(`${API_SERVICES_BASE_URL}/${insertedService.machine_name}`)
            .send(dataToUpdate)
            .end((err, res) => {
              res.should.have.status(200);
              res.body.status.should.eql('success');
              const serviceUpdated = res.body.data;
              serviceUpdated.should.be.an('object');

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
              Date.parse(serviceUpdated.updatedAt).should.be.gt(
                insertedService.updatedAt.getTime());
              Date.parse(serviceUpdated.createdAt).should.be.eql(
                insertedService.createdAt.getTime());

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
        machine_name: 'bd_maintenance',
      };

      mockObjects.createValidService()
        .then((insertedService) => {
          chai.request(server)
            .put(`${API_SERVICES_BASE_URL}/${insertedService.machine_name}`)
            .send(dataToUpdate)
            .end((err, res) => {
              res.should.have.status(400);
              res.body.status.should.eql('fail');

              done();
            });
        });
    });

    it('Deve validar as propriedades antes de atualizar', (done) => {
      const dataToUpdate = {
        name: '    ',
      };

      mockObjects.createValidService()
        .then((insertedService) => {
          chai.request(server)
            .put(`${API_SERVICES_BASE_URL}/${insertedService.machine_name}`)
            .send(dataToUpdate)
            .end((err, res) => {
              res.should.have.status(400);
              res.body.status.should.eql('fail');

              done();
            });
        });
    });
  });

  describe('Remoção', () => { // DELETE
    beforeEach(() => clearDB());

    it('Deve apagar um Serviço já inserido e retornar OK', (done) => {
      mockObjects.createValidService()
        .then((insertedService) => {
          chai.request(server)
            .delete(`${API_SERVICES_BASE_URL}/${insertedService.machine_name}`)
            .end((err, res) => {
              res.should.have.status(200);
              done();
            });
        });
    });

    it('Deve falhar com um 400 para um machine_name inválido', (done) => {
      const invalidService = mockObjects.getInvalidService();
      chai.request(server)
        .delete(`${API_SERVICES_BASE_URL}/${invalidService.machine_name}`)
        .end((err, res) => {
          res.should.have.status(400);
          done();
        });
    });

    it('Deve falhar com um 404 para um Serviço inexistente', (done) => {
      const invalidService = mockObjects.getInvalidService(1);
      chai.request(server)
        .delete(`${API_SERVICES_BASE_URL}/${invalidService.machine_name}`)
        .end((err, res) => {
          res.should.have.status(404);
          done();
        });
    });
  });
});

describe('Testes com Requisições', () => {
  describe('Listagem', () => {

  });
  describe('Criação', () => { // CREATE
    beforeEach(() => clearDB());

    it('Deve aceitar a criação de uma Requisição gerada corretamente', (done) => {
      mockObjects.createValidService()
        .then((insertedService) => {
          mockObjects.getValidRequest()
            .then((generatedRequest) => {
              const newRequest = generatedRequest;
              newRequest.service_name = insertedService.machine_name;
              return newRequest;
            })
            .then((newRequest) => {
              chai.request(server)
                .post(API_REQUESTS_BASE_URL)
                .send(newRequest)
                .end((err, res) => {
                  res.should.have.status(201);
                  done();
                });
            });
        });
    });

    it('Não deve aceitar a criação de uma Requisição sem service_name', (done) => {
      chai.request(server)
        .post(API_REQUESTS_BASE_URL)
        .send(mockObjects.getInvalidRequest())
        .end((err, res) => {
          res.should.have.status(400);
          done();
        });
    });

    it('Não deve aceitar a criação de uma Requisição com Serviço inexistente', (done) => {
      chai.request(server)
        .post(API_REQUESTS_BASE_URL)
        .send(mockObjects.getInvalidRequest(1))
        .end((err, res) => {
          res.should.have.status(404);
          done();
        });
    });

    it('Não deve aceitar a criação de uma Requisição inválida, mesmo com Serviço existente', (done) => {
      mockObjects.createValidService()
        .then((insertedService) => {
          const invalidRequest = mockObjects.getInvalidRequest();
          invalidRequest.service_name = insertedService.machine_name;
          chai.request(server)
            .post(API_REQUESTS_BASE_URL)
            .send(invalidRequest)
            .end((err, res) => {
              res.should.have.status(400);
              done();
            });
        });
    });

    it('Não deve aceitar a criação de uma Requisição inválida, mesmo com Serviço existente (2)', (done) => {
      mockObjects.createValidService()
        .then((insertedService) => {
          const invalidRequest = mockObjects.getInvalidRequest(2);
          invalidRequest.service_name = insertedService.machine_name;
          chai.request(server)
            .post(API_REQUESTS_BASE_URL)
            .send(invalidRequest)
            .end((err, res) => {
              res.should.have.status(400);
              done();
            });
        });
    });
  });

  describe('Visualização', () => { // READ
    beforeEach(() => clearDB());

    it('Deve retornar corretamente uma Requisição criada', (done) => {
      mockObjects.createValidService()
        .then(mockObjects.createValidRequest)
        .then((validRequest) => {
          chai.request(server)
            .get(`${API_REQUESTS_BASE_URL}/${validRequest._id}`)
            .end((err, res) => {
              res.should.have.status(200);
              res.body.status.should.eql('success');
              const createdRequest = res.body.data;
              createdRequest.should.be.an('object');

              /* CAMPOS OBRIGATÓRIOS */
              createdRequest.should.have.property('service_name');
              createdRequest.should.have.property('data');
              createdRequest.data.should.be.an('object');
              createdRequest.data.should.not.eql({});

              createdRequest.should.have.property('notifications');
              createdRequest.notifications.should.be.an('array');
              createdRequest.notifications.should.not.eql([]);

              createdRequest.should.have.property('status', validRequest.status);

              /* TIMESTAMPS */
              Date.parse(createdRequest.updatedAt).should.be.eql(validRequest.updatedAt.getTime());
              Date.parse(createdRequest.createdAt).should.be.eql(validRequest.createdAt.getTime());

              /* CAMPOS QUE NÃO DEVEM SER EXIBIDOS */
              createdRequest.should.not.have.property('_id');
              createdRequest.should.not.have.property('id');
              createdRequest.should.not.have.property('__v');

              done();
            });
        });
    });
  });
});
