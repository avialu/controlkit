// Thin wrapper around morgan in case we want to swap loggers later.
const morgan = require('morgan');
module.exports = morgan('dev');
