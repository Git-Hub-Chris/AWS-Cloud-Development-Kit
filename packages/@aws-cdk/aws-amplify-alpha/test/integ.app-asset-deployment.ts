import * as path from 'path';
import { App, Stack, StackProps } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as amplify from '../lib';
import { Asset } from 'aws-cdk-lib/aws-s3-assets';
import { IntegTest } from '@aws-cdk/integ-tests-alpha';
import { NODEJS_FUNCTION_DEFAULT_AWS_SDK_CONNECTION_REUSE_TO_FALSE } from 'aws-cdk-lib/cx-api';

class TestStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    const asset = new Asset(this, 'SampleAsset', {
      path: path.join(__dirname, 'test-asset'),
    });

    const amplifyApp = new amplify.App(this, 'App', {});
    amplifyApp.addBranch('main', { asset });
  }
}

const app = new App({
  context: { [NODEJS_FUNCTION_DEFAULT_AWS_SDK_CONNECTION_REUSE_TO_FALSE]: false },
});
const stack = new TestStack(app, 'cdk-amplify-app-asset-deployment');

// Deploying the stack is sufficient to test the custom resources
// On successful deployment we can check the Amplify app with the branch named as 'main' consisting of the asset file changes
// On updating the asset file and re-deploying it updates the existing Amplify app with the new change.
new IntegTest(app, 'cdk-amplify-app-integ-test', {
  testCases: [stack],
  diffAssets: true,
});