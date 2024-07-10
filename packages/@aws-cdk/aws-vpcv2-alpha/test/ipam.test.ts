import { Template } from 'aws-cdk-lib/assertions';
import * as cdk from 'aws-cdk-lib';
import * as vpc from '../lib';
import { AddressFamily, Ipam, IpamPoolPublicIpSource } from '../lib';

describe('IPAM Test', () => {
  let stack: cdk.Stack;
  let ipam: Ipam;

  beforeEach(() => {
    const envUSA = { region: 'us-west-2' };
    const app = new cdk.App({
      context: {
        '@aws-cdk/core:newStyleStackSynthesis': false,
      },
    });
    stack = new cdk.Stack(app, 'IPAMTestStack', {
      env: envUSA,
    });
    ipam = new Ipam(stack, 'Ipam');
  });

  test('Creates IP Pool under Public Scope', () => {

    const pool = ipam.publicScope.addPool('Public', {
      addressFamily: AddressFamily.IP_V6,
      awsService: 'ec2',
      locale: 'us-east-1',
      publicIpSource: IpamPoolPublicIpSource.AMAZON,
    });

    new vpc.VpcV2(stack, 'TestVPC', {
      primaryAddressBlock: vpc.IpAddresses.ipv4('10.2.0.0/16'),
      secondaryAddressBlocks: [vpc.IpAddresses.ipv6Ipam({
        ipv6IpamPool: pool,
        ipv6NetmaskLength: 52,
      })],
    });
    Template.fromStack(stack).hasResourceProperties(
      'AWS::EC2::IPAMPool',
      {
        AddressFamily: 'ipv6',
        IpamScopeId: {
          'Fn::GetAtt': [
            'Ipam50346F82',
            'PublicDefaultScopeId',
          ],
        },
        Locale: 'us-east-1',
      },
    ); //End Template
  }); // End Test

  test('Creates IP Pool under Private Scope', () => {

    const pool = ipam.privateScope.addPool('Private', {
      addressFamily: vpc.AddressFamily.IP_V4,
      provisionedCidrs: [{ cidr: '10.2.0.0/16' }],
      locale: 'us-east-1',
    });

    new vpc.VpcV2(stack, 'TestVPC', {
      primaryAddressBlock: vpc.IpAddresses.ipv4('10.2.0.0/16'),
      secondaryAddressBlocks: [vpc.IpAddresses.ipv4Ipam({
        ipv4IpamPool: pool,
        ipv4NetmaskLength: 20,
      })],
    });
    Template.fromStack(stack).hasResourceProperties(
      'AWS::EC2::IPAMPool',
      {
        AddressFamily: 'ipv4',
        IpamScopeId: {
          'Fn::GetAtt': [
            'Ipam50346F82',
            'PrivateDefaultScopeId',
          ],
        },
        Locale: 'us-east-1',
      },
    ); //End Template
  });

  test('Creates IPAM CIDR pool under public scope for IPv6', () => {
    // Create IPAM resources
    const ipamIpv6 = new Ipam(stack, 'TestIpam');
    const poolOptions: vpc.PoolOptions = {
      addressFamily: AddressFamily.IP_V6,
      awsService: 'ec2',
      publicIpSource: IpamPoolPublicIpSource.AMAZON,
      locale: 'us-east-1',
    };
    ipamIpv6.publicScope.addPool('TestPool', poolOptions);

    // Define the expected CloudFormation template
    const expectedTemplate = {
      Resources: {
        Ipam50346F82: { Type: 'AWS::EC2::IPAM' },
        TestIpamDBF92BA8: { Type: 'AWS::EC2::IPAM' },
        TestIpamTestPool5D90F91B: {
          Type: 'AWS::EC2::IPAMPool',
          Properties: {
            AddressFamily: 'ipv6',
            IpamScopeId: {
              'Fn::GetAtt':
                ['TestIpamDBF92BA8',
                  'PublicDefaultScopeId'],
            },
            Locale: 'us-east-1',
          },
        },
      },
    };
    // // Assert that the generated template matches the expected template
    Template.fromStack(stack).templateMatches(expectedTemplate);
  });

  test('Get region from stack env', () => {
    // Create IPAM resources
    const ipamRegion = new Ipam(stack, 'TestIpam');
    const poolOptions: vpc.PoolOptions = {
      addressFamily: AddressFamily.IP_V6,
      awsService: 'ec2',
      publicIpSource: IpamPoolPublicIpSource.AMAZON,
    };
    ipamRegion.publicScope.addPool('TestPool', poolOptions);

    // Define the expected CloudFormation template
    const expectedTemplate = {
      Resources: {
        Ipam50346F82: { Type: 'AWS::EC2::IPAM' },
        TestIpamDBF92BA8: { Type: 'AWS::EC2::IPAM' },
        TestIpamTestPool5D90F91B: {
          Type: 'AWS::EC2::IPAMPool',
          Properties: {
            AddressFamily: 'ipv6',
            IpamScopeId: {
              'Fn::GetAtt':
                ['TestIpamDBF92BA8',
                  'PublicDefaultScopeId'],
            },
            Locale: 'us-west-2',
          },
        },
      },
    };
    // // Assert that the generated template matches the expected template
    Template.fromStack(stack).templateMatches(expectedTemplate);
  });

  test('Creates IPAM with default scopes', () => {
    new Ipam(stack, 'TestIpam');
    Template.fromStack(stack).hasResource(
      'AWS::EC2::IPAM', {},
    );
  });

});// End Test