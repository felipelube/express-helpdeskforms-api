const
  Service = require("../../src/models/serviceModel"),
  Request = require("../../src/models/serviceModel");

/** retornar o getJSONSchema orginal */
const mockObjects = () => {
  const getValidService = () => {
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
            pattern: /(?=\s*\S).*/,
            description: "Breve descrição do que o script vai fazer"
          },
          sgdb: {
            type: "string",
            id: '/properties/sgdb',
            enum: ["Oracle", "SQL Server"],
            description: "SGDB"
          },
          dbName: {
            type: "string",
            id: '/properties/dbName',
            pattern: /(?=\s*\S).*/,
            description: "Nome do banco"
          },
          environment: {
            type: "string",
            id: '/properties/environment',
            enum: ["Produção", "Homologação", "Desenvolvimento"],
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
            pattern: /(?=\s*\S).*/,
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
      notifications: [{
        notificationType: 'email',
        dataFormat: {
          to: 'atendimento@prodest.es.gov.br',
          from: 'teste@example.com',
          body: ["%CATEGORY=${service.sa_category}",
            "%PARENT=${form.parentSA}",
            "%SUMMARY=${summary} - ${dbName}",
            "%DESCRIPTION=Breve descrição do que o script vai fazer: ${form.summary}",
            "SGDB (Oracle/SQL Server): ${form.sgdb}",
            "Nome do banco: ${form.dbName}",
            "Ambiente (Desenvolvimento, Teste, Treinamento, Homologação ou Produção): ${form.environment}",
            "Os scripts criam novos objetos no banco (tabelas, views, packages ou outros)? ${form.scriptsCreateObjects}",
            "É necessário fazer backup do banco de dados antes da execução do script (Sim - Prazo de retenção/Não)? ${form.backupNeeded ? 'Sim, '+ form.backupRetentionPeriod :'Não'}",
            "Data e hora para execução dos scripts: ${form.backupRetentionPeriod}",
            "Depende de outra SA ou procedimento para ser executado: (Sim - Qual/Não)? ${form.dependentSA ? 'Sim, '+ form.dependentSA :'Não'}",
            "Instruções adicionais para execução ou outras informações: ${form.additionalInfo} "
          ].join(),
          subject: "${summary} - ${dbName}",
          attachments: []
          /** @todo DÚVIDA: o conteúdo dos anexos retirado da leitura de um 
                   arquivo enviado enviado pelo cliente para uma api de hospedagem; ou não anexar arquivo nenhum e 
                   simplesmente listar as urls dos arquivos hospedados no formulário acima? */

        }
      }],
      category: "Banco de dados",
      sa_category: "Banco de dados.manutenção",
      published: true,
    });
  }

  const getValidRequest = () => {
    return Promise.resolve({
      data: {
        summary: "Este script é apenas um teste para o nosso sistema",
        sgdb: 'Oracle',
        dbName: 'BD_TESTE',
        environment: 'Produção',
        scriptsCreateObjects: false,
        backupNeeded: false,
        executionDateTime: new Date(),
        parentSA: 288987
      },
      notifications: [{
        notificationType: 'email',
        formatedData: {
          to: 'atendimento@prodest.es.gov.br',
          from: 'teste@example.com',
          body: ` %CATEGORY=Banco de dados.manutenção
                  %PARENT=288987
                  %SUMMARY=Este script é apenas um teste para o nosso sistema - BD_TESTE
                %DESCRIPTION=Breve descrição do que o script vai fazer: Este script é apenas um teste para o nosso sistema
                SGDB (Oracle/SQL Server): Oracle
                Nome do banco: BD_TESTE
                Ambiente (Desenvolvimento, Teste, Treinamento, Homologação ou Produção): Produção
                Os scripts criam novos objetos no banco (tabelas, views, packages ou outros)? Não
                É necessário fazer backup do banco de dados antes da execução do script (Sim - Prazo de retenção/Não)? Não
                Data e hora para execução dos scripts: Assim que possível
                Depende de outra SA ou procedimento para ser executado: (Sim - Qual/Não)? Não
                Instruções adicionais para execução ou outras informações: `,
          subject: 'Este script é apenas um teste para o nosso sistema - BD_TESTE',
          attachments: [],
          /** @todo */
        },
        priority: 0,
        status: {
          status: 'awaitingSending',
          changed: [{
            statusName: 'awaitingSending',
            timestamp: new Date,
          }]
        }
      }],
      status: 'new',
    })
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
      .then((generatedService) => {
        generatedService.published = true;
        const newService = new Service(generatedService);
        return newService.save();
      })
      .then((newService) => {
        return newService.toJSON();
      })
      .catch((err) => {
        throw err;
      })
  }

  const getInvalidRequest = (requestIndex = 0) => {
    let validServiceId;
    let invalidRequests;

    invalidRequests = [{
        serviceId: true,
        data: {},
        notifications: [],
        status: 'nova',
      },
      {
        serviceId: '507f191e810c19729de860ea',
        data: {},
        notifications: [],
        status: 'nova',
      },
      {
        serviceId: '507f191e810c19729de860ea',
        data: {},
        notifications: [],
        status: 'new',
      },
    ];
    return invalidRequests[requestIndex];
  }

  return {
    getValidService,
    getValidRequest,
    getInvalidService,
    getInvalidRequest,
    createValidService
  }
}

module.exports = mockObjects();