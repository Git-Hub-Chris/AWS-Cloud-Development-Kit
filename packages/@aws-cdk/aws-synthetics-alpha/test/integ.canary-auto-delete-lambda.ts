import { App, Stack, StackProps } from 'aws-cdk-lib';
import { IntegTest } from '@aws-cdk/integ-tests-alpha';
import { Construct } from 'constructs';
import * as synthetics from '../lib';
import { AwsCustomResource, AwsCustomResourcePolicy, PhysicalResourceId } from 'aws-cdk-lib/custom-resources';

class TestStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    new synthetics.Canary(this, 'Canary', {
      runtime: synthetics.Runtime.SYNTHETICS_NODEJS_PUPPETEER_4_0,
      test: synthetics.Test.custom({
        handler: 'index.handler',
        code: synthetics.Code.fromInline(`
          exports.handler = async () => {
            console.log(\'hello world\');
          };`),
      }),
      autoDeleteLambda: true,
    });

    const canaryThatWillBeRemoved = new synthetics.Canary(this, 'CanaryRemoved', {
      runtime: synthetics.Runtime.SYNTHETICS_NODEJS_PUPPETEER_4_0,
      test: synthetics.Test.custom({
        handler: 'index.handler',
        code: synthetics.Code.fromInline(`
          exports.handler = async () => {
            console.log(\'hello world\');
          };`),
      }),
      autoDeleteLambda: true,
      startAfterCreation: false, // otherwise we get error: canary is in a state that can't be deleted: RUNNING
    });

    // Remove this canary immediately
    // so we can test that a non-existing canary will not fail the auto-delete-lambda Custom Resource
    new AwsCustomResource(this, 'DeleteCanary', {
      onCreate: {
        physicalResourceId: PhysicalResourceId.of(canaryThatWillBeRemoved.canaryName),
        service: 'Synthetics',
        action: 'deleteCanary',
        parameters: {
          Name: canaryThatWillBeRemoved.canaryName,
        },
      },
      policy: AwsCustomResourcePolicy.fromSdkCalls({
        resources: AwsCustomResourcePolicy.ANY_RESOURCE,
      }),
    });
  }
}

const app = new App();

new IntegTest(app, 'cdk-integ-synthetics-canary-auto-delete-lambda', {
  testCases: [new TestStack(app, 'cdk-synthetics-canary-auto-delete-lambda')],
  diffAssets: true,
  stackUpdateWorkflow: false, // will error because this stack has a cr that deletes its own resources
});
