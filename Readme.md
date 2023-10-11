# AWS ECS Upsert Service Action

This GitHub Action can be used to upsert an ECS service in AWS.

## Inputs

### `cluster_name`

**Required** The name of the ECS cluster.

### `service_name`

**Required** The name of the service to update/create.

### `task_definition`

**Required** Path to task definition file in JSON format.

### `service_tags`

Comma separated key=value pairs of tags to apply to service. Default `""`

### `desired_count`

The number of tasks that should be running in the service. Default `"1"`

### `enable_execute_command`

Enable exec. Default `"False"`

### `launch_type`

The launch type on which to run the service. Default `"EC2"`

### `subnets`

Comma separated list of subnet ids. Default `""`

### `security_groups`

Comma Separated list of security group ids. Default `""`

### `assign_public_ip`

Assign public ip to service. Default `"false"`

## Example Usage

To use this action, add the following step to your workflow:

```yaml
- name: Upsert ECS service
  uses: your-username/aws-ecs-upsert-service-action@v1
  with:
    cluster: my-cluster
    service: my-service
    taskDefinition: my-task-definition
    desiredCount: 2
    launchType: FARGATE
    subnets: subnet-12345678,subnet-23456789
    securityGroups: sg-12345678,sg-23456789
    platformVersion: 1.4.0
  env:
    AWS_REGION: us-east-1
    AWS_ACCESS_KEY_ID: ${{ secrets.AWS_ACCESS_KEY_ID }}
    AWS_SECRET_ACCESS_KEY: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
```