const _ = require('underscore');
const Boom = require('boom');
const mongoose = require('mongoose');
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
  const listAll = (req, res, next) => {
    Request
      .find()
      .then((rawRequests) => {
        if (!rawRequests || rawRequests.length === 0) {
          throw new Boom.notFound();
        }
        const getRequestsInfo = [];
        rawRequests.forEach((request) => {
          getRequestsInfo.push(request.getInfo());
        });
        Promise
          .all(getRequestsInfo)
          .then(requestsInfo => res.jsend.success(requestsInfo));
      })
      .catch(next);
  };

  /**
   * @function validateRequest
   * @desc Verifica se o Serviço referenciado pela Requisição enviada existe e, se existe, retorna
   * uma função de validação que considera o JSON Schema geral para toda Requisição e o específico
   * para o Serviço dessa Requisição.
   */
  const validateRequest = (req, res, next) => {
    if (!req.body.serviceId ||
      !mongoose.Types.ObjectId.isValid(req.body.serviceId)) {
      throw new Boom.badRequest('Missing/invalid serviceId');
    }
    Service
      .findById(req.body.serviceId).exec()
      .then((service) => {
        if (!service) {
          throw new Boom.notFound('Service for this Request does not exist');
        }
        try {
          const basicRequestInfoSchema = Request.getJSONSchema();
          Request.getDataSchema(req.body.serviceId) /** @todo otimizar */
            .then(requestDataSchema => validate({ body: basicRequestInfoSchema },
              [requestDataSchema])(req, res, next))
            .catch(next);
        } catch (e) {
          throw e;
        }
      })
      .catch(next);
  };

  /**
   * @function insert
   * @desc Insere uma nova Requisição e envia ela para o agendador. Os dados já foram validados pelo
   * middleware validateRequest acima. Retorna a Requisição pronta para ser exibida para o usuário
   * final.
   */
  const insert = (req, res, next) => {
    const newRequest = new Request({
      serviceId: req.body.serviceId,
      data: req.body.data,
      notifications: req.body.notifications,
      status: 'new',
    });
    newRequest
      .save()
      .then(rawRequest => rawRequest.getInfo())
      .then((request) => {
        res
          .status(201)
          .jsend
          .success(request);
        return request;
      })
      /** @todo tente enviar a Requisição para o Agendador...
         * use os padrões descritos em https://gist.github.com/briancavalier/842626 para tentar
         * enviar novamente em caso de falha.
        */
      .catch(next);
  };

  /**
   * @function validateUpdate
   * @desc Filtra as propriedades enviadas para atualização pelo cliente para deixar apenas as
   * permitidas e retorna uma função middleware que valida essas propriedades contra uma versão
   * reduzida a estas propriedades do JSON Schema geral para Requisições.
   */
  const validateUpdate = (req, res, next) => {
    const updatableProperties = Request.getUpdatableProperties();
    const updateData = _.pick(req.body, updatableProperties);

    if (_.size(updateData) === 0) { // cliente passou apenas propriedades não atualizáveis
      return next(new Boom.badRequest());
    }

    req.request.udpateData = updateData;
    const partialSchemaForUpdate = Request.getJSONSchema();
    partialSchemaForUpdate.required = _.keys(updateData);
    partialSchemaForUpdate.properties = _.pick(partialSchemaForUpdate.properties,
      _.keys(updateData));

    if (_.size(partialSchemaForUpdate.properties) === 0) {
      return next(new Boom.badRequest());
    }

    return validate({ body: partialSchemaForUpdate })(req, res, next);
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
  const update = (req, res, next) => {
    Request
      .findByIdAndUpdate(req.request.id, req.request.udpateData)
      .then((request) => {
        if (!request) {
          throw new Boom.notFound();
        }
        return request
          .getInfo()
          .then(info => res.jsend.success(info));
      })
      .catch(next);
  };

  /**
   * @function view
   * @desc Simplesmente retorna o objeto Requisição pronto para ser exibido ao usuário final
   */
  const view = (req, res, next) => {
    req.request
      .getInfo()
      .then(info => res.jsend.success(info))
      .catch(next);
  };

  /**
   * @function getById
   * @desc Middleware que busca e, se achado, insere na requisição o objeto completo da Requisição
   * identificada pelo parâmetro 'id' na URL.
   */
  const getById = (req, res, next) => {
    Request
      .findById(req.params.id)
      .then((request) => {
        if (!request) {
          throw new Boom.notFound('Request not found');
        }
        req.request = request;
        next();
      })
      .catch(next);
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
