import { Tokenization } from '@aws-cdk/core';
import { Construct } from 'constructs';
import { ImportedTaskDefinition } from '../base/_imported-task-definition';
import {
  CommonTaskDefinitionAttributes,
  CommonTaskDefinitionProps,
  Compatibility,
  ITaskDefinition,
  NetworkMode,
  TaskDefinition,
} from '../base/task-definition';
import { RuntimePlatform, OperatingSystemFamily } from '../runtime-platform';

/**
 * The properties for a task definition.
 */
export interface FargateTaskDefinitionProps extends CommonTaskDefinitionProps {
  /**
   * The number of cpu units used by the task. For tasks using the Fargate launch type,
   * this field is required and you must use one of the following values,
   * which determines your range of valid values for the memory parameter:
   *
   * 256 (.25 vCPU) - Available memory values: 512 (0.5 GB), 1024 (1 GB), 2048 (2 GB)
   *
   * 512 (.5 vCPU) - Available memory values: 1024 (1 GB), 2048 (2 GB), 3072 (3 GB), 4096 (4 GB)
   *
   * 1024 (1 vCPU) - Available memory values: 2048 (2 GB), 3072 (3 GB), 4096 (4 GB), 5120 (5 GB), 6144 (6 GB), 7168 (7 GB), 8192 (8 GB)
   *
   * 2048 (2 vCPU) - Available memory values: Between 4096 (4 GB) and 16384 (16 GB) in increments of 1024 (1 GB)
   *
   * 4096 (4 vCPU) - Available memory values: Between 8192 (8 GB) and 30720 (30 GB) in increments of 1024 (1 GB)
   *
   * @default 256
   */
  readonly cpu?: number;

  /**
   * The amount (in MiB) of memory used by the task. For tasks using the Fargate launch type,
   * this field is required and you must use one of the following values, which determines your range of valid values for the cpu parameter:
   *
   * 512 (0.5 GB), 1024 (1 GB), 2048 (2 GB) - Available cpu values: 256 (.25 vCPU)
   *
   * 1024 (1 GB), 2048 (2 GB), 3072 (3 GB), 4096 (4 GB) - Available cpu values: 512 (.5 vCPU)
   *
   * 2048 (2 GB), 3072 (3 GB), 4096 (4 GB), 5120 (5 GB), 6144 (6 GB), 7168 (7 GB), 8192 (8 GB) - Available cpu values: 1024 (1 vCPU)
   *
   * Between 4096 (4 GB) and 16384 (16 GB) in increments of 1024 (1 GB) - Available cpu values: 2048 (2 vCPU)
   *
   * Between 8192 (8 GB) and 30720 (30 GB) in increments of 1024 (1 GB) - Available cpu values: 4096 (4 vCPU)
   *
   * @default 512
   */
  readonly memoryLimitMiB?: number;

  /**
   * The amount (in GiB) of ephemeral storage to be allocated to the task. The maximum supported value is 200 GiB.
   *
   * NOTE: This parameter is only supported for tasks hosted on AWS Fargate using platform version 1.4.0 or later.
   *
   * @default 20
   */
  readonly ephemeralStorageGiB?: number;

  /**
   * The operating system that your task definitions are running on.
   * A platform family is specified only for tasks using the Fargate launch type.
   *
   * When you specify a task in a service, this value must match the runtimePlatform value of the service.
   *
   * @default - Undefined.
   */
  readonly runtimePlatform?: RuntimePlatform;
}

/**
 * The interface of a task definition run on a Fargate cluster.
 */
export interface IFargateTaskDefinition extends ITaskDefinition {

}

/**
 * Attributes used to import an existing Fargate task definition
 */
export interface FargateTaskDefinitionAttributes extends CommonTaskDefinitionAttributes {

}

/**
 * The details of a task definition run on a Fargate cluster.
 *
 * @resource AWS::ECS::TaskDefinition
 */
export class FargateTaskDefinition extends TaskDefinition implements IFargateTaskDefinition {

  /**
   * Imports a task definition from the specified task definition ARN.
   */
  public static fromFargateTaskDefinitionArn(scope: Construct, id: string, fargateTaskDefinitionArn: string): IFargateTaskDefinition {
    return new ImportedTaskDefinition(scope, id, { taskDefinitionArn: fargateTaskDefinitionArn });
  }

  /**
   * Import an existing Fargate task definition from its attributes
   */
  public static fromFargateTaskDefinitionAttributes(
    scope: Construct,
    id: string,
    attrs: FargateTaskDefinitionAttributes,
  ): IFargateTaskDefinition {
    return new ImportedTaskDefinition(scope, id, {
      taskDefinitionArn: attrs.taskDefinitionArn,
      compatibility: Compatibility.FARGATE,
      networkMode: attrs.networkMode,
      taskRole: attrs.taskRole,
    });
  }

  /**
   * The Docker networking mode to use for the containers in the task. Fargate tasks require the awsvpc network mode.
   */
  public readonly networkMode: NetworkMode = NetworkMode.AWS_VPC;
  // NOTE: Until the fix to https://github.com/Microsoft/TypeScript/issues/26969 gets released,
  // we need to explicitly write the type here, as type deduction for enums won't lead to
  // the import being generated in the .d.ts file.

  /**
   * The amount (in GiB) of ephemeral storage to be allocated to the task.
   */
  public readonly ephemeralStorageGiB?: number;

  /**
   * Constructs a new instance of the FargateTaskDefinition class.
   */
  constructor(scope: Construct, id: string, props: FargateTaskDefinitionProps = {}) {
    super(scope, id, {
      ...props,
      cpu: props.cpu !== undefined ? Tokenization.stringifyNumber(props.cpu) : '256',
      memoryMiB: props.memoryLimitMiB !== undefined ? Tokenization.stringifyNumber(props.memoryLimitMiB) : '512',
      compatibility: Compatibility.FARGATE,
      networkMode: NetworkMode.AWS_VPC,
    });

    if (props.ephemeralStorageGiB && (props.ephemeralStorageGiB < 21 || props.ephemeralStorageGiB > 200)) {
      throw new Error('Ephemeral storage size must be between 21GiB and 200GiB');
    }

    if (props.runtimePlatform?.operatingSystemFamily) {
      if (props.runtimePlatform?.operatingSystemFamily?._operatingSystemFamily !== OperatingSystemFamily.LINUX._operatingSystemFamily) {
        checkFargateWindowsBasedTasksSize(props.cpu!, props.memoryLimitMiB!);
      }
    }

    this.ephemeralStorageGiB = props.ephemeralStorageGiB;
  }
}


export function checkFargateWindowsBasedTasksSize(cpu: number, memory: number) {
  if (cpu === 1024) {
    if (memory < 1024 || memory > 8192) {
      throw new Error('If define 1 vCPU,Memory need in Min. 2GB and Max. 8GB, in 1GB increments');
    }
  } else if (cpu === 2048) {
    if (memory < 4096 || memory > 16384) {
      throw new Error('If define 2 vCPU,Memory need in Min. 4GB and Max. 16GB, in 1GB increments');
    }
  } else if (cpu === 4096) {
    if (memory < 8192 || memory > 30720) {
      throw new Error('If define 4 vCPU,Memory need in Min. 8GB and Max. 30GB, in 1GB increments');
    }
  } else {
    throw new Error('If define Operating System Family is WINDOWS_SERVER_X, CPU need in 1 vCPU, 2 vCPU or 4 vCPU');
  }
};