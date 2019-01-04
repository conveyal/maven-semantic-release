const {exec, getError} = require('./util')

/**
 * Change the version number in the pom.xml file(s)
 */
async function updateVersionInPomXml (logger, versionStr) {
  logger.log(`Updating pom.xml to version ${versionStr}`)
  await exec(
    'mvn',
    ['versions:set', 'versions:commit', `-DnewVersion=${versionStr}`]
  )
}

/**
 * Run the maven command to deploy the project
 */
async function deploy (logger, nextRelease) {
  logger.log('Deploying version %s with maven', nextRelease.version)
  try {
    await exec(
      'mvn',
      ['deploy', '-DskipTests', '--settings', 'maven-settings.xml']
    )
  } catch (e) {
    logger.error('failed to deploy to maven')
    logger.error(e)
    throw getError('EMAVENDEPLOY')
  }
}

module.exports = {
  updateVersionInPomXml,
  deploy
}
