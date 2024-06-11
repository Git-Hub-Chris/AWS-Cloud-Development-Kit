import { CfnIPAMPool, CfnRoute, CfnRouteTable, CfnVPC, CfnVPCCidrBlock, INetworkAcl, IRouteTable, RouterType, SubnetSelection } from 'aws-cdk-lib/aws-ec2';
//import { NetworkBuilder } from 'aws-cdk-lib/aws-ec2/lib/network-util';
import { Resource } from 'aws-cdk-lib/core';
import { Construct, IDependable } from 'constructs';
import { IpamIpv4, IpamIpv6 } from './ipam';
import { Arn } from 'aws-cdk-lib/core/lib/arn';
import { Token } from 'aws-cdk-lib/core';
import { NetworkBuilder } from 'aws-cdk-lib/aws-ec2/lib/network-util';

export interface IIpIpamOptions{
  readonly ipv4IpamPoolId: any;
  readonly ipv4NetmaskLength: number;
}

export interface Ipv6AddressesOptions {
  readonly scope?: Construct;
  readonly vpcId?: string;
  readonly ipv4options?: IIpv6AddressesOptions;
  readonly ipv6CidrBlock?: string;
}

abstract class IpAddresses {

  public static ipv4(ipv4Cidr: string): IIpAddresses {
    return new ipv4CidrAllocation(ipv4Cidr);
  }

  public static ipv4Ipam(ipv4IpamOptions: IIpIpamOptions) {
    return new IpamIpv4(ipv4IpamOptions);
  }

  public static ipv6(ipv6CidrOptions: IIpv6AddressesOptions): IIpAddresses {
    return new ipv6CidrAllocation(ipv6CidrOptions);
  }

  public static ipv6Ipam(ipv6IpamOptions: IIpIpamOptions): IIpAddresses {
    return new IpamIpv6(ipv6IpamOptions);
  }

  public static amazonProvidedIpv6() {
    return new AmazonProvided();
  }

}

export interface VpcV2Options {

  /**
   * CIDR Block
   */
  readonly ipv4CidrBlock?: string;

  /**
   * CIDR Mask for Vpc
   *
   * @default - Only required when using AWS Ipam
   */
  readonly ipv4NetmaskLength?: number;

  /**
   * ipv4 IPAM Pool Id
   *
   * @default - Only required when using AWS Ipam
   */
  readonly ipv4IpamPool?: CfnIPAMPool;

  /**
   * Implementing ipv6
   */
  readonly ipv6CidrBlock?: string;

  /*
  */
  readonly ipv4IpamPoolId?: string;

  /**
   * CIDR Mask for Vpc
   *
   * @default - Only required when using AWS Ipam
   */
  readonly ipv6NetmaskLength?: number;

  /*
  */
  readonly ipv6IpamPoolId?: string;

  /**
   * required with cidr block for BYOL IP
   */
  readonly ipv6Pool?: string;

  /**
   * required with cidr block for BYOL IP
   */
  readonly amazonProvided?: boolean;
}

export interface IVpcV2 {

  readonly vpcId: string;

  readonly vpcArn: string;

  readonly vpcCidrBlock: string;

}

export interface IIpv6AddressesOptions {
  readonly ipv6CidrBlock?: string;
  readonly ipv6PoolId?: string;
}

export interface IIpAddresses {

  allocateVpcCidr() : VpcV2Options;

  // allocateVpcV6Cidr(options: Ipv6AddressesOptions): VpcV2Options;
}

export interface IpAddressesCidrConfig {
  readonly cidrblock: string;
}

export interface VpcV2Props {

  /** A must IPv4 CIDR block for the VPC
   * https://docs.aws.amazon.com/vpc/latest/userguide/vpc-cidr-blocks.html
  */
  readonly primaryAddressBlock?: IIpAddresses;

  /**Can be  IPv4 or IPv6 */
  readonly secondaryAddressBlocks?: IIpAddresses[];
  readonly enableDnsHostnames?: boolean;
  readonly enableDnsSupport?: boolean;
  readonly useIpv6?: boolean;
}

/**
 * Creates new VPC with added functionalities
 * @resource AWS::EC2::VPC
 */
export class VpcV2 extends Resource implements IVpcV2 {

  /**
   * Identifier for this VPC
   */
  public readonly vpcId: string;

  /**
     * @attribute
     */
  public readonly vpcArn: string;

  /**
     * @attribute
     */
  public readonly vpcCidrBlock: string;

  /**
   *
   */
  /**
   * The IPv6 CIDR block CFN resource.
   *
   * Needed to create a dependency for the subnets.
   */
  public readonly ipv6CidrBlock?: CfnVPCCidrBlock;

  /**
   * The provider of ipv4 addresses
   */
  public readonly ipAddresses: IIpAddresses;

  //public readonly ipv6Addresses: IIpAddresses;

  public readonly resource: CfnVPC;

  /**
   * Indicates if instances launched in this VPC will have public DNS hostnames.
   */
  public readonly dnsHostnamesEnabled: boolean;

  /**
     * Indicates if DNS support is enabled for this VPC.
     */
  public readonly dnsSupportEnabled: boolean;

  constructor(scope: Construct, id: string, props: VpcV2Props = {}) {
    super(scope, id);

    this.ipAddresses = props.primaryAddressBlock ?? IpAddresses.ipv4('10.0.0.0/16');
    const vpcOptions = this.ipAddresses.allocateVpcCidr();

    this.dnsHostnamesEnabled = props.enableDnsHostnames == null ? true : props.enableDnsHostnames;
    this.dnsSupportEnabled = props.enableDnsSupport == null ? true : props.enableDnsSupport;
    this.resource = new CfnVPC(this, 'Resource', {
      cidrBlock: vpcOptions.ipv4CidrBlock, //for Ipv4 addresses CIDR block
      enableDnsHostnames: this.dnsHostnamesEnabled,
      enableDnsSupport: this.dnsSupportEnabled,
      ipv4IpamPoolId: vpcOptions.ipv4IpamPoolId, // for Ipv4 ipam option
      ipv4NetmaskLength: vpcOptions.ipv4NetmaskLength, // for Ipv4 ipam option
    });

    this.vpcCidrBlock = this.resource.attrCidrBlock;
    this.vpcId = this.resource.attrVpcId;
    this.vpcArn = Arn.format({
      service: 'ec2',
      resource: 'vpc',
      resourceName: this.vpcId,
    }, this.stack);

    if (props.secondaryAddressBlocks) {

      const secondaryAddressBlocks: IIpAddresses[] = props.secondaryAddressBlocks;

      for (const secondaryAddressBlock of secondaryAddressBlocks) {
        const vpcoptions: VpcV2Options = secondaryAddressBlock.allocateVpcCidr();

        // validate CIDR ranges per RFC 1918
        if (vpcOptions.ipv4CidrBlock!) {
          validateIpv4address(vpcoptions.ipv4CidrBlock);
        }
        //Create secondary blocks for Ipv4 and Ipv6
        new CfnVPCCidrBlock(this, `Secondary${vpcoptions.ipv4CidrBlock}`, {
          vpcId: this.vpcId,
          cidrBlock: vpcoptions.ipv4CidrBlock,
          ipv4IpamPoolId: vpcoptions.ipv4IpamPoolId,
          ipv4NetmaskLength: vpcoptions.ipv4NetmaskLength,
          //IPv6 Options
          ipv6CidrBlock: vpcoptions.ipv6CidrBlock,
          ipv6Pool: vpcoptions.ipv6Pool,
          ipv6NetmaskLength: vpcoptions.ipv6NetmaskLength,
          ipv6IpamPoolId: vpcoptions.ipv6IpamPoolId,
          amazonProvidedIpv6CidrBlock: vpcoptions.amazonProvided,
        });
      }
    }
  }
}

export interface ISubnetV2 {
  /**
   * The Availability Zone the subnet is located in
   */
  readonly availabilityZone: string;

  /**
   * The subnetId for this particular subnet
   * @attribute
   */
  readonly subnetId: string;

  /**
   * Dependable that can be depended upon to force internet connectivity established on the VPC
   */
  readonly internetConnectivityEstablished: IDependable;

  /**
   * The IPv4 CIDR block for this subnet
   */
  readonly ipv4CidrBlock: string;

  /**
   * The route table for this subnet
   */
  readonly routeTable: IRouteTable;

  /**
   * Associate a Network ACL with this subnet
   *
   * @param acl The Network ACL to associate
   */
  associateNetworkAcl(id: string, acl: INetworkAcl): void;
}


export interface IRouter {
  readonly subnets: SubnetSelection[];
  readonly routerType: RouterType;
  readonly routerId: string;
}
  
  
  // export interface RouterProps {
    //   readonly subnets?: SubnetSelection[];
    // }
    
    // export class GatewayV2 extends Resource implements IRouter {
      //   public readonly subnets: SubnetSelection[];
      //   public readonly routerType: RouterType;
      //   public readonly routerId: string;
      
      //   constructor(scope: Construct, id: string, props: RouterProps) {
        //     super(scope, id);
        
        //     this.subnets = props.subnets ?? [];
        //     this.routerType = RouterType.GATEWAY;
        //   }
        // }
        
        
export interface IRouteV2 {
  readonly destination: IIpAddresses;
  readonly target: IRouter;
  readonly routeTable: IRouteTable;
}

export class Route extends Resource implements IRouteV2 {
  public readonly destination: IIpAddresses;
  public readonly target: IRouter;
  // public readonly routeTableId: string;
  public readonly routeTable: IRouteTable;

  public readonly targetRouterType: RouterType

  public readonly resource: CfnRoute;

  constructor(scope: Construct, id: string, props: RouteProps) {
    super(scope, id);

    this.destination = props.destination ?? IpAddresses.ipv4('10.0.0.0/16');
    this.target = props.target;
    // this.routeTableId = props.routeTableId ?? '';
    this.routeTable = props.routeTable;

    this.targetRouterType = this.target.routerType;

    this.resource = new CfnRoute(this, 'Route', {
      routeTableId: this.routeTable.routeTableId,
      destinationCidrBlock: this.destination.allocateVpcCidr().ipv4CidrBlock,
      destinationIpv6CidrBlock: this.destination.allocateVpcCidr().ipv6CidrBlock,
      [routerTypeToPropName(this.targetRouterType)]: this.target.routerId,
    });

    // this.routeTable.addRoute(this.resource.ref);
  }

}

export interface RouteProps {
  readonly routeTable: IRouteTable;
  readonly destination: IIpAddresses;
  readonly target: IRouter;
}

export class RouteTable extends Resource implements IRouteTable {
  public readonly routeTableId: string;
  // public readonly routes: string[];

  public readonly resource: CfnRouteTable;

  constructor(scope: Construct, id: string, props: RouteTableProps) {
    super(scope, id);

    // this.routes = Array<string>();

    this.resource = new CfnRouteTable(this, 'RouteTable', {
      vpcId: props.vpcId,
    });

    this.routeTableId = this.resource.attrRouteTableId;
  }

  // function addRoute() {
  //   return;
  // }

  // function getRoute(routeId: string) {
  //   return;
  // }
}

export interface RouteTableProps {
  readonly vpcId: string;
  // readonly routes?: IRouteV2[];
}

class ipv4CidrAllocation implements IIpAddresses {

  private readonly networkBuilder: NetworkBuilder;

  constructor(private readonly cidrBlock: string) {
    if (Token.isUnresolved(cidrBlock)) {
      throw new Error('\'cidr\' property must be a concrete CIDR string, got a Token (we need to parse it for automatic subdivision)');
    }

    this.networkBuilder = new NetworkBuilder(this.cidrBlock);
  }

  allocateVpcCidr(): VpcV2Options {
    return {
      ipv4CidrBlock: this.networkBuilder.networkCidr.cidr,
    };
  }
}

class ipv6CidrAllocation implements IIpAddresses {

  private readonly ipv6cidrBlock : string;
  private readonly ipv6poolId: string;
  constructor(private readonly props: IIpv6AddressesOptions) {
    this.ipv6cidrBlock = this.props.ipv6CidrBlock ?? '';
    this.ipv6poolId = this.props.ipv6PoolId ?? '';
  }

  allocateVpcCidr(): VpcV2Options {
    return {
      ipv6CidrBlock: this.ipv6cidrBlock,
      ipv6Pool: this.ipv6poolId,
    };
  }
}

class AmazonProvided implements IIpAddresses {

  amazonProvided: boolean;
  constructor() {
    this.amazonProvided = true;
  };

  allocateVpcCidr(): VpcV2Options {
    return {
      amazonProvided: this.amazonProvided,
    };
  }

}

function validateIpv4address(cidr?: string) {
  
}

function routerTypeToPropName(routerType: RouterType) {
  return ({
    [RouterType.CARRIER_GATEWAY]: 'carrierGatewayId',
    [RouterType.EGRESS_ONLY_INTERNET_GATEWAY]: 'egressOnlyInternetGatewayId',
    [RouterType.GATEWAY]: 'gatewayId',
    [RouterType.INSTANCE]: 'instanceId',
    [RouterType.LOCAL_GATEWAY]: 'localGatewayId',
    [RouterType.NAT_GATEWAY]: 'natGatewayId',
    [RouterType.NETWORK_INTERFACE]: 'networkInterfaceId',
    [RouterType.TRANSIT_GATEWAY]: 'transitGatewayId',
    [RouterType.VPC_PEERING_CONNECTION]: 'vpcPeeringConnectionId',
    [RouterType.VPC_ENDPOINT]: 'vpcEndpointId',
  })[routerType];
}
