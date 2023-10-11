import { ECSClient, CreateServiceCommand, ListServicesCommand, RegisterTaskDefinitionCommand, UpdateServiceCommand, CreateServiceCommand, TagResourceCommand } from '@aws-sdk/client-ecs';
import core from '@actions/core';
import github from '@actions/github';
import path from 'path';
import fs from 'fs';

const client = new ECSClient();

const cluster = core.getInput('cluster_name');
const serviceName = core.getInput('service_name');
const taskDefinitionFile = core.getInput('task_definition');
const desiredCount = core.getInput('desired_count');
const enableExecuteCommand = core.getInput('enable_execute_command');
const launchType = core.getInput('launch_type');
const assignPublicIp = core.getInput('assign_public_ip');

const tags = core.getInput('service_tags').split(',').map(tag => { 
  const components = tag.split('=');
  return {
    key: components[0],
    value: components[1]
  }
});

const subnets = core.getInput('subnets').split(',');

const securityGroups = core.getInput('security_groups').split(',');

/**
 * Register Task Definition
 */

const taskDefinitionPath = path.isAbsolute(taskDefinitionFile) ? taskDefinitionFile : path.join(process.env.GITHUB_WORKSPACE, taskDefinitionFile);
const taskDefinition = JSON.parse(fs.readFileSync(taskDefinitionPath, 'utf8'));

try {
  const registerTaskDefinitionCommand = new RegisterTaskDefinitionCommand(taskDefinition);
  const registerTaskDefinitionResponse = await client.send(registerTaskDefinitionCommand);
  
  console.log(JSON.stringify(registerTaskDefinitionResponse));
} catch(error) {
  core.setFailed(error.message);
}

const taskDefinitionArn = registerTaskDefinitionResponse.taskDefinition.taskDefinitionArn;

/**
 * List Services
 */

const listServicesInput = {
  cluster,
  maxResults: 100
};

try {
  const listServicesCommand = new ListServicesCommand(listServicesInput);
  const listServicesResponse = await client.send(listServicesCommand);
  
  console.log(JSON.stringify(listServicesResponse));
} catch(error) {
  core.setFailed(error.message);
}

const services = listServicesResponse.serviceArns.filter(service => service.includes(serviceName));

if(services.length > 0) {
  /**
   * Update Existing Service
   */

  const updateServiceInput = {
    cluster,
    service,
    desiredCount,
    taskDefinition: taskDefinitionArn,
    forceNewDeployment: true,
  }

  try {
    const updateServiceCommand = new UpdateServiceCommand(updateServiceInput);
    const updateServiceResponse = await client.send(updateServiceCommand);
  
    console.log(JSON.stringify(updateServiceResponse))
  } catch(error) {
    core.setFailed(error.message);
  }

  const serviceArn = updateServiceResponse.service.serviceArn;

  //Update Tags of Existing Service
  const updateServiceTagsInput = {
    resourceArn: serviceArn,
    tags,
  }

  try {
    const updateServiceTagsCommand = new TagResourceCommand(updateServiceTagsInput);
    const updateServiceTagsResponse = await client.send(updateServiceTagsCommand);

    console.log(JSON.stringify(updateServiceTagsResponse));
  } catch(error) {
    core.setFailed(error.message);
  }

} else {
  /**
   * Create New Service
   */

  const createServiceInput = {
    cluster,
    serviceName,
    taskDefinition: taskDefinitionArn,
    desiredCount,
    launchType,
    enableExecuteCommand,
    tags
  }

  try {
    const createServiceCommand = new CreateServiceCommand(createServiceInput);
    const createServiceResponse = await client.send(createServiceCommand);

    console.log(JSON.stringify(createServiceResponse));
  } catch(error) {
    core.setFailed(error.message);
  }
}
