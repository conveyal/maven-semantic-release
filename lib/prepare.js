const {configureGit} = require('./git')
const {commitVersionInPomXml} = require('./maven')

module.exports = async function publish (pluginConfig, context) {
  const {logger, nextRelease, options} = context

  // configure git to allow pushing
  await configureGit(options.repositoryUrl, logger)

  // set and commit version number in pom.xml
  await commitVersionInPomXml(nextRelease.version, logger)
}
