"use strict"

var exec = require("child_process").exec
var path = require("path")
var NodeGit = require("nodegit")
var log4j = require("./logger")
var logger = log4j.getLogger("console")
var logmailer = log4j.getLogger("mailer")
var fs = require("fs")

let options = {
    folderPath: "tmp",
    sendMail: false
}

function getSNSMessageObject(msgString) {
    msgString = JSON.parse(msgString);
    return msgString
}

exports.handler = function (event, context) {


    let gitHubEventStr = event.Records[0].Sns.Message
    let gitHubEvent = getSNSMessageObject(gitHubEventStr)
    let appName = gitHubEvent.repository.name
    let cloneURL = gitHubEvent.repository.clone_url
    let branchName = gitHubEvent.ref.split("/")[2]
    let repository = null

    logger.info("EVENT_RECIEVED", gitHubEvent)
    logger.info(appName, cloneURL, branchName)

    let deployCondition = function () {
        return (branchName === "dev" || branchName === "stage" || branchName === "master") && gitHubEvent.commits.length > 0
    }


    if (deployCondition()) {

        if (!fs.existsSync(options.folderPath)) {
            fs.mkdirSync(options.folderPath)
        }

        let pathTofolder = path.resolve(__dirname, options.folderPath, appName)

        let openRepo = function () {

            return new Promise((resolve, reject) => {

                NodeGit.Repository.open(pathTofolder).then((repo) => {

                    logger.info("OPEN_REPO", "SUCCESS", repo)
                    resolve(repo)
                    pullBranch()

                }).catch((errOpen) => {

                    logger.error("OPEN_REPO", "FAILED", errOpen)

                    let fetchOptions = {
                        fetchOpts: {
                            callbacks: {
                                certificateCheck: function () {
                                    return 1
                                }
                            }
                        }
                    }

                    NodeGit.Clone(cloneURL, pathTofolder, fetchOptions).then(function (repository) {
                        logger.info("CLONE_REPO", "SUCCESS", repository)
                        resolve(repository)
                        pullBranch()
                    }).catch((errClone) => {
                        logger.info("CLONE_REPO", "FAILED", errClone)
                        reject(errClone)
                    })
                })
            })
        }

        let pullBranch = function () {

            return new Promise((resolve, reject) => {

                NodeGit.Repository.open(pathTofolder).catch((errResult) => {

                    logger.error("PULL_BRANCH", "OPEN_FAILED", errResult)
                    return

                }).then((repo) => {

                    logger.info("PULL_BRANCH", "OPEN SUCCESS", repo)
                    repository = repo
                    return repo.fetch("origin/" + branchName, {
                        callbacks: {
                            certificateCheck: function () {
                                return 1
                            }
                        }

                    }).catch((errFetch) => {
                        logger.error("PULL_BRANCH", "FETCH FAILED", errFetch)
                        reject(errFetch)
                    }).then(function (fetches) {

                        logger.info("PULL_BRANCH", "FETCH SUCCESS", fetches)
                        return repository.mergeBranches(branchName, "origin/" + branchName, null, null, {
                            fileFavor: NodeGit.Merge.FILE_FAVOR.THEIRS
                        }).then((mergeResult) => {

                            logger.info("PULL_BRANCH", "MERGE SUCCESS", mergeResult)
                            return repo.checkoutBranch(branchName)
                                .then(function () {
                                    logger.info("PULL_BRANCH", "CHECKOUT SUCCESS")
                                    deployCode()
                                })

                        })
                    })
                })
            })
        }


        let deployCode = function () {

            return new Promise((resolve, reject) => {

                let cmd = "cd " + options.folderPath + "/" + appName + " && node ../../node_modules/serverless/lib/Serverless.js deploy"

                exec(cmd, function (error, stdout, stderr) {
                    // command output is in stdout
                    if (!error) {
                        if (options.sendMail)
                            logmailer.info("DEPLOYED", "SUCCESS", {
                                appName: appName,
                                branchName: branchName
                            })
                        logger.info("DEPLOY", "SUCCESS")
                        resolve("successfully deployed", stdout)
                    } else {
                        if (options.sendMail)
                            logmailer.info("DEPLOYED", "FAILED", {
                                appName: appName,
                                branchName: branchName
                            })
                        logger.info("DEPLOY", "FAILED", error, stderr)
                        reject("Error occered", error, stderr)
                    }
                })
            })
        }

        openRepo()

    }
}
