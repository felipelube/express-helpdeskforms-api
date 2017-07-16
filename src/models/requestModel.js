const boom = require('boom');
const mongoose = require('mongoose');
const _ = require('lodash');
const Service = require('./serviceModel');

require('mongoose-schema-jsonschema')(mongoose);

const Schema = mongoose.Schema;
/**
 * @desc status da Requisição suportados
 */
const REQUEST_STATUSES = [
  'new', // requisição nova, status inicial
  'sentToScheduler', // Requisição recebida e adicionada na fila do Agendador
  'notificationsTranslated', // dados das notificações traduzidos
  'notificationsSent', // todas notificações foram enviadas
  'caOpened', // A SA foi aberta no CA (recebida a notificação de abertura)
  'caPaused', // A SA foi pausada no CA (recebida a notificação de pendência do cliente)
  'caClosed', // A SA foi fechada no CA (recebida a notificação de fechamento)
];
/**
 * @desc Tipos de Notificação suportados
 */
const NOTIFICATION_TYPES = ['email'];
/**
 * @desc status da Solicitação no CA Service Desk Manager suportados
 */
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
 * Tipos de Solicitação no CA Service Desk Manager
 */
const CA_SA_TYPES = [
  'IN', // Incidente
  'CR', // Solicitação
];
/**
 * @desc o Schema para o modelo de Requisição
 * @todo Apesar de ter um id internamente, criar um campo 'rid', número inteiro, mais amigável
 * para o usuário final. Esse número pode ser criado depois que a requisição for salva (hook save)
 */
const requestSchema = new Schema({
  service_name: { // o nome de máquina do Serviço ao qual a Requisição está associada
    type: String,
    required: true,
  },
  data: { // os dados da Requisição no formato do formulário do Serviço
    type: Object,
    required: true,
  },
  notifications: [ // dados das notificações realizadas
    {
      _id: false,
      type: { // o tipo da notificação
        type: String,
        enum: NOTIFICATION_TYPES,
        required: true,
      },
      data: { // os dados da notificação já 'traduzidos'
        type: Object,
        required: false,
      },
    },
  ],
  status: { // o status da Requisição
    type: String,
    enum: REQUEST_STATUSES,
    default: 'new',
    required: true,
  },
  ca_info: {
    ca_type: {
      type: String,
      enum: CA_SA_TYPES,
      default: 'CR',
    },
    sa_status: { // o status da Solicitação/Incidente no CA Service Desk Manager
      type: String,
      enum: CA_SA_STATUSES,
      required: false,
    },
  },
}, {
  timestamps: true,
});
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
 * @desc retorna o JSON Schema para o modelo Request, segundo o draft 4 da especificção, usa o
 * pacote mongoose-schema-jsonschema
 */
function getJSONSchema() {
  const generatedSchema = requestSchema.jsonSchema();
  generatedSchema.id = '/ServiceSchema';
  generatedSchema.properties.data.$ref = '/ServiceFormSchema';
  return generatedSchema;
}
/**
 * @function getIdSchema
 * @desc Retorna um JSON Schema somente para a propriedade 'id' deste modelo
 */
function getIdSchema() {
  const partialSchema = this.getJSONSchema();
  partialSchema.properties = _.pick(partialSchema.properties, '_id');
  partialSchema.required = _.filter(partialSchema.required, name => name === '_id');
  partialSchema.properties.id = partialSchema.properties._id;
  delete partialSchema.properties._id; // delete a propriedade _id, que não é utilizada externamente
  return partialSchema;
}
/**
 * @async
 * @function getDataSchema
 * @desc retorna o schema para determinado Serviço (service_name), que uma Requisição válida para
 * aquele Serviço deve respeitar
 */
async function getDataSchema(serviceName) {
  try {
    if (!serviceName) {
      throw new boom.badRequest('é necessário indicar um nome de serviço');
    }
    const service = await Service.findOne({ machine_name: serviceName });
    if (!service) {
      throw new boom.notFound(`serviço ${serviceName} não encontrado`);
    }
    const formSchema = service.getDataSchema();
    formSchema.id = '/ServiceFormSchema';
    return formSchema;
  } catch (e) {
    throw e;
  }
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
 * Registre os métodos e funções acima no schema
 */
requestSchema.statics.getJSONSchema = getJSONSchema;
requestSchema.statics.getIdSchema = getIdSchema;
requestSchema.statics.getDataSchema = getDataSchema;
requestSchema.statics.getUpdatableProperties = getUpdatableProperties; /** @todo memoizar? */
requestSchema.methods.getInfo = getRequestInfo;

module.exports = mongoose.model('Request', requestSchema);
