const secrets = require('./secrets/');

module.exports = {
  db_uri: 'mongodb://localhost/helpdeskforms_dev',
  log_level: 'debug',
  port: 5000,
  HELPDESK_JOB_API_URL: 'http://localhost:5001/api/job',
  secrets,
};
