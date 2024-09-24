import { App, RemovalPolicy, Stack, StackProps } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as iam from 'aws-cdk-lib/aws-iam';
import { IntegTest } from '@aws-cdk/integ-tests-alpha';

export class TestStack extends Stack {

  readonly table: dynamodb.Table;
  readonly tableTwo: dynamodb.Table;

  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    const doc = new iam.PolicyDocument({
      statements: [
        new iam.PolicyStatement({
          actions: ['dynamodb:*'],
          principals: [new iam.AccountRootPrincipal()],
          resources: ['*'],
        }),
      ],
    });

    this.table = new dynamodb.Table(this, 'TableTest1', {
      partitionKey: {
        name: 'id',
        type: dynamodb.AttributeType.STRING,
      },
      removalPolicy: RemovalPolicy.DESTROY,
      resourcePolicy: doc,
    });

    this.table.addToResourcePolicy(new iam.PolicyStatement({
      actions: ['dynamodb:GetItem'],
      principals: [new iam.AccountRootPrincipal()],
      resources: ['*'],
    }));

    this.tableTwo = new dynamodb.Table(this, 'TableTest2', {
      partitionKey: {
        name: 'PK',
        type: dynamodb.AttributeType.STRING,
      },
      removalPolicy: RemovalPolicy.DESTROY,
    });

    this.tableTwo.addToResourcePolicy( new iam.PolicyStatement({
      actions: ['dynamodb:PutItem'],
      principals: [new iam.AccountRootPrincipal()],
      resources: ['*'],
    }));

    // TODO
    // The following causes a circular depedency issue, which needs investigated
    //
    // this.tableTwo.grantReadData(new iam.AccountPrincipal('012345678910'));
  }
}

const app = new App();
const stack = new TestStack(app, 'resource-policy-stack', {});

new IntegTest(app, 'resource-policy-integ-test', {
  testCases: [stack],
});
