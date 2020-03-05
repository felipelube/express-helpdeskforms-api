const _ = require('lodash');
const Boom = require('boom');
const { validate } = require('express-jsonschema');
const webRequest = require('requestretry');
const config = require('config');

const Request = require('../models/requestModel');
const Service = require('../models/serviceModel');

const requestsController = () => {
  /**
   * @async
   * @function listAll
   * @desc Lista todos as Requisições
   * @todo listar apenas as Requisições do usuário
   * @todo para um usuário gestor, listar apenas as Requisições do órgão
   */
  const listAll = async (req, res, next) => {
    try {
      const requests = await Request.find();
      let requestsForResult = [];
      _.forEach(requests, async (request) => {
        requestsForResult.push(request.getInfo());
      });
      requestsForResult = await Promise.all(requestsForResult);
      res.jsend.success(requestsForResult);
    } catch (e) {
      next(e);
    }
  };

  /**
   * @async
   * @function validateRequest
   * @desc Verifica se o Serviço referenciado pela Requisição enviada existe e, se existe, retorna
   * uma função de validação que considera o JSON Schema geral para toda Requisição e o específico
   * para o formulário do Serviço dessa Requisição.
   */
  const validateRequest = async (req, res, next) => {
    try {
      if (!req.body.service_name) {
        throw new Boom.badRequest('Nome de Serviço não especificado');
      }
      const service = await Service.findOne({ machine_name: req.body.service_name });
      if (!service) {
        throw new Boom.notFound('O Serviço para esta Requisição não existe');
      }
      const basicRequestInfoSchema = Request.getJSONSchema();
      const requestDataSchema = await Request.getDataSchema(service.machine_name);
      return validate({ body: basicRequestInfoSchema }, [requestDataSchema])(req, res, next);
    } catch (e) {
      return next(e);
    }
  };

  /**
   * @async
   * @function sendRequestToScheduler
   * @desc Envia uma Requisição para ser processada no Agendador
   * @param {any} request o objeto JSON da Requisição
   * @param {string} [jobType='translateNotificationsData'] o tipo do job
   */
  const sendRequestToScheduler = async (request, jobType = 'translateNotificationsData') => {
    try {
      if (!jobType) {
        throw new Error(`O tipo do job é necessário para enviar uma Requisição ao
        Agendador`);
      }
      const job = {
        type: jobType,
        data: request,
      };

      /** Reduza o tempo e número de tentativas em ambiente de teste */
      const retryDelay = process.env.NODE_ENV === 'test' ? 1000 : 5000;
      const maxAttempts = process.env.NODE_ENV === 'test' ? 2 : 5;

      /** tente enviar a requisição para o agendador */
      await webRequest({
        url: config.HELPDESK_JOB_API_URL,
        json: job,
        method: 'POST',
        retryDelay,
        maxAttempts,
      });
    } catch (e) {
      throw e;
    }
  };

  /**
   * @async
   * @function insert
   * @desc Insere uma nova Requisição e envia ela para o Agendador. Retorna a Requisição pronta para
   * ser exibida para o usuário final.
   * ATENÇÃO: Os dados devem ser validados pelo middleware validateRequest.
   */
  const insert = async (req, res, next) => {
    try {
      const newRequest = await new Request({
        service_name: req.body.service_name,
        data: req.body.data,
        notifications: req.body.notifications,
        status: 'new',
        ca_info: req.body.ca_info,
      }).save();

      const jsonRequest = await newRequest.getInfo();

      await sendRequestToScheduler(jsonRequest);

      res
        .status(201)
        .jsend
        .success(jsonRequest);
    } catch (e) {
      // falhe a criação da requisição se o servidor de agendamento não responder
      if (webRequest.RetryStrategies.NetworkError(e)) {
        next(new Boom.serverUnavailable(`Não foi possível criar a Requisição, pois o
        Servidor de agendamento está indisponível. Tente mais tarde.`));
      } else {
        next(e);
      }
    }
  };

  /**
   * @async
   * @function validateUpdate
   * @desc Filtra as propriedades enviadas para atualização pelo cliente para deixar apenas as
   * permitidas e roda a validação em cima dessas propriedades considerando o JSON Schema geral para
   * Requisições e o JSON Schema específico para o formulário de Serviço relacionado à Requisição.
   * @todo refatorar para  não usar lodash
   */
  const validateUpdate = async (req, res, next) => {
    try {
      const updatableProperties = Request.getUpdatableProperties();
      const updateData = _.pick(req.body, updatableProperties);
      // verifica se o cliente passou apenas propriedades não atualizáveis
      if (_.size(updateData) === 0) {
        throw new Boom.badRequest('Dados para atualização inválidos.');
      }
      // filtra o JSON Schema geral apenas às propriedades que se quer atualizar
      const partialSchemaForUpdate = Request.getJSONSchema();
      partialSchemaForUpdate.required = _.keys(updateData);
      partialSchemaForUpdate.properties = _.pick(partialSchemaForUpdate.properties,
        _.keys(updateData));
      // verifica se o cliente passou apenas propriedades não atualizáveis
      if (_.size(partialSchemaForUpdate.properties) === 0) {
        throw new Boom.badRequest('Dados para atualização inválidos.');
      }
      // Pega o JSON Schema específico para o formulário de Serviço relacionado à Requisição
      const requestDataSchema = await Request.getDataSchema(res.locals.request.service_name);
      // deixa disponível para outros middlewares as propriedades que podem ser atualizadas
      res.locals.request.updateData = updateData;
      // Por fim, passa ao middleware de validação
      return validate({ body: partialSchemaForUpdate }, [requestDataSchema])(req, res, next);
    } catch (e) {
      return next(e);
    }
  };

  /**
   * @function validateRequestId
   * @desc Função middleware que valida apenas o parâmetro 'id' na URL tal como ele foi definido no
   * JSON Schema geral de Requisições
   */
  const validateRequestId = (req, res, next) => validate({
    params: Request.getIdSchema(),
  })(req, res, next);

  /**
   * @async
   * @function update
   * @desc Simplesmente atualiza uma Requisição e a retorna pronta para ser exibida para o usuário
   * final.
   * ATENÇÃO: Os dados da atualização devem ser validados e inseridos pelo middleware validateUpdate
   * antes. O objeto da Requisição deve estar req.locals (trabalho do middleware getById).
   */
  const update = async (req, res, next) => {
    try {
      const request = await Request.findByIdAndUpdate(res.locals.request.id,
        res.locals.request.updateData, { new: true });
      if (!request) {
        throw new Boom.notFound('Request not found');
      }
      res.jsend.success(await request.getInfo());
    } catch (e) {
      next(e);
    }
  };

  /**
   * @async
   * @function view
   * @desc Simplesmente retorna o objeto Requisição pronto para ser exibido ao usuário final.
   */
  const view = async (req, res, next) => {
    try {
      res.jsend.success(await res.locals.request.getInfo());
    } catch (e) {
      next(e);
    }
  };

  /**
   * @async
   * @function getById
   * @desc Middleware que busca e, se achado, insere em req.locals a Requisição identificada pelo
   * parâmetro 'id' na URL.
   * ATENÇÃO: o parâmetro 'id' de ser validado pelo middleware validateRequestId antes.
   */
  const getById = async (req, res, next) => {
    try {
      const request = await Request.findById(req.params.id);
      if (!request) {
        throw new Boom.notFound('Request not found');
      }
      res.locals.request = request;
      next();
    } catch (e) {
      next(e);
    }
  };

  return {
    /* Métodos */
    insert,
    view,
    listAll,
    update,
    /* Middlewares */
    getById,
    validate: validateRequest,
    validateRequestId,
    validateUpdate,
  };
};

module.exports = requestsController();
