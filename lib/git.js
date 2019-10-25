const execa = require('execa')

/**
 * Add a list of file to the Git index. `.gitignore` will be ignored.
 *
 * @param {Array<String>} files Array of files path to add to the index.
 * @param {Object} [execaOpts] Options to pass to `execa`.
 */
async function add (files, execaOpts) {
  await execa('git', ['add', '--force', '--ignore-errors', ...files], {...execaOpts, reject: false})
}

/**
 * Commit to the local repository.
 *
 * @param {String} message Commit message.
 * @param {Object} [execaOpts] Options to pass to `execa`.
 *
 * @throws {Error} if the commit failed.
 */
async function commit (message, execaOpts) {
  await execa('git', ['commit', '-m', message], execaOpts)
}

/**
 * Push to the remote repository.
 *
 * @param {String} origin The remote repository URL.
 * @param {String} branch The branch to push.
 * @param {Object} [execaOpts] Options to pass to `execa`.
 *
 * @throws {Error} if the push failed.
 */
async function push (origin, branch, execaOpts) {
  await execa('git', ['push', '--follow-tags', origin, `HEAD:${branch}`], execaOpts)
}

async function configureGit (context) {
  const {env, cwd, logger, options} = context
  const execaOpts = {env, cwd}

  // fetch all branches because Travis doesn't do it for us
  // code copied from https://stackoverflow.com/a/44036486/269834
  logger.log('configuring git')
  await execa(
    'git',
    [
      'config',
      '--replace-all',
      'remote.origin.fetch',
      '+refs/heads/*:refs/remotes/origin/*'
    ],
    execaOpts
  )

  // fetch everything
  logger.log('fetching branches')
  await execa('git', ['fetch'], execaOpts)

  // checkout master and pull latest
  logger.log('checking out release branch')
  await execa('git', ['checkout', options.branch], execaOpts)

  logger.log('pulling')
  await execa('git', ['pull'], execaOpts)
}

/**
 * Merges the master branch into the dev branch.  The devBranch must be specified
 * in the options for this to work.
 */
async function mergeMasterIntoDev (context) {
  const {env, cwd, logger, options} = context
  const execaOpts = {env, cwd}
  const {branch, devBranch, repositoryUrl} = options

  logger.log('Merging master branch into dev branch')

  // checkout dev branch
  logger.log('checking out dev branch')
  await execa('git', ['checkout', devBranch], execaOpts)

  // merge
  logger.log('merging release branch into dev branch')
  await execa('git', ['merge', branch], execaOpts)

  // push
  logger.log('pushing dev branch')
  await push(repositoryUrl, devBranch, execaOpts)

  logger.log('merge and push successful!')
}

/**
 * Commit, add and push changes to the pom.xml file(s)
 */
async function saveChangesToPomXml (context, versionStr) {
  const {env, cwd, logger, options} = context
  const {branch, repositoryUrl} = options
  const execaOpts = {env, cwd}

  const isSnapshotVersion = versionStr.indexOf('SNAPSHOT') > -1
  let commitMessage
  if (isSnapshotVersion) {
    commitMessage = `Prepare next development iteration ${versionStr}`
    if (options.disableSnapshotSkipCi == null || !options.disableSnapshotSkipCi) {
      commitMessage += ' [ci skip]'
    }
  } else {
    commitMessage = `${versionStr}`
    if (options.disableFinalSkipCi == null || !options.disableFinalSkipCi) {
      commitMessage += ' [ci skip]'
    }
  }

  logger.log('adding pom.xml files to a commmit')
  await add(['pom.xml'], execaOpts)
  try {
    await add(['*/pom.xml'], execaOpts)
  } catch (e) {
    // this will error out on non-multi-project projects
    logger.log('INFO: no multi-project pom.xml files found to add to commit')
  }
  
  if (options.additionalFilesToCommit !== undefined && options.additionalFilesToCommit.length > 0) {
    logger.log('adding additional files to commit: ' + options.additionalFilesToCommit)
    const additionalFiles = options.additionalFilesToCommit.split(',')
    await add(additionalFiles, execaOpts)
  }
  
  logger.log('committing changes')
  await commit(commitMessage, execaOpts)
  process.stdout.write('\n')

  logger.log('pushing changes')
  await push(repositoryUrl, branch, execaOpts)

  logger.log('changes pushed')
}

module.exports = {
  configureGit,
  mergeMasterIntoDev,
  saveChangesToPomXml
}
