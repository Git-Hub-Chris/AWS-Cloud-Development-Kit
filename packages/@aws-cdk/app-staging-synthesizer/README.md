# App Scoped Staging Synthesizer
<!--BEGIN STABILITY BANNER-->

---

![cdk-constructs: Experimental](https://img.shields.io/badge/cdk--constructs-experimental-important.svg?style=for-the-badge)

> The APIs of higher level constructs in this module are experimental and under active development.
> They are subject to non-backward compatible changes or removal in any future version. These are
> not subject to the [Semantic Versioning](https://semver.org/) model and breaking changes will be
> announced in the release notes. This means that while you may use them, you may need to update
> your source code when upgrading to a newer version of this package.

---

<!--END STABILITY BANNER-->

This library includes constructs aimed at replacing the current model of bootstrapping and providing
greater control of the bootstrap experience to the CDK user. The important constructs in this library
are the `IStagingStack`, a framework for an app-level bootstrap stack that handles file assets and
docker assets and the `DefaultStagingStack`, which is a works-out-of-the-box implementation of the
interface. Additionally, there is an `AppStagingSynthesizer` that will synthesize CDK applications
built with this new model of bootstrapping.

## Bootstrap Model

Our current bootstrap model looks like this, when you run `cdk bootstrap aws://<account>/<region>` :

```mermaid
graph TD
    A(Bootstrap Stack) --- B(CloudFormationExecutionRole <br> DeploymentActionRole <br> LookupRole <br> FilePublishingRole <br> ImagePublishingRole <br> StagingBucket <br> ContainerAssetsRepository <br> FileAssetsBucketEncryptionKey)
```

Your CDK Applicaiton utilizes some of these resources when deploying. For example, if you have a file asset,
it gets uploaded to the `StagingBucket` using the `FilePublishingRole` when you run `cdk deploy`.

This library introduces an alternate model to bootstrapping, by splitting out essential CloudFormation iam roles
and staging resources. There will still be a Bootstrap Stack, but this will only contain IAM roles necessary for
CloudFormation deployment. Each CDK App will instead be in charge of it's own staging resources, including the
S3 Bucket, ECR Repositories, and associated IAM roles. It works like this:

The Staging Stack will contain, on a per-need basis, 

- 1 S3 Bucket with KMS encryption for all file assets in the CDK App.
- An ECR Repository _per_ image (and it's revisions).
- IAM roles with access to the Bucket and Repositories.

> The Staging Stack is being actively worked on right now and currently does not support image assets.

```mermaid
graph TD
    A(Bootstrap Stack) --- B(CloudFormationExecutionRole <br> DeploymentActionRole <br> LookupRole)
    C(CDK App with File Asset) --- D(Staging Stack A) 
    C --- I(Stack A)
    I --- J(File Asset)
    F(CDK App with File/Image Asset) --- G(Staging Stack B)
    F --- K(Stack B)
    K --- L(File Asset <br> Image Asset)
    G --- H(FilePublishingRole <br> ImagePublishingRole <br> StagingBucket <br> ContainerAssetsRepository <br> FileAssetsBucketEncryptionKey)
    D --- E(FilePublishingRole <br> StagingBucket <br> FileAssetsBucketEncryptionKey)
    M(CDK App with no Assets) --- N(Stack C)
    N --- O(<br>)
```

This allows staging resources to be created when needed next to the CDK App. It has the following
benefits:

- Bootstrapping will be faster since the heavy resource of a KMS key is no longer involved.
- Because roles are a global resource, every account now only needs to be bootstrapped once.
- Users have a familiar way to customize staging resources in the CDK Application.

> As this library is `experimental`, the accompanying Bootstrap Stack is not yet implemented. To use this
> library right now, you must reuse roles that have been traditionally bootstrapped.

## Synthesizer

To use this library, supply the `AppStagingSynthesizer` in as the default synthesizer to the app.
This will ensure that a Staging Stack will be created next to the CDK App to hold the staging resources.

`AppStagingSynthesizer` comes with static methods covering the use-cases for the synthesizer. 

### Using the Default Staging Stack per Environment

The most common use case will be to use the built-in `DefaultStagingStack` on a per-environment basis.
That means that in each environment the CDK App is deployed to, the synthesizer will create a
Staging Stack to store its resources. To use this kind of synthesizer, use
`AppStagingSynthesizer.stackPerEnv()`.

```ts
import { App } from 'aws-cdk-lib';
import { AppStagingSynthesizer } from '@aws-cdk/app-staging-synthesizer';

const app = new App({
  defaultSynthesizer: AppStagingSynthesizer.stackPerEnv({
    appId: 'my-app-id',
  }),
});
```

### Using a Custom Staging Stack per Environment

To use a custom stack, but still on a per-environment basis, use `AppStagingSynthesizer.customFactory()`.
This has the benefit of providing a custom Staging Stack that can be created in every environment the CDK App
is deployed to.

```ts
import { App } from 'aws-cdk-lib';
import { AppStagingSynthesizer } from '@aws-cdk/app-staging-synthesizer';

const app = new App({
  defaultSynthesizer: AppStagingSynthesizer.customFactory({
    stagingStackFactory: {
      stagingStackFactory(boundStack: Stack) {
        const app = App.of(boundStack);
        if (!App.isApp(app)) {
          throw new Error(`Stack ${boundStack.stackName} must be part of an App`);
        }
        return new CustomStagingStack(app, 'StagingStack', { appId: 'my-app-id' }),
      },
    },
    oncePerEnv: true, // by default
  }),
});
```

### Using an Existing Staging Stack

If you need to pass in an existing stack as the Staging Stack to the CDK App, use
`AppStagingSynthesizer.customStack()`. Make sure that the custom stack you provide implements
`IStagingStack`.

```ts
import { App, Stack } from 'aws-cdk-lib';
import { AppStagingSynthesizer, IStagingStack } from '@aws-cdk/app-staging-synthesizer';

class CustomStagingStack implements IStagingStack {
  // ...
}

const app = new App({
  defaultSynthesizer: AppStagingSynthesizer.customStack(new CustomStagingStack(this, 'StagingStack')),
});
```

## Default Staging Stack

> The Default Staging Stack is being actively worked on right now and currently does not support image assets.

The default Staging Stack includes all the staging resources necessary for CDK Assets. The below example
is of a CDK App using the `AppStagingSynthesizer` and creating a file asset for the Lambda Function
source code. As part of the `DefaultStagingStack`, an s3 bucket and iam role will be created that will be
used to upload the asset to s3.

```ts
import * as path from 'path';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import { App, Stack } from 'aws-cdk-lib';
import { AppStagingSynthesizer } from 'aws-cdk-lib/app-staging-synthesizer';

const app = new App({
  defaultSynthesizer: new AppStagingSynthesizer.stackPerEnv({appId: 'my-app-id'}),
});

const stack = new Stack(app, 'my-stack');

new lambda.Function(stack, 'lambda', {
  code: lambda.AssetCode.fromAsset(path.join(__dirname, 'assets')),
  handler: 'index.handler',
  runtime: lambda.Runtime.PYTHON_3_9,
});

app.synth();
```

Every CDK App that uses the `DefaultStagingStack` must include an `appId`. This should
be an identifier unique to the app and is used to differentiate staging resources associated
with the app.

### Custom Roles

You can customize some or all of the roles you'd like to use in the synthesizer as well,
if all you need is to supply custom roles (and not change anything else in the `DefaultStagingStack`):

```ts
import { App } from 'aws-cdk-lib';
import { AppStagingSynthesizer, BootstrapRole } from 'aws-cdk-lib/app-staging-synthesizer';

const app = new App({
  defaultSynthesizer: new AppStagingSynthesizer.stackFromEnv({
    appId: 'my-app-id',
    roles: {
      cloudFormationExecutionRole: BoostrapRole.fromRoleArn('arn'),
      deploymentActionRole: BootstrapRole.fromRoleArn('arn'),
      lookupRole: BoostrapRole.fromRoleArn('arn'),
      fileAssetPublishingRole: BootstrapRole.fromRoleArn('arn'),
      imageAssetPublishingRole: BootstrapRole.fromRoleArn('arn'),
    },
  }),
});
```
