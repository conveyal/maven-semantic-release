const DEBUG = require('debug')
const debug = DEBUG('maven-semantic-release:get-last-release')
const fs = require('fs-extra')
const got = require('got')
const getVersionHead = require('@semantic-release/npm/lib/get-version-head')
const xml2js = require('xml2js-es6-promise')

// we need to override the debugs that were enabled in semantic release
DEBUG.enable('semantic-release:*,maven-semantic-release:*')

/* eslint-disable complexity */
/**
 * Get the last release of the maven repository
 */
module.exports = async function getLastRelease (cfg) {
  // get package name from pom.xml
  const pomXmlFilePath = './pom.xml'
  const stats = await fs.stat('./pom.xml')

  if (!stats) {
    throw new Error('pom.xml file is missing!')
  }

  let pomXml
  try {
    const pomContents = await fs.readFile(pomXmlFilePath, 'utf8')
    pomXml = await xml2js(pomContents)
  } catch (e) {
    throw new Error('Error reading pom.xml')
  }

  if (
    !pomXml ||
    !pomXml.project ||
    !pomXml.project.groupId ||
    pomXml.project.groupId.length === 0 ||
    !pomXml.project.artifactId ||
    pomXml.project.artifactId.length === 0
  ) {
    throw new Error('pom.xml is missing groupId or artifactId')
  }

  const searchTerm = `${pomXml.project.groupId[0]}.${pomXml.project.artifactId[0]}`

  // get the last semver version from published repo
  debug('searching maven for term %s', searchTerm)
  const mavenJson = await got(
    `https://search.maven.org/solrsearch/select?q=${searchTerm}&rows=20&wt=json`,
    { json: true }
  )

  if (
    !mavenJson ||
    !mavenJson.body ||
    !mavenJson.body.response ||
    !mavenJson.body.response.docs ||
    mavenJson.body.response.docs.length === 0
  ) {
    debug('No version found of package %s found on %s', searchTerm, 'maven central')
    return
  }

  // (dangerously) assume first doc is the one we're looking for
  const version = mavenJson.body.response.docs[0].latestVersion

  // get the sha from the git release of said version
  const gitHead = await getVersionHead(version)
  return {gitHead, version}
}
