const {exec, getError} = require('./util')

/**
 * Change the version number in the pom.xml file(s)
 */
async function updateVersionInPomXml (logger, versionStr) {
  logger.log(`Updating pom.xml to version ${versionStr}`)
  await exec(
    'mvn',
    ['versions:set', '-DgenerateBackupPoms=false', `-DnewVersion=${versionStr}`]
  )
}

/**
 * Run the maven command to deploy the project. The tests are skipped because it
 * is assumed that they have already successfully been ran in the script part of
 * the CI build.
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

/**
 * Run the maven command to package the project. `package` is a reserved word,
 * so that's why the function is named this way. The tests are skipped because
 * it is assumed that they have already successfully been ran in the script part
 * of the CI build.
 */
async function mvnPackage (logger) {
  logger.log('Packaging with maven')
  try {
    await exec(
      'mvn',
      ['package', '-DskipTests']
    )
  } catch (e) {
    logger.error('failed to package with maven')
    logger.error(e)
    throw getError('EMAVENPACKAGE')
  }
}

module.exports = {
  deploy,
  mvnPackage,
  updateVersionInPomXml
}
