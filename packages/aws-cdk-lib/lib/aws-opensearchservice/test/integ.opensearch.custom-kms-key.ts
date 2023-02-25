import * as iam from '../../aws-iam';
import * as kms from '../../aws-kms';
import { App, RemovalPolicy, Stack, StackProps } from '../../core';
import { Construct } from 'constructs';
import * as opensearch from '../lib';

class TestStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    const key = new kms.Key(this, 'Key');

    const domainProps: opensearch.DomainProps = {
      removalPolicy: RemovalPolicy.DESTROY,
      version: opensearch.EngineVersion.ELASTICSEARCH_7_1,
      encryptionAtRest: {
        enabled: true,
        kmsKey: key,
      },
      accessPolicies: [
        new iam.PolicyStatement({
          effect: iam.Effect.ALLOW,
          actions: ['es:ESHttp*'],
          principals: [new iam.AccountRootPrincipal()],
          resources: ['*'],
        }),
      ],
    };

    new opensearch.Domain(this, 'Domain', domainProps);
  }
}

const app = new App();
new TestStack(app, 'cdk-integ-opensearch-custom-kms-key');
app.synth();
