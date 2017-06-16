"use strict";
const
  Boom = require("boom"),
  jwt = require("jsonwebtoken"),
  mongoose = require("mongoose"),
  chai = require('chai'),
  chaiHttp = require('chai-http'),
  should = chai.should(),
  expect = chai.expect;

const
  server = require('../src/server'),
  Service = require("../src/models/serviceModel"),
  JWTSECRET = require('../src/config/secrets/secrets').JWTSecret;

chai.use(chaiHttp);

const API_BASE_URL = '/api/v1';

const validService = {
  machine_name: 'bd_maintenance',
  name: 'Manutenção em banco de dados',
  description: '',
  form: {},
  category: 'Banco de dados',
  sa_category: 'Banco de dados.MANUTENCAO',
  created: new Date,
  changed: new Date,
  published: true,
}

const invalidService = {
  machine_name: '001557',
  name: '    ',
  description: '',
  form: {
    a: 'b'
  },
  category: 'Banco de dados',
  created: new Date(),
  changed: 'sexta-feira',
  published: 'não',
}

const getServicesList = () =>{
  return new Promise((resolve, reject)=>{
    chai.request(server)
      .get(`${API_BASE_URL}/services`)
      .end((err, res) => {
        resolve(res);
      });
  });
}

const insertValidService = () => {
  return new Promise((resolve, reject)=>{
    chai
      .request(server)
      .post(`${API_BASE_URL}/services`)
      .send(validService)
      .end((err, res) => {
        resolve(res);
      });
  });
}

/* Limpe o banco de dados antes de iniciar os testes */
before(() => {
  return Service.remove({});
});

describe('Listagem de serviços...', () => {
  it('sem nada, deve retornar um 404', (done) => {
    chai.request(server)
      .get(`${API_BASE_URL}/services`)
      .end((err, res) => {
        res.should.have.status(404);
        done();
      })
  });
});

describe('Inserção de serviço...', () => {
  it('vazio, deve retornar um 400', (done) => {
    chai.request(server)
      .post(`${API_BASE_URL}/services`)
      .send({})
      .end((err, res) => {
        res.should.have.status(400);
        done();
      })
  });



  it('inválido, deve retornar um 400', (done) => {
    chai.request(server)
      .post(`${API_BASE_URL}/services`)
      .send(invalidService)
      .end((err, res) => {
        res.should.have.status(400);
        let validationInfo = JSON.parse(res.text).data.body;
        validationInfo.should.be.a('array');

        let expectedProperties = [
          'request.body.machine_name',
          'request.body.name',
          'request.body.changed',
          'request.body.published'
        ];

        validationInfo.forEach((property, propertyIndex, properties) => {
          let removeIndex = expectedProperties.indexOf(properties[propertyIndex].property);
          if (removeIndex > -1) {
            expectedProperties.splice(removeIndex, 1);
          }
        });

        expectedProperties.length.should.eql(0);
        done();
      });
  });
});

describe('Listagem de serviços...', () => {
  before((done) => {
    chai
      .request(server)
      .post(`${API_BASE_URL}/services`)
      .send(validService)
      .end((err, res) => {
        let data = JSON.stringify(JSON.parse(res.text).data);
        res.should.have.status(201);
        done();
      });
  })

  it('depois de inserir um serviço, deve retornar uma lista não vazia', (done) => {
    getServicesList()
      .then((res)=>{
        res.should.have.status(200);
        let services = JSON.parse(res.text).data;
        services.should.be.a('array');
        services.length.should.eql(1);
        done();
      });
  });
});

describe('Atualização de serviços...', () => {
  it('com propriedades permitidas, deve atualizar', (done) => {
    chai.request(server)
      .put(`${API_BASE_URL}/services/${validService.machine_name}`)
      .send({
        'sa_category': 'Banco de dados.Manutenção'
      })
      .end((err, res) => {
        res.should.have.status(200);
        let updatedService = res.body.data;
        updatedService.should.be.a('object');
        updatedService.should.have.property('sa_category','Banco de dados.Manutenção');
        Date.parse(updatedService.changed).should.be.gt(validService.changed.getTime());
        done();
      })
  });
  
  it('com apenas propriedades não permitidas, deve ignorá-las e atualizar o resto', (done) => {
    chai.request(server)
      .put(`${API_BASE_URL}/services/${validService.machine_name}`)
      .send({
        'machine_name': 'abacate'
      })
      .end((err, res) => {
        res.should.have.status(400);
        done();
      })
  });

  it('em caso misto, deve ignorar quem não é atualizável', (done) => {
    chai.request(server)
      .put(`${API_BASE_URL}/services/${validService.machine_name}`)
      .send({
        'machine_name': 'abacate',
        'sa_category': 'Manutenção.Banco de dados'
      })
      .end((err, res) => {
        res.should.have.status(200);
        let updatedService = res.body.data;
        updatedService.should.have.property('sa_category','Manutenção.Banco de dados');
        updatedService.should.not.have.property('machine_name', 'abacate')

        Date.parse(updatedService.changed).should.be.gt(validService.changed.getTime());
        
        done();
      })
  });
});

describe('Remoção de serviços...', () => {
  it('com machine_name inválido, deve retornar um 400', (done) => {
    chai.request(server)
      .delete(`${API_BASE_URL}/services/${invalidService.machine_name}`)
      .send()
      .end((err, res) => {
        res.should.have.status(400);
        done();
      })
  });

  it('com machine_name válido, mas inexistente, deve retornar um 404', (done) => {
    chai.request(server)
      .delete(`${API_BASE_URL}/services/abacate_magico12`)
      .send()
      .end((err, res) => {
        res.should.have.status(404);
        done();
      })
  });

  it('com machine_name válido, deve apagar o serviço, retornar OK', (done) => {
    chai.request(server)
      .delete(`${API_BASE_URL}/services/${validService.machine_name}`)
      .send()
      .end((err, res) => {
        res.should.have.status(200);

        getServicesList()
          .then((res) => {
            res.should.have.status(404);
            let data = JSON.parse(res.text).data;
            data.should.not.be.an("array");
            done();
          });
      });
  });

});

describe('Visualização de serviços...', () => {
  it('com machine_name inválido, deve retornar um 400', (done) => {
    chai.request(server)
      .get(`${API_BASE_URL}/services/${invalidService.machine_name}`)
      .send()
      .end((err, res) => {
        res.should.have.status(400);
        done();
      })
  });

  it('com machine_name inexistente, deve retornar um 404', (done) => {
    chai.request(server)
      .get(`${API_BASE_URL}/services/${validService.machine_name}`)
      .send()
      .end((err, res) => {
        res.should.have.status(404);
        done();
      });
  });

  it('com machine_name existente, deve retornar o serviço', (done) => {
    insertValidService()
      .then((res)=>{
        chai.request(server)
          .get(`${API_BASE_URL}/services/${validService.machine_name}`)
          .send()
          .end((err, res) => {
            res.should.have.status(200);
            let service = JSON.parse(res.text).data;
              service.should.be.an("object");
              //não vaze informações internas para o usuário
              service.should.not.have.property("__v");
              service.should.not.have.property("_id"); 
              
              service.should.have.property("category", validService.category);
              service.should.have.property("description", validService.description);
              service.should.have.property("machine_name", validService.machine_name);
              service.should.have.property("name", validService.name);
              service.should.have.property("published", validService.published);
              service.should.have.property("sa_category", validService.sa_category);
              service.should.have.property("changed");
              service.should.have.property("created");
            done();
          });
      });
  });

});