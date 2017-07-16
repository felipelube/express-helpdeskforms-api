const mongoose = require('mongoose');
const _ = require('lodash');


require('mongoose-schema-jsonschema')(mongoose);

const Schema = mongoose.Schema;

/**
 * @desc Tipos de Notificação suportados
 * @todo mesclar com essa constante no modelo de Requisições
 */
const NOTIFICATION_TYPES = ['email'];
/**
 * Tipos de Solicitação no CA Service Desk Manager
 */
const CA_SA_TYPES = [
  'IN', // Incidente
  'CR', // Solicitação
];
/**
 * @desc o Schema para o modelo de Serviço
 * @todo expandir a propriedade category com um ícone, descrição etc
 */
const serviceSchema = new Schema({
  machine_name: { // nome de máquina do Serviço, usado em urls
    type: String,
    unique: true,
    maxlength: 32,
    required: true,
  },
  name: { // nome 'humano', título do Serviço
    type: String,
    required: true,
  },
  description: String, // descrição para o serviço, pode ser um texto longo
  form: { // formulário em JSON Schema
    type: Object,
    required: true,
  },
  category: { // categoria simples para este serviço
    type: String,
    required: true,
  },
  ca_info: {
    sa_category: { // categoria no CA Service Desk Manager
      type: String,
      required: true,
    },
    sa_type: { // o tipo da Solicitação no CA Service Desk Manager
      type: String,
      enum: CA_SA_TYPES,
      required: true,
      default: 'CR',
    },
  },
  notifications: [ // notificações que devem ser enviadas toda vez que este serviço for requisitado
    {
      _id: false,
      type: {
        type: String,
        enum: NOTIFICATION_TYPES,
        required: true,
      },
      data_format: {},
    },
  ],
  published: { // publicado: se o serviço está disponível para ser requisitado ou não
    type: Boolean,
    required: true,
    default: false,
  },
}, {
  timestamps: true, // use timestamps gerados automaticamente
});

/**
 * @function info
 * @desc filtra propriedades de uma instância de Serviço escondendo detalhes internos, preparando
 * assim para a exibição ao usuário final
 */
function info() {
  let service = this.toJSON();
  service = _.omit(service, ['__v', '_id']);
  return service;
}
/**
 * @function getJSONSchema
 * @desc retorna o JSON Schema para o modelo Service, segundo o draft 4 da especificção, usa o
 * pacote mongoose-schema-jsonschema
 */
function getJSONSchema() {
  const generatedSchema = serviceSchema.jsonSchema();

  /** Insere algumas propriedades não inferias automaticamente a partir do Schema Mongoose */
  generatedSchema.properties.machine_name.maxLength = 32;
  generatedSchema.properties.machine_name.pattern = /[_a-z][_a-z0-9]{0,32}/;
  generatedSchema.properties.name.pattern = /(?=\s*\S).*/;

  return generatedSchema;
}

/**
 * @function getDataSchema
 * @desc retorna o JSON Schema do formulário para requisitar este serviço
 */
function getDataSchema() {
  return this.form;
}


/**
 * @function getUpdatableProperties
 * @desc retorna um array de propriedades que podem ser atualizadas neste modelo
 */
function getUpdatableProperties() {
  const jsonSchema = serviceSchema.jsonSchema();
  return _.keys(_.pick(jsonSchema.properties, [
    'name',
    'description',
    'form',
    'category',
    'ca_info',
    'published',
  ]));
}


/**
 * @function getMachineNameJSONSchema
 * @desc Retorna um JSON Schema somente para a propriedade 'machine_name' deste modelo
 */
function getMachineNameJSONSchema() {
  const partialSchema = serviceSchema.statics.getJSONSchema();
  partialSchema.properties = _.pick(partialSchema.properties, 'machine_name');
  partialSchema.required = _.filter(partialSchema.required, name => name === 'machine_name');
  return partialSchema;
}

/**
 * Registre os métodos e funções acima no schema
 */
serviceSchema.statics.getUpdatableProperties = getUpdatableProperties;
serviceSchema.statics.getMachineNameJSONSchema = getMachineNameJSONSchema;
serviceSchema.statics.getJSONSchema = getJSONSchema;
serviceSchema.methods.info = info;
serviceSchema.methods.getDataSchema = getDataSchema;

module.exports = mongoose.model('Service', serviceSchema);
