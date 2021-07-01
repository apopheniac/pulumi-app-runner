import * as aws from "@pulumi/aws";
import * as pulumi from "@pulumi/pulumi";
import { repository as repo } from "./ecr";

const stackName = pulumi.getStack();
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

const AppRunnerECRAccessRole = new aws.iam.Role(
  "AppRunnerECRAccessRole",
  {
    assumeRolePolicy:
      '{"Version":"2012-10-17","Statement":[{"Effect":"Allow","Principal":{"Service":"build.apprunner.amazonaws.com"},"Action":"sts:AssumeRole"}]}',
    description: "This role gives App Runner permission to access ECR",
    forceDetachPolicies: false,
    maxSessionDuration: 3600,
    name: "AppRunnerECRAccessRole",
    path: "/service-role/",
  },
  {
    protect: true,
  }
);

const serviceRole = new aws.iam.Role(`${appName}ECRAccessRole`, {
  path: "/service-role/",
  assumeRolePolicy: {
    Version: "2012-10-17",
    Statement: [
      {
        Effect: "Allow",
        Principal: {
          AWS: "tasks.apprunner.amazonaws.com",
        },
        Action: "sts:AssumeRole",
      },
    ],
  },
});

export const service = new aws.apprunner.Service(appName, {
  serviceName: appName,
  sourceConfiguration: {
    authenticationConfiguration: {
      accessRoleArn: AppRunnerECRAccessRole.arn,
      //  "arn:aws:iam::375001022156:role/service-role/AppRunnerECRAccessRole",
    },
    imageRepository: {
      imageIdentifier: pulumi.interpolate`${repo.repository.repositoryUrl}:latest`,
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
