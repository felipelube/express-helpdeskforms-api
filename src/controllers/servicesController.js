/** usar app.locals e req.locals */

const _ = require('lodash');
const Boom = require('boom');
const { validate } = require('express-jsonschema');

const Service = require('../models/serviceModel');

const serviceController = () => {
  /**
   * @function listAll
   * @desc lista todos os Serviços publicados
   * @todo implementar acls
   */
  const listAll = async (req, res, next) => {
    try {
      let services = await Service.find({ published: true });
      services = services.map(service => service.info());
      res.jsend.success(services);
    } catch (e) {
      next(e);
    }
  };
  /**
   * @function validateService
   * @desc Retorna uma função middleware que valida os dados de um Serviço no corpo da requisição
   * http contra o JSON Schema geral para Serviços. Internamente usa a função validate do pacote
   * express-jsonschema.
   */
  const validateService = (req, res, next) => validate({
    body: Service.getJSONSchema(),
  })(req, res, next);

  /**
   * @function validateMachineName
   * @desc Retorna uma função middleware que valida apenas o parâmetro 'machine_name' da URL usando
   * parcialmente este campo tal como definido no JSON Schema geral Serviços.
   */
  const validateMachineName = (req, res, next) => validate({
    params: Service.getMachineNameJSONSchema(),
  })(req, res, next);

  /**
   * @function validateUpdate
   * @desc Filtra as propriedades enviadas para atualização pelo cliente para deixar apenas as
   * permitidas para atualização e retorna uma função middleware que valida essas propriedades
   * contra uma versão reduzida a estas propriedades do JSON Schema geral para Serviços.
   */
  const validateUpdate = (req, res, next) => {
    try {
      const updatableProperties = Service.getUpdatableProperties();
      const updateData = _.pick(req.body, updatableProperties);

      if (_.size(updateData) === 0) { // cliente passou apenas propriedades não atualizáveis
        throw new Boom.badRequest('update data is not valid');
      }

      req.service.updateData = updateData;
      const partialSchemaForUpdate = Service.getJSONSchema();
      partialSchemaForUpdate.required = _.keys(updateData);
      partialSchemaForUpdate.properties = _.pick(partialSchemaForUpdate.properties,
        _.keys(updateData));

      if (_.size(partialSchemaForUpdate.properties) === 0) {
        throw new Boom.badRequest('update data is not valid');
      }
      return validate({ body: partialSchemaForUpdate })(req, res, next);
    } catch (e) {
      return next(e);
    }
  };

  /**
   * @function insert
   * @desc Simplesmente insere um novo Serviço. Os dados já foram validados pelo middleware
   * validateService acima. Retorna o Serviço pronto para ser exibido para o usuário final.
   */
  const insert = async (req, res, next) => {
    try {
      const newService = await new Service({
        machine_name: req.body.machine_name,
        name: req.body.name,
        description: req.body.description,
        form: req.body.form,
        category: req.body.category,
        sa_category: req.body.sa_category,
        published: req.body.published,
        notifications: req.body.notifications,
        /** @todo incluir os timestamps enviados pela requisição ou usar os gerados automaticamente
         * pelo MongoDB? */
      }).save();

      res
        .status(201)
        .jsend
        .success(await newService.info());
    } catch (err) {
      if (err.code && err.code === 11000) { // já existe serviço com esse machine_name
        next(new Boom.conflict('machine_name already used',
          {
            body: [{
              messages: ['already used'],
              property: 'request.body.machine_name',
            }],
          },
        ));
        return;
      }
      next(err);
    }
  };
  /**
   * @function getByMachineName
   * @desc Middleware que busca e, se achado, insere na requisição o objeto completo do Serviço
   * identificado pelo parâmetro 'machine_name' na URL.
   */
  const getByMachineName = async (req, res, next) => {
    try {
      const service = await Service.findOne({ machine_name: req.params.machine_name });
      if (!service) {
        throw new Boom.notFound('Service not found');
      }
      req.service = service;
      next();
    } catch (e) {
      next(e);
    }
  };
  /**
   * @function update
   * @desc Simplesmente atualiza um Serviço. Os dados a serem atualizados já foram validados e
   * inseridos na requisição pelo middleware validateUpdate acima. Retorna o Serviço atualizado e
   * pronto para ser exibido para o usuário final.
   */
  const update = async (req, res, next) => {
    try {
      const service = await Service.findByIdAndUpdate(req.service.id, req.service.updateData,
        { new: true });
      if (!service) {
        throw new Boom.notFound('service not found');
      }
      res.jsend.success(await service.info());
    } catch (e) {
      next(e);
    }
  };
  /**
   * @function remove
   * @desc Simplesmente remove um Serviço.
   */
  const remove = async (req, res, next) => {
    try {
      const service = await Service.findByIdAndRemove(req.service.id);
      if (!service) {
        throw new Boom.notFound('Service not found');
      }
      res.jsend.success(`Service ${service.machine_name} removed.`);
    } catch (e) {
      next(e);
    }
  };
  /**
   * @function view
   * @desc Simplesmente retorna o objeto Serviço pronto para ser exibido ao usuário final
   */
  const view = async (req, res, next) => {
    try {
      res.jsend.success(await req.service.info());
    } catch (e) {
      next(e);
    }
  };

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
  };
};

module.exports = serviceController();
