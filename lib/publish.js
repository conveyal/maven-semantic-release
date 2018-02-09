const debug = require('debug')('maven-semantic-release:publish')
const execa = require('execa')
const fs = require('fs-extra')
const semanticGithub = require('@semantic-release/github')
const {gitHead: getGitHead} = require('semantic-release/lib/git')

module.exports = publish

/**
 * Publish repo to maven
 * 1. configure git by setting the remote if it hasn't been already
 * 2. Commit the new version number to pom.xml
 * 3. Perform the release using the mvn command
 * 4. Make another commit updating to the next snapshot version
 */
async function publish (pluginConfig, publishConfig) {
  const {options, nextRelease} = publishConfig

  // configure git to allow pushing
  await configureGit(options.repositoryUrl)

  // set and commit version number in pom.xml
  await commitVersionInPomXml(nextRelease.version)

  debug('Deploying version %s with maven', nextRelease.version)
  try {
    await exec('mvn', ['deploy', '--settings', 'maven-settings.xml'])
  } catch (e) {
    throw new Error('failed to deploy to maven')
  }

  // tag and create a release on github
  nextRelease.gitHead = await getGitHead()
  await semanticGithub.publish(pluginConfig, publishConfig)

  // update version to next snapshot version
  const nextSnapshotVersion = nextRelease.version.split('.').map(s => parseInt(s, 10))
  nextSnapshotVersion[2] += 1

  // make a commit bumping to snapshot version
  await commitVersionInPomXml(`${nextSnapshotVersion.join('.')}-SNAPSHOT`)
}

/**
 * Configure git settings.  Copied from this guide: https://gist.github.com/willprice/e07efd73fb7f13f917ea
 */
async function configureGit (repositoryUrl) {
  debug('configuring git')

  // run bash script to make sure we're on the master branch and not in detached head mode
  debug('resolving and checking out current branch')

  // verify integrity of build
  const headRef = await execa.stdout('git', ['rev-parse', 'HEAD'])
  const branchRef = await execa.stdout('git', ['rev-parse', process.env.TRAVIS_BRANCH])

  if (headRef !== branchRef) {
    throw new Error(`
      HEAD ref (${headRef}) does not match ${process.env.TRAVIS_BRANCH} ref (${branchRef}).
      Someone may have pushed new commits before this build cloned the repo.
    `)
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
async function commitVersionInPomXml (versionStr) {
  let pomLines
  try {
    pomLines = (await fs.readFile('./pom.xml', 'utf8')).split('\n')
  } catch (e) {
    debug(e)
    throw new Error('Error reading pom.xml')
  }

  // manually iterate through lines and make edits to
  // preserve formatting and comments of file
  for (let i = 0; i < pomLines.length; i++) {
    const line = pomLines[i]
    if (line.indexOf('<!-- semantic-release-version-line -->') > -1) {
      // edit version field
      pomLines[i] = line.replace(/<version>(.*)<\/version>/, `<version>${versionStr}</version>`)
      break
    }
  }

  await fs.writeFile('./pom.xml', pomLines.join('\n'))

  const commitMessage = versionStr.indexOf('SNAPSHOT') > -1
    ? `Prepare next development iteration ${versionStr} [ci skip]`
    : `${versionStr} [ci skip]`

  debug('adding pom.xml to a commmit')
  await exec('git', ['add', 'pom.xml'])

  debug('committing changes')
  await exec('git', ['commit', '-m', commitMessage])
  process.stdout.write('\n')

  debug('pushing changes')
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
