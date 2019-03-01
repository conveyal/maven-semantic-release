const {configureGit, mergeMasterIntoDev, saveChangesToPomXml} = require('./git')
const {deploy, mvnPackage, updateVersionInPomXml} = require('./maven')
const {printVersion} = require('./util')

/**
 * Publish repo to maven
 * 1. Perform the release using the mvn command
 * 2. Make another commit updating to the next snapshot version
 */
module.exports = async function publish (pluginConfig, context) {
  const {logger, nextRelease, options} = context
  printVersion(logger)

  if (!options.skipMavenDeploy) {
    // deploy the project to maven-central
    await deploy(logger, nextRelease)
  } else if (options.useConveyalWorkflow) {
    // Although this library is being ran with instructions to skip the
    // deployment to maven central, the package command is still needed in the
    // Conveyal workflow. This is because sometimes the jar that is generated
    // from the package command when the project is in the release state commit
    // is needed by other tasks in Travis.
    // See https://github.com/conveyal/datatools-server/issues/181
    await mvnPackage(logger)
  }

  // special logic to do some extra Conveyal-specific tasks
  if (options.useConveyalWorkflow) {
    // do some extra configuration to allow pushing more than 1 commit
    await configureGit(context)

    // bump to snapshot version
    const nextSnapshotVersion = nextRelease.version.split('.').map(s => parseInt(s, 10))
    nextSnapshotVersion[2] += 1
    const nextSnapshotVersionStr = `${nextSnapshotVersion.join('.')}-SNAPSHOT`

    await updateVersionInPomXml(
      logger,
      nextSnapshotVersionStr
    )

    // commit and push snapshot version
    await saveChangesToPomXml(context, nextSnapshotVersionStr)

    if (options.devBranch) {
      // merge master into dev
      await mergeMasterIntoDev(context)
    }
  }
}
