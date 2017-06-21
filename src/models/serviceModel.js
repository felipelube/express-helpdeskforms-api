"use strict";
const
  mongoose = require("mongoose"),
  _ = require("underscore");


require('mongoose-schema-jsonschema')(mongoose);

const
  Schema = mongoose.Schema;

const serviceSchema = new Schema({
  machine_name: {
    type: String,
    unique: true,
    required: true,
  },
  name: {
    type: String,
    required: true,
  },
  description: String,
  form: {
    type: Object,
    required: true,
  },
  category: {
    type: String,
    required: true,
  },
  sa_category: {
    type: String,
    required: true,
  },
  published: {
    type: Boolean,
    required: true,
    default: false,
  },
}, {
  timestamps: true
});

/**
 * @function  info
 * @desc      retorna a instância de Service pronta para ser exibida ao usuário
 *            final, escondendo detalhes não necessários.
 */
serviceSchema.methods.info = function () {
  let service = this.toJSON();
  service = _.omit(service, ['__v', '_id']);
  return service;
}

/**
 * @function  getJSONSchema
 * @desc      retorna o JSON Schema para o modelo Service, segundo o draft 4 da 
 *            especificção, usa o pacote mongoose-schema-jsonschema 
 *            (https://tools.ietf.org/html/draft-zyp-json-schema-04)
 */
serviceSchema.statics.getJSONSchema = function () {
  let generatedSchema = serviceSchema.jsonSchema();
  
  /* validações não incluidas no model Schema, mas sim no JSON Schema */
  generatedSchema.properties.machine_name.maxLength = 32;
  generatedSchema.properties.machine_name.pattern = "[_a-z][_a-z0-9]{0,32}";
  generatedSchema.properties.name.pattern = ".*\\S.*";
  
  return generatedSchema;
}

serviceSchema.statics.getUpdatableProperties = () => {
  let jsonSchema = serviceSchema.jsonSchema();
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
 * @desc Retorna um JSON Schema parcial para Service, apenas exigindo o 
 * machine_name do serviço
 */
serviceSchema.statics.getMachineNameJSONSchema = _.memoize(function () {
  let partialSchema = this.getJSONSchema();
  partialSchema.properties = _.pick(partialSchema.properties, 'machine_name');
  partialSchema.required = _.filter(partialSchema.required, (name) => {
    return name == 'machine_name' ? true : false;
  });
  return partialSchema;
});

module.exports = mongoose.model("Service", serviceSchema);