const SemanticReleaseError = require('@semantic-release/error')
const execa = require('execa')
const fs = require('fs-extra')
const xml2js = require('xml2js-es6-promise')

const pkg = require('../package.json')
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

/**
 * get package info from pom.xml
 */
async function getPomInfo (logger) {
  const pomXmlFilePath = './pom.xml'
  const stats = await fs.stat(pomXmlFilePath)

  if (!stats) {
    throw getError('ENOPOMXML')
  }

  let pomXml
  try {
    const pomContents = await fs.readFile(pomXmlFilePath, 'utf8')
    pomXml = await xml2js(pomContents)
  } catch (e) {
    logger.log(e)
    throw getError('EREADPOMXML')
  }

  return pomXml
}

function printVersion (logger) {
  logger.log(`Running ${pkg.name} version ${pkg.version}`)
}

module.exports = {
  exec,
  getError,
  getPomInfo,
  printVersion
}
