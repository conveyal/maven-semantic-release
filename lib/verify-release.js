const fs = require('fs-extra')
const got = require('got')
const semver = require('semver')
const xml2js = require('xml2js-es6-promise')

/**
 * Get the last release of the maven repository
 */
module.exports = async function verify (pluginConfig, context) {
  const {logger} = context
  logger.log('begin maven verify')

  let pomXml
  try {
    pomXml = await getPomInfo()
  } catch (e) {
    logger.error(e)
    throw e
  }

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
    throw new Error(
      `pom.xml version of ${pomVersion} differs too much from last git tag version of ${lastReleaseVersion}`
    )
  }
}

// get package info from pom.xml
async function getPomInfo () {
  const pomXmlFilePath = './pom.xml'
  const stats = await fs.stat('./pom.xml')

  if (!stats) {
    throw new Error('pom.xml file is missing!')
  }

  let pomXml
  try {
    const pomContents = await fs.readFile(pomXmlFilePath, 'utf8')
    pomXml = await xml2js(pomContents)
  } catch (e) {
    throw new Error('Error reading pom.xml')
  }

  if (
    !pomXml ||
    !pomXml.project ||
    !pomXml.project.groupId ||
    pomXml.project.groupId.length === 0 ||
    !pomXml.project.artifactId ||
    pomXml.project.artifactId.length === 0
  ) {
    throw new Error('pom.xml is missing groupId or artifactId')
  }

  if (!pomXml.project.version) {
    throw new Error('Version is missing from pom.xml')
  }

  return pomXml
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
