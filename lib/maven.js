const execa = require('execa')

const {exec, getError} = require('./util')

/**
 * Change the pom.xml file, commit the change and then push it to the repo
 */
async function commitVersionInPomXml (versionStr, logger) {
  await exec(
    'mvn',
    ['versions:set', 'versions:commit', `-DnewVersion=${versionStr}`]
  )

  const commitMessage = versionStr.indexOf('SNAPSHOT') > -1
    ? `Prepare next development iteration ${versionStr} [ci skip]`
    : `${versionStr} [ci skip]`

  logger.log('adding pom.xml files to a commmit')
  await exec('git', ['add', 'pom.xml'])
  try {
    await exec('git', ['add', '*/pom.xml'])
  } catch (e) {
    // this will error out on non-multi-project projects
    logger.log('INFO: no multi-project pom.xml files found to add to commit')
  }

  logger.log('committing changes')
  await exec('git', ['commit', '-m', commitMessage])
  process.stdout.write('\n')

  logger.log('pushing changes')
  const token = process.env.GH_TOKEN || process.env.GITHUB_TOKEN
  // don't pipe to stdout in case token is shown
  await execa(
    'git',
    [
      'push',
      '--quiet',
      '--follow-tags',
      `https://${token}@github.com/${process.env.TRAVIS_REPO_SLUG}`,
      process.env.TRAVIS_BRANCH
    ]
  )
}

/**
 * Run the maven command to deploy the project
 */
async function deploy (pluginConfig, context) {
  const {logger, nextRelease} = context

  logger.log('Deploying version %s with maven', nextRelease.version)
  try {
    await exec('mvn', ['deploy', '--settings', 'maven-settings.xml'])
  } catch (e) {
    logger.error('failed to deploy to maven')
    logger.error(e)
    throw getError('EMAVENDEPLOY')
  }
}

module.exports = {
  commitVersionInPomXml,
  deploy
}
