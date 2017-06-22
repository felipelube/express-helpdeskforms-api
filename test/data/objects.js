const
  Service = require("../../src/models/serviceModel"),
  Request = require("../../src/models/serviceModel");

/** retornar o getJSONSchema orginal */
const mockObjects = () => {
  const getValidService = () =>{
    return new Promise.resolve({
        machine_name: 'bd_maintenance',
        name: 'Manutenção em Banco de Dados',
        description: `Trata-se da execução de scripts paara a criação e objetos 
        (tabelas, índices, funções), execução de procedures para manipulação de dados 
        (carga, atualização ou deleção) e também de solicitações como criação de sinônimos, 
        concessão de privilégios para usuários da aplicação e criação/agendamento de Jobs. 
        Geralmente solicitado pela GESIN ou GEINF e usuários externos. <b>Os scripts deverão 
        ser anexados à SA.</b>`,
        form: {
          type: "object",
          properties: {
            summary: {
              type: "string",
              id: '/properties/summary',
              pattern: "(?=\s*\S).*",
              description: "Breve descrição do que o script vai fazer"
            },
            sgdb: {
              type: "string",
              id: '/properties/sgdb',
              enum: [ "Oracle", "SQL Server"],
              description: "SGDB"
            },
            dbName: {
              type: "string",
              id: '/properties/dbName',
              pattern: "(?=\s*\S).*",
              description: "Nome do banco"
            },
            environment: {
              type: "string",
              id: '/properties/environment',
              enum: [ "Produção", "Homologação", "Desenvolvimento"],
              description: "Ambiente"
            },
            scriptsCreateObjects: {
              type: "boolean",
              id: '/properties/scriptsCreateObjects',
              description: "Os scripts criam novos objetos no banco (tabelas, views, packages ou outros)"
            },
            backupNeeded: {
              type: "boolean",
              id: '/properties/backupNeeded',
              description: "É necesário fazer backup do banco de dados antes da execução do script"
            },
            backupRetentionPeriod: {
              type: "number",
              id: '/properties/backupRetentionPeriod',
              description: "Prazo de retenção do backup"
            },
            executionDateTime: {
              type: "string",
              id: '/properties/executionDateTime',
              format: "date-time",
              description: "Data e hora para execução dos scripts"
            },
            dependentSA: {
              type: "number",
              id: '/properties/dependentSA',
              description: "Depende de outra SA ou procedimento para ser executado"
            },
            additionalInfo: {
              type: "string",
              id: '/properties/additionalInfo',
              pattern: "(?=\s*\S).*",
              description: "Instruções adicionais para execução ou outras informações"
            },
          },
          required: [
            'summary',
            'sgdb',
            'dbName',
            'environment',
            'scriptsCreateObjects',
            'backupNeeded',
          ]
        },
        category: "Banco de dados",
        sa_category: "Banco de dados.manutenção",
        published: true,
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

  const createValidService = () => {
    return getValidService()
      .then((generatedService)=>{
        generatedService.published = true;
        const newService = new Service(generatedService);
        return newService.save();
      })
      .then((newService)=>{
        return newService.toJSON();
      })
      .catch((err)=>{
        throw err;
      })
  }

  const getInvalidRequest = () =>{
    throw new Error();
  }

  return {
    getValidService,
    getValidRequest,
    getInvalidService,

    createValidService
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