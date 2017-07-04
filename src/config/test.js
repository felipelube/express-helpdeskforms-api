const secrets = require('./secrets/');

module.exports = {
  db_uri: 'mongodb://localhost/helpdeskforms_test',
  log_level: 'error',
  port: 3000,
  secrets,
};
