const
  jsf = require('json-schema-faker');

const
  Service = require("../../src/models/serviceModel"),
  Request = require("../../src/models/serviceModel");

/** retornar o getJSONSchema orginal */
const mockObjects = () => {
  const getValidService = () =>{
    let jsonSchema = Service.getJSONSchema();
    return jsf.resolve(jsonSchema)
      .then((validService)=>{
        return validService;
      })
      .catch((err)=>{
        throw err;
      });
  }

  const getValidRequest = () =>{
    let jsonSchema = Request.getJSONSchema();
    return jsf.resolve(jsonSchema)
      .then((validRequest)=>{
        return validRequest;
      });
  }

  const getInvalidService = () => {
    return {
      machine_name: '001557',
      name: '    ',
      description: '',
      form: {
        a: 'b'
      },
      category: 'Banco de dados',
      createdAt: 'sexta-feira',
      published: 'não',
    }
  }

  const getInvalidRequest = () =>{
    throw new Error();
  }

  return {
    getValidService,
    getValidRequest,
    getInvalidService
  }
}

module.exports = mockObjects();



/*

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
}*/