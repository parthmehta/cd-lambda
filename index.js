var serverless = require("serverless")
var exec = require('child_process').exec;
var path = require('path')
var NodeGit = require('nodegit')

//TODO
const folderPath = "./tmp"

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

  console.log("EVENT_RECIEVED", JSON.stringify(gitHubEvent));

  //TODO
  if (branchName && gitHubEvent.repository.action == "merged") {

    let pathTofolder = path.resolve(__dirname, folderPath + appName)



    let openRepo = new Promise((resolve, reject) => {
      NodeGit.Repository.open(pathTofolder).then((repo) => {
        console.info('openRepo successfully', repo);
        resolve(repo);
      }).catch((errOpen) => {
        console.error('Not a Git Repository', errResult);
        //TODO
        Git.Clone(gitHubEvent.cloneURl, pathTofolder).then(function(repository) {
          console.error('Clone successfully', repository);
          resolve(repository)
        }).catch((errClone) => {
          console.log("Error occured", errClone)
          reject(errClone)
        });
      })
    })



    let pullBranch = new Promise((resolve, reject) => {

      NodeGit.Repository.open(pathTofolder).catch((errResult) => {
        console.log("Fetch the code")
      }).then((repo) => {
        console.log('pullBranch Open successfully', repo);
        // TODO GIT CHECKOUT
        return repo.getBranch('refs/remotes/origin/' + branchName).then(function(reference) {
          //checkout branch
          return repo.checkoutRef(reference).then((checkoutRef) => {

            return repo.fetch("origin/" + branchName, {
              callbacks: {
                certificateCheck: function() {
                  return 1;
                }
              }
            }).catch((errFetch) => {})then(function(fetches) {
              // Now that we're finished fetching, go ahead and merge
              //TODO
              // var signature = NodeGit.Signature.now("TableauDeploymentTool", "ab@c.de");
              return repository.mergeBranches(branchName, "origin/" + branchName, null, null, {fileFavor: NodeGit.Merge.FILE_FAVOR.THEIRS});
            })
          })

        });

      })
    })



    //TODO
    let deployCode = new Promise((resolve, reject) => {
      let cmd = 'cd ' folderPath + "/" + appName + ' && serverless deploy';
      exec(cmd, function(error, stdout, stderr) {
        // command output is in stdout
        if (!error) {
          resolve("successfully deplyed", stdout)
        } else {
          reject("Error occered", error, stderr)
        }
      })
    })

    //TODO Notify Status
    Promise.all([openRepo, pullBranch, deployCode]).then((data) => console.log(data)).catch((err) => console.log(err))
  }
}

var dummyEvent = {
  Records: [
    {
      Sns: {
        Message: {
          repository: {
            name: 'admin',
            branch: "master",
            action: "merged",
            clone_url: ""
          }
        }
      }
    }
  ]
}

test(dummyEvent, null)
