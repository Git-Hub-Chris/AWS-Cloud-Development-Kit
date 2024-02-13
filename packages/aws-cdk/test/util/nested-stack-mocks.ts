import * as cxapi from '@aws-cdk/cx-api';
import { MockSdkProvider } from './mock-sdk';
import { Deployments } from '../../lib/api/deployments';
import { CloudFormationStack, Template } from '../../lib/api/util/cloudformation';
import { CdkToolkit } from '../../lib/cdk-toolkit';
import { FakeCloudformationStack } from '../api/fake-cloudformation-stack';
import { MockCloudExecutable, TestAssembly } from '../util';

const STACK_NAME = 'withouterrors';
const STACK_ID = 'stackId';

export interface MockNestedStack {
  deployedTemplate: Template;
  generatedTemplate: Template;
  name: string;
  logicalId: string;
}

export class NestedStackTestHelpers {
  private stackTemplates: { [stackName: string]: any } = {};
  private currentCfnStack = new FakeCloudformationStack({
    stackName: STACK_NAME,
    stackId: STACK_ID,
  });
  public constructor() {
    CloudFormationStack.lookup = async (_: AWS.CloudFormation, stackName: string) => {
      this.currentCfnStack.template = async () => this.stackTemplates[stackName];
      return this.currentCfnStack;
    };

  }

  public addTemplateToCloudFormationLookupMock(stackArtifact: cxapi.CloudFormationStackArtifact) {
    const templateDeepCopy = JSON.parse(JSON.stringify(stackArtifact.template)); // deep copy the template, so our tests can mutate one template instead of creating two
    this.stackTemplates[stackArtifact.stackName] = templateDeepCopy;
  }
}

export class MockToolkitEnvironment {
  private cloudExecutable: MockCloudExecutable;
  private cloudFormation: Deployments;
  public sdkProvider: MockSdkProvider;
  public toolkit: CdkToolkit;

  public constructor(asm: TestAssembly, sdkProvider: MockSdkProvider) {
    this.cloudExecutable = new MockCloudExecutable(asm, sdkProvider);
    this.cloudFormation = new Deployments({
      sdkProvider: sdkProvider,
    });
    this.toolkit = new CdkToolkit({
      cloudExecutable: this.cloudExecutable,
      deployments: this.cloudFormation,
      configuration: this.cloudExecutable.configuration,
      sdkProvider: sdkProvider,
    });
    this.sdkProvider = this.cloudExecutable.sdkProvider;
  }
}