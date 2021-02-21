import * as path from 'path';
import { HttpApi, HttpMethod, HttpRouteAuthorizerType } from '@aws-cdk/aws-apigatewayv2';
import { LambdaProxyIntegration } from '@aws-cdk/aws-apigatewayv2-integrations';
import * as lambda from '@aws-cdk/aws-lambda';
import { App, Stack } from '@aws-cdk/core';
import { HttpLambdaAuthorizer } from '../../lib';

/*
 * Stack verification steps:
 * * `curl --request --header 'X-API-Key: 123' GET <url>` should return 200
 * * `curl --request GET <url>` should return 401
 */

const app = new App();
const stack = new Stack(app, 'AuthorizerInteg');

const httpApi = new HttpApi(stack, 'MyHttpApi');

const authHandler = new lambda.Function(stack, 'auth-function', {
  runtime: lambda.Runtime.NODEJS_14_X,
  handler: 'index.handler',
  code: lambda.Code.fromAsset(path.join(__dirname, '../integ.lambda.auth.handler')),
});


const authorizer = new HttpLambdaAuthorizer({
  handler: authHandler,
  type: HttpRouteAuthorizerType.SIMPLE,
});

const handler = new lambda.Function(stack, 'lambda', {
  runtime: lambda.Runtime.NODEJS_12_X,
  handler: 'index.handler',
  code: lambda.AssetCode.fromAsset(path.join(__dirname, '../integ.lambda.handler')),
});

httpApi.addRoutes({
  path: '/',
  methods: [HttpMethod.GET],
  integration: new LambdaProxyIntegration({ handler }),
  authorizer,
});
