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

serviceSchema.methods.info = function() {
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

module.exports = mongoose.model("Service", serviceSchema);