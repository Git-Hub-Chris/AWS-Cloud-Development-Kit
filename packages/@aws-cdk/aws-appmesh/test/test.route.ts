import { expect, haveResourceLike } from '@aws-cdk/assert';
import * as cdk from '@aws-cdk/core';
import { Test } from 'nodeunit';

import * as appmesh from '../lib';

export = {
  'When creating new routes': {
    'route has expected defaults'(test:Test) {
      // GIVEN
      const stack = new cdk.Stack();
      const mesh = new appmesh.Mesh(stack, 'mesh', {
        meshName: 'test-mesh',
      });
      const router = new appmesh.VirtualRouter(stack, 'router', {
        mesh,
      });

      // WHEN
      const node = mesh.addVirtualNode('test-node', {
        serviceDiscovery: appmesh.ServiceDiscovery.dns('test'),
        listeners: [appmesh.VirtualNodeListener.http()],
      });

      router.addRoute('test-http-route', {
        routeSpec: appmesh.RouteSpec.http({
          weightedTargets: [
            {
              virtualNode: node,
            },
          ],
          timeout: {
            idle: cdk.Duration.seconds(10),
            perRequest: cdk.Duration.seconds(11),
          },
        }),
      });

      router.addRoute('test-http2-route', {
        routeSpec: appmesh.RouteSpec.http2({
          weightedTargets: [
            {
              virtualNode: node,
            },
          ],
          timeout: {
            idle: cdk.Duration.seconds(12),
            perRequest: cdk.Duration.seconds(13),
          },
        }),
      });

      router.addRoute('test-tcp-route', {
        routeSpec: appmesh.RouteSpec.tcp({
          weightedTargets: [
            {
              virtualNode: node,
            },
          ],
          timeout: {
            idle: cdk.Duration.seconds(14),
          },
        }),
      });

      router.addRoute('test-grpc-route', {
        routeSpec: appmesh.RouteSpec.grpc({
          weightedTargets: [
            {
              virtualNode: node,
            },
          ],
          match: {
            serviceName: 'test.svc.local',
          },
          timeout: {
            idle: cdk.Duration.seconds(15),
            perRequest: cdk.Duration.seconds(16),
          },
        }),
      });

      // THEN
      expect(stack).to(haveResourceLike('AWS::AppMesh::Route', {
        Spec: {
          HttpRoute: {
            Action: {
              WeightedTargets: [
                {
                  VirtualNode: {
                    'Fn::GetAtt': [
                      'meshtestnodeF93946D4',
                      'VirtualNodeName',
                    ],
                  },
                  Weight: 1,
                },
              ],
            },
            Match: {
              Prefix: '/',
            },
            Timeout: {
              Idle: {
                Value: 10000,
                Unit: 'ms',
              },
              PerRequest: {
                Value: 11000,
                Unit: 'ms',
              },
            },
          },
        },
        RouteName: 'test-http-route',
      }));

      expect(stack).to(haveResourceLike('AWS::AppMesh::Route', {
        Spec: {
          Http2Route: {
            Action: {
              WeightedTargets: [
                {
                  VirtualNode: {
                    'Fn::GetAtt': [
                      'meshtestnodeF93946D4',
                      'VirtualNodeName',
                    ],
                  },
                  Weight: 1,
                },
              ],
            },
            Match: {
              Prefix: '/',
            },
            Timeout: {
              Idle: {
                Value: 12000,
                Unit: 'ms',
              },
              PerRequest: {
                Value: 13000,
                Unit: 'ms',
              },
            },
          },
        },
        RouteName: 'test-http2-route',
      }));

      expect(stack).to(haveResourceLike('AWS::AppMesh::Route', {
        Spec: {
          TcpRoute: {
            Action: {
              WeightedTargets: [
                {
                  VirtualNode: {
                    'Fn::GetAtt': [
                      'meshtestnodeF93946D4',
                      'VirtualNodeName',
                    ],
                  },
                  Weight: 1,
                },
              ],
            },
            Timeout: {
              Idle: {
                Value: 14000,
                Unit: 'ms',
              },
            },
          },
        },
        RouteName: 'test-tcp-route',
      }));

      expect(stack).to(haveResourceLike('AWS::AppMesh::Route', {
        Spec: {
          GrpcRoute: {
            Action: {
              WeightedTargets: [
                {
                  VirtualNode: {
                    'Fn::GetAtt': [
                      'meshtestnodeF93946D4',
                      'VirtualNodeName',
                    ],
                  },
                  Weight: 1,
                },
              ],
            },
            Match: {
              ServiceName: 'test.svc.local',
            },
            Timeout: {
              Idle: {
                Value: 15000,
                Unit: 'ms',
              },
              PerRequest: {
                Value: 16000,
                Unit: 'ms',
              },
            },
          },
        },
        RouteName: 'test-grpc-route',
      }));

      test.done();
    },

    'should have expected features'(test: Test) {
      // GIVEN
      const stack = new cdk.Stack();
      const mesh = new appmesh.Mesh(stack, 'mesh', {
        meshName: 'test-mesh',
      });
      const router = new appmesh.VirtualRouter(stack, 'router', {
        mesh,
      });

      // WHEN
      const node = mesh.addVirtualNode('test-node', {
        serviceDiscovery: appmesh.ServiceDiscovery.dns('test'),
        listeners: [appmesh.VirtualNodeListener.http()],
      });

      router.addRoute('test-http-route', {
        routeSpec: appmesh.RouteSpec.http({
          weightedTargets: [
            {
              virtualNode: node,
            },
          ],
          match: {
            prefixPath: '/node',
          },
          timeout: {
            idle: cdk.Duration.seconds(10),
            perRequest: cdk.Duration.seconds(11),
          },
        }),
      });

      // THEN
      expect(stack).to(haveResourceLike('AWS::AppMesh::Route', {
        Spec: {
          HttpRoute: {
            Action: {
              WeightedTargets: [
                {
                  VirtualNode: {
                    'Fn::GetAtt': [
                      'meshtestnodeF93946D4',
                      'VirtualNodeName',
                    ],
                  },
                  Weight: 1,
                },
              ],
            },
            Match: {
              Prefix: '/node',
            },
            Timeout: {
              Idle: {
                Value: 10000,
                Unit: 'ms',
              },
              PerRequest: {
                Value: 11000,
                Unit: 'ms',
              },
            },
          },
        },
        RouteName: 'test-http-route',
      }));
      test.done();
    },

    'should match routes based on headers'(test: Test) {
      // GIVEN
      const stack = new cdk.Stack();
      const mesh = new appmesh.Mesh(stack, 'mesh', {
        meshName: 'test-mesh',
      });

      const router = new appmesh.VirtualRouter(stack, 'router', {
        mesh,
      });

      const virtualNode = mesh.addVirtualNode('test-node', {
        serviceDiscovery: appmesh.ServiceDiscovery.dns('test'),
        listeners: [appmesh.VirtualNodeListener.http()],
      });

      // WHEN
      router.addRoute('route', {
        routeSpec: appmesh.RouteSpec.http2({
          weightedTargets: [{ virtualNode }],
          match: {
            prefixPath: '/',
            headers: [
              appmesh.HeaderMatch.valueIs('Content-Type', 'application/json'),
              appmesh.HeaderMatch.valueIsNot('Content-Type', 'text/html'),
              appmesh.HeaderMatch.valueStartsWith('Content-Type', 'application/'),
              appmesh.HeaderMatch.valueDoesNotStartWith('Content-Type', 'text/'),
              appmesh.HeaderMatch.valueEndsWith('Content-Type', '/json'),
              appmesh.HeaderMatch.valueDoesNotEndWith('Content-Type', '/json+foobar'),
              appmesh.HeaderMatch.valueMatchesRegex('Content-Type', 'application/.*'),
              appmesh.HeaderMatch.valueDoesNotMatchRegex('Content-Type', 'text/.*'),
              appmesh.HeaderMatch.valuesIsInRange('Max-Forward', 1, 5),
              appmesh.HeaderMatch.valuesIsNotInRange('Max-Forward', 1, 5),
            ],
          },
        }),
      });

      // THEN
      expect(stack).to(haveResourceLike('AWS::AppMesh::Route', {
        Spec: {
          Http2Route: {
            Match: {
              Prefix: '/',
              Headers: [
                {
                  Invert: false,
                  Match: { Exact: 'application/json' },
                  Name: 'Content-Type',
                },
                {
                  Invert: true,
                  Match: { Exact: 'text/html' },
                  Name: 'Content-Type',
                },
                {
                  Invert: false,
                  Match: { Prefix: 'application/' },
                  Name: 'Content-Type',
                },
                {
                  Invert: true,
                  Match: { Prefix: 'text/' },
                  Name: 'Content-Type',
                },
                {
                  Invert: false,
                  Match: { Suffix: '/json' },
                  Name: 'Content-Type',
                },
                {
                  Invert: true,
                  Match: { Suffix: '/json+foobar' },
                  Name: 'Content-Type',
                },
                {
                  Invert: false,
                  Match: { Regex: 'application/.*' },
                  Name: 'Content-Type',
                },
                {
                  Invert: true,
                  Match: { Regex: 'text/.*' },
                  Name: 'Content-Type',
                },
                {
                  Invert: false,
                  Match: {
                    Range: {
                      End: 5,
                      Start: 1,
                    },
                  },
                  Name: 'Max-Forward',
                },
                {
                  Invert: true,
                  Match: {
                    Range: {
                      End: 5,
                      Start: 1,
                    },
                  },
                  Name: 'Max-Forward',
                },
              ],
            },
          },
        },
      }));

      test.done();
    },

    'should match routes based on method'(test: Test) {
      // GIVEN
      const stack = new cdk.Stack();
      const mesh = new appmesh.Mesh(stack, 'mesh', {
        meshName: 'test-mesh',
      });

      const router = new appmesh.VirtualRouter(stack, 'router', {
        mesh,
      });

      const virtualNode = mesh.addVirtualNode('test-node', {
        serviceDiscovery: appmesh.ServiceDiscovery.dns('test'),
        listeners: [appmesh.VirtualNodeListener.http()],
      });

      // WHEN
      router.addRoute('route', {
        routeSpec: appmesh.RouteSpec.http2({
          weightedTargets: [{ virtualNode }],
          match: {
            prefixPath: '/',
            method: appmesh.HttpRouteMatchMethod.GET,
          },
        }),
      });

      // THEN
      expect(stack).to(haveResourceLike('AWS::AppMesh::Route', {
        Spec: {
          Http2Route: {
            Match: {
              Prefix: '/',
              Method: 'GET',
            },
          },
        },
      }));

      test.done();
    },

    'should match routes based on scheme'(test: Test) {
      // GIVEN
      const stack = new cdk.Stack();
      const mesh = new appmesh.Mesh(stack, 'mesh', {
        meshName: 'test-mesh',
      });

      const router = new appmesh.VirtualRouter(stack, 'router', {
        mesh,
      });

      const virtualNode = mesh.addVirtualNode('test-node', {
        serviceDiscovery: appmesh.ServiceDiscovery.dns('test'),
        listeners: [appmesh.VirtualNodeListener.http()],
      });

      // WHEN
      router.addRoute('route', {
        routeSpec: appmesh.RouteSpec.http2({
          weightedTargets: [{ virtualNode }],
          match: {
            prefixPath: '/',
            protocol: appmesh.HttpRouteMatchScheme.HTTP,
          },
        }),
      });

      // THEN
      expect(stack).to(haveResourceLike('AWS::AppMesh::Route', {
        Spec: {
          Http2Route: {
            Match: {
              Prefix: '/',
              Scheme: 'http',
            },
          },
        },
      }));

      test.done();
    },

    'should allow route priority'(test: Test) {
      // GIVEN
      const stack = new cdk.Stack();
      const mesh = new appmesh.Mesh(stack, 'mesh', {
        meshName: 'test-mesh',
      });

      const router = new appmesh.VirtualRouter(stack, 'router', {
        mesh,
      });

      const virtualNode = mesh.addVirtualNode('test-node', {
        serviceDiscovery: appmesh.ServiceDiscovery.dns('test'),
        listeners: [appmesh.VirtualNodeListener.http()],
      });

      // WHEN
      router.addRoute('http2', {
        routeSpec: appmesh.RouteSpec.http2({
          priority: 0,
          weightedTargets: [{ virtualNode }],
        }),
      });
      router.addRoute('http', {
        routeSpec: appmesh.RouteSpec.http({
          priority: 10,
          weightedTargets: [{ virtualNode }],
        }),
      });
      router.addRoute('grpc', {
        routeSpec: appmesh.RouteSpec.grpc({
          priority: 20,
          weightedTargets: [{ virtualNode }],
          match: {
            serviceName: 'test',
          },
        }),
      });
      router.addRoute('tcp', {
        routeSpec: appmesh.RouteSpec.tcp({
          priority: 30,
          weightedTargets: [{ virtualNode }],
        }),
      });

      // THEN
      expect(stack).to(haveResourceLike('AWS::AppMesh::Route', {
        Spec: {
          Priority: 0,
          Http2Route: {},
        },
      }));
      expect(stack).to(haveResourceLike('AWS::AppMesh::Route', {
        Spec: {
          Priority: 10,
          HttpRoute: {},
        },
      }));
      expect(stack).to(haveResourceLike('AWS::AppMesh::Route', {
        Spec: {
          Priority: 20,
          GrpcRoute: {},
        },
      }));
      expect(stack).to(haveResourceLike('AWS::AppMesh::Route', {
        Spec: {
          Priority: 30,
          TcpRoute: {},
        },
      }));

      test.done();
    },
  },

  'Can import Routes using an ARN'(test: Test) {
    const app = new cdk.App();
    // GIVEN
    const stack = new cdk.Stack(app, 'Imports', {
      env: { account: '123456789012', region: 'us-east-1' },
    });
    const meshName = 'test-mesh';
    const virtualRouterName = 'test-virtual-router';
    const routeName = 'test-route';
    const arn = `arn:aws:appmesh:us-east-1:123456789012:mesh/${meshName}/virtualRouter/${virtualRouterName}/gatewayRoute/${routeName}`;

    // WHEN
    const route = appmesh.Route.fromRouteArn(stack, 'importedRoute', arn);
    // THEN
    test.equal(route.routeName, routeName);
    test.equal(route.virtualRouter.virtualRouterName, virtualRouterName);
    test.equal(route.virtualRouter.mesh.meshName, meshName);
    test.done();
  },

  'Can import Routes using ARN and attributes'(test: Test) {
    const app = new cdk.App();
    // GIVEN
    const stack = new cdk.Stack(app, 'Imports', {
      env: { account: '123456789012', region: 'us-east-1' },
    });
    const meshName = 'test-mesh';
    const virtualRouterName = 'test-virtual-router';
    const routeName = 'test-route';

    // WHEN
    const mesh = appmesh.Mesh.fromMeshName(stack, 'Mesh', meshName);
    const virtualRouter = mesh.addVirtualRouter('VirtualGateway', {
      virtualRouterName: virtualRouterName,
    });
    const route = appmesh.Route.fromRouteAttributes(stack, 'importedRoute', { routeName, virtualRouter });
    // THEN
    test.equal(route.routeName, routeName);
    test.equal(route.virtualRouter.mesh.meshName, meshName);

    test.done();
  },
};
