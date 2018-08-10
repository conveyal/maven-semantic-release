# maven-semantic-release

Automated release management for maven projects

## About

maven-semantic-release is a plugin for [semantic-release](https://github.com/semantic-release/semantic-release) v15.  This project will deploy a maven project to maven central instead of deploying a node.js project to npm.  This tool is intended to be used on github projects that use a Travis-CI server.

The workflow this assumes is that your project will use [Angular-style commit messages](https://github.com/angular/angular/blob/master/CONTRIBUTING.md#type) (theoretically you could override this and use a different style) and only merge to master when you want to create a new release.  When a new release is generated, it will automatically be deployed to maven central and this tool will create and push 2 commits to your github repository.  The first commit will change your pom.xml file to the next version and the second one will update the pom.xml file again to the next snapshot.

## Setup

This tool is intended to automate the releases of maven projects to maven central.  However, a lot of manual steps unfortunately must be taken to get your maven project setup so it can work properly.  Big thanks to Nathan Fischer for detailing how to do a lot of these steps in a blog post [here](http://www.debonair.io/post/maven-cd/).

### Step 1: Setup an account with OSSRH

Follow [this guide](http://central.sonatype.org/pages/ossrh-guide.html#initial-setup).

### Step 2:  Make sure your pom.xml file is ready to be released

<span style="font-size:larger;">[See this example project for a sample pom.xml](https://github.com/evansiroky/maven-semantic-release-example/blob/master/pom.xml).</span>

Your maven project needs to have at least the following items in your pom.xml:

- `name` - the name of the project
- `description` - a short description
- `url` - location where users can go to get more information about the library
- `licences` - self explanatory
- `scm` - source control information
- `developers` - who worked on the project
- `distributionManagement` - the places where you want to distribute your project to

#### Plugins

Your pom.xml file needs to have the following maven plugins included:

- `maven-gpg-plugin`
- `maven-javadoc-plugin`
- `maven-source-plugin`

Your pom.xml file also needs the following sonatype plugin to automatically close and release your project from nexus.

- `nexus-staging-maven-plugin`

<span style="font-size:larger;">[See this example project for a sample pom.xml](https://github.com/evansiroky/maven-semantic-release-example/blob/master/pom.xml).</span>

### Step 3: Create a maven-settings.xml file

You can copy paste [this file](https://github.com/evansiroky/maven-semantic-release-example/blob/master/maven-settings.xml) into your repository.  The file must be called `maven-settings.xml` and must exist in the root directory of your project.

### Step 4: Create gpg keys to sign your artifact

Follow the all steps from `Create code signing cert` to `Encrypt cert and variables for travis` in [this guide](http://www.debonair.io/post/maven-cd/#create-code-signing-cert:a547b4a31e9ae1ba41fe3873843c9208).  When adding keys to Travis you could also add them using the Travis-CI website in the settings of your repository instead of adding secure variables to your .travis.yml file.  

We wish you good luck as this step is really easy to mess up and get exactly right.  Adding your password to travis can be infuriating as you may need to escape parts of it if it has a space, @ symbol or something else.

### Step 5:  Create a .travis.yml file that'll run maven-semantic-release after success

See this [example file](https://github.com/evansiroky/maven-semantic-release-example/blob/master/.travis.yml).  In your `.travis.yml` file you'll want the following items:

#### after_success

After the success of your CI Run, you'll want to run semantic-release with the maven-semantic-release plugins.  Include the following in this exact order:

```
after_success:
  - yarn global add @conveyal/maven-semantic-release semantic-release && semantic-release --prepare @conveyal/maven-semantic-release --publish @semantic-release/github,@conveyal/maven-semantic-release --verify-conditions @semantic-release/github --verify-release @conveyal/maven-semantic-release
```

#### before_install

Be sure to include the import of your signing keys.  If you followed everything correctly in step 4 you should have something like the following added to your .travis.yml file:

```
before_install: |
  # only install signing keys under the same circumstances we do a mvn deploy later
  if [[ "$TRAVIS_PULL_REQUEST" = false ]] && [[ "$TRAVIS_BRANCH" = master ]]; then
    openssl aes-256-cbc -K $encrypted_### -iv $encrypted_### -in maven-artifact-signing-key.asc.enc -out maven-artifact-signing-key.asc -d
    gpg --import --batch maven-artifact-signing-key.asc
  fi
```

#### cache:

This should help speed up the installation of maven-semantic-release.  You'll want to include the m2 directory as well.

```
cache:
  directories:
    - $HOME/.m2/repository
    - $HOME/.yarn-cache
```

### Step 6:  Add a github token to Travis

Create a Github token that will be used to make commits and create releases.  Add the token to your travis environment variables as either `GH_TOKEN` or `GITHUB_TOKEN`.  Add the following permissions to your token:

<img src="https://raw.githubusercontent.com/conveyal/maven-semantic-release/master/github-token-example.png" />
