const mongoose = require('mongoose');
const _ = require('underscore');


require('mongoose-schema-jsonschema')(mongoose);

const Schema = mongoose.Schema;

/**
 * SCHEMA
 * @desc o schema para o modelo Serviço
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
  form: { // formulário com as descrições dos campos em JSON Schema
    type: Object,
    required: true,
  },
  category: { // categoria simpels para este serviço @todo evoluir
    type: String,
    required: true,
  },
  sa_category: { // categoria no CA Service Desk Manager
    type: String,
    required: true,
  },
  notifications: {
    type: Array,
    required: true,
  },
  published: { // publicado: se o serviço está disponível para ser requisitado ou não
    type: Boolean,
    required: true,
    default: false,
  },
}, {
  timestamps: true, // use timestamps gerados automaticamente
});

/**
 * MÉTODOS E FUNÇÕES */

/**
 * @function info
 * @desc filtra propriedades de uma instância de Serviço escondendo detalhes não necessários,
 * preparando assim para a exibição ao usuário final
 */
function info() {
  let service = this.toJSON();
  service = _.omit(service, ['__v', '_id']);
  return service;
}


/**
 * @function getJSONSchema
 * @desc retorna o JSON Schema para o modelo Service, segundo o draft 4 da
 * especificção, usa o pacote mongoose-schema-jsonschema
 */

function getJSONSchema() {
  const generatedSchema = serviceSchema.jsonSchema();

  /* validações não inferidas/incluidas do/no Schema mongoose, mas que devem estar no JSON Schema */
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
  const service = this;
  return service.form;
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
    'sa_category',
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
 * REGISTRO DE MÉTODOS NO SCHEMA */
serviceSchema.statics.getUpdatableProperties = getUpdatableProperties;
serviceSchema.statics.getMachineNameJSONSchema = getMachineNameJSONSchema;
serviceSchema.statics.getJSONSchema = getJSONSchema;
serviceSchema.methods.info = info;
serviceSchema.methods.getDataSchema = getDataSchema;

module.exports = mongoose.model('Service', serviceSchema);
