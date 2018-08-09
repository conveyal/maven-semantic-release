const execa = require('execa')
const semanticGithub = require('@semantic-release/github')
const {gitHead: getGitHead} = require('semantic-release/lib/git')

const getError = require('./get-error')

module.exports = publish

/**
 * Publish repo to maven
 * 1. configure git by setting the remote if it hasn't been already
 * 2. Commit the new version number to pom.xml
 * 3. Perform the release using the mvn command
 * 4. Make another commit updating to the next snapshot version
 */
async function publish (pluginConfig, context) {
  const {logger, nextRelease, options} = context

  // configure git to allow pushing
  await configureGit(options.repositoryUrl, logger)

  // set and commit version number in pom.xml
  await commitVersionInPomXml(nextRelease.version, logger)

  logger.log('Deploying version %s with maven', nextRelease.version)
  try {
    await exec('mvn', ['deploy', '--settings', 'maven-settings.xml'])
  } catch (e) {
    logger.error('failed to deploy to maven')
    logger.error(e)
    throw getError('EMAVENDEPLOY')
  }

  // tag and create a release on github
  nextRelease.gitHead = await getGitHead()
  await semanticGithub.publish(pluginConfig, context)

  // deploy jar to s3 bucket if cli option is set
  const bucketFlagIdx = process.argv.indexOf('--deploy-to-s3-bucket')
  if (bucketFlagIdx > -1) {
    // assume that the bucket to deploy to is the next argument
    const bucket = process.argv[bucketFlagIdx + 1]

    // push to s3
    try {
      await exec(
        'aws',
        [
          's3',
          'cp',
          '--recursive',
          '--exclude',
          '"*"',
          '--include',
          '"v*.jar"',
          `/home/travis/build/${process.env.TRAVIS_REPO_SLUG}/target`,
          `s3://${bucket}`
        ]
      )
    } catch (e) {
      console.error('error pushing to s3')
      console.error(e)
    }
  }

  // update version to next snapshot version
  const nextSnapshotVersion = nextRelease.version.split('.').map(s => parseInt(s, 10))
  nextSnapshotVersion[2] += 1

  // make a commit bumping to snapshot version
  await commitVersionInPomXml(`${nextSnapshotVersion.join('.')}-SNAPSHOT`, logger)
}

/**
 * Configure git settings.  Copied from this guide: https://gist.github.com/willprice/e07efd73fb7f13f917ea
 */
async function configureGit (repositoryUrl, logger) {
  logger.log('configuring git')

  // run bash script to make sure we're on the master branch and not in detached head mode
  logger.log('resolving and checking out current branch')

  // verify integrity of build
  const headRef = await execa.stdout('git', ['rev-parse', 'HEAD'])
  const branchRef = await execa.stdout('git', ['rev-parse', process.env.TRAVIS_BRANCH])

  if (headRef !== branchRef) {
    throw getError('EGITREFMISMATCH', {branchRef, headRef})
  }

  // checkout branch so we can make commits and push
  await exec('git', ['checkout', process.env.TRAVIS_BRANCH])

  await exec(
    'git',
    ['config', '--global', 'user.email', '"travis@travis-ci.org"']
  )
  await exec(
    'git',
    ['config', '--global', 'user.name', '"Travis CI"']
  )

  // no need to add remote as it should already be set in travis
}

/**
 * Execute while streaming to stdout in realtime
 */
function exec () {
  const childProcess = execa(...arguments)
  childProcess.stdout.pipe(process.stdout)
  return childProcess
}

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
