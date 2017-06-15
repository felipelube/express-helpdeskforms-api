"use strict";
const
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
    chai.request(server)
      .get(`${API_BASE_URL}/services`)
      .end((err, res) => {
        res.should.have.status(200);
        let services = JSON.parse(res.text).data;
        services.should.be.a('array');
        services.length.should.eql(1);
        done();
      })
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
  
  it('com apenas propriedades não permitidas, deve ignorá-las e não atualizar', (done) => {
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
})