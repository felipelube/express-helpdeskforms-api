const { describe, it, before } = require('mocha');
const { chai, server, clearDB, postService, getService, putService, deleteService, postRequest,
getRequest, putRequest, delay, API_SERVICES_BASE_URL, API_REQUESTS_BASE_URL } = require('./util/');
const mockObjects = require('./util/objects');

before(clearDB); // limpe o banco antes de começar os testes

describe('Testes com Serviços', () => {
  describe('Listagem', () => {
    it('Deve retornar uma lista vazia', async () => {
      chai.request(server)
        .get(API_SERVICES_BASE_URL)
        .end((err, res) => {
          res.should.have.status(200);
          const requests = res.body.data;
          requests.should.be.an('array');
          requests.length.should.be.eq(0);
        });
    });

    it('Deve retornar uma lista com um Serviço, depois de inserir um', async () => {
      await mockObjects.createValidService();
      chai.request(server)
        .get(API_SERVICES_BASE_URL)
        .end((err, res) => {
          res.should.have.status(200);
          const requests = res.body.data;
          requests.should.be.an('array');
          requests.length.should.be.eq(1);
        });
    });
  });
  describe('Criação', () => { // CREATE
    it('Deve aceitar a criação de um Serviço gerado corretamente', async () => {
      await clearDB();
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
    it('Deve retornar uma lista vazia', async () => {
      chai.request(server)
        .get(API_REQUESTS_BASE_URL)
        .end((err, res) => {
          res.should.have.status(200);
          const requests = res.body.data;
          requests.should.be.an('array');
          requests.length.should.be.eq(0);
        });
    });

    it('Deve retornar uma lista com uma Requisição, depois de inserir uma', async () => {
      const validService = await mockObjects.createValidService();
      await mockObjects.createValidRequest(validService);
      chai.request(server)
        .get(API_REQUESTS_BASE_URL)
        .end((err, res) => {
          res.should.have.status(200);
          const requests = res.body.data;
          requests.should.be.an('array');
          requests.length.should.be.eq(1);
        });
    });
  });
  describe('Criação', () => { // CREATE
    it('Deve aceitar a criação de uma Requisição gerada corretamente', (done) => {
      mockObjects.createValidService()
        .then(validService => mockObjects.createValidRequest(validService))
        .then((validRequest) => {
          postRequest(validRequest)
            .end((err, res) => {
              res.should.have.status(201);
              done();
            });
        });
    }).timeout(20000); // dê tempo para o agendador responder

    it('Não deve aceitar a criação de uma Requisição sem service_name', async () => {
      postRequest(await mockObjects.getInvalidRequest())
        .end((err, res) => {
          res.should.have.status(400);
        });
    });

    it('Não deve aceitar a criação de uma Requisição com Serviço inexistente', async () => {
      postRequest(await mockObjects.getInvalidRequest(1))
        .end((err, res) => {
          res.should.have.status(404);
        });
    });

    it('Não deve aceitar a criação de uma Requisição inválida, mesmo com Serviço existente', async () => {
      const validService = await mockObjects.createValidService();
      const invalidRequest = await mockObjects.getInvalidRequest();
      invalidRequest.service_name = validService.machine_name;
      postRequest(invalidRequest)
        .end((err, res) => {
          res.should.have.status(400);
        });
    });

    it('Não deve aceitar a criação de uma Requisição inválida, mesmo com Serviço existente (2)', async () => {
      const validService = await mockObjects.createValidService();
      const invalidRequest = await mockObjects.getInvalidRequest(2);
      invalidRequest.service_name = validService.machine_name;
      postRequest(invalidRequest)
        .end((err, res) => {
          res.should.have.status(400);
        });
    });
  });

  describe('Visualização', () => { // READ
    it('Deve retornar corretamente uma Requisição criada', async () => {
      const validService = await mockObjects.createValidService();
      const validRequest = await mockObjects.createValidRequest(validService);
      getRequest(validRequest.id)
        .end((err, res) => {
          res.should.have.status(200);
          res.body.status.should.eql('success');
          const createdRequest = res.body.data;
          createdRequest.should.be.an('object');

          /* CAMPOS OBRIGATÓRIOS */
          createdRequest.should.have.property('service_name', validRequest.service_name);
          createdRequest.should.have.property('data');
          createdRequest.should.have.property('notifications');

          createdRequest.should.have.property('status', validRequest.status);

          /** @todo resolver problema com datas */
          // createdRequest.data.should.deep.equal(validRequest.data);
          // createdRequest.notifications.should.deep.equal(validRequest.notifications);

          /* TIMESTAMPS */
          Date.parse(createdRequest.updatedAt).should.be.eql(validRequest.updatedAt.getTime());
          Date.parse(createdRequest.createdAt).should.be.eql(validRequest.createdAt.getTime());

          /* CAMPOS QUE NÃO DEVEM SER EXIBIDOS */
          createdRequest.should.not.have.property('_id');
          createdRequest.should.not.have.property('__v');
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

      putRequest(validRequest.id, dataToUpdate)
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

    it('Deve atualizar sem problemas as notificações da Requisição', async () => {
      const dataToUpdate = {
        notifications: [],
      };
      const validService = await mockObjects.createValidService();
      const validRequest = await mockObjects.createValidRequest(validService);

      putRequest(validRequest.id, dataToUpdate)
        .end((err, res) => {
          res.should.have.status(200);
          res.body.status.should.eql('success');
          const requestUpdated = res.body.data;
          requestUpdated.should.be.an('object');

          requestUpdated.should.have.property('notifications');
          requestUpdated.notifications.should.deep.equal(dataToUpdate.notifications);

          /* TIMESTAMPS */
          Date.parse(requestUpdated.updatedAt).should.be.gt(
            validRequest.updatedAt.getTime());
          Date.parse(requestUpdated.createdAt).should.be.eql(
            validRequest.createdAt.getTime());
        });
    });
  });
});
