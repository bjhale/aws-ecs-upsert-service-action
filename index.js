import { ECSClient, CreateServiceCommand, ListServicesCommand, RegisterTaskDefinitionCommand, UpdateServiceCommand, TagResourceCommand } from '@aws-sdk/client-ecs';
import core from '@actions/core';
import path from 'path';
import fs from 'fs';
import process from 'process';

const client = new ECSClient();

const cluster = core.getInput('cluster_name');
const serviceName = core.getInput('service_name');
const taskDefinitionFile = core.getInput('task_definition');
const desiredCount = parseInt(core.getInput('desired_count'));
const enableExecuteCommand = !!core.getInput('enable_execute_command');
const launchType = core.getInput('launch_type');
const assignPublicIp = !!core.getInput('assign_public_ip');

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


const registerTaskDefinitionCommand = new RegisterTaskDefinitionCommand(taskDefinition);
const registerTaskDefinitionResponse = await client.send(registerTaskDefinitionCommand);

console.log("Task Definition Response:", JSON.stringify(registerTaskDefinitionResponse));

const taskDefinitionArn = registerTaskDefinitionResponse.taskDefinition.taskDefinitionArn;

/**
 * List Services
 */

const listServicesInput = {
  cluster,
  maxResults: 100
};


const listServicesCommand = new ListServicesCommand(listServicesInput);
const listServicesResponse = await client.send(listServicesCommand);

console.log("List Services Response:", JSON.stringify(listServicesResponse));


const services = listServicesResponse.serviceArns.filter(service => service.includes(serviceName));

console.log('Found Services: ', JSON.stringify(services));

if(services.length > 0) {
  console.log('Updating Existing Service: ', services[0]);
  /**
   * Update Existing Service
   */

  const updateServiceInput = {
    cluster,
    service: services[0],
    desiredCount,
    taskDefinition: taskDefinitionArn,
    forceNewDeployment: true,
    networkConfiguration: {
      awsvpcConfiguration: {
        subnets,
        securityGroups,
        assignPublicIp: assignPublicIp ? 'ENABLED' : 'DISABLED'
      }
    }
  }


  const updateServiceCommand = new UpdateServiceCommand(updateServiceInput);
  const updateServiceResponse = await client.send(updateServiceCommand);

  console.log("Update Service Response:", JSON.stringify(updateServiceResponse))


  const serviceArn = updateServiceResponse.service.serviceArn;

  //Update Tags of Existing Service
  const updateServiceTagsInput = {
    resourceArn: serviceArn,
    tags,
  }


  const updateServiceTagsCommand = new TagResourceCommand(updateServiceTagsInput);
  const updateServiceTagsResponse = await client.send(updateServiceTagsCommand);

  console.log("Update Service Tags Response:", JSON.stringify(updateServiceTagsResponse));


} else {
  console.log('Creating New Service: ', serviceName);
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
    assignPublicIp,
    networkConfiguration: {
      awsvpcConfiguration: {
        subnets,
        securityGroups,
        assignPublicIp: assignPublicIp ? 'ENABLED' : 'DISABLED'
      }
    },
    tags
  }

  const createServiceCommand = new CreateServiceCommand(createServiceInput);
  const createServiceResponse = await client.send(createServiceCommand);

  console.log("Create Service Response:", JSON.stringify(createServiceResponse));

}
