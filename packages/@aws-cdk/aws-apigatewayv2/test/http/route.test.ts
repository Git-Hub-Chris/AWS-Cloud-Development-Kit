import '@aws-cdk/assert/jest';
import { Stack } from '@aws-cdk/core';
import {
  HttpApi, HttpAuthorizerType, HttpConnectionType, HttpIntegrationType, HttpMethod, HttpRoute, HttpRouteAuthorizerBindOptions,
  HttpRouteAuthorizerConfig, HttpRouteIntegrationConfig, HttpRouteKey, IHttpRouteAuthorizer, IHttpRouteIntegration, PayloadFormatVersion,
} from '../../lib';

describe('HttpRoute', () => {
  test('default', () => {
    const stack = new Stack();
    const httpApi = new HttpApi(stack, 'HttpApi');

    new HttpRoute(stack, 'HttpRoute', {
      httpApi,
      integration: new DummyIntegration(),
      routeKey: HttpRouteKey.with('/books', HttpMethod.GET),
    });

    expect(stack).toHaveResource('AWS::ApiGatewayV2::Route', {
      ApiId: stack.resolve(httpApi.httpApiId),
      RouteKey: 'GET /books',
      Target: {
        'Fn::Join': [
          '',
          [
            'integrations/',
            {
              Ref: 'HttpRouteHttpRouteIntegration6EE0FE47',
            },
          ],
        ],
      },
    });

    expect(stack).toHaveResource('AWS::ApiGatewayV2::Integration', {
      ApiId: stack.resolve(httpApi.httpApiId),
    });
  });

  test('integration is configured correctly', () => {
    const stack = new Stack();
    const httpApi = new HttpApi(stack, 'HttpApi');

    new HttpRoute(stack, 'HttpRoute', {
      httpApi,
      integration: new DummyIntegration(),
      routeKey: HttpRouteKey.with('/books', HttpMethod.GET),
    });

    expect(stack).toHaveResource('AWS::ApiGatewayV2::Integration', {
      ApiId: stack.resolve(httpApi.httpApiId),
      IntegrationType: 'HTTP_PROXY',
      PayloadFormatVersion: '2.0',
      IntegrationUri: 'some-uri',
    });
  });

  test('throws when path not start with /', () => {
    const stack = new Stack();
    const httpApi = new HttpApi(stack, 'HttpApi');

    expect(() => new HttpRoute(stack, 'HttpRoute', {
      httpApi,
      integration: new DummyIntegration(),
      routeKey: HttpRouteKey.with('books', HttpMethod.GET),
    })).toThrowError(/path must always start with a "\/" and not end with a "\/"/);
  });

  test('throws when path ends with /', () => {
    const stack = new Stack();
    const httpApi = new HttpApi(stack, 'HttpApi');

    expect(() => new HttpRoute(stack, 'HttpRoute', {
      httpApi,
      integration: new DummyIntegration(),
      routeKey: HttpRouteKey.with('/books/', HttpMethod.GET),
    })).toThrowError(/path must always start with a "\/" and not end with a "\/"/);
  });

  test('configures private integration correctly when all props are passed', () => {
    // GIVEN
    const stack = new Stack();
    const httpApi = new HttpApi(stack, 'HttpApi');

    class PrivateIntegration implements IHttpRouteIntegration {
      public bind(): HttpRouteIntegrationConfig {
        return {
          method: HttpMethod.ANY,
          payloadFormatVersion: PayloadFormatVersion.VERSION_1_0,
          type: HttpIntegrationType.HTTP_PROXY,
          connectionId: 'some-connection-id',
          connectionType: HttpConnectionType.VPC_LINK,
          uri: 'some-target-arn',
        };
      }
    }

    // WHEN
    new HttpRoute(stack, 'HttpRoute', {
      httpApi,
      integration: new PrivateIntegration(),
      routeKey: HttpRouteKey.with('/books', HttpMethod.GET),
    });

    // THEN
    expect(stack).toHaveResource('AWS::ApiGatewayV2::Integration', {
      IntegrationType: 'HTTP_PROXY',
      ConnectionId: 'some-connection-id',
      ConnectionType: 'VPC_LINK',
      IntegrationMethod: 'ANY',
      IntegrationUri: 'some-target-arn',
      PayloadFormatVersion: '1.0',
    });
    expect(stack).not.toHaveResource('AWS::ApiGatewayV2::VpcLink');
  });

  test('can create route with an authorizer attached', () => {
    const stack = new Stack();
    const httpApi = new HttpApi(stack, 'HttpApi');

    const authorizer = new DummyAuthorizer();

    new HttpRoute(stack, 'HttpRoute', {
      httpApi,
      integration: new DummyIntegration(),
      routeKey: HttpRouteKey.with('/books', HttpMethod.GET),
      authorizer,
    });

    expect(stack).toHaveResource('AWS::ApiGatewayV2::Integration', {
      ApiId: stack.resolve(httpApi.httpApiId),
      IntegrationType: 'HTTP_PROXY',
      PayloadFormatVersion: '2.0',
      IntegrationUri: 'some-uri',
    });

    expect(stack).toHaveResource('AWS::ApiGatewayV2::Authorizer');

    expect(stack).toHaveResource('AWS::ApiGatewayV2::Route', {
      AuthorizerId: 'auth-1234',
      AuthorizationType: 'JWT',
    });
  });
});

class DummyIntegration implements IHttpRouteIntegration {
  public bind(): HttpRouteIntegrationConfig {
    return {
      type: HttpIntegrationType.HTTP_PROXY,
      payloadFormatVersion: PayloadFormatVersion.VERSION_2_0,
      uri: 'some-uri',
      method: HttpMethod.DELETE,
    };
  }
}

class DummyAuthorizer implements IHttpRouteAuthorizer {
  public bind(_: HttpRouteAuthorizerBindOptions): HttpRouteAuthorizerConfig {
    return {
      authorizerId: 'auth-1234',
      authorizationType: HttpAuthorizerType.JWT,
    };
  }
}