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

/**
 * Merges the master branch into the dev branch.  The devBranch must be specified
 * in the options for this to work.
 */
async function mergeMasterIntoDev (context) {
  const {env, cwd, logger, options} = context
  const execaOpts = {env, cwd}
  const {branch, devBranch, repositoryUrl} = options

  logger.log('Merging master branch into dev branch')

  // fetch all branches because Travis doesn't do it for us
  // code copied from https://stackoverflow.com/a/44036486/269834
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
  await execa('git', ['fetch'], execaOpts)

  // checkout dev branch
  await execa('git', ['checkout', devBranch], execaOpts)

  // merge
  await execa('git', ['merge', branch], execaOpts)

  // push
  await push(repositoryUrl, devBranch, execaOpts)
}

/**
 * Commit, add and push changes to the pom.xml file(s)
 */
async function saveChangesToPomXml (context, versionStr) {
  const {env, cwd, logger, options} = context
  const {branch, repositoryUrl} = options
  const execaOpts = {env, cwd}

  const commitMessage = versionStr.indexOf('SNAPSHOT') > -1
    ? `Prepare next development iteration ${versionStr} [ci skip]`
    : `${versionStr} [ci skip]`

  logger.log('adding pom.xml files to a commmit')
  await add(['pom.xml'], execaOpts)
  try {
    await add(['*/pom.xml'], execaOpts)
  } catch (e) {
    // this will error out on non-multi-project projects
    logger.log('INFO: no multi-project pom.xml files found to add to commit')
  }

  logger.log('committing changes')
  await commit(commitMessage, execaOpts)
  process.stdout.write('\n')

  logger.log('pushing changes')
  await push(repositoryUrl, branch, execaOpts)
}

module.exports = {
  mergeMasterIntoDev,
  saveChangesToPomXml
}
