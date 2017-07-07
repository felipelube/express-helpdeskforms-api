const { describe, it, before } = require('mocha');
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
    

const delay = (timeout = 10000) => {
  return new Promise ((resolve, reject)=>{
    setTimeout(resolve, timeout)
  });
};
 
before(clearDB);

/* describe.only('Rodando integração com o Agendador', () => {
  it('OK', (done)=>{
    done();
  });
}); */

describe('Testes com Serviços', () => {
  describe('Listagem', () => {

  });
  describe('Criação', () => { // CREATE
    it('Deve aceitar a criação de um Serviço gerado corretamente', async () => {
      await clearDB;
      const validService = await mockObjects.getValidService();

      postService(validService)
        .end((err, res) => {
          res.should.have.status(201);
        });
    });

    it('Não deve aceitar um Serviço inválido', async () => {
      const invalidService = await mockObjects.getInvalidService();

      postService(invalidService)
        .end((err, res) => {
          res.should.have.status(400);
        });
    });

    it('Não deve aceitar um Serviço vazio', () => {
      postService({})
        .end((err, res) => {
          res.should.have.status(400);
        });
    });

    it('Deve validar as propriedades antes de inserir', async () => {
      const invalidService = await mockObjects.getValidService();
      invalidService.name = '    ';

      postService(invalidService)
        .end((err, res) => {
          res.should.have.status(400);
          res.body.status.should.eql('fail');
          const validationErrors = res.body.data.body;
          validationErrors.should.be.an('array');
          validationErrors.length.should.gt(0);
        });
    });

    it('Não deve aceitar a criação de um serviço com machine_name já em uso', async () => {
      await mockObjects.createValidService();
      const validService = await mockObjects.getValidService();

      postService(validService)
        .end((err, res) => {
          res.should.have.status(409);
          res.body.status.should.eql('fail');
          const validationErrors = res.body.data.body;
          validationErrors.should.be.an('array');
          validationErrors.length.should.gt(0);
        });
    });
  });

  describe('Visualização', async () => { // READ
    it('Deve retornar corretamente um Serviço criado', async () => {
      const createdService = await mockObjects.createValidService();
      getService(createdService.machine_name)
        .end((err, res) => {
          res.should.have.status(200);
          res.body.status.should.eql('success');
          const serviceCreated = res.body.data;
          serviceCreated.should.be.an('object');

          /* CAMPOS OBRIGATÓRIOS */
          serviceCreated.should.have.property('machine_name', createdService.machine_name);
          serviceCreated.should.have.property('name', createdService.name);
          serviceCreated.should.have.property('category', createdService.category);
          serviceCreated.should.have.property('published', createdService.published);
          serviceCreated.should.have.property('sa_category', createdService.sa_category);

          /* CAMPOS OPCIONAIS */
          if (createdService.description) {
            serviceCreated.should.have.property('description', createdService.description);
          }

          /* TIMESTAMPS */
          Date.parse(serviceCreated.updatedAt).should.be.eql(
            createdService.updatedAt.getTime());
          Date.parse(serviceCreated.createdAt).should.be.eql(
            createdService.createdAt.getTime());

          /* CAMPOS QUE NÃO DEVEM SER EXIBIDOS */
          serviceCreated.should.not.have.property('_id');
          serviceCreated.should.not.have.property('id');
          serviceCreated.should.not.have.property('__v');
        });
    });

    it('Deve retornar um NotFound para nomes de Serviço inválidos', async () => {
      getService('abacate!!!')
        .end((err, res) => {
          res.should.have.status(404);
        });
    });

    it('Deve retornar um NotFound para nomes de Serviço válidos, mas não existentes', async () => {
      await clearDB();
      getService('abacate_magico')
        .end((err, res) => {
          res.should.have.status(404);
        });
    });
  });

  describe('Atualização', async () => { // UPDATE
    it('Se tudo estiver OK, deve atualizar', async () => {
      const dataToUpdate = {
        category: 'Banco de dados',
        sa_category: 'Banco de dados.Criação',
      };
      const validService = await mockObjects.createValidService();
      putService(validService.machine_name, dataToUpdate)
        .end((err, res) => {
          res.should.have.status(200);
          res.body.status.should.eql('success');
          const serviceUpdated = res.body.data;
          serviceUpdated.should.be.an('object');

          /* CAMPOS INDIFERENTES À ATUALIZAÇÃO */
          if (validService.description) {
            serviceUpdated.should.have.property('description', validService.description);
          }
          serviceUpdated.should.have.property('machine_name', validService.machine_name);
          serviceUpdated.should.have.property('name', validService.name);
          serviceUpdated.should.have.property('published', validService.published);

          /* CAMPOS QUE DEVEM SER ATUALIZADOS */
          serviceUpdated.should.have.property('category', dataToUpdate.category);
          serviceUpdated.should.have.property('sa_category', dataToUpdate.sa_category);

          /* TIMESTAMPS */
          Date.parse(serviceUpdated.updatedAt).should.be.gt(
            validService.updatedAt.getTime());
          Date.parse(serviceUpdated.createdAt).should.be.eql(
            validService.createdAt.getTime());

          /* CAMPOS QUE NÃO DEVEM SER EXIBIDOS */
          serviceUpdated.should.not.have.property('_id');
          serviceUpdated.should.not.have.property('id');
          serviceUpdated.should.not.have.property('__v');
        });
    });

    it('Deve atualizar somente propriedades atualizáveis e ignorar as não atualizáveis', async () => {
      const dataToUpdate = {
        category: 'Banco de dados',
        sa_category: 'Banco de dados.Manutenção',
        machine_name: 'bd_maintenance',
      };
      const validService = await mockObjects.createValidService();
      putService(validService.machine_name, dataToUpdate)
        .end((err, res) => {
          res.should.have.status(200);
          res.body.status.should.eql('success');
          const serviceUpdated = res.body.data;
          serviceUpdated.should.be.an('object');

          /* CAMPOS INDIFERENTES À ATUALIZAÇÃO */
          if (validService.description) {
            serviceUpdated.should.have.property('description', validService.description);
          }

          serviceUpdated.should.have.property('name', validService.name);
          serviceUpdated.should.have.property('published', validService.published);

          /* CAMPOS QUE DEVEM SER ATUALIZADOS */
          serviceUpdated.should.have.property('category', dataToUpdate.category);
          serviceUpdated.should.have.property('sa_category', dataToUpdate.sa_category);

          /* CAMPOS QUE NÃO DEVEM SER ATUALIZADOS */
          serviceUpdated.should.have.property('machine_name', validService.machine_name);

          /* TIMESTAMPS */
          Date.parse(serviceUpdated.updatedAt).should.be.gt(
            validService.updatedAt.getTime());
          Date.parse(serviceUpdated.createdAt).should.be.eql(
            validService.createdAt.getTime());

          /* CAMPOS QUE NÃO DEVEM SER EXIBIDOS */
          serviceUpdated.should.not.have.property('_id');
          serviceUpdated.should.not.have.property('id');
          serviceUpdated.should.not.have.property('__v');
        });
    });

    it('Deve retornar um BadRequest se a tentativa de atualização for somente composta por propriedades não atualizáveis', async () => {
      const dataToUpdate = {
        machine_name: 'bd_maintenance',
      };
      const validService = await mockObjects.createValidService();
      putService(validService.machine_name, dataToUpdate)
        .end((err, res) => {
          res.should.have.status(400);
          res.body.status.should.eql('fail');
        });
    });

    it('Deve validar as propriedades antes de atualizar', async () => {
      const dataToUpdate = {
        name: '    ',
      };

      const validService = await mockObjects.createValidService();
      putService(validService.machine_name, dataToUpdate)
        .end((err, res) => {
          res.should.have.status(400);
          res.body.status.should.eql('fail');
        });
    });
  });

  describe('Remoção', () => { // DELETE
    it('Deve apagar um Serviço já inserido e retornar OK', async () => {
      const validService = await mockObjects.createValidService();
      deleteService(validService.machine_name)
        .end((err, res) => {
          res.should.have.status(200);
        });
    });

    it('Deve falhar com um 400 para um machine_name inválido', async () => {
      const invalidService = await mockObjects.getInvalidService();
      deleteService(invalidService.machine_name)
        .end((err, res) => {
          res.should.have.status(400);
        });
    });

    it('Deve falhar com um 404 para um Serviço inexistente', async () => {
      const invalidService = await mockObjects.getInvalidService(1);
      deleteService(invalidService.machine_name)
        .end((err, res) => {
          res.should.have.status(404);
        });
    });
  });
});

describe('Testes com Requisições', () => {
  describe('Listagem', () => {

  });
  describe('Criação', () => { // CREATE
    it('Deve aceitar a criação de uma Requisição gerada corretamente', async () => {
      const validService = await mockObjects.createValidService();
      const validRequest = await mockObjects.createValidRequest(validService);
      chai.request(server)
        .post(API_REQUESTS_BASE_URL)
        .send(validRequest)
        .end(async (err, res) => {
          res.should.have.status(201);          
        });
      await delay(500); // dê tempo para o agendador processar esta requisição
    });

    it('Não deve aceitar a criação de uma Requisição sem service_name', async () => {
      chai.request(server)
        .post(API_REQUESTS_BASE_URL)
        .send(await mockObjects.getInvalidRequest())
        .end((err, res) => {
          res.should.have.status(400);          
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

    it('Não deve aceitar a criação de uma Requisição inválida, mesmo com Serviço existente', async () => {
      const validService = await mockObjects.createValidService();
      const invalidRequest = await mockObjects.getInvalidRequest();
      invalidRequest.service_name = validService.machine_name;      
      chai.request(server)
        .post(API_REQUESTS_BASE_URL)
        .send(invalidRequest)
        .end((err, res) => {
          res.should.have.status(400);          
        });
    });

    it('Não deve aceitar a criação de uma Requisição inválida, mesmo com Serviço existente (2)', async () => {
      const validService = await mockObjects.createValidService();
      const invalidRequest = await mockObjects.getInvalidRequest(2);
      invalidRequest.service_name = validService.machine_name;      
      chai.request(server)
        .post(API_REQUESTS_BASE_URL)
        .send(invalidRequest)
        .end((err, res) => {
          res.should.have.status(400);          
        });
    });
  });

  describe('Visualização', () => { // READ
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
              createdRequest.should.not.have.property('__v');

              done();
            });
        });
    });
  });

  describe('Atualização', () => {
    it('Deve atualizar sem problemas o status da Requisição', async () => {
      const dataToUpdate = {
        status: 'notificationsProcessed',
      };
      const validService = await mockObjects.createValidService();
      const validRequest = await mockObjects.createValidRequest(validService);

      chai.request(server)
        .put(`${API_REQUESTS_BASE_URL}/${validRequest.id}`)
        .send(dataToUpdate)
        .end((err, res) => {
          res.should.have.status(200);
          res.body.status.should.eql('success');
          const requestUpdated = res.body.data;
          requestUpdated.should.be.an('object');

          requestUpdated.should.have.property('status', dataToUpdate.status);

          /* TIMESTAMPS */
          Date.parse(requestUpdated.updatedAt).should.be.gt(
            validRequest.updatedAt.getTime());
          Date.parse(requestUpdated.createdAt).should.be.eql(
            validRequest.createdAt.getTime());
        });
    });

    it('Deve atualizar sem problemas as notificações da Requisição', async (done) => {
      const dataToUpdate = {
        notifications: [],
      };
      const validService = await mockObjects.createValidService();
      const validRequest = await mockObjects.createValidRequest(validService);

      chai.request(server)
        .put(`${API_REQUESTS_BASE_URL}/${validRequest.id}`)
        .send(dataToUpdate)
        .end((err, res) => {
          res.should.have.status(200);
          res.body.status.should.eql('success');
          const requestUpdated = res.body.data;
          requestUpdated.should.be.an('object');

          requestUpdated.should.have.property('status', dataToUpdate.status);
          done();
        });
    });

    it('Deve atualizar sem problemas os dados da Requisição', async (done) => {
      const dataToUpdate = {
        status: 'notificationsProcessed',
      };
      const validService = await mockObjects.createValidService();
      const validRequest = await mockObjects.createValidRequest(validService);

      chai.request(server)
        .put(`${API_REQUESTS_BASE_URL}/${validRequest.id}`)
        .send(dataToUpdate)
        .end((err, res) => {
          res.should.have.status(200);
          res.body.status.should.eql('success');
          const requestUpdated = res.body.data;
          requestUpdated.should.be.an('object');

          requestUpdated.should.have.property('status', dataToUpdate.status);
          done();
        });
    });
  });
});
