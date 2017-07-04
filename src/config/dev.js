const secrets = require('./secrets/');

module.exports = {
  db_uri: 'mongodb://localhost/helpdeskforms_dev',
  log_level: 'debug',
  port: 5000,
  secrets,
};
