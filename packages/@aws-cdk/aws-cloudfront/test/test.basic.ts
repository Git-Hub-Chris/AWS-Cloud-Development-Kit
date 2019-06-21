import { expect, haveResource } from '@aws-cdk/assert';
import * as cloudformation from '@aws-cdk/aws-cloudformation';
import * as lambda from '@aws-cdk/aws-lambda';
import * as s3 from '@aws-cdk/aws-s3';
import * as cdk from '@aws-cdk/cdk';
import { Test } from 'nodeunit';
import { CloudFrontWebDistribution, LambdaEdgeEventType, ViewerProtocolPolicy } from '../lib';

// tslint:disable:object-literal-key-quotes

export = {

  'distribution with custom origin adds custom origin'(test: Test) {
    const stack = new cdk.Stack();

    new CloudFrontWebDistribution(stack, 'AnAmazingWebsiteProbably', {
      originConfigs: [
        {
          originHeaders: {
            "X-Custom-Header": "somevalue",
          },
          customOriginSource: {
            domainName: "myorigin.com",
          },
          behaviors: [
            {
              isDefaultBehavior: true,
            }
          ],
        }
      ]
    });

    expect(stack).toMatch(
      {
        "Resources": {
          "AnAmazingWebsiteProbablyCFDistribution47E3983B": {
            "Type": "AWS::CloudFront::Distribution",
            "Properties": {
              "DistributionConfig": {
                "CacheBehaviors": [],
                "DefaultCacheBehavior": {
                  "AllowedMethods": [
                    "GET",
                    "HEAD"
                  ],
                  "CachedMethods": [
                    "GET",
                    "HEAD"
                  ],
                  "ForwardedValues": {
                    "Cookies": {
                      "Forward": "none"
                    },
                    "QueryString": false
                  },
                  "TargetOriginId": "origin1",
                  "ViewerProtocolPolicy": "redirect-to-https"
                },
                "DefaultRootObject": "index.html",
                "Enabled": true,
                "HttpVersion": "http2",
                "IPV6Enabled": true,
                "Origins": [
                  {
                    "CustomOriginConfig": {
                      "HTTPPort": 80,
                      "HTTPSPort": 443,
                      "OriginKeepaliveTimeout": 5,
                      "OriginProtocolPolicy": "https-only",
                      "OriginReadTimeout": 30,
                      "OriginSSLProtocols": [
                        "TLSv1.2"
                      ]
                    },
                    "DomainName": "myorigin.com",
                    "Id": "origin1",
                    "OriginCustomHeaders": [
                      {
                        "HeaderName": "X-Custom-Header",
                        "HeaderValue": "somevalue"
                      }
                    ]
                  }
                ],
                "PriceClass": "PriceClass_100",
                "ViewerCertificate": {
                  "CloudFrontDefaultCertificate": true
                }
              }
            }
          }
        }
      }
    );

    test.done();
  },

  'most basic distribution'(test: Test) {
    const stack = new cdk.Stack();
    const sourceBucket = new s3.Bucket(stack, 'Bucket');

    new CloudFrontWebDistribution(stack, 'AnAmazingWebsiteProbably', {
      originConfigs: [
        {
          s3OriginSource: {
            s3BucketSource: sourceBucket
          },
          behaviors: [
            {
              isDefaultBehavior: true,
            }
          ]
        }
      ]
    });

    expect(stack).toMatch({
      "Resources": {
        "Bucket83908E77": {
          "Type": "AWS::S3::Bucket",
          "DeletionPolicy": "Retain",
        },
        "AnAmazingWebsiteProbablyCFDistribution47E3983B": {
          "Type": "AWS::CloudFront::Distribution",
          "Properties": {
            "DistributionConfig": {
              "DefaultRootObject": "index.html",
              "Origins": [
                {
                  "DomainName": {
                    "Fn::GetAtt": [
                      "Bucket83908E77",
                      "RegionalDomainName"
                    ]
                  },
                  "Id": "origin1",
                  "S3OriginConfig": {}
                }
              ],
              "ViewerCertificate": {
                "CloudFrontDefaultCertificate": true
              },
              "PriceClass": "PriceClass_100",
              "DefaultCacheBehavior": {
                "AllowedMethods": [
                  "GET",
                  "HEAD"
                ],
                "CachedMethods": [
                  "GET",
                  "HEAD"
                ],
                "TargetOriginId": "origin1",
                "ViewerProtocolPolicy": "redirect-to-https",
                "ForwardedValues": {
                  "QueryString": false,
                  "Cookies": { "Forward": "none" }
                }
              },
              "Enabled": true,
              "IPV6Enabled": true,
              "HttpVersion": "http2",
              "CacheBehaviors": []
            }
          }
        }
      }
    });
    test.done();
  },

  'distribution with trusted signers on default distribution'(test: Test) {
    const stack = new cdk.Stack();
    const sourceBucket = new s3.Bucket(stack, 'Bucket');

    new CloudFrontWebDistribution(stack, 'AnAmazingWebsiteProbably', {
      originConfigs: [
        {
          s3OriginSource: {
            s3BucketSource: sourceBucket
          },
          behaviors: [
            {
              isDefaultBehavior: true,
              trustedSigners: ["1234"],
            },
          ]
        }
      ]
    });

    expect(stack).toMatch({
      "Resources": {
        "Bucket83908E77": {
          "Type": "AWS::S3::Bucket",
          "DeletionPolicy": "Retain",
        },
        "AnAmazingWebsiteProbablyCFDistribution47E3983B": {
          "Type": "AWS::CloudFront::Distribution",
          "Properties": {
            "DistributionConfig": {
              "DefaultRootObject": "index.html",
              "Origins": [
                {
                  "DomainName": {
                    "Fn::GetAtt": [
                      "Bucket83908E77",
                      "RegionalDomainName"
                    ]
                  },
                  "Id": "origin1",
                  "S3OriginConfig": {}
                }
              ],
              "ViewerCertificate": {
                "CloudFrontDefaultCertificate": true
              },
              "PriceClass": "PriceClass_100",
              "DefaultCacheBehavior": {
                "AllowedMethods": [
                  "GET",
                  "HEAD"
                ],
                "CachedMethods": [
                  "GET",
                  "HEAD"
                ],
                "TargetOriginId": "origin1",
                "ViewerProtocolPolicy": "redirect-to-https",
                "ForwardedValues": {
                  "QueryString": false,
                  "Cookies": { "Forward": "none" }
                },
                "TrustedSigners": [
                  "1234"
                ]
              },
              "Enabled": true,
              "IPV6Enabled": true,
              "HttpVersion": "http2",
              "CacheBehaviors": []
            }
          }
        }
      }
    });
    test.done();
  },

  'distribution with ViewerProtocolPolicy set to a non-default value'(test: Test) {
    const stack = new cdk.Stack();
    const sourceBucket = new s3.Bucket(stack, 'Bucket');

    new CloudFrontWebDistribution(stack, 'AnAmazingWebsiteProbably', {
      viewerProtocolPolicy: ViewerProtocolPolicy.ALLOW_ALL,
      originConfigs: [
        {
          s3OriginSource: {
            s3BucketSource: sourceBucket
          },
          behaviors: [
            {
              isDefaultBehavior: true,
            }
          ]
        }
      ]
    });

    expect(stack).toMatch({
      "Resources": {
        "Bucket83908E77": {
          "Type": "AWS::S3::Bucket",
          "DeletionPolicy": "Retain",
        },
        "AnAmazingWebsiteProbablyCFDistribution47E3983B": {
          "Type": "AWS::CloudFront::Distribution",
          "Properties": {
            "DistributionConfig": {
              "DefaultRootObject": "index.html",
              "Origins": [
                {
                  "DomainName": {
                    "Fn::GetAtt": [
                      "Bucket83908E77",
                      "RegionalDomainName"
                    ]
                  },
                  "Id": "origin1",
                  "S3OriginConfig": {}
                }
              ],
              "ViewerCertificate": {
                "CloudFrontDefaultCertificate": true
              },
              "PriceClass": "PriceClass_100",
              "DefaultCacheBehavior": {
                "AllowedMethods": [
                  "GET",
                  "HEAD"
                ],
                "CachedMethods": [
                  "GET",
                  "HEAD"
                ],
                "TargetOriginId": "origin1",
                "ViewerProtocolPolicy": "allow-all",
                "ForwardedValues": {
                  "QueryString": false,
                  "Cookies": { "Forward": "none" }
                }
              },
              "Enabled": true,
              "IPV6Enabled": true,
              "HttpVersion": "http2",
              "CacheBehaviors": []
            }
          }
        }
      }
    });
    test.done();
  },

  'distribution with resolvable lambda-association'(test: Test) {
    const stack = new cdk.Stack();
    const sourceBucket = new s3.Bucket(stack, 'Bucket');

    const lambdaFunction = new lambda.SingletonFunction(stack, 'Lambda', {
      uuid: 'xxxx-xxxx-xxxx-xxxx',
      code: lambda.Code.inline('foo'),
      handler: 'index.handler',
      runtime: lambda.Runtime.Nodejs810
    });

    const customResource = new cloudformation.CustomResource(stack, 'CustomResource', {
      provider: cloudformation.CustomResourceProvider.lambda(lambdaFunction)
    });

    new CloudFrontWebDistribution(stack, 'AnAmazingWebsiteProbably', {
      originConfigs: [
        {
          s3OriginSource: {
            s3BucketSource: sourceBucket
          },
          behaviors: [
            {
              isDefaultBehavior: true,
              lambdaFunctionAssociations: [{
                eventType: LambdaEdgeEventType.OriginRequest,
                lambdaFunction: lambda.Version.fromVersionArn(
                  stack,
                  'LambdaEdgeVersion',
                  customResource.getAtt('Output').toString()
                )
              }]
            }
          ]
        }
      ]
    });

    expect(stack).to(haveResource('AWS::CloudFront::Distribution', {
      "DistributionConfig": {
        "DefaultRootObject": "index.html",
        "Origins": [
          {
            "DomainName": {
              "Fn::GetAtt": [
                "Bucket83908E77",
                "RegionalDomainName"
              ]
            },
            "Id": "origin1",
            "S3OriginConfig": {}
          }
        ],
        "ViewerCertificate": {
          "CloudFrontDefaultCertificate": true
        },
        "PriceClass": "PriceClass_100",
        "DefaultCacheBehavior": {
          "AllowedMethods": [
            "GET",
            "HEAD"
          ],
          "CachedMethods": [
            "GET",
            "HEAD"
          ],
          "TargetOriginId": "origin1",
          "ViewerProtocolPolicy": "redirect-to-https",
          "ForwardedValues": {
            "QueryString": false,
            "Cookies": { "Forward": "none" }
          },
          "LambdaFunctionAssociations": [
            {
              "EventType": "origin-request",
              "LambdaFunctionARN": {
                "Fn::Join": [
                  "",
                  [
                    {
                      "Fn::Join": [
                        ":",
                        [
                          {
                            "Fn::Select": [
                              0,
                              {
                                "Fn::Split": [
                                  ":",
                                  {
                                    "Fn::GetAtt": [
                                      "CustomResource",
                                      "Output"
                                    ]
                                  }
                                ]
                              }
                            ]
                          },
                          {
                            "Fn::Select": [
                              1,
                              {
                                "Fn::Split": [
                                  ":",
                                  {
                                    "Fn::GetAtt": [
                                      "CustomResource",
                                      "Output"
                                    ]
                                  }
                                ]
                              }
                            ]
                          },
                          {
                            "Fn::Select": [
                              2,
                              {
                                "Fn::Split": [
                                  ":",
                                  {
                                    "Fn::GetAtt": [
                                      "CustomResource",
                                      "Output"
                                    ]
                                  }
                                ]
                              }
                            ]
                          },
                          {
                            "Fn::Select": [
                              3,
                              {
                                "Fn::Split": [
                                  ":",
                                  {
                                    "Fn::GetAtt": [
                                      "CustomResource",
                                      "Output"
                                    ]
                                  }
                                ]
                              }
                            ]
                          },
                          {
                            "Fn::Select": [
                              4,
                              {
                                "Fn::Split": [
                                  ":",
                                  {
                                    "Fn::GetAtt": [
                                      "CustomResource",
                                      "Output"
                                    ]
                                  }
                                ]
                              }
                            ]
                          },
                          {
                            "Fn::Select": [
                              5,
                              {
                                "Fn::Split": [
                                  ":",
                                  {
                                    "Fn::GetAtt": [
                                      "CustomResource",
                                      "Output"
                                    ]
                                  }
                                ]
                              }
                            ]
                          },
                          {
                            "Fn::Select": [
                              6,
                              {
                                "Fn::Split": [
                                  ":",
                                  {
                                    "Fn::GetAtt": [
                                      "CustomResource",
                                      "Output"
                                    ]
                                  }
                                ]
                              }
                            ]
                          }
                        ]
                      ]
                    },
                    ":",
                    {
                      "Fn::Select": [
                        7,
                        {
                          "Fn::Split": [
                            ":",
                            {
                              "Fn::GetAtt": [
                                "CustomResource",
                                "Output"
                              ]
                            }
                          ]
                        }
                      ]
                    }
                  ]
                ]
              }
            }
          ]
        },
        "Enabled": true,
        "IPV6Enabled": true,
        "HttpVersion": "http2",
        "CacheBehaviors": []
      }
    }));

    test.done();
  },

};
