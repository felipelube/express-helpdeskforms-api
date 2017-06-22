const
  Boom = require("boom"),
  _ = require("underscore"),
  Service = require("../models/serviceModel"),
  {validate} = require("express-jsonschema"),
  slug = require('slug');

const serviceController = () => {
  const listAll = (req, res, next) => {
    Service
      .find({
        published: true
      })
      .then((rawServices) => {
        if (!rawServices || rawServices.length == 0) {
          return res.jsend.success([]);
        }
        let services = [];
        rawServices.forEach((service)=>{
          services.push(service.info());
        });
        res.jsend.success(services);
      })
      .catch(next);
  }
  /**
   @function validateService 

   @desc Valida os dados do serviço no corpo da requisição contra um JSON
         Schema. Internamente usa a função validate do pacote 
         express-jsonschema, que por sua vez retorna uma função middleware.
  */
  const validateService = (req, res, next) => {
    return validate({body: Service.getJSONSchema()})(req, res, next);
  }

  /**
   @function validateMachineName 

   @desc Valida a requisição com os dados para um serviço considerando apenas o
         machine_name do serviço.
  */
  const validateMachineName = (req, res, next) => {
    return validate({params: Service.getMachineNameJSONSchema()})(req, res, next);
  }
  

  /**
   * @function validateUpdate
   * @desc valida o corpo da requisição para verificar se as propriedades que o cliente
   * quer atualizar estão entre as permitidas e valida essas propriedades contra uma versão
   * reduzida (a estas propriedades) do JSON Schema do Serviço
   */
  const validateUpdate = (req, res, next) => {
    const updatableProperties = Service.getUpdatableProperties();
    let updateData = _.pick(req.body, updatableProperties);

    if (_.size(updateData) == 0) {
      return next(new Boom.badRequest());
    } else {
      req.service._updateData = updateData;
      let partialSchemaForUpdate = Service.getJSONSchema();
      partialSchemaForUpdate.required = _.keys(updateData); 
      partialSchemaForUpdate.properties = _.pick(partialSchemaForUpdate.properties, _.keys(updateData));

      if (_.size(partialSchemaForUpdate.properties) == 0) {
        return next(new Boom.badRequest()); 
      }

      return validate({body: partialSchemaForUpdate})(req, res, next);
    }
  }

  /**
   @function insert

   @desc Após a validação dos dados do serviço, recebe os mesmos na requisição e
         insere um novo serviço no banco de dados. Retorna um HTTP 201 e o 
         serviço criado.
  */
  const insert = (req, res, next) => {
    let newService = new Service({
      machine_name: req.body.machine_name,
      name: req.body.name,
      description: req.body.description,
      form: req.body.form,
      category: req.body.category,
      sa_category: req.body.sa_category,
      created: Date.now(),
      published: req.body.published
    });
    newService
      .save()
      .then((rawService) => {
        return rawService.info();
      })
      .then((service) => {
        res
          .status(201)
          .jsend
          .success(service);
      })
      .catch(next);
  }

  const getByMachineName = (req, res, next) => {
    Service
      .findOne({
        machine_name: req.params.machine_name
      })
      .then((service) => {
        if (!service) {
          throw new Boom.notFound();
        }
        req.service = service;
        next();
      })
      .catch(next);
  }

  const update = (req, res, next) => {
    Service
      .findByIdAndUpdate(req.service.id, req.service._updateData, {new:true}, (err, service)=>{
        if (err) {
          return next(new Boom.badRequest());
        }
        if (!service) {
          return next(new Boom.notFound());
        }
        res.jsend.success(service.info());
      });
  }

  const remove = (req, res, next) => {
    Service
      .findByIdAndRemove(req.service.id, (err, service)=>{
        if (err) {
          return next(new Boom.badRequest());
        }
        if (!service) {
          return next(new Boom.notFound());
        }
        res.jsend.success(`Service ${req.service.machine_name} removed.`);
      })
  }

  const view = (req, res, next) => {
    res.jsend.success(req.service.info());
  }

  return {
    /* Métodos */
    listAll,
    getByMachineName,
    view,
    update,
    remove,
    insert,
    /* Middlewares */
    validate: validateService,
    validateMachineName,
    validateUpdate,
  }
}

module.exports = serviceController();