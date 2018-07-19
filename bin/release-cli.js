#!/usr/bin/env node

const semanticRelease = require('semantic-release/cli')

/**
 * Add necessary arguments to run semantic release for maven projects
 */
async function run () {
  process.argv.push(...[
    '--publish',
    '@conveyal/maven-semantic-release/lib/publish',
    '--verify-conditions',
    '@semantic-release/github',
    '--verify-release',
    '@conveyal/maven-semantic-release/lib/verify-release'
  ])

  await semanticRelease()
}

// allow invocation using node command
if (require.main === module) {
  run()
}

module.exports = run
