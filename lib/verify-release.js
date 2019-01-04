const got = require('got')
const semver = require('semver')

const {getError, getPomInfo, printVersion} = require('./util')

/**
 * Get the last release of the maven repository
 */
module.exports = async function verifyRelease (pluginConfig, context) {
  const {logger, options} = context
  printVersion(logger)

  const pomXml = await getPomInfo(logger)
  const pomVersion = pomXml.project.version[0]
  const lastReleaseVersion = context.lastRelease.version

  // check integrity of pom version
  if (!semver.valid(pomVersion)) {
    logger.log(
      'WARNING: pom.xml version of %s is an invalid semver version',
      pomVersion
    )
  }

  // make sure the difference in versions doesn't differ too much
  // this is sort of a safegaurd against the pom.xml version straying from the
  // git version too much through manual edits to pom.xml
  if (semver.inc(lastReleaseVersion, 'patch') !== semver.inc(pomVersion, 'patch')) {
    // only throw an error if using the Conveyal workflow
    if (options.useConveyalWorkflow) {
      throw getError('ETOOLARGELASTRELEASEPOMDIFF', { lastReleaseVersion, pomVersion })
    } else {
      logger.log(
        `The pom.xml version of \`${pomVersion}\` differs too much from last git tag version of \`${lastReleaseVersion}\`.`
      )
    }
  }

  // if deploying to maven central, do some more checks of the version found in
  // the pom.xml versus what is on maven central
  // These checks only result in warnings as the git tags are the source of
  // truth for the last version number
  if (!options.skipMavenDeploy) {
    const mavenCentralVersion = await getLatestVersionFromMavenCentral(
      pomXml,
      logger
    )

    if (!semver.valid(mavenCentralVersion)) {
      logger.log(
        'WARNING: maven central version of %s is an invalid semver version',
        mavenCentralVersion
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
