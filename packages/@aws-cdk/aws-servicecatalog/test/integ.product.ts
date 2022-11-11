import * as path from 'path';
import * as s3 from '@aws-cdk/aws-s3';
import * as s3_assets from '@aws-cdk/aws-s3-assets';
import * as sns from '@aws-cdk/aws-sns';
import * as cdk from '@aws-cdk/core';
import * as servicecatalog from '../lib';
import { ProductStackHistory, ProductStackProps } from '../lib';

const app = new cdk.App();
const stack = new cdk.Stack(app, 'integ-servicecatalog-product');

class TestProductStack extends servicecatalog.ProductStack {
  constructor(scope: any, id: string) {
    super(scope, id);

    new sns.Topic(this, 'TopicProduct');
  }
}

class TestAssetProductStack extends servicecatalog.ProductStack {
  constructor(scope: any, id: string, props?: ProductStackProps) {
    super(scope, id, props);

    new s3_assets.Asset(this, 'testAsset', {
      path: path.join(__dirname, 'products.template.zip'),
    });
  }
}

const productStackHistory = new ProductStackHistory(stack, 'ProductStackHistory', {
  productStack: new TestProductStack(stack, 'SNSTopicProduct3'),
  currentVersionName: 'v1',
  currentVersionLocked: true,
});

const testAssetBucket = new s3.Bucket(stack, 'TestAssetBucket', {
  bucketName: 'product-stack-asset-bucket-12345678-test-region',
  removalPolicy: cdk.RemovalPolicy.DESTROY,
  autoDeleteObjects: true,
});

const product = new servicecatalog.CloudFormationProduct(stack, 'TestProduct', {
  productName: 'testProduct',
  owner: 'testOwner',
  productVersions: [
    {
      validateTemplate: false,
      cloudFormationTemplate: servicecatalog.CloudFormationTemplate.fromUrl(
        'https://awsdocs.s3.amazonaws.com/servicecatalog/development-environment.template'),
    },
    {
      cloudFormationTemplate: servicecatalog.CloudFormationTemplate.fromAsset(path.join(__dirname, 'product1.template.json')),
    },
    {
      cloudFormationTemplate: servicecatalog.CloudFormationTemplate.fromAsset(path.join(__dirname, 'product2.template.json')),
    },
    {
      cloudFormationTemplate: servicecatalog.CloudFormationTemplate.fromProductStack(new TestProductStack(stack, 'SNSTopicProduct1')),
    },
    {
      cloudFormationTemplate: servicecatalog.CloudFormationTemplate.fromProductStack(new TestProductStack(stack, 'SNSTopicProduct2')),
    },
    {
      validateTemplate: false,
      cloudFormationTemplate: servicecatalog.CloudFormationTemplate.fromProductStack(new TestAssetProductStack(stack, 'S3AssetProduct', {
        assetBucket: testAssetBucket,
      })),
    },
    productStackHistory.currentVersion(),
  ],
});

const tagOptions = new servicecatalog.TagOptions(stack, 'TagOptions', {
  allowedValuesForTags: {
    key1: ['value1', 'value2'],
    key2: ['value1'],
  },
});

product.associateTagOptions(tagOptions);

app.synth();
