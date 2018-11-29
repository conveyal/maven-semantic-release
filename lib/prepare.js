const {saveChangesToPomXml} = require('./git')
const {updateVersionInPomXml} = require('./maven')

module.exports = async function publish (pluginConfig, context) {
  const {logger, nextRelease, options} = context

  // set and commit version number in pom.xml
  await updateVersionInPomXml(logger, nextRelease.version)

  // special logic to do some extra Conveyal-specific tasks
  if (options.useConveyalWorkflow) {
    // commit and push version that was just deployed
    saveChangesToPomXml(context, nextRelease.version)
  }
}
