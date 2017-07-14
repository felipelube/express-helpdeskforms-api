const secrets = require('./secrets/');

module.exports = {
  db_uri: 'mongodb://localhost/helpdeskforms_test',
  log_level: 'error',
  port: 3000,
  HELPDESK_JOB_API_URL: 'http://localhost:3001/api/v1/jobs',
  secrets,
};
