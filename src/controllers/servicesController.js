const
  _ = require("underscore"),
  Boom = require("boom"),
  {validate} = require("express-jsonschema");
  
const
  Service = require("../models/serviceModel");  

const serviceController = () => {
  /**
   * @function listAll
   * @desc lista todos os serviços publicados
   */
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
   * @function validateService 
   * @desc Retorna uma função middleware que valida os dados de um Serviço no corpo da requisição http contra o JSON 
   * Schema geral para Serviços. Internamente usa a função validate do pacote express-jsonschema.
   */
  const validateService = (req, res, next) => {
    return validate({body: Service.getJSONSchema()})(req, res, next);
  }

  /**
   * @function validateMachineName 
   * @desc Retorna uma função middleware que valida apenas o parâmetro 'machine_name' da URL usando parcialmente este 
   * campo tal como definido no JSON Schema geral Serviços.
   */
  const validateMachineName = (req, res, next) => {    
    return validate({params: Service.getMachineNameJSONSchema()})(req, res, next);
  }
  

  /**
   * @function validateUpdate
   * @desc Filtra as propriedades enviadas para atualização pelo cliente para deixar apenas as permitidas para 
   * atualização e retorna uma função middleware que valida essas propriedades contra uma versão reduzida a 
   * estas propriedades do JSON Schema geral para Serviços.
   */
  const validateUpdate = (req, res, next) => {
    const updatableProperties = Service.getUpdatableProperties();
    let updateData = _.pick(req.body, updatableProperties);

    if (_.size(updateData) == 0) { //cliente passou apenas propriedades não atualizáveis
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
   * @function insert
   * @desc Simplesmente insere um novo Serviço. Os dados já foram validados pelo middleware validateService acima. 
   * Retorna o serviço pronto para ser exibido para o usuário final.
   */
  const insert = (req, res, next) => {
    let newService = new Service({
      machine_name: req.body.machine_name,
      name: req.body.name,
      description: req.body.description,
      form: req.body.form,
      category: req.body.category,
      sa_category: req.body.sa_category,      
      published: req.body.published
      /**@todo incluir os timestamps enviados pela requisição ou usar os gerados automaticamente pelo MongoDB? */
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
  /**
   * @function getByMachineName
   * @desc Middleware que busca e, se achado, insere na requisição o objeto completo do serviço identificado pelo 
   * parâmetro 'machine_name' na URL.
   */
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
  /**
   * @function update
   * @desc Simplesmente atualiza um serviço. Os dados a serem atualizados já foram validados e inseridos na requisição 
   * pelo middleware validateUpdate acima. Retorna o serviço atualizado pronto para ser exibido para o usuário final.
   */
  const update = (req, res, next) => {
    Service
      .findByIdAndUpdate(req.service.id, req.service._updateData, {new:true})
        .then((service)=>{
          if (!service) {
            throw new Boom.notFound();
          }
          return service.info();
        })
        .then((service)=>{
          res.jsend.success(service);
        })
        .catch(next);
  }
  /**
   * @function remove
   * @desc Simplesmente remove um serviço.
   */
  const remove = (req, res, next) => {
    Service
      .findByIdAndRemove(req.service.id)
        .then((service)=>{
          if (!service) {
            throw new Boom.notFound();
          }
          res.jsend.success(`Service ${service.machine_name} removed.`);
        })        
        .catch(next);
  }
  /**
   * @function view
   * @desc Simplesmente retorna o objeto serviço pronto para ser exibido ao usuário final
   */
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