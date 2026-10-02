const { Joi, Segments } = require("celebrate");

const schemas = {
  recordUpload: {
    [Segments.BODY]: Joi.object({
      data: Joi.string().min(1).max(10_000).required(),
    }),
  },
  recordById: {
    [Segments.PARAMS]: Joi.object({
      id: Joi.number().integer().positive().required(),
    }),
  },
  statsQuery: {
    [Segments.QUERY]: Joi.object({
      range: Joi.string().valid("7d", "30d", "90d").default("7d"),
    }),
  },
};

module.exports = schemas;
