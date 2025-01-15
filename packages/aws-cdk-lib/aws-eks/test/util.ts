import { KubectlV31Layer } from '@aws-cdk/lambda-layer-kubectl-v31';
import * as ec2 from '../../aws-ec2';
import { App, Stack } from '../../core';
import { Cluster, FargateCluster, ClusterProps, KubernetesVersion } from '../lib';

const CLUSTER_VERSION = KubernetesVersion.V1_25;
const DEFAULT_REGION = 'us-east-1';

export function testFixture(region: string = DEFAULT_REGION) {
  const { stack, app } = testFixtureNoVpc(region);
  const vpc = new ec2.Vpc(stack, 'VPC');

  return { stack, vpc, app };
}

export function testFixtureNoVpc(region: string = DEFAULT_REGION) {
  const app = new App();
  const stack = new Stack(app, 'Stack', { env: { region } });
  return { stack, app };
}

export interface testFixtureClusterOptions {
  /**
   * Indicates whether the cluster should be a Fargate cluster or not.
   * If true, a FargateCluster will be created, otherwise a regular Cluster.
   */
  isFargate?: boolean;
};
