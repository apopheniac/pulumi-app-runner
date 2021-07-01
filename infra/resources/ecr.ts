import * as aws from "@pulumi/aws";
import * as awsx from "@pulumi/awsx";

import { getStack } from "@pulumi/pulumi";
import { Config } from "@pulumi/pulumi";

const stackName = getStack();
const config = new Config();
const appName = config.require("app-name");

const repository = new awsx.ecr.Repository(appName);
const image = repository.buildAndPushImage({
  dockerfile: "../docker/Dockerfile",
  context: "..",
});

export { repository, image };
