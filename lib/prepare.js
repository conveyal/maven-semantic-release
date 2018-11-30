const {saveChangesToPomXml} = require('./git')
const {updateVersionInPomXml} = require('./maven')
const {printVersion} = require('./util')

module.exports = async function publish (pluginConfig, context) {
  const {logger, nextRelease, options} = context
  printVersion(logger)

  // set and commit version number in pom.xml
  await updateVersionInPomXml(logger, nextRelease.version)

  // special logic to do some extra Conveyal-specific tasks
  if (options.useConveyalWorkflow) {
    // commit and push version that was just deployed
    await saveChangesToPomXml(context, nextRelease.version)
  }
}
