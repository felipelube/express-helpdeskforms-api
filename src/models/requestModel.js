"use strict";
const
  Boom = require("boom"),
  mongoose = require("mongoose"),
  _ = require("underscore"),
  Service = require("./serviceModel"),
  Schema = mongoose.Schema;

const requestSchema = new Schema({
  rid: Number,
  serviceId: Schema.ObjectId,
  data: {},
  notifications: [],
  status: {
    type: String,
    enum: ['new', 'notificationsScheduled', 'notificationsSent',
      'caInfoReceived'
    ],
  },
  created: Date,
  notified: Date
});

/**
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

      return {
        rid: request.rid,
        service: result.service,
        data: request.data,
        notifications: request.notifications,
        status: request.status,
        created: request.created,
        notified: request.notified
      }
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
  return {
    "$schema": "http://json-schema.org/draft-04/schema#",
    "definitions": {},
    "id": "http://example.com/example.json",
    "properties": {
      "created": {
        "id": "/properties/created",
        "type": "string",
        "format": "date-time"
      },
      "data": {
        "id": "/properties/data",
        "type": "object"
      },
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
      "created",
      "serviceId",
      "rid",
      "data"
    ],
    "type": "object"
  }
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