import { Construct, IResource, Resource } from '@aws-cdk/core';
import { CfnClusterParameterGroup } from './redshift.generated';

/**
 * Possible Parameter Group Families
 * used for defining {@link ClusterParameterGroupProps.family}.
 * > At this time, redshift-1.0 is the only version of the Amazon Redshift engine.
 * see https://docs.aws.amazon.com/redshift/latest/mgmt/working-with-parameter-groups.html
 */
const REDSHIFT_1_0 = 'redshift-1.0';

/**
 * A parameter group
 */
export interface IClusterParameterGroup extends IResource {
  /**
   * The name of this parameter group
   *
   * @attribute
   */
  readonly clusterParameterGroupName: string;
}

/**
 * A new cluster or instance parameter group
 */
abstract class ClusterParameterGroupBase extends Resource implements IClusterParameterGroup {
  /**
   * The name of the parameter group
   */
  public abstract readonly clusterParameterGroupName: string;
}

/**
 * Properties for a parameter group
 */
export interface ClusterParameterGroupProps {
  /**
   * The version of the Amazon Redshift engine to which the parameters in the parameter group apply.
   * see https://docs.aws.amazon.com/redshift/latest/mgmt/working-with-parameter-groups.html
   *
   * @default REDSHIFT_1_0
   */
  readonly family?: string;

  /**
   * Description for this parameter group
   *
   * @default a CDK generated description
   */
  readonly description?: string;

  /**
   * The parameters in this parameter group
   */
  readonly parameters: { [name: string]: string };
}

/**
 * A cluster parameter group
 *
 * @resource AWS::Redshift::ClusterParameterGroup
 */
export class ClusterParameterGroup extends ClusterParameterGroupBase {
  /**
   * Imports a parameter group
   */
  public static fromClusterParameterGroupName(scope: Construct, id: string, clusterParameterGroupName: string): IClusterParameterGroup {
    class Import extends Resource implements IClusterParameterGroup {
      public readonly clusterParameterGroupName = clusterParameterGroupName;
    }
    return new Import(scope, id);
  }

  /**
   * The name of the parameter group
   */
  public readonly clusterParameterGroupName: string;

  constructor(scope: Construct, id: string, props: ClusterParameterGroupProps) {
    super(scope, id);

    if (props.family && props.family !== REDSHIFT_1_0) {
      throw new Error(`Only ${REDSHIFT_1_0} is supported for PrameterGroupFamily at this time!`);
    }

    const resource = new CfnClusterParameterGroup(this, 'Resource', {
      description: props.description || `Cluster parameter group for ${props.family}`,
      parameterGroupFamily: props.family ? props.family : REDSHIFT_1_0,
      parameters: Object.entries(props.parameters).map(([name, value]) => {
        return {parameterName: name, parameterValue: value};
      }),
    });

    this.clusterParameterGroupName = resource.ref;
  }
}