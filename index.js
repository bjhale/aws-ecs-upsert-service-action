import { ECSClient, CreateServiceCommand, ListServicesCommand, RegisterTaskDefinitionCommand, UpdateServiceCommand, TagResourceCommand } from '@aws-sdk/client-ecs';
import core from '@actions/core';
import yaml from 'yaml';
import path from 'path';
import fs from 'fs';
import process from 'process';

const client = new ECSClient();

const cluster = core.getInput('cluster_name');
const serviceName = core.getInput('service_name');
const taskDefinitionFile = core.getInput('task_definition');
const desiredCount = parseInt(core.getInput('desired_count'));
const enableExecuteCommand = core.getInput('enable_execute_command') === 'true' ? true : false;
const launchType = core.getInput('launch_type');
const assignPublicIp = core.getInput('assign_public_ip') === 'true' ? true : false;
const loadBalancers = yaml.parse(core.getInput('load_balancers'));
const serviceRegistries = yaml.parse(core.getInput('service_registries'));

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

console.log("Task Definition Request: ", JSON.stringify(taskDefinition));

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

console.log("List Services Request: ", JSON.stringify(listServicesInput));

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
    loadBalancers,
    serviceRegistries,
    forceNewDeployment: true,
    networkConfiguration: {
      awsvpcConfiguration: {
        subnets,
        securityGroups,
        assignPublicIp: assignPublicIp ? 'ENABLED' : 'DISABLED'
      }
    }
  }

  console.log("Update Service Request: ", JSON.stringify(updateServiceInput));

  const updateServiceCommand = new UpdateServiceCommand(updateServiceInput);
  const updateServiceResponse = await client.send(updateServiceCommand);

  console.log("Update Service Response:", JSON.stringify(updateServiceResponse))


  const serviceArn = updateServiceResponse.service.serviceArn;

  //Update Tags of Existing Service
  const updateServiceTagsInput = {
    resourceArn: serviceArn,
    tags,
  }

  console.log("Update Service Tags Request: ", JSON.stringify(updateServiceTagsInput));

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
    loadBalancers,
    serviceRegistries,
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

  console.log("Create Service Request: ", JSON.stringify(createServiceInput));

  const createServiceCommand = new CreateServiceCommand(createServiceInput);
  const createServiceResponse = await client.send(createServiceCommand);

  console.log("Create Service Response:", JSON.stringify(createServiceResponse));

}
