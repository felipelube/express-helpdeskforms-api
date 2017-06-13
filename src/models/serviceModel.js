"use strict";
const
  mongoose = require("mongoose"),
  Schema = mongoose.Schema;

const serviceSchema = new Schema({
  machine_name: {
    type: String,
    unique: true
  },
  name: String,
  description: String,
  form: {},
  category: String,
  sa_category: String,
  created: Date,
  changed: {
    type: Date,
    default: Date.now
  },
  published: Boolean,
});

/**
 * @function  info
 * @desc      retorna a instância de Service pronta para ser exibida ao usuário
 *            final, escondendo detalhes não necessários.
 */
serviceSchema.methods.info = function () {
  let service = this.toJSON();
  return {
    machine_name: service.machine_name,
    name: service.name,
    description: service.description,
    form: service.form,
    sa_category: service.sa_category,
    category: service.category,
    created: service.created,
    changed: service.changed,
    published: service.published
  }
}

/**
 * @function  getJSONSchema
 * @desc      retorna o JSON Schema para o modelo Service, segundo o draft 4 da 
 *            especificção 
 *            (https://tools.ietf.org/html/draft-zyp-json-schema-04)
 */
serviceSchema.statics.getJSONSchema = function () {
  return {
    "$schema": "http://json-schema.org/draft-04/schema#",
    "definitions": {},
    "id": "ServiceSchema",
    "properties": {
      "machine_name": {
        "id": "/properties/machine_name",
        "maxLength": 30,
        "pattern": "[_a-zA-Z][_a-zA-Z0-9]{0,30}",
        "type": "string"
      },
      "name": {
        "id": "/properties/name",
        "type": "string"
      },
      "description": {
        "id": "/properties/description",
        "type": "string"
      },
      "form": {
        "id": "/properties/form",
        "type": "object"
      },
      "category": {
        "id": "/properties/category",
        "type": "string"
      },
      "sa_category": {
        "id": "/properties/sa_category",
        "type": "string"
      },
      "created": {
        "id": "/properties/created",
        "type": "string"
      },
      "changed": {
        "id": "/properties/changed",
        "type": "string"
      },
      "published": {
        "default": true,
        "id": "/properties/published",
        "type": "boolean"
      },
    },
    "required": [
      "category",
      "machine_name",
      "name",
      "form",
      "created",
      "changed",
      "sa_category",
      "published"
    ],
    "type": "object"
  }
}

module.exports = mongoose.model("Service", serviceSchema);