const secrets = require('./secrets/');

module.exports = {
  db_uri: 'mongodb://localhost/helpdeskforms',
  log_level: 'info',
  port: 8000,
  HELPDESK_JOB_API_URL: 'http://localhost:8001/api/job',
  secrets,
};
