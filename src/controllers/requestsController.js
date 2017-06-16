const
  Boom = require("boom"),
  mongoose = require("mongoose"),
  _ = require("underscore"),
  Request = require("../models/requestModel"),
  Service = require("../models/serviceModel"),
  {validate} = require("express-jsonschema"),
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
        rawRequests.forEach((Request)=>{
          requests.push(Request.info());
        })
        res.jsend.success(requests);
      })
      .catch(next);
  }
  /**
   @function validateRequest 

   @desc Valida os dados de uma Requisição no corpo da requisição contra um JSON
         Schema. Internamente usa a função validate do pacote 
         express-jsonschema, que por sua vez retorna uma função middleware.
  */
  const validateRequest = (req, res, next) => {
    if(!req.body.serviceId || 
      !mongoose.Types.ObjectId.isValid(req.body.serviceId))
      {
        return next(new Boom.badRequest)
      }
    
    Service
      .findById(req.body.serviceId).exec()
        .then((service)=>{
          /** verifica se o serviço existe antes de validar os outros dados 
           * da Requisição
           **/
          if(!service) {
            throw new Boom.notFound("service for this request not found")
          }
          try{
            return validate({body: Request.getJSONSchema()})(req, res, next);
          }
          catch(e) {
            throw e;
          }
        })
        .catch(next);
  }

  /**
   @function validateRequestRID 

   @desc Valida a requisição com os dados para uma Requisição considerando 
         apenas a RID da Requisição.
  */
  const validateRequestRID = (req, res, next) => {
    return validate({params: Request.getRIDJsonSchema()})(req, res, next);
  }

  /**
   @function insert

   @desc Após a validação dos dados da Requisilção, recebe os mesmos na 
         requisição e insere uma nova Requisição no banco de dados. Retorna um 
         HTTP 201 e a Requisição criada.
  */
  const insert = (req, res, next) => {
    let newRequest = new Request({
      rid: req.body.rid,
      serviceId: req.body.serviceId,
      data: req.body.data,
      notifications: [],
      status: 'new',
      created: Date.now(),
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
      })
      .catch(next);
  }

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
      .findByIdAndUpdate(req.request.id, updateFields, {new:true}, (err, request)=>{
        if (err) {
          return next(new Boom.badRequest());
        }
        if (!request) {
          return next(new Boom.notFound());
        }
        res.jsend.success(request.info());
      });
  }

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