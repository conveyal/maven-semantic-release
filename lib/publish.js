const {configureGit, mergeMasterIntoDev, saveChangesToPomXml} = require('./git')
const {updateVersionInPomXml, deploy} = require('./maven')

/**
 * Publish repo to maven
 * 1. Perform the release using the mvn command
 * 2. Make another commit updating to the next snapshot version
 */
module.exports = async function publish (pluginConfig, context) {
  const {logger, nextRelease, options} = context

  await deploy(logger, nextRelease)

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
    saveChangesToPomXml(context, nextSnapshotVersionStr)

    if (options.devBranch) {
      // merge master into dev
      mergeMasterIntoDev(context)
    }
  }
}
