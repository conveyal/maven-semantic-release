const execa = require('execa')

const {exec, getError} = require('./util')

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

module.exports = {
  configureGit
}
