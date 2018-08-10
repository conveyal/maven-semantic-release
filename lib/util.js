const SemanticReleaseError = require('@semantic-release/error')
const execa = require('execa')

const ERROR_DEFINITIONS = require('./definitions/errors')

/**
 * Execute while streaming to stdout in realtime
 */
function exec () {
  const childProcess = execa(...arguments)
  childProcess.stdout.pipe(process.stdout)
  childProcess.stderr.pipe(process.stderr)
  return childProcess
}

/**
 * Helper function to create a new SemanticReleaseError
 */
function getError (code, ctx = {}) {
  const {message, details} = ERROR_DEFINITIONS[code](ctx)
  return new SemanticReleaseError(message, code, details)
}

module.exports = {
  exec,
  getError
}
