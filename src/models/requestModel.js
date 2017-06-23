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
  NOTFICATION_STATUSES = ['awaitingSending', 'awaitingDataProcess', 'sent'],
  NOTIFICATION_TYPES = ['email'];

/**
 * O Schema para este modelo para Requisições
 * @todo //Apesar de ter um id internamente, criar um campo 'rid', número inteiro,
 *        mais amigável para o usuário final. Esse número pode ser criado depois que a
 *        requisição for salva (hook save)
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
    enum: ['new', 'notificationsScheduled', 'notificationsSent',
      'caInfoReceived'
    ],
    required: true,
  },    
}, {
  timestamps: true
});

/**
 * @todo otimizar
 * @function  info
 * @desc      retorna a instância de Service pronta para ser exibida ao usuário
 *            final, escondendo detalhes não necessários.
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

      request = _.omit(request, ['__v', '_id']);

      return request;
    })
    .catch((err) => {
      throw new Boom.badImplementation(err.message);
    });
}

/**
 * @function  getJSONSchema
 * @desc      retorna o JSON Schema para o modelo Request, segundo o draft 4 da 
 *            especificção 
 *            (https://tools.ietf.org/html/draft-zyp-json-schema-04)
 */
requestSchema.statics.getJSONSchema = function () {
  let generatedSchema = requestSchema.jsonSchema();
  return generatedSchema;
  /*

  return {
    "$schema": "http://json-schema.org/draft-04/schema#",
    "definitions": {},
    "id": "http://example.com/example.json",
    "properties": {
      "createdAt": {
        "id": "/properties/createdAt",
        "type": "string",
        "format": "date-time"
      },
      "updatedAt": {
        "id": "/properties/updatedAt",
        "type": "string",
        "format": "date-time"
      },
      "data": {"$ref": "/ServiceFormSchema"},
      "notifications": {
        "id": "/properties/notifications",
        "items": {
          "id": "/properties/notifications/items",
          "properties": {
            "data": {
              "id": "/properties/notifications/items/properties/data",
              "properties": {
                "body": {
                  "id": "/properties/notifications/items/properties/data/properties/body",
                  "type": "string"
                },
                "subject": {
                  "id": "/properties/notifications/items/properties/data/properties/subject",
                  "type": "string"
                }
              },
              "required": [
                "body",
                "subject"
              ],
              "type": "object"
            },
            "name": {
              "id": "/properties/notifications/items/properties/name",
              "type": "string"
            }
          },
          "required": [
            "data",
            "name"
          ],
          "type": "object"
        },
        "type": "array"
      },
      "notified": {
        "id": "/properties/notified",
        "type": "string",
        "format": "date-time"
      },
      "rid": {
        "id": "/properties/rid",
        "type": "integer"
      },
      "serviceId": {
        "id": "/properties/serviceId",
        "type": "string",
        "pattern": "^[0-9a-fA-F]{24}$"
      },
      "status": {
        "id": "/properties/status",
        "type": "string",
        "enum": ['new', 'notificationsScheduled', 'notificationsSent',
      'caInfoReceived'],
      }
    },
    "required": [
      "status",
      "createdAt",
      "serviceId",
      "rid",
      "data"
    ],
    "type": "object"
  }*/
}

requestSchema.statics.getServiceFormJSONSchema = function () { 
  const request = this.toJSON();
  return Service
    .findById(request.serviceId).exec()
    .then((service)=>{
      let formSchema;
      try {
        formSchema = service.getJSONSchema().form;
        formSchema.id = "/ServiceFormSchema";
      } catch(e) {
        throw new Boom.notFound();
      }
      return formSchema;
    });
}

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