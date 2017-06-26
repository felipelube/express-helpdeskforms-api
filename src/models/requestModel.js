"use strict";
const
  Boom = require("boom"),
  mongoose = require("mongoose"),
  _ = require("underscore"),
  Service = require("./serviceModel");

require('mongoose-schema-jsonschema')(mongoose);

const
  Schema = mongoose.Schema;

const
  NOTFICATION_STATUSES = [
    'awaitingSending', //dados processados, aguardando ser enviada por e-mail
    'awaitingDataProcess', //dados não processados, aguardando processamento
    'sent' //enviada
  ],
  REQUEST_STATUSES = [
    'new', //requisição nova, status padrão
    'notificationsScheduled', //todas notificações enviadas para o agendador
    'notificationsSent', //todas notificações enviadas
    //'caInfoReceived' //informações do CA recebidas
  ],
  NOTIFICATION_TYPES = ['email'];


/**
 * @desc O Schema para o modelo Requisição
 * @todo Apesar de ter um id internamente, criar um campo 'rid', número inteiro,
 *       mais amigável para o usuário final. Esse número pode ser criado depois que a
 *       requisição for salva (hook save)
 */
const requestSchema = new Schema({  
  serviceId: {
    type: Schema.ObjectId, //o serviço que esta requisição solicita
    required: true,
  },
  data: { //os dados da requisição no formato do formulário do serviço
    type: Object,
    required: true,
  }, 
  notifications: [ //as notificações programadas/feitas, com dados formatados ou aguardando formatação
    {
      notificationType: { //o tipo da notificação
        type: String,
        enum: NOTIFICATION_TYPES,
        required: true,
      },
      formatedData: { //os dados da notificação formatados, prontos para serem enviados
        type: Object,
        required: true,
      },
      priority: { //a prioridade no envio dessa notificação
        type: Number,
        max: 9,
        default: 5,
        required: true,
      },
      status: { //o status dessa notificação quando esse status mudou
        status: {
          type: String,
          enum: NOTFICATION_STATUSES,
          required: true,
        },        
        changed: [ //um histórico de status
          {
            statusName: {
              type: String,
              enum: NOTFICATION_STATUSES,
              required: true,
            },
            timestamp: {
              type: Date,
              required: true,
            }
          }
        ]
      }
    }
  ],
  status: {
    type: String,
    enum: REQUEST_STATUSES,
    default: 'new',
    required: true,
  },    
}, {
  timestamps: true
});

/**
 * @function info
 * @desc retorna a instância de Service pronta para ser exibida ao usuário
 * final, escondendo detalhes internos.
 * @todo otimizar
 */
requestSchema.methods.info = function () {
  const request = this.toJSON();
  return Service
    .findById(request.serviceId).exec()
    .then((service) => {
      let result = {}

      if (!service) {
        result.service = '<deleted>';
      } else {
        result.service = service.machine_name;
      }

      result = _.omit(request, ['__v', '_id']);

      return result;
    })
    .catch((err) => {
      throw new Boom.badImplementation(err.message);
    });
}

/**
 * @function getJSONSchema
 * @desc retorna o JSON Schema para o modelo Request, segundo o draft 4 da 
 * especificação (https://tools.ietf.org/html/draft-zyp-json-schema-04).
 */
requestSchema.statics.getJSONSchema = function () {
  let generatedSchema = requestSchema.jsonSchema();  
  generatedSchema.properties.data["$ref"] = '/ServiceFormSchema';
  return generatedSchema;
}

/**
 * @desc retorna o schema para determinado Serviço (serviceId),
 * que uma Requisição válida para aquele Serviço deve respeitar
 */
requestSchema.statics.getDataSchema =  function (serviceId) {   
  return Service
    .findById(serviceId).exec()
    .then((service)=>{
      let formSchema;
      try {
        formSchema = service.getDataSchema();
        formSchema.id = "/ServiceFormSchema";
      } catch(e) {
        throw new Boom.notFound();
      }
      return formSchema;
    });
}

/**
 * @function getUpdatableProperties
 * @desc retorna um array de propriedades que podem ser atualizadas neste modelo
 */
requestSchema.statics.getUpdatableProperties = () => {
  let jsonSchema = requestSchema.jsonSchema();
  return _.keys(_.pick(jsonSchema.properties, [
    'data',
    'notifications',
    'status',    
  ]));
}

/**
 * @function getRIDJsonSchema
 * @deprecated
 * @desc Retorna um JSON Schema parcial para Service, apenas exigindo o 
 * machine_name do serviço
 */
requestSchema.statics.getRIDJsonSchema = _.memoize(function () {
  let partialSchema = this.getJSONSchema();
  partialSchema.properties = _.pick(partialSchema.properties, 'rid');
  partialSchema.required = _.filter(partialSchema.required, (name) => {
    return name == 'rid' ? true : false;
  });
  return partialSchema;
});

module.exports = mongoose.model("Request", requestSchema);