import * as aws from "@pulumi/aws";
import * as pulumi from "@pulumi/pulumi";
import { repository } from "./ecr";

const config = new pulumi.Config();
const appName = config.require("app-name");

const pullImagePolicy = new aws.iam.Policy("AmazonEC2ContainerRegistryPull", {
  description: "Grants permission to pull images from Amazon ECR",
  policy: {
    Version: "2012-10-17",
    Statement: [
      {
        Effect: "Allow",
        Action: [
          "ecr:GetDownloadUrlForLayer",
          "ecr:BatchGetImage",
          "ecr:DescribeImages",
          "ecr:GetAuthorizationToken",
          "ecr:BatchCheckLayerAvailability",
        ],
        Resource: "*",
      },
    ],
  },
});

const appRunnerECRAccessRole = new aws.iam.Role("AppRunnerECRAccessRole", {
  assumeRolePolicy: {
    Version: "2012-10-17",
    Statement: [
      {
        Effect: "Allow",
        Principal: { Service: "build.apprunner.amazonaws.com" },
        Action: "sts:AssumeRole",
      },
    ],
  },
  description: "This role gives App Runner permission to access ECR",
  forceDetachPolicies: false,
  maxSessionDuration: 3600,
  name: "AppRunnerECRAccessRole",
  path: "/service-role/",
});

export const service = new aws.apprunner.Service(appName, {
  serviceName: appName,
  sourceConfiguration: {
    authenticationConfiguration: {
      // TODO: Replace delay with test for ability to assume role
      // https://github.com/pulumi/pulumi-aws/issues/673#issuecomment-569944177†NEW
      accessRoleArn: appRunnerECRAccessRole.arn.apply(async (arn) => {
        if (!pulumi.runtime.isDryRun()) {
          await new Promise((resolve) => setTimeout(resolve, 30 * 1000));
        }
        return arn;
      }),
    },
    imageRepository: {
      imageIdentifier: pulumi.interpolate`${repository.repository.repositoryUrl}:latest`,
      imageRepositoryType: "ECR",
      imageConfiguration: {
        port: "8080",
      },
    },
  },
  healthCheckConfiguration: {
    protocol: "HTTP",
  },
});
