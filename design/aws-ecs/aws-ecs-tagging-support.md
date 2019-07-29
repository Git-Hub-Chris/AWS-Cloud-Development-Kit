# AWS ECS - Tagging Support

Amazon ECS supports tagging for all the ECS resources (see [here](https://docs.aws.amazon.com/AmazonECS/latest/developerguide/ecs-using-tags.html)). Note that ECS provides a property of ECS service named `PropagateTags` to support propagating tags from either task definitions or services to tasks (tasks cannot be tagged using CDK without setting this parameter). Currently this property is not set in CDK so that the tags are not propagated by default.

In addition, `EnableECSManagedTags` is provided as another property so that ECS managed tags can be supported and used to tag ECS tasks. However, currently users cannot set `EnableECSManagedTags` and the default value is `false`.

## General approach

The new `BaseService` class will include two more base properties:

* propagateTags
* enableECSManagedTags

`propagateTags` specifies whether to propagate the tags from the task definition or the service to ECS tasks and `enableECSManagedTags` specifies whether to enable Amazon ECS managed tags for the tasks within the service. Also, for `Ec2Service` and `FargateService` we will have the corresponding two new properties exposed to users:

* propagateTaskTagsFrom (`SERVICE` | `TASK_DEFINITION` | `NO_PROPAGATE`)
* enableECSManagedTags (`true` | `false`)

\*SERVICE and true are default values.\
\*`propagateTaskTagsFrom` takes enum type `PropagatedTagSource`.\
\*Note that the reason why we define `propagateTaskTagsFrom` is because we want to have a different name for `propagateTags` to eliminate the naming confusion.

In addition, for `aws-ecs-pattern` we don’t want to bother users to make additional choice, since aws-ecs-pattern modules  should be convenient to use. As a result, `SERVICE` will be set for `propagateTaskTagsFrom` when creating an ECS service, while `true` will be set for `enableECSManagedTags`.

## Code changes

Given the above, we should make the following changes on ECS:
  1. Add `propagateTags` and `enableECSManagedTags` properties to `BaseServiceOptions`.
  2. Add `propagateTaskTagsFrom` and `enableECSManagedTags` properties to `Ec2ServiceProps` and `FargateServiceProps`.
  3. Add an enum type `PropagatedTagSource` to support `propagateTaskTagsFrom`.

# Part 1: Support Tag Propagation for ECS Task and ECS Managed Tags

```ts
export interface BaseServiceOptions {

  ...

   /**
   * Specifies whether to propagate the tags from the task definition or the service to the tasks in the service
   *
   * Valid values are: PropagateTagFromType.SERVICE or PropagateTagFromType.TASK_DEFINITION
   *
   * @default SERVICE
   */
  readonly propagateTags?: PropagatedTagSource;

   /**
   * Specifies whether to enable Amazon ECS managed tags for the tasks within the service. For more information, see
   * [Tagging Your Amazon ECS Resources](https://docs.aws.amazon.com/AmazonECS/latest/developerguide/ecs-using-tags.html)
   *
   * @default true
   */
  readonly enableECSManagedTags?: boolean;
}
```

``` ts
export enum PropagatedTagSource {
  /**
   * Propagate tags from service
   */
  SERVICE = 'SERVICE',

  /**
   * Propagate tags from task definition
   */
  TASK_DEFINITION = 'TASK_DEFINITION',

  /**
   * Do not propagate
   */
  NO_PROPAGATE = 'NO_PROPAGATE'
}
```

``` ts
export interface Ec2ServiceProps extends BaseServiceOptions {

  ...

   /**
   * Specifies whether to propagate the tags from the task definition or the service to the tasks in the service.
   * Tags can only be propagated to the tasks within the service during service creation.
   *
   * @default SERVICE
   */
  readonly propagateTaskTagsFrom?: PropagatedTagSource;
}
```

``` ts
export interface FargateServiceProps extends BaseServiceOptions {

  ...

   /**
   * Specifies whether to propagate the tags from the task definition or the service to the tasks in the service.
   * Tags can only be propagated to the tasks within the service during service creation.
   *
   * @default SERVICE
   */
  readonly propagateTaskTagsFrom?: PropagatedTagSource;
}
```

The `Ec2Service` and `FargateService` constructs will have two new properties:

* propagateTaskTagsFrom - Propagate tags from either ECS Task Definition or Service to Task.
* enableECSManagedTags - Enable ECS managed tags to ECS Task.

An example use case to create an EC2/Fargate service:

```ts
// Create Service
const service = new ecs.Ec2Service(stack, "Service", {
  cluster,
  taskDefinition,
  propagateTaskTagsFrom: ecs.PropagatedTagSource.TASK_DEFINITION,
  enableECSManagedTags: true,
});
```
