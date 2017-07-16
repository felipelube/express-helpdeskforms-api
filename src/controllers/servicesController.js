const _ = require('lodash');
const Boom = require('boom');
const { validate } = require('express-jsonschema');

const Service = require('../models/serviceModel');

const serviceController = () => {
  /**
   * @async
   * @function listAll
   * @desc Lista todos os Serviços publicados
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
   * @desc Função middleware que valida apenas o parâmetro 'machine_name' na URL tal como ele foi
   * definido no JSON Schema de Serviços
   */
  const validateMachineName = (req, res, next) => validate({
    params: Service.getMachineNameJSONSchema(),
  })(req, res, next);

  /**
   * @function validateUpdate
   * @desc Filtra as propriedades enviadas para atualização pelo cliente para deixar apenas as
   * permitidas para atualização e retorna uma função middleware que valida essas propriedades
   * contra uma versão reduzida a estas propriedades do JSON Schema geral para Serviços.
   * @todo refatorar p/ usar essa função recursivamente para atualizações complexas que envolvem
   * uma propriedade-objeto parcialmente atualizada
  *   @example ca_info, que contém sa_type e sa_category, onde só se quis atualizar sa_type
   */
  const validateUpdate = (req, res, next) => {
    try {
      const updatableProperties = Service.getUpdatableProperties();
      const updateData = _.pick(req.body, updatableProperties);
      // verifica se o cliente passou apenas propriedades não atualizáveis
      if (_.size(updateData) === 0) {
        throw new Boom.badRequest('Dados para atualização inválidos.');
      }
      // filtra o JSON Schema geral apenas às propriedades que se quer atualizar
      const partialSchemaForUpdate = Service.getJSONSchema();
      partialSchemaForUpdate.required = _.keys(updateData);
      partialSchemaForUpdate.properties = _.pick(partialSchemaForUpdate.properties,
        _.keys(updateData));
      // verifica se o cliente passou apenas propriedades não atualizáveis
      if (_.size(partialSchemaForUpdate.properties) === 0) {
        throw new Boom.badRequest('Dados para atualização inválidos.');
      }
      // deixa disponível para outros middlewares as propriedades que podem ser atualizadas
      res.locals.service.updateData = updateData;
      // Por fim, passa ao middleware de validação
      return validate({ body: partialSchemaForUpdate })(req, res, next);
    } catch (e) {
      return next(e);
    }
  };

  /**
   * @async
   * @function insert
   * @desc Simplesmente insere um novo Serviço e o retorna pronto para ser exibido para o usuário
   * final.
   * ATENÇÃO: Os dados do Serviço devem ser validados pelo middleware validateService antes.
   * @todo incluir os timestamps enviados pela requisição ou usar os gerados automaticamente
   * pelo Mongoose?
   */
  const insert = async (req, res, next) => {
    try {
      const newService = await new Service({
        machine_name: req.body.machine_name,
        name: req.body.name,
        description: req.body.description,
        form: req.body.form,
        category: req.body.category,
        ca_info: req.body.ca_info,
        published: req.body.published,
        notifications: req.body.notifications,
      }).save();

      res
        .status(201)
        .jsend
        .success(await newService.info());
    } catch (err) {
      if (err.code && err.code === 11000) { // já existe serviço com esse machine_name
        next(new Boom.conflict('Nome de máquina (machine_name) já está em uso.',
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
   * @async
   * @function getByMachineName
   * @desc Middleware que busca e, se achado, insere em req.locals o Serviço identificado pelo
   * parâmetro 'machine_name' na URL.
   * ATENÇÃO: o parâmetro 'machine_name' de ser validado pelo middleware validateMachineName antes.
   */
  const getByMachineName = async (req, res, next) => {
    try {
      const service = await Service.findOne({ machine_name: req.params.machine_name });
      if (!service) {
        throw new Boom.notFound('Serviço não encontrado.');
      }
      res.locals.service = service;
      next();
    } catch (e) {
      next(e);
    }
  };
  /**
   * @async
   * @function update
   * @desc Simplesmente atualiza um Serviço e o retorna pronto para ser exibido para o usuário
   * final.
   * ATENÇÃO: Os dados da atualização devem ser validados e inseridos pelo middleware validateUpdate
   * antes. O objeto do Serviço deve estar req.locals (trabalho do middleware getByMachineName).
   */
  const update = async (req, res, next) => {
    try {
      const service = await Service.findByIdAndUpdate(res.locals.service.id,
        res.locals.service.updateData,
        { new: true });
      if (!service) {
        throw new Boom.notFound('Falha na atualização: Serviço não encontrado.');
      }
      res.jsend.success(await service.info());
    } catch (e) {
      next(e);
    }
  };
  /**
   * @async
   * @function remove
   * @desc Simplesmente remove um Serviço.
   * ATENÇÃO: o objeto do serviço deve estar na requisição antes tal como feito pelo middleware
   * getByMachineName.
   */
  const remove = async (req, res, next) => {
    try {
      const service = await Service.findByIdAndRemove(res.locals.service.id);
      if (!service) {
        throw new Boom.notFound('Service not found');
      }
      res.jsend.success(`Service ${service.machine_name} removed.`);
    } catch (e) {
      next(e);
    }
  };
  /**
   * @async
   * @function view
   * @desc Simplesmente retorna o objeto Serviço pronto para ser exibido ao usuário final.
   */
  const view = async (req, res, next) => {
    try {
      res.jsend.success(await res.locals.service.info());
    } catch (e) {
      next(e);
    }
  };

  return {
    /* Métodos */
    listAll,
    view,
    update,
    remove,
    insert,
    /* Middlewares */
    getByMachineName,
    validate: validateService,
    validateMachineName,
    validateUpdate,
  };
};

module.exports = serviceController();
