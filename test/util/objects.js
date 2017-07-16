const Service = require('../../src/models/serviceModel');
const Request = require('../../src/models/requestModel');

/** retornar o getJSONSchema orginal */
const mockObjects = () => {
  const getValidService = () => Promise.resolve({
    machine_name: 'bd_maintenance',
    name: 'Manutenção em Banco de Dados',
    description: `Trata-se da execução de scripts paara a criação e objetos 
      (tabelas, índices, funções), execução de procedures para manipulação de dados 
      (carga, atualização ou deleção) e também de solicitações como criação de sinônimos, 
      concessão de privilégios para usuários da aplicação e criação/agendamento de Jobs. 
      Geralmente solicitado pela GESIN ou GEINF e usuários externos. <b>Os scripts deverão 
      ser anexados à SA.</b>`,
    form: {
      type: 'object',
      properties: {
        summary: {
          type: 'string',
          id: '/properties/summary',
          pattern: /(?=\s*\S).*/,
          description: 'Breve descrição do que o script vai fazer',
        },
        sgdb: {
          type: 'string',
          id: '/properties/sgdb',
          enum: ['Oracle', 'SQL Server'],
          description: 'SGDB',
        },
        db_name: {
          type: 'string',
          id: '/properties/db_name',
          pattern: /(?=\s*\S).*/,
          description: 'Nome do banco',
        },
        environment: {
          type: 'string',
          id: '/properties/environment',
          enum: ['Produção', 'Homologação', 'Desenvolvimento'],
          description: 'Ambiente',
        },
        scripts_create_objects: {
          type: 'boolean',
          id: '/properties/scripts_create_objects',
          description: 'Os scripts criam novos objetos no banco (tabelas, views, packages ou outros)',
        },
        backup_needed: {
          type: 'boolean',
          id: '/properties/backup_needed',
          description: 'É necesário fazer backup do banco de dados antes da execução do script',
        },
        backup_retention_period: {
          type: 'number',
          id: '/properties/backup_retention_period',
          description: 'Prazo de retenção do backup',
        },
        execution_date_time: {
          type: 'string',
          id: '/properties/execution_date_time',
          format: 'date-time',
          description: 'Data e hora para execução dos scripts',
        },
        dependent_sa: {
          type: 'number',
          id: '/properties/dependent_sa',
          description: 'Depende de outra SA ou procedimento para ser executado',
        },
        additional_info: {
          type: 'string',
          id: '/properties/additional_info',
          pattern: /(?=\s*\S).*/,
          description: 'Instruções adicionais para execução ou outras informações',
        },
      },
      required: [
        'summary',
        'sgdb',
        'db_name',
        'environment',
        'scripts_create_objects',
        'backup_needed',
      ],
    },
    category: 'Banco de dados',
    notifications: [{
      type: 'email',
      data_format: {
        to: 'felipe.lubra@gmail.com',
        from: 'monitoramento@felipelube.com',
        body: ['%CATEGORY=${service.sa_category}',
          '%PARENT=${request.data.parent_sa}',
          '%SUMMARY=${request.data.summary} - ${request.data.db_name}',
          '%DESCRIPTION=Breve descrição do que o script vai fazer: ${request.data.summary}',
          'SGDB (Oracle/SQL Server): ${request.data.sgdb}',
          'Nome do banco: ${request.data.db_name}',
          'Ambiente (Desenvolvimento, Teste, Treinamento, Homologação ou Produção): ${request.data.environment}',
          'Os scripts criam novos objetos no banco (tabelas, views, packages ou outros)? ${request.data.scripts_create_objects? "Sim": "Não"}',
          "É necessário fazer backup do banco de dados antes da execução do script (Sim - Prazo de retenção/Não)? ${request.data.backup_needed ? 'Sim, '+ request.data.backup_retention_period :'Não'}",
          'Data e hora para execução dos scripts: ${request.data.backup_retention_period}',
          "Depende de outra SA ou procedimento para ser executado: (Sim - Qual/Não)? ${request.data.dependent_sa ? 'Sim, '+ request.data.dependent_sa :'Não'}",
          'Instruções adicionais para execução ou outras informações: ${request.data.additional_info} ',
        ].join(),
        subject: '${service.sa_category} - ${request.data.summary} - ${request.data.db_name}',
        attachments: [],
        /** @todo DÚVIDA: o conteúdo dos anexos retirado da leitura de um
                 arquivo enviado enviado pelo cliente para uma api de hospedagem; ou não anexar
                 arquivo nenhum e simplesmente listar as urls dos arquivos hospedados no
                 formulário acima? */

      },
    }],
    ca_info: {
      sa_category: 'Banco de dados.manutenção',
      sa_type: 'CR',
    },
    published: true,
  });

  const getValidRequest = () => Promise.resolve({
    data: {
      summary: 'Este script é apenas um teste para o nosso sistema',
      sgdb: 'Oracle',
      db_name: 'BD_TESTE',
      environment: 'Produção',
      scripts_create_objects: false,
      backup_needed: false,
      execution_date_time: new Date(),
      parent_sa: 288987,
    },
    notifications: [],
    status: 'new',
  });

  const getInvalidService = (serviceIndex = 0) => {
    const invalidServices = [{
      machine_name: '001557',
      name: '    ',
      description: '',
      form: {
        a: 'b',
      },
      category: 'Banco de dados',
      createdAt: 'sexta-feira',
      published: 'não',
    },
    {
      machine_name: 'bd_maintenance',
      name: '    ',
      description: '',
      form: {
        a: 'b',
      },
      category: 'Banco de dados',
      createdAt: 'sexta-feira',
      published: 'não',
    },
    ];
    return invalidServices[serviceIndex];
  };

  const createValidService = async () => {
    let validService = null;
    try {
      validService = await getValidService();
      validService.published = true;
      validService = await new Service(validService).save();
      return validService.toJSON();
    } catch (e) {
      // já existe serviço com esse machine_name, retorne-o então
      if (e.code && e.code === 11000 && validService) {
        const service = await Service.findOne({ machine_name: validService.machine_name });
        return service.info();
      }
      throw new Error(`Falha ao tentar criar um Serviço válido: ${e.message}`);
    }
  };

  const createValidRequest = async (serviceName) => {
    try {
      let validRequest = await getValidRequest();
      if (typeof (serviceName) === 'string') {
        validRequest.service_name = serviceName;
      } else if (typeof (serviceName) === 'object' && serviceName.machine_name) {
        validRequest.service_name = serviceName.machine_name;
      } else {
        throw new Error('serviceName inválido');
      }
      validRequest = new Request(validRequest);
      validRequest = await validRequest.save();
      return await validRequest.getInfo();
    } catch (e) {
      throw new Error(`Falha ao tentar criar uma Requisição válida: ${e.message}`);
    }
  };

  const getInvalidRequest = (requestIndex = 0) => {
    const invalidRequests = [{
      data: {},
      notifications: [],
      status: 'nova',
    },
    {
      service_name: '507f191e810c19729de860ea',
      data: {},
      notifications: [],
      status: 'nova',
    },
    {
      service_name: '507f191e810c19729de860ea',
      data: {},
      notifications: [],
      status: 'new',
    },
    ];
    return invalidRequests[requestIndex];
  };

  return {
    getValidService,
    getValidRequest,
    getInvalidService,
    getInvalidRequest,
    createValidService,
    createValidRequest,
  };
};

module.exports = mockObjects();
