var serverless = require("serverless")
var exec = require('child_process').exec;
var path = require('path')
var NodeGit = require('nodegit')
const Promise = require('bluebird');
var log4j = require("./logger")
var logger = log4j.getLogger('console');
var logmailer = log4j.getLogger("mailer");

const folderPath = "tmp"

function getSNSMessageObject(msgString) {
  var x = msgString.replace(/\\/g, '');
  var y = x.substring(1, x.length - 1);
  var z = JSON.parse(y);
  return z;
}

var test = exports.handler = function(event, context) {

  //TODO
  let gitHubEventStr = event.Records[0].Sns.Message;
  let gitHubEvent = gitHubEventStr //getSNSMessageObject(gitHubEventStr);
  let appName = gitHubEvent.repository.name;
  let cloneURL = gitHubEvent.repository.clone_url;
  let branchName = gitHubEvent.repository.branch

  logger.info("EVENT_RECIEVED", gitHubEvent);

  //TODO
  if (branchName && gitHubEvent.repository.action == "merged") {

    let pathTofolder = path.resolve(__dirname, folderPath, appName)

    let openRepo = function() {
      return new Promise((resolve, reject) => {
        NodeGit.Repository.open(pathTofolder).then((repo) => {
          logger.info('OPEN_REPO', "SUCCESS", repo);
          resolve(repo);
          pullBranch()
        }).catch((errOpen) => {
          logger.error('OPEN_REPO', "FAILED", errOpen);
          //TODO
          let fetchOptions = {
            fetchOpts: {
              callbacks: {
                certificateCheck: function() {
                  return 1;
                }
              }
            }
          }

          NodeGit.Clone(cloneURL, pathTofolder, fetchOptions).then(function(repository) {
            logger.info('CLONE_REPO', "SUCCESS", repository);
            resolve(repository)
            pullBranch()
          }).catch((errClone) => {
            logger.info("CLONE_REPO", "FAILED", errClone)
            reject(errClone)
          });
        })
      })
    }

    let pullBranch = function() {
      return new Promise((resolve, reject) => {
        NodeGit.Repository.open(pathTofolder).catch((errResult) => {
          logger.error("PULL_BRANCH", "OPEN_FAILED", errResult)
          return
        }).then((repo) => {

          logger.info('PULL_BRANCH', "OPEN SUCCESS", repo);
          // TODO GIT CHECKOUT
          return repo.getBranch('origin/' + branchName).then(function(reference) {
            //checkout branch
            logger.info("PULL_BRANCH", "GET_BRANCH_SUCCESS", branchName, reference)
            return repo.checkoutRef(reference).then((checkoutRef) => {

              return repo.fetch("origin/" + branchName, {
                callbacks: {
                  certificateCheck: function() {
                    return 1;
                  }
                }
              }).catch((errFetch) => {}).then(function(fetches) {
                // Now that we're finished fetching, go ahead and merge
                //TODO
                // var signature = NodeGit.Signature.now("TableauDeploymentTool", "ab@c.de");
                return repository.mergeBranches(branchName, "origin/" + branchName, null, null, {
                  fileFavor: NodeGit.Merge.FILE_FAVOR.THEIRS
                });
              })
            })

          });

        })
      })
    }

    //TODO
    let deployCode = function() {
      return new Promise((resolve, reject) => {
        let cmd = 'cd ' + folderPath + "/" + appName + ' && serverless deploy';
        exec(cmd, function(error, stdout, stderr) {
          // command output is in stdout
          if (!error) {
            // logmailer.info("DEPLOYED", "SUCCESS", {
            //   appName: appName,
            //   branchName: branchName
            // })
            resolve("successfully deplyed", stdout)
          } else {
            // logmailer.info("DEPLOYED", "FAILED", {
            //   appName: appName,
            //   branchName: branchName
            // })
            reject("Error occered", error, stderr)
          }
        })
      })
    }

    openRepo()

  }
}

var dummyEvent = {
  Records: [{
    Sns: {
      Message: {
        repository: {
          name: 'less-practice',
          branch: "master",
          action: "merged",
          clone_url: "https://github.com/parthmehta/less-practice"
        }
      }
    }
  }]
}

test(dummyEvent, null)
