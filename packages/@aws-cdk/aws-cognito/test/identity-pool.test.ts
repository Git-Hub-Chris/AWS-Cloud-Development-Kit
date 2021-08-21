import { Template } from '@aws-cdk/assertions';
import {
  Role,
  ServicePrincipal,
  ArnPrincipal,
  AnyPrincipal,
  OpenIdConnectProvider,
  SamlProvider,
  SamlMetadataDocument,
  Effect,
  PolicyDocument,
  PolicyStatement,
} from '@aws-cdk/aws-iam';
import { Function } from '@aws-cdk/aws-lambda';
import { Stack } from '@aws-cdk/core';
import { IdentityPool, SupportedLoginProviderType, RoleMappingMatchType } from '../lib/identity-pool';
import { UserPool } from '../lib/user-pool';
import { UserPoolIdentityProvider } from '../lib/user-pool-idp';

describe('identity pool', () => {
  test('minimal setup', () => {
    const stack = new Stack();
    const authRole = new Role(stack, 'authRole', {
      assumedBy: new ServicePrincipal('service.amazonaws.com'),
    });
    const unauthRole = new Role(stack, 'unauthRole', {
      assumedBy: new ServicePrincipal('service.amazonaws.com'),
    });
    new IdentityPool(stack, 'TestIdentityPool', {
      authenticatedRole: authRole,
      unauthenticatedRole: unauthRole,
    });
    const temp = Template.fromStack(stack);

    temp.hasResourceProperties('AWS::Cognito::IdentityPool', {
      AllowUnauthenticatedIdentities: false,
    });

    temp.hasResourceProperties('AWS::IAM::Role', {
      AssumeRolePolicyDocument: {
        Statement: [
          {
            Action: 'sts:AssumeRole',
            Effect: 'Allow',
            Principal: {
              Service: 'service.amazonaws.com',
            },
          },
        ],
      },
    });

    temp.resourceCountIs('AWS::IAM::Role', 2);

    temp.hasResourceProperties('AWS::Cognito::IdentityPoolRoleAttachment', {
      IdentityPoolId: {
        Ref: 'TestIdentityPool328F7622',
      },
      Roles: {
        authenticated: {
          'Fn::GetAtt': [
            'authRoleB7A6401B',
            'Arn',
          ],
        },
        unauthenticated: {
          'Fn::GetAtt': [
            'unauthRole8318277E',
            'Arn',
          ],
        },
      },
    });
  });

  test('from static', () => {
    const stack = new Stack(undefined, undefined, {
      env: {
        region: 'my-region',
        account: '1234567891011',
      },
    });
    expect(() => IdentityPool.fromIdentityPoolId(stack, 'idPoolIdError', 'idPool')).toThrowError('Invalid Identity Pool Id: Identity Pool Ids must follow the format <region>:<id>');
    expect(() => IdentityPool.fromIdentityPoolArn(stack, 'idPoolArnError', 'arn:aws:cognito-identity:my-region:1234567891011:identitypool\/your-region:idPool/')).toThrowError('Invalid Identity Pool Id: Region in Identity Pool Id must match stack region');
    const idPool = IdentityPool.fromIdentityPoolId(stack, 'staticIdPool', 'my-region:idPool');

    expect(idPool.identityPoolId).toEqual('my-region:idPool');
    expect(idPool.identityPoolArn).toMatch(/cognito-identity:my-region:1234567891011:identitypool\/my-region:idPool/);
  });

  test('user pools are properly configured', () => {
    const stack = new Stack();
    const authRole = new Role(stack, 'authRole', {
      assumedBy: new ServicePrincipal('service.amazonaws.com'),
    });
    const unauthRole = new Role(stack, 'unauthRole', {
      assumedBy: new ServicePrincipal('service.amazonaws.com'),
    });
    const poolProvider = UserPoolIdentityProvider.fromProviderName(stack, 'poolProvider', 'poolProvider');
    const otherPoolProvider = UserPoolIdentityProvider.fromProviderName(stack, 'otherPoolProvider', 'otherPoolProvider');
    const pool = new UserPool(stack, 'Pool');
    const otherPool = new UserPool(stack, 'OtherPool');
    pool.registerIdentityProvider(poolProvider);
    otherPool.registerIdentityProvider(otherPoolProvider);
    const userPools = [pool];
    const idPool = new IdentityPool(stack, 'TestIdentityPoolUserPools', {
      authenticatedRole: authRole,
      unauthenticatedRole: unauthRole,
      userPools,
    });
    idPool.addUserPool(otherPool, undefined, true);
    const temp = Template.fromStack(stack);
    temp.resourceCountIs('AWS::Cognito::UserPool', 2);
    temp.resourceCountIs('AWS::Cognito::UserPoolClient', 2);
    temp.hasResourceProperties('AWS::Cognito::UserPoolClient', {
      UserPoolId: {
        Ref: 'PoolD3F588B8',
      },
      AllowedOAuthFlows: [
        'implicit',
        'code',
      ],
      AllowedOAuthFlowsUserPoolClient: true,
      AllowedOAuthScopes: [
        'profile',
        'phone',
        'email',
        'openid',
        'aws.cognito.signin.user.admin',
      ],
      CallbackURLs: [
        'https://example.com',
      ],
      SupportedIdentityProviders: [
        'poolProvider',
        'COGNITO',
      ],
    });
    temp.hasResourceProperties('AWS::Cognito::UserPoolClient', {
      UserPoolId: {
        Ref: 'OtherPool7DA7F2F7',
      },
      AllowedOAuthFlows: [
        'implicit',
        'code',
      ],
      AllowedOAuthFlowsUserPoolClient: true,
      AllowedOAuthScopes: [
        'profile',
        'phone',
        'email',
        'openid',
        'aws.cognito.signin.user.admin',
      ],
      CallbackURLs: [
        'https://example.com',
      ],
      SupportedIdentityProviders: [
        'otherPoolProvider',
        'COGNITO',
      ],
    });
    temp.hasResourceProperties('AWS::Cognito::IdentityPool', {
      AllowUnauthenticatedIdentities: false,
      CognitoIdentityProviders: [
        {
          ClientId: {
            Ref: 'PoolUserPoolClientForundefinedBF6BDE57',
          },
          ProviderName: 'poolProvider',
          ServerSideTokenCheck: true,
        },
        {
          ClientId: {
            Ref: 'OtherPoolUserPoolClientForundefined1B97829F',
          },
          ProviderName: 'otherPoolProvider',
          ServerSideTokenCheck: false,
        },
      ],
    });
  });

  test('openId, saml, classicFlow, customProviders', () => {
    const stack = new Stack();
    const authRole = new Role(stack, 'authRole', {
      assumedBy: new ServicePrincipal('service.amazonaws.com'),
    });
    const unauthRole = new Role(stack, 'unauthRole', {
      assumedBy: new ServicePrincipal('service.amazonaws.com'),
    });
    const openId = new OpenIdConnectProvider(stack, 'OpenId', {
      url: 'https://example.com',
      clientIds: ['client1', 'client2'],
      thumbprints: ['thumbprint'],
    });
    const saml = new SamlProvider(stack, 'Provider', {
      metadataDocument: SamlMetadataDocument.fromXml('document'),
    });
    new IdentityPool(stack, 'TestIdentityPoolCustomProviders', {
      authenticatedRole: authRole,
      unauthenticatedRole: unauthRole,
      openIdConnectProviders: [openId],
      samlProviders: [saml],
      customProvider: 'https://my-custom-provider.com',
      allowClassicFlow: true,
    });
    const temp = Template.fromStack(stack);
    temp.resourceCountIs('Custom::AWSCDKOpenIdConnectProvider', 1);
    temp.resourceCountIs('AWS::IAM::SAMLProvider', 1);
    temp.hasResourceProperties('AWS::Cognito::IdentityPool', {
      AllowUnauthenticatedIdentities: false,
      AllowClassicFlow: true,
      DeveloperProviderName: 'https://my-custom-provider.com',
      OpenIdConnectProviderARNs: [
        {
          Ref: 'OpenId76D94D20',
        },
      ],
      SamlProviderARNs: [
        {
          Ref: 'Provider2281708E',
        },
      ],
    });
  });

  test('pushSync, cognito events and streams, supported login providers', () => {
    const stack = new Stack();
    const authRole = new Role(stack, 'authRole', {
      assumedBy: new ServicePrincipal('service.amazonaws.com'),
    });
    const unauthRole = new Role(stack, 'unauthRole', {
      assumedBy: new ServicePrincipal('service.amazonaws.com'),
    });
    const pushSyncRole = new Role(stack, 'pushSyncRole', {
      assumedBy: new ServicePrincipal('service.amazonaws.com'),
    });
    const streamRole = new Role(stack, 'streamRole', {
      assumedBy: new ServicePrincipal('service.amazonaws.com'),
    });
    new IdentityPool(stack, 'TestIdentityPoolPushSyncStreamsEventsEtc', {
      authenticatedRole: authRole,
      unauthenticatedRole: unauthRole,
      allowUnauthenticatedIdentities: true,
      identityPoolName: 'my-id-pool',
      pushSyncConfig: {
        applicationArns: ['my::application::arn'],
        role: pushSyncRole,
      },
      streamOptions: {
        streamName: 'my-stream',
        enableStreamingStatus: true,
        role: streamRole,
      },
      supportedLoginProviders: {
        amazon: 'my-app.amazon.com',
        google: 'my-app.google.com',
      },
      syncTrigger: Function.fromFunctionArn(stack, 'my-event-function', 'my::lambda::arn'),
    });
    const temp = Template.fromStack(stack);
    temp.resourceCountIs('AWS::IAM::Role', 4);
    temp.hasResourceProperties('AWS::Cognito::IdentityPool', {
      AllowUnauthenticatedIdentities: true,
      CognitoEvents: {
        SyncTrigger: 'my::lambda::arn',
      },
      CognitoStreams: {
        RoleArn: {
          'Fn::GetAtt': [
            'streamRoleFD11C7FD',
            'Arn',
          ],
        },
        StreamName: 'my-stream',
        StreamingStatus: 'ENABLED',
      },
      IdentityPoolName: 'my-id-pool',
      PushSync: {
        ApplicationArns: [
          'my::application::arn',
        ],
        RoleArn: {
          'Fn::GetAtt': [
            'pushSyncRole90B6639A',
            'Arn',
          ],
        },
      },
      SupportedLoginProviders: {
        'www.amazon.com': 'my-app.amazon.com',
        'accounts.google.com': 'my-app.google.com',
      },
    });
  });
});

describe('role mappings', () => {
  test('using token', () => {
    const stack = new Stack();
    const authRole = new Role(stack, 'authRole', {
      assumedBy: new ServicePrincipal('service.amazonaws.com'),
    });
    const unauthRole = new Role(stack, 'unauthRole', {
      assumedBy: new ServicePrincipal('service.amazonaws.com'),
    });
    new IdentityPool(stack, 'TestIdentityPoolRoleMappingToken', {
      authenticatedRole: authRole,
      unauthenticatedRole: unauthRole,
      roleMappings: [{
        providerUrl: SupportedLoginProviderType.AMAZON,
        useToken: true,
      }],
    });
    Template.fromStack(stack).hasResourceProperties('AWS::Cognito::IdentityPoolRoleAttachment', {
      IdentityPoolId: {
        Ref: 'TestIdentityPoolRoleMappingTokenE6CC49E0',
      },
      RoleMappings: {
        'www.amazon.com': {
          AmbiguousRoleResolution: 'Deny',
          IdentityProvider: 'www.amazon.com',
          Type: 'Token',
        },
      },
      Roles: {
        authenticated: {
          'Fn::GetAtt': [
            'authRoleB7A6401B',
            'Arn',
          ],
        },
        unauthenticated: {
          'Fn::GetAtt': [
            'unauthRole8318277E',
            'Arn',
          ],
        },
      },
    });
  });

  test('rules type without rules throws', () => {
    const stack = new Stack();
    const authRole = new Role(stack, 'authRole', {
      assumedBy: new ServicePrincipal('service.amazonaws.com'),
    });
    const unauthRole = new Role(stack, 'unauthRole', {
      assumedBy: new ServicePrincipal('service.amazonaws.com'),
    });
    expect(() => new IdentityPool(stack, 'TestIdentityPoolRoleMappingErrors', {
      authenticatedRole: authRole,
      unauthenticatedRole: unauthRole,
      roleMappings: [{
        providerUrl: SupportedLoginProviderType.AMAZON,
      }],
    })).toThrowError('IdentityPoolRoleMapping.rules is required when useToken is false');
  });

  test('role mapping with rules configuration', () => {
    const stack = new Stack();
    const authRole = new Role(stack, 'authRole', {
      assumedBy: new ServicePrincipal('service.amazonaws.com'),
    });
    const unauthRole = new Role(stack, 'unauthRole', {
      assumedBy: new ServicePrincipal('noservice.amazonaws.com'),
    });
    const adminRole = new Role(stack, 'adminRole', {
      assumedBy: new ServicePrincipal('admin.amazonaws.com'),
    });
    const nonAdminRole = new Role(stack, 'nonAdminRole', {
      assumedBy: new AnyPrincipal(),
      inlinePolicies: {
        DenyAll: new PolicyDocument({
          statements: [
            new PolicyStatement({
              effect: Effect.DENY,
              actions: ['update:*', 'put:*', 'delete:*'],
              resources: ['*'],
            }),
          ],
        }),
      },
    });
    const facebookRole = new Role(stack, 'facebookRole', {
      assumedBy: new ArnPrincipal('arn:aws:iam::123456789012:user/FacebookUser'),
    });
    const idPool = new IdentityPool(stack, 'TestIdentityPoolRoleMappingRules', {
      authenticatedRole: authRole,
      unauthenticatedRole: unauthRole,
      roleMappings: [{
        providerUrl: SupportedLoginProviderType.AMAZON,
        resolveAmbiguousRoles: true,
        rules: [
          {
            claim: 'custom:admin',
            claimValue: 'admin',
            mappedRole: adminRole,
          },
          {
            claim: 'custom:admin',
            claimValue: 'admin',
            matchType: RoleMappingMatchType.NOTEQUAL,
            mappedRole: nonAdminRole,
          },
        ],
      }],
    });
    idPool.addRoleMappings({
      providerUrl: SupportedLoginProviderType.FACEBOOK,
      rules: [
        {
          claim: 'iss',
          claimValue: 'https://graph.facebook.com',
          mappedRole: facebookRole,
        },
      ],
    });

    Template.fromStack(stack).hasResourceProperties('AWS::Cognito::IdentityPoolRoleAttachment', {
      IdentityPoolId: {
        Ref: 'TestIdentityPoolRoleMappingRulesA841EAFB',
      },
      RoleMappings: {
        'www.amazon.com': {
          AmbiguousRoleResolution: 'AuthenticatedRole',
          IdentityProvider: 'www.amazon.com',
          RulesConfiguration: {
            Rules: [
              {
                Claim: 'custom:admin',
                MatchType: 'Equals',
                RoleARN: {
                  'Fn::GetAtt': [
                    'adminRoleC345D70B',
                    'Arn',
                  ],
                },
                Value: 'admin',
              },
              {
                Claim: 'custom:admin',
                MatchType: 'NotEqual',
                RoleARN: {
                  'Fn::GetAtt': [
                    'nonAdminRole43C19D5C',
                    'Arn',
                  ],
                },
                Value: 'admin',
              },
            ],
          },
          Type: 'Rules',
        },
        'graph.facebook.com': {
          AmbiguousRoleResolution: 'Deny',
          IdentityProvider: 'graph.facebook.com',
          RulesConfiguration: {
            Rules: [
              {
                Claim: 'iss',
                MatchType: 'Equals',
                RoleARN: {
                  'Fn::GetAtt': [
                    'facebookRoleC345D70B',
                    'Arn',
                  ],
                },
                Value: 'https://graph.facebook.com',
              },
            ],
          },
        },
        Type: 'Rules',
      },
      Roles: {
        authenticated: {
          'Fn::GetAtt': [
            'authRoleB7A6401B',
            'Arn',
          ],
        },
        unauthenticated: {
          'Fn::GetAtt': [
            'unauthRole8318277E',
            'Arn',
          ],
        },
      },
    });
  });
});