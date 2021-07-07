import * as awsx from "@pulumi/awsx";
import { Config } from "@pulumi/pulumi";

const config = new Config();
const appName = config.require("app-name");
const maxImages = config.requireNumber("ecr-max-images");

const repository = new awsx.ecr.Repository(appName, {
  lifeCyclePolicyArgs: {
    rules: [
      {
        selection: "untagged",
        maximumNumberOfImages: maxImages,
      },
    ],
  },
});

const image = repository.buildAndPushImage({
  dockerfile: "../docker/Dockerfile",
  context: "..",
});

export { repository, image };
