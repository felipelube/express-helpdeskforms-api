const _ = require('lodash');
const Boom = require('boom');
const { validate } = require('express-jsonschema');

const Request = require('../models/requestModel');
const Service = require('../models/serviceModel');

const requestsController = () => {
  /**
   * @function listAll
   * @desc lista todas as Requisições
   * @todo listar apenas as Requisições do usuário
   * @todo para um usuário gestor, listar apenas as Requisições do órgão
   */
  const listAll = async (req, res, next) => {
    try {
      let requests = await Request.find();
      requests = requests.map(async request => request.getInfo());
      res.jsend.success(requests);
    } catch (e) {
      next(e);
    }
  };

  /**
   * @function validateRequest
   * @desc Verifica se o Serviço referenciado pela Requisição enviada existe e, se existe, retorna
   * uma função de validação que considera o JSON Schema geral para toda Requisição e o específico
   * para o Serviço dessa Requisição.
   */
  const validateRequest = async (req, res, next) => {
    try {
      if (!req.body.service_name) {
        throw new Boom.badRequest('Missing service_name');
      }
      const service = await Service.findOne({ machine_name: req.body.service_name });
      if (!service) {
        throw new Boom.notFound('Service for this Request does not exist');
      }
      const basicRequestInfoSchema = Request.getJSONSchema();
      const requestDataSchema = await Request.getDataSchema(service.machine_name);
      return validate({ body: basicRequestInfoSchema }, [requestDataSchema])(req, res, next);
    } catch (e) {
      return next(e);
    }
  };

  /**
   * @function insert
   * @desc Insere uma nova Requisição e envia ela para o agendador. Os dados já foram validados pelo
   * middleware validateRequest acima. Retorna a Requisição pronta para ser exibida para o usuário
   * final.
   */
  const insert = async (req, res, next) => {
    try {
      const newRequest = await new Request({
        service_name: req.body.service_name,
        data: req.body.data,
        notifications: req.body.notifications,
        status: 'new',
      }).save();

      res
        .status(201)
        .jsend
        .success(await newRequest.getInfo());
      /**
       * @todo tente enviar a Requisição para o Agendador...
       * use os padrões descritos em https://gist.github.com/briancavalier/842626 para tentar
       * enviar novamente em caso de falha.
       */
    } catch (e) {
      next(e);
    }
  };

  /**
   * @function validateUpdate
   * @desc Filtra as propriedades enviadas para atualização pelo cliente para deixar apenas as
   * permitidas e retorna uma função middleware que valida essas propriedades contra uma versão
   * reduzida a estas propriedades do JSON Schema geral para Requisições.
   * @todo refatorar
   */
  const validateUpdate = (req, res, next) => {
    try {
      const updatableProperties = Request.getUpdatableProperties();
      const updateData = _.pick(req.body, updatableProperties);

      if (_.size(updateData) === 0) { // cliente passou apenas propriedades não atualizáveis
        throw new Boom.badRequest('update data is not valid');
      }

      req.request.updateData = updateData;
      const partialSchemaForUpdate = Request.getJSONSchema();
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
   * @function validateRequestId
   * @desc Retorna uma função middleware que valida apenas o parâmetro 'id' da URL usando
   * parcialmente este  campo tal como definido no JSON Schema geral das Requisição.
   */
  const validateRequestId = (req, res, next) => validate({
    params: Request.getIdSchema(),
  })(req, res, next);

  /**
   * @function update
   * @desc Simplesmente atualiza uma Requisição. Os dados a serem atualizados já foram validados e
   * inseridos na requisição http pelo middleware validateUpdate acima. Retorna a Requisição
   * atualizada e pronta para ser exibido ao usuário final.
   */
  const update = async (req, res, next) => {
    try {
      const request = await Request.findByIdAndUpdate(req.request.id, req.request.updateData,
        { new: true });
      if (!request) {
        throw new Boom.notFound('Request not found');
      }
      res.jsend.success(await request.getInfo());
    } catch (e) {
      next(e);
    }
  };

  /**
   * @function view
   * @desc Simplesmente retorna o objeto Requisição pronto para ser exibido ao usuário final
   */
  const view = async (req, res, next) => {
    try {
      res.jsend.success(await req.request.getInfo());
    } catch (e) {
      next(e);
    }
  };

  /**
   * @function getById
   * @desc Middleware que busca e, se achado, insere na requisição o objeto completo da Requisição
   * identificada pelo parâmetro 'id' na URL.
   */
  const getById = async (req, res, next) => {
    try {
      const request = await Request.findById(req.params.id);
      if (!request) {
        throw new Boom.notFound('Request not found');
      }
      req.request = request;
      next();
    } catch (e) {
      next(e);
    }
  };

  return {
    listAll,
    validate: validateRequest,
    validateRequestId,
    getById,
    view,
    update,
    insert,
    validateUpdate,
  };
};

module.exports = requestsController();
