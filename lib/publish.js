const {commitVersionInPomXml, deploy} = require('./maven')

/**
 * Publish repo to maven
 * 1. Perform the release using the mvn command
 * 2. Make another commit updating to the next snapshot version
 */
module.exports = async function publish (pluginConfig, context) {
  const {logger, nextRelease} = context

  await deploy(pluginConfig, context)

  // update version to next snapshot version
  const nextSnapshotVersion = nextRelease.version.split('.').map(s => parseInt(s, 10))
  nextSnapshotVersion[2] += 1

  // make a commit bumping to snapshot version
  await commitVersionInPomXml(`${nextSnapshotVersion.join('.')}-SNAPSHOT`, logger)
}
