const Boom = require('boom');
const mongoose = require('mongoose');
const _ = require('lodash');
const Service = require('./serviceModel');

require('mongoose-schema-jsonschema')(mongoose);

const Schema = mongoose.Schema;

/**
 * CONSTANTES */
const REQUEST_STATUSES = [
  'new', // requisição nova, status inicial
  'sentToScheduler', // Requisição recebida e adicionada na fila do Agendador
  'notificationsTranslated', // dados das notificações traduzidos
  'notificationsSent', // todas notificações foram enviadas
  'caOpened', // A SA foi aberta no CA (recebida a notificação de abertura)
  'caPaused', // A SA foi pausada no CA (recebida a notificação de pendência do cliente)
  'caClosed', // A SA foi fechada no CA (recebida a notificação de fechamento)
];
const NOTIFICATION_TYPES = ['email'];
const CA_SA_STATUSES = [
  'opened', // Aberta
  'scheduled', // Agendada
  'awaiting_child_incident', // Aguardando Inciidente Filho
  'awaiting_child_request', // Aguardandno Requisição Filha
  'client_canceled', // Cancelada pelo cliente
  'in_progress', // Em andamento
  'closed', // Fechada
  'client_info_needed', // Pendência do cliente
  'supplier_info_needed', // Pendência do fornecedor
];

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
    _id: false,
    type: { // o tipo da notificação
      type: String,
      enum: NOTIFICATION_TYPES,
      required: true,
    },
    data: { // os dados da notificação formatados, prontos para serem enviados
      type: Object,
      required: false,
    },
  },
  ],
  status: {
    type: String,
    enum: REQUEST_STATUSES,
    default: 'new',
    required: true,
  },
  ca_info: [{
    sa_status: {
      type: String,
      enum: CA_SA_STATUSES,
      required: true,
      default: 'unknown',
    },
    timestamp: {
      type: Date,
      required: true,
    },
  }],
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
  request.id = request._id;
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
  generatedSchema.id = '/ServiceSchema';
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
  delete partialSchema.properties._id;
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
