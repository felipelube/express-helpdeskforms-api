const Boom = require('boom');
const mongoose = require('mongoose');
const _ = require('lodash');
const Service = require('./serviceModel');

require('mongoose-schema-jsonschema')(mongoose);

const Schema = mongoose.Schema;

/**
 * CONSTANTES */
const NOTFICATION_STATUSES = [
  'awaitingSending', // dados processados, aguardando ser enviada por e-mail
  'awaitingDataProcess', // dados não processados, aguardando processamento
  'sent', // enviada
];
const REQUEST_STATUSES = [
  'new', // requisição nova, status padrão
  'notificationsScheduled', // todas notificações enviadas para o agendador
  'notificationsSent', // todas notificações enviadas
  'caInfoReceived', // informações do CA recebidas
];
const NOTIFICATION_TYPES = ['email'];

/**
 * SCHEMA
 * @desc O Schema para o modelo Requisição
 * @todo Apesar de ter um id internamente, criar um campo 'rid', número inteiro,
 *       mais amigável para o usuário final. Esse número pode ser criado depois que a
 *       requisição for salva (hook save)
 */
const requestSchema = new Schema({
  service_name: {
    type: String,
    required: true,
  },
  data: { // os dados da requisição no formato do formulário do serviço
    type: Object,
    required: true,
  },
  /* as notificações programadas/feitas, com dados formatados ou aguardando formatação */
  notifications: [{
    type: { // o tipo da notificação
      type: String,
      enum: NOTIFICATION_TYPES,
      required: true,
    },
    data: { // os dados da notificação formatados, prontos para serem enviados
      type: Object,
      required: true,
    },
    priority: { // a prioridade no envio dessa notificação
      type: Number,
      max: 9,
      default: 5,
      required: true,
    },
    status: { // o status dessa notificação quando esse status mudou
      status: {
        type: String,
        enum: NOTFICATION_STATUSES,
        required: true,
      },
      changed: [ // um histórico de status
        {
          status_name: {
            type: String,
            enum: NOTFICATION_STATUSES,
            required: true,
          },
          timestamp: {
            type: Date,
            required: true,
          },
        },
      ],
    },
  },
  ],
  status: {
    type: String,
    enum: REQUEST_STATUSES,
    default: 'new',
    required: true,
  },
}, {
  timestamps: true,
});

/**
 * MÉTODOS E FUNÇÕES */

/**
 * @function getRequestInfo
 * @desc retorna a instância de Service pronta para ser exibida ao usuário
 * final, escondendo detalhes internos.
 * @todo otimizar
 */
function getRequestInfo() {
  let request = this.toJSON();
  request = _.omit(request, ['__v', '_id']);
  return Promise.resolve(request);
}

/**
 * @function getJSONSchema
 * @desc retorna o JSON Schema para o modelo Request, segundo o draft 4 da
 * especificação (https://tools.ietf.org/html/draft-zyp-json-schema-04).
 */
function getJSONSchema() {
  const generatedSchema = requestSchema.jsonSchema();
  generatedSchema.properties.data.$ref = '/ServiceFormSchema';
  return generatedSchema;
}


/**
 * @function getIdSchema
 * @desc retorna o JSON Schema para o modelo Request, segundo o draft 4 da
 * especificação (https://tools.ietf.org/html/draft-zyp-json-schema-04).
 */
function getIdSchema() {
  const partialSchema = this.getJSONSchema();
  partialSchema.properties = _.pick(partialSchema.properties, '_id');
  partialSchema.required = _.filter(partialSchema.required, name => name === '_id');
  partialSchema.properties.id = partialSchema.properties._id;
  delete partialSchema.properties_id;
  return partialSchema;
}

/**
 * @desc retorna o schema para determinado Serviço (service_name),
 * que uma Requisição válida para aquele Serviço deve respeitar
 */
function getDataSchema(serviceName) {
  return Service
    .findOne({ machine_name: serviceName })
    .then((service) => {
      let formSchema;
      try {
        formSchema = service.getDataSchema();
        formSchema.id = '/ServiceFormSchema';
      } catch (e) {
        throw new Boom.notFound();
      }
      return formSchema;
    });
}

/**
 * @function getUpdatableProperties
 * @desc retorna um array de propriedades que podem ser atualizadas neste modelo
 */
function getUpdatableProperties() {
  const jsonSchema = requestSchema.jsonSchema();
  return _.keys(_.pick(jsonSchema.properties, [
    'data',
    'notifications',
    'status',
  ]));
}

/**
 * REGISTRO DE MÉTODOS NO SCHEMA */
requestSchema.statics.getJSONSchema = getJSONSchema;
requestSchema.statics.getIdSchema = getIdSchema;
requestSchema.statics.getDataSchema = getDataSchema;
requestSchema.statics.getUpdatableProperties = getUpdatableProperties; /** @todo memoizar? */
requestSchema.methods.getInfo = getRequestInfo;

module.exports = mongoose.model('Request', requestSchema);
