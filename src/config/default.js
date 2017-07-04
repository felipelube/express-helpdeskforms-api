const secrets = require('./secrets/');

module.exports = {
  db_uri: 'mongodb://localhost/helpdeskforms',
  log_level: 'info',
  port: 8000,
  secrets,
};
