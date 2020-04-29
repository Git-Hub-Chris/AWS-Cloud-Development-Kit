import { IVpc } from '@aws-cdk/aws-ec2';
import * as ecs from '@aws-cdk/aws-ecs';
import * as elbv2 from '@aws-cdk/aws-elasticloadbalancingv2';
import { IRole } from '@aws-cdk/aws-iam';
import { ARecord, IHostedZone, RecordTarget } from '@aws-cdk/aws-route53';
import { LoadBalancerTarget } from '@aws-cdk/aws-route53-targets';
import { CfnOutput, Construct, Duration, Stack } from '@aws-cdk/core';

/**
 * The properties for the base NetworkMultipleTargetGroupsEc2Service or NetworkMultipleTargetGroupsFargateService service.
 */
export interface NetworkMultipleTargetGroupsServiceBaseProps {
  /**
   * The name of the cluster that hosts the service.
   *
   * If a cluster is specified, the vpc construct should be omitted. Alternatively, you can omit both cluster and vpc.
   * @default - create a new cluster; if both cluster and vpc are omitted, a new VPC will be created for you.
   */
  readonly cluster?: ecs.ICluster;

  /**
   * The VPC where the container instances will be launched or the elastic network interfaces (ENIs) will be deployed.
   *
   * If a vpc is specified, the cluster construct should be omitted. Alternatively, you can omit both vpc and cluster.
   * @default - uses the VPC defined in the cluster or creates a new VPC.
   */
  readonly vpc?: IVpc;

  /**
   * The properties required to create a new task definition. Only one of TaskDefinition or TaskImageOptions must be specified.
   *
   * @default - none
   */
  readonly taskImageOptions?: NetworkLoadBalancedTaskImageProps;

  /**
   * The desired number of instantiations of the task definition to keep running on the service.
   * The minimum value is 1
   *
   * @default 1
   */
  readonly desiredCount?: number;

  /**
   * Name of the service.
   *
   * @default - CloudFormation-generated name.
   */
  readonly serviceName?: string;

  /**
   * The period of time, in seconds, that the Amazon ECS service scheduler ignores unhealthy
   * Elastic Load Balancing target health checks after a task has first started.
   *
   * @default - defaults to 60 seconds if at least one load balancer is in-use and it is not already set
   */
  readonly healthCheckGracePeriod?: Duration;

  /**
   * The network load balancer that will serve traffic to the service.
   *
   * @default - a new load balancer with a listener will be created.
   */
  readonly loadBalancers?: NetworkLoadBalancerProps[];

  /**
   * Specifies whether to propagate the tags from the task definition or the service to the tasks in the service.
   * Tags can only be propagated to the tasks within the service during service creation.
   *
   * @default - none
   */
  readonly propagateTags?: ecs.PropagatedTagSource;

  /**
   * Specifies whether to enable Amazon ECS managed tags for the tasks within the service. For more information, see
   * [Tagging Your Amazon ECS Resources](https://docs.aws.amazon.com/AmazonECS/latest/developerguide/ecs-using-tags.html)
   *
   * @default false
   */
  readonly enableECSManagedTags?: boolean;

  /**
   * The options for configuring an Amazon ECS service to use service discovery.
   *
   * @default - AWS Cloud Map service discovery is not enabled.
   */
  readonly cloudMapOptions?: ecs.CloudMapOptions;

  /**
   * Properties to specify NLB target groups.
   *
   * @default - default portMapping registered as target group and attached to the first defined listener
   */
  readonly targetGroups?: NetworkTargetProps[];
}

/**
 * Options for configuring a new container.
 */
export interface NetworkLoadBalancedTaskImageProps {
  /**
   * The image used to start a container. Image or taskDefinition must be specified, but not both.
   *
   * @default - none
   */
  readonly image: ecs.ContainerImage;

  /**
   * The environment variables to pass to the container.
   *
   * @default - No environment variables.
   */
  readonly environment?: { [key: string]: string };

  /**
   * The secrets to expose to the container as an environment variable.
   *
   * @default - No secret environment variables.
   */
  readonly secrets?: { [key: string]: ecs.Secret };

  /**
   * Flag to indicate whether to enable logging.
   *
   * @default true
   */
  readonly enableLogging?: boolean;

  /**
   * The log driver to use.
   *
   * @default - AwsLogDriver if enableLogging is true
   */
  readonly logDriver?: ecs.LogDriver;

  /**
   * The name of the task execution IAM role that grants the Amazon ECS container agent permission to call AWS APIs on your behalf.
   *
   * @default - No value
   */
  readonly executionRole?: IRole;

  /**
   * The name of the task IAM role that grants containers in the task permission to call AWS APIs on your behalf.
   *
   * @default - A task role is automatically created for you.
   */
  readonly taskRole?: IRole;

  /**
   * The container name value to be specified in the task definition.
   *
   * @default - none
   */
  readonly containerName?: string;

  /**
   * A list of port numbers on the container that is bound to the user-specified or automatically assigned host port.
   *
   * If you are using containers in a task with the awsvpc or host network mode, exposed ports should be specified using containerPort.
   * If you are using containers in a task with the bridge network mode and you specify a container port and not a host port,
   * your container automatically receives a host port in the ephemeral port range.
   *
   * Port mappings that are automatically assigned in this way do not count toward the 100 reserved ports limit of a container instance.
   *
   * For more information, see
   * [hostPort](https://docs.aws.amazon.com/AmazonECS/latest/APIReference/API_PortMapping.html#ECS-Type-PortMapping-hostPort).
   *
   * @default - [80]
   */
  readonly containerPorts?: number[];

  /**
   * The name of a family that this task definition is registered to. A family groups multiple versions of a task definition.
   *
   * @default - Automatically generated name.
   */
  readonly family?: string;
}

/**
 * Properties to define an network load balancer.
 */
export interface NetworkLoadBalancerProps {
  /**
   * Name of the load balancer.
   */
  readonly name: string;

  /**
   * Listeners (at least one listener) attached to this load balancer.
   *
   * @default - none
   */
  readonly listeners: NetworkListenerProps[];

  /**
   * Determines whether the Load Balancer will be internet-facing.
   *
   * @default true
   */
  readonly publicLoadBalancer?: boolean;

  /**
   * The domain name for the service, e.g. "api.example.com."
   *
   * @default - No domain name.
   */
  readonly domainName?: string;

  /**
   * The Route53 hosted zone for the domain, e.g. "example.com."
   *
   * @default - No Route53 hosted domain zone.
   */
  readonly domainZone?: IHostedZone;
}

/**
 * Properties to define an network listener.
 */
export interface NetworkListenerProps {
  /**
   * Name of the listener.
   */
  readonly name: string;

  /**
   * The port on which the listener listens for requests.
   *
   * @default 80
   */
  readonly port?: number;

  /**
   * Protocol for listener, expects TCP or TLS
   *
   * @default - TLS if certificates are provided. TCP otherwise.
   */
  readonly protocol?: elbv2.Protocol;

  /**
   * Certificate list of ACM cert ARNs
   *
   * @default - No certificates.
   */
  readonly certificates?: elbv2.IListenerCertificate[];
}

/**
 * Properties to define a network load balancer target group.
 */
export interface NetworkTargetProps {
  /**
   * The port number of the container. Only applicable when using application/network load balancers.
   */
  readonly containerPort: number;

  /**
   * Name of the listener the target group attached to.
   *
   * @default - default listener (first added listener)
   */
  readonly listener?: string;
}

/**
 * The base class for NetworkMultipleTargetGroupsEc2Service and NetworkMultipleTargetGroupsFargateService classes.
 */
export abstract class NetworkMultipleTargetGroupsServiceBase extends Construct {
  /**
   * The desired number of instantiations of the task definition to keep running on the service.
   */
  public readonly desiredCount: number;

  /**
   * The Network Load Balancer for the service.
   */
  public readonly loadBalancer: elbv2.NetworkLoadBalancer;

  /**
   * The listener for the service.
   */
  public readonly listener: elbv2.NetworkListener;

  /**
   * The cluster that hosts the service.
   */
  public readonly cluster: ecs.ICluster;

  protected logDriver?: ecs.LogDriver;
  protected listeners = new Array<elbv2.NetworkListener>();
  protected targetGroups = new Array<elbv2.NetworkTargetGroup>();

  private loadBalancers = new Array<elbv2.NetworkLoadBalancer>();

  /**
   * Constructs a new instance of the NetworkMultipleTargetGroupsServiceBase class.
   */
  constructor(scope: Construct, id: string, props: NetworkMultipleTargetGroupsServiceBaseProps = {}) {
    super(scope, id);

    this.validateInput(props);

    this.cluster = props.cluster || this.getDefaultCluster(this, props.vpc);
    this.desiredCount = props.desiredCount || 1;
    if (props.taskImageOptions) {
      this.logDriver = this.createLogDriver(props.taskImageOptions.enableLogging, props.taskImageOptions.logDriver);
    }

    if (props.loadBalancers) {
      for (const lbProps of props.loadBalancers) {
        const lb = this.createLoadBalancer(lbProps.name, lbProps.publicLoadBalancer);
        this.loadBalancers.push(lb);
        for (const listenerProps of lbProps.listeners) {
          const listener = lb.addListener(listenerProps.name, {
            port: listenerProps.port || 80,
            certificates: listenerProps.certificates,
            protocol: listenerProps.protocol,
          });
          this.listeners.push(listener);
        }
        this.createDomainName(lb, lbProps.domainName, lbProps.domainZone);
        new CfnOutput(this, `LoadBalancerDNS${lb.node.id}`, { value: lb.loadBalancerDnsName });
      }
      // set up default load balancer and listener.
      this.loadBalancer = this.loadBalancers[0];
      this.listener = this.listeners[0];
    } else {
      this.loadBalancer = this.createLoadBalancer('LB');
      this.listener = this.loadBalancer.addListener('PublicListener', {port: 80});
      this.createDomainName(this.loadBalancer);

      new CfnOutput(this, 'LoadBalancerDNS', { value: this.loadBalancer.loadBalancerDnsName });
    }
  }

  /**
   * Returns the default cluster.
   */
  protected getDefaultCluster(scope: Construct, vpc?: IVpc): ecs.Cluster {
    // magic string to avoid collision with user-defined constructs.
    const DEFAULT_CLUSTER_ID = `EcsDefaultClusterMnL3mNNYN${vpc ? vpc.node.id : ''}`;
    const stack = Stack.of(scope);
    return stack.node.tryFindChild(DEFAULT_CLUSTER_ID) as ecs.Cluster || new ecs.Cluster(stack, DEFAULT_CLUSTER_ID, { vpc });
  }

  protected createAWSLogDriver(prefix: string): ecs.AwsLogDriver {
    return new ecs.AwsLogDriver({ streamPrefix: prefix });
  }

  protected findListener(name?: string): elbv2.NetworkListener {
    if (!name) {
      return this.listener;
    }
    for (const listener of this.listeners) {
      if (listener.node.id === name) {
        return listener;
      }
    }
    throw new Error(`Listener ${name} is not defined. Did you define listener with name ${name}?`);
  }

  protected registerECSTargets(service: ecs.BaseService, container: ecs.ContainerDefinition, targets: NetworkTargetProps[]):
  elbv2.NetworkTargetGroup {
    for (const targetProps of targets) {
      const targetGroup = this.findListener(targetProps.listener).addTargets(`ECSTargetGroup${container.containerName}${targetProps.containerPort}`, {
        port: 80,
        targets: [
          service.loadBalancerTarget({
            containerName: container.containerName,
            containerPort: targetProps.containerPort,
          }),
        ],
      });
      this.targetGroups.push(targetGroup);
    }
    if (this.targetGroups.length === 0) {
      throw new Error('At least one target group should be specified.');
    }
    return this.targetGroups[0];
  }

  protected addPortMappingForTargets(container: ecs.ContainerDefinition, targets: NetworkTargetProps[]) {
    for (const target of targets) {
      if (!container.findPortMapping(target.containerPort, ecs.Protocol.TCP)) {
        container.addPortMappings({
          containerPort: target.containerPort,
        });
      }
    }
  }

  /**
   * Create log driver if logging is enabled.
   */
  private createLogDriver(enableLoggingProp?: boolean, logDriverProp?: ecs.LogDriver): ecs.LogDriver | undefined {
    const enableLogging = enableLoggingProp !== undefined ? enableLoggingProp : true;
    const logDriver = logDriverProp !== undefined
      ? logDriverProp : enableLogging
        ? this.createAWSLogDriver(this.node.id) : undefined;
    return logDriver;
  }

  private validateInput(props: NetworkMultipleTargetGroupsServiceBaseProps) {
    if (props.cluster && props.vpc) {
      throw new Error('You can only specify either vpc or cluster. Alternatively, you can leave both blank');
    }

    if (props.desiredCount !== undefined && props.desiredCount < 1) {
      throw new Error('You must specify a desiredCount greater than 0');
    }

    if (props.loadBalancers) {
      if (props.loadBalancers.length === 0) {
        throw new Error('At least one load balancer must be specified');
      }
      for (const lbProps of props.loadBalancers) {
        if (lbProps.listeners.length === 0) {
          throw new Error('At least one listener must be specified');
        }
      }
    }
  }

  private createLoadBalancer(name: string, publicLoadBalancer?: boolean): elbv2.NetworkLoadBalancer {
    const internetFacing = publicLoadBalancer !== undefined ? publicLoadBalancer : true;
    const lbProps = {
      vpc: this.cluster.vpc,
      internetFacing,
    };

    return new elbv2.NetworkLoadBalancer(this, name, lbProps);
  }

  private createDomainName(loadBalancer: elbv2.NetworkLoadBalancer, name?: string, zone?: IHostedZone) {
    if (typeof name !== 'undefined') {
      if (typeof zone === 'undefined') {
        throw new Error('A Route53 hosted domain zone name is required to configure the specified domain name');
      }

      new ARecord(this, `DNS${loadBalancer.node.id}`, {
        zone,
        recordName: name,
        target: RecordTarget.fromAlias(new LoadBalancerTarget(loadBalancer)),
      });
    }
  }
}