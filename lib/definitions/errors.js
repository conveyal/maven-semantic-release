/* eslint-disable sort-keys */ // for better readability

module.exports = {
  EGITREFMISMATCH: ({ branchRef, headRef }) => ({
    message: 'Git ref mismatch',
    details: `HEAD ref (${headRef}) does not match ${process.env.TRAVIS_BRANCH} ref (${branchRef}).

Someone may have pushed new commits before this build cloned the repo.`
  }),
  EMAVENDEPLOY: () => ({
    message: 'Deployment to maven failed.',
    details: `The deployment to maven failed for an unknown reason.

Please check the logs on the CI server to see what happened.`
  }),
  ENOPOMPROJECT: () => ({
    message: 'Missing `project` entry in `pom.xml` file',
    details: `The \`project\` entry must be included in the \`pom.xml\` file.

Please create a \`pom.xml\` file according to [this guide](https://github.com/conveyal/maven-semantic-release#step-2--make-sure-your-pomxml-file-is-ready-to-be-released).`
  }),
  ENOPOMPROJECTARTIFACTID: () => ({
    message: 'Missing `artifactId` entry in `project` entry in `pom.xml` file',
    details: `The \`artifactId\` entry must be included in the \`project\` entry in the \`pom.xml\` file.

Please create a \`pom.xml\` file according to [this guide](https://github.com/conveyal/maven-semantic-release#step-2--make-sure-your-pomxml-file-is-ready-to-be-released).`
  }),
  ENOPOMPROJECTGROUPID: () => ({
    message: 'Missing `groupId` entry in `project` entry in `pom.xml` file',
    details: `The \`groupId\` entry must be included in the \`project\` entry in the \`pom.xml\` file.

Please create a \`pom.xml\` file according to [this guide](https://github.com/conveyal/maven-semantic-release#step-2--make-sure-your-pomxml-file-is-ready-to-be-released).`
  }),
  ENOPOMPROJECTVERSION: () => ({
    message: 'Missing `version` entry in `project` entry in `pom.xml` file',
    details: `The \`version\` entry must be included in the \`project\` entry in the \`pom.xml\` file.

Please create a \`pom.xml\` file according to [this guide](https://github.com/conveyal/maven-semantic-release#step-2--make-sure-your-pomxml-file-is-ready-to-be-released).`
  }),
  ENOPOMXML: () => ({
    message: 'Missing `pom.xml` file.',
    details: `The \`pom.xml\` file could not be found in this repository.

This file is required to run and publish this java package.  Please create a \`pom.xml\` file according to [this guide](https://github.com/conveyal/maven-semantic-release#step-2--make-sure-your-pomxml-file-is-ready-to-be-released).`
  }),
  EREADPOMXML: () => ({
    message: 'Error parsing `pom.xml` file.',
    details: 'An error was encountered while reading the `pom.xml` file.  Please make sure the file contains valid xml.'
  }),
  ES3DEPLOY: () => ({
    message: 'Error copying to s3.',
    details: `An error occurred while deploying the built jar file for an unknown reason.

Please check the logs on the CI server to see what happened.`
  }),
  ETOOLARGELASTRELEASEPOMDIFF: ({pomVersion, lastReleaseVersion}) => ({
    message: 'Version mismatch',
    details: `The pom.xml version of \`${pomVersion}\` differs too much from last git tag version of \`${lastReleaseVersion}\`.

Please edit the \`project\` entry in the \`pom.xml\` file to have a version number of no more than 1 patch version ahead of the git tag version of \`${lastReleaseVersion}\`.`
  })
}
