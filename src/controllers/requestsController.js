const
  Boom = require("boom"),
  mongoose = require("mongoose"),
  _ = require("underscore"),
  Request = require("../models/requestModel"),
  Service = require("../models/serviceModel"),
  {
    validate
  } = require("express-jsonschema"),
  slug = require('slug');

const requestsController = () => {
  const listAll = (req, res, next) => {
    Request
      .find()
      .then((rawRequests) => {
        if (!rawRequests || rawRequests.length == 0) {
          throw new Boom.notFound();
        }
        let requests = [];
        rawRequests.forEach((Request) => {
          requests.push(Request.info());
        })
        res.jsend.success(requests);
      })
      .catch(next);
  }
  /**
   * @function validateRequest 
   * @desc Verifica se o Serviço ao qual os dados Requisição enviada existe, e
   * se existe, retorna uma função de validação que considera o JSON Schema geral
   * para toda Requisição e o específico para o Serviço dessa requisição.
  */
  const validateRequest = (req, res, next) => {
    if (!req.body.serviceId ||
      !mongoose.Types.ObjectId.isValid(req.body.serviceId)) {
      return next(new Boom.badRequest('Missing/invalid serviceId'));
    }
    Service
      .findById(req.body.serviceId).exec()
      .then((service) => {        
        if (!service) {
          throw new Boom.notFound("Service for this Request does not exist")
        }
        try {
          let basicRequestInfoSchema = Request.getJSONSchema();
          Request.getDataSchema(req.body.serviceId)
            .then((requestDataSchema) => {
              return validate({body: basicRequestInfoSchema}, [requestDataSchema])(req, res, next);
            })
            .catch(next);
        } catch (e) {
          throw e;
        }
      })
      .catch(next);
  }

  /**
   * @function validateRequestRID    
   * @desc Valida a requisição com os dados para uma Requisição considerando 
   * apenas a RID da Requisição.
   * @deprecated
  */
  const validateRequestRID = (req, res, next) => {
    return validate({params: Request.getRIDJsonSchema()})(req, res, next);
  }

  /**
   * @function insert
   * @desc Após a validação dos dados, recebe os mesmos e insere uma nova 
   * Requisição no banco de dados. 
   * Se tudo estiver OK retorna um HTTP 201 e a Requisição criada e envia
   * a nova Requisição para o Agendador.
  */
  const insert = (req, res, next) => {
    let newRequest = new Request({
      serviceId: req.body.serviceId,
      data: req.body.data,
      notifications: req.body.notifications,
      status: 'new',
    });
    newRequest
      .save()
      .then((rawRequest) => {
        return rawRequest.info();
      })
      .then((request) => {
        res
          .status(201)
          .jsend
          .success(request);
        return request;
      })
      .then((request) => {
        /** @todo envia a requisição para o Agendador... */
      })
      .catch((err) => {
        return next(err);
      });
  }

/**
 * @deprecated
 */
  const getByRID = (req, res, next) => {
    Request
      .findOne({
        rid: req.params.rid
      })
      .then((request) => {
        if (!request) {
          throw new Boom.notFound();
        }
        req.request = request;
        next();
      })
      .catch(next);
  }
/**
 * @desc atualiza uma Requisição
 */
  const update = (req, res, next) => {
    const updatableProperties = [
      'notifications',
      'status',
    ];

    let updateFields = _.pick(req.body, updatableProperties);

    if (_.size(updateFields) == 0) {
      return next(new Boom.badRequest())
    }

    Request
      .findByIdAndUpdate(req.request.id, updateFields, {
        new: true
      }, (err, request) => {
        if (err) {
          return next(new Boom.badRequest());
        }
        if (!request) {
          return next(new Boom.notFound());
        }
        res.jsend.success(request.info());
      });
  }
/**
 * @desc visualiza uma Requisição
 */
  const view = (req, res, next) => {
    res.jsend.success(req.request.info());
  }

  return {
    listAll,
    validate: validateRequest,
    validateRequestRID,
    getByRID,
    view,
    update,
    insert
  }
}

module.exports = requestsController();