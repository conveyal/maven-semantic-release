const AggregateError = require('aggregate-error')
const fs = require('fs-extra')
const got = require('got')
const semver = require('semver')
const xml2js = require('xml2js-es6-promise')

const getError = require('./get-error')

/**
 * Get the last release of the maven repository
 */
module.exports = async function verify (pluginConfig, context) {
  const {logger} = context
  logger.log('begin maven verify')

  const pomXml = await getPomInfo(logger)
  const pomVersion = pomXml.project.version[0]
  const mavenCentralVersion = await getLatestVersionFromMavenCentral(
    pomXml,
    logger
  )
  const lastReleaseVersion = context.lastRelease.version

  if (!semver.valid(mavenCentralVersion)) {
    logger.log(
      'WARNING: maven central version of %s is an invalid semver version',
      mavenCentralVersion
    )
  }

  if (!semver.valid(pomVersion)) {
    logger.log(
      'WARNING: pom.xml version of %s is an invalid semver version',
      pomVersion
    )
  }

  if (
    semver.inc(mavenCentralVersion, 'patch') !==
    semver.inc(pomVersion, 'patch')
  ) {
    logger.log(
      'WARNING: maven central version of %s differs widely from pom version of %s',
      mavenCentralVersion,
      pomVersion
    )
  }

  if (lastReleaseVersion !== mavenCentralVersion) {
    logger.log(
      'WARNING: maven central version of %s differs from last version of %s found in git history',
      mavenCentralVersion,
      lastReleaseVersion
    )
  }

  if (semver.inc(lastReleaseVersion, 'patch') !== semver.inc(pomVersion, 'patch')) {
    throw getError('ETOOLARGELASTRELEASEPOMDIFF', { lastReleaseVersion, pomVersion })
  }
}

/**
 * get package info from pom.xml
 */
async function getPomInfo (logger) {
  const pomXmlFilePath = './pom.xml'
  const stats = await fs.stat('./pom.xml')

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

  validatePomXml(pomXml)

  return pomXml
}

/**
 * Validate that the contents of pom.xml appear to be setup properly
 */
function validatePomXml (pomXml) {
  if (!pomXml) {
    throw getError('EREADPOMXML')
  }

  const pomValidationErrors = []

  if (!pomXml.project) {
    pomValidationErrors.push(getError('ENOPOMPROJECT'))
  } else {
    if (!pomXml.project.groupId || pomXml.project.groupId.length === 0) {
      pomValidationErrors.push(getError('ENOPOMPROJECTGROUPID'))
    }
    if (!pomXml.project.artifactId || pomXml.project.artifactId.length === 0) {
      pomValidationErrors.push(getError('ENOPOMPROJECTARTIFACTID'))
    }
    if (!pomXml.project.version || !pomXml.project.version.length === 0) {
      pomValidationErrors.push(getError('ENOPOMPROJECTVERSION'))
    }
  }

  if (pomValidationErrors.length > 0) {
    throw new AggregateError(pomValidationErrors)
  }
}

/**
 * Search for the maven project on maven central and return the release number
 * of the latest version.  Return nothing if none found.
 */
async function getLatestVersionFromMavenCentral (pomXml, logger) {
  const searchTerm = `${pomXml.project.groupId[0]}.${pomXml.project.artifactId[0]}`

  // get the last semver version from published repo
  logger.log('searching maven for term %s', searchTerm)
  const mavenCentralJson = await got(
    `https://search.maven.org/solrsearch/select?q=${searchTerm}&rows=20&wt=json`,
    { json: true }
  )

  if (
    !mavenCentralJson ||
    !mavenCentralJson.body ||
    !mavenCentralJson.body.response ||
    !mavenCentralJson.body.response.docs ||
    mavenCentralJson.body.response.docs.length === 0
  ) {
    logger.log('No version found of package %s found on %s', searchTerm, 'maven central')
    return
  }

  // (dangerously) assume first doc is the one we're looking for
  return mavenCentralJson.body.response.docs[0].latestVersion
}
