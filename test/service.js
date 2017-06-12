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

/* Limpe o banco de dados antes de iniciar os testes */
before(() => {
  return Service.remove({});
});

describe('Listagem de serviços...', ()=>{
  it('sem nada, deve retornar um 404', (done)=>{
    chai.request(server)
      .get(`${API_BASE_URL}/services`)
      .end((err, res)=>{
        res.should.have.status(404);
        done();
      })
  });
});

describe('Inserção de serviço...', ()=>{
  it('vazio, deve retornar um 400', (done)=>{
    chai.request(server)
      .post(`${API_BASE_URL}/services`)
      .send({})
      .end((err, res)=>{
        res.should.have.status(400);
        done();
      })
  });

  let invalidService = {
    machine_name: '001557',
    name: '    ',
    description: '',
    form: {
      a: 'b'
    },
    category: 'Banco de dados',
    created: Date.now(),
    changed: Date.now(),
    published: 'não',
  }
  
  it('inválido, deve retornar um 400', (done)=>{
    chai.request(server)
      .post(`${API_BASE_URL}/services`)
      .send(invalidService)
      .end((err, res)=>{
        res.should.have.status(400);
          let validationInfo = JSON.parse(res.text).data;
          validationInfo.should.be.a('array');
          validationInfo[0].should.have.property('param', 'machine_name');
          validationInfo[1].should.have.property('param', 'name');
          validationInfo[2].should.have.property('param', 'form');
          validationInfo[3].should.have.property('param', 'sa_category');
          validationInfo[4].should.have.property('param', 'published');
        done();
      });
  });
});

describe.only('Listagem de serviços...', ()=>{
  let validService = {
    machine_name: 'bd_maintenance',
    name: 'Manutenção em banco de dados',
    description: '',
    form: {},
    category: 'Banco de dados',
    sa_category: 'Banco de dados.MANUTENCAO',
    created: Date.now().toString(),
    changed: Date.now().toString(),
    published: true,
  }
  before((done)=>{
    chai
      .request(server)
        .post(`${API_BASE_URL}/services`)
        .send(validService)
        .end((err, res)=>{
          let data = JSON.stringify(JSON.parse(res.text).data);
          res.should.have.status(201);
          done();
        });
  })

  it('depois de inserir um serviço, deve retornar uma lista não vazia', (done)=>{
    chai.request(server)
      .get(`${API_BASE_URL}/services`)
      .end((err, res)=>{
        res.should.have.status(200);
          let services = JSON.parse(res.text).data;
          services.should.be.a('array');
          services.length.should.eql(1);
        done();
      })
  });
});