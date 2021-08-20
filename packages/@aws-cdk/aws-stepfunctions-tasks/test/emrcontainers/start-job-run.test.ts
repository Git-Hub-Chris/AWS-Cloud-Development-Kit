import '@aws-cdk/assert-internal/jest';
import * as iam from '@aws-cdk/aws-iam';
import * as logs from '@aws-cdk/aws-logs';
import * as s3 from '@aws-cdk/aws-s3';
import * as sfn from '@aws-cdk/aws-stepfunctions';
import { Stack } from '@aws-cdk/core';
import { EmrContainersStartJobRun, VirtualClusterInput, ReleaseLabel, ApplicationConfiguration, Classification } from '../../lib/emrcontainers/start-job-run';

let stack: Stack;
let clusterId: string;
let defaultTask: EmrContainersStartJobRun;


beforeEach(() => {
  stack = new Stack();
  clusterId = 'clusterId';
  defaultTask = new EmrContainersStartJobRun(stack, 'Default EMR Containers Start Job Run', {
    virtualCluster: VirtualClusterInput.fromTaskInput(sfn.TaskInput.fromText(clusterId)),
    releaseLabel: ReleaseLabel.EMR_6_2_0,
    jobDriver: {
      sparkSubmitJobDriver: {
        entryPoint: sfn.TaskInput.fromText('local:///usr/lib/spark/examples/src/main/python/pi.py'),
        sparkSubmitParameters: '--conf spark.executor.instances=2',
      },
    },
  });
});

describe('Invoke EMR Containers Start Job Run with ', () => {
  test('Request/Response integration pattern', () => {

    // WHEN
    const task = new EmrContainersStartJobRun(stack, 'EMR Containers Start Job Run', {
      virtualCluster: VirtualClusterInput.fromTaskInput(sfn.TaskInput.fromText(clusterId)),
      releaseLabel: ReleaseLabel.EMR_6_2_0,
      jobDriver: {
        sparkSubmitJobDriver: {
          entryPoint: sfn.TaskInput.fromText('local:///usr/lib/spark/examples/src/main/python/pi.py'),
          sparkSubmitParameters: '--conf spark.executor.instances=2',
        },
      },
      integrationPattern: sfn.IntegrationPattern.REQUEST_RESPONSE,
    });

    // THEN
    expect(stack.resolve(task.toStateJson())).toEqual({
      Type: 'Task',
      Resource: {
        'Fn::Join': [
          '',
          [
            'arn:',
            {
              Ref: 'AWS::Partition',
            },
            ':states:::emr-containers:startJobRun',
          ],
        ],
      },
      End: true,
      Parameters: {
        VirtualClusterId: clusterId,
        ReleaseLabel: ReleaseLabel.EMR_6_2_0.label,
        JobDriver: {
          SparkSubmitJobDriver: {
            EntryPoint: 'local:///usr/lib/spark/examples/src/main/python/pi.py',
            SparkSubmitParameters: '--conf spark.executor.instances=2',
          },
        },
        ConfigurationOverrides: {
          MonitoringConfiguration: {
            PersistentAppUI: 'ENABLED',
          },
        },
        ExecutionRoleArn: {
          'Fn::GetAtt': [
            'EMRContainersStartJobRunJobExecutionRole40B8DD81',
            'Arn',
          ],
        },
      },
    });
  });

  test('.sync integration pattern', () => {

    // THEN
    expect(stack.resolve(defaultTask.toStateJson())).toEqual({
      Type: 'Task',
      Resource: {
        'Fn::Join': [
          '',
          [
            'arn:',
            {
              Ref: 'AWS::Partition',
            },
            ':states:::emr-containers:startJobRun.sync',
          ],
        ],
      },
      End: true,
      Parameters: {
        VirtualClusterId: clusterId,
        ReleaseLabel: ReleaseLabel.EMR_6_2_0.label,
        JobDriver: {
          SparkSubmitJobDriver: {
            EntryPoint: 'local:///usr/lib/spark/examples/src/main/python/pi.py',
            SparkSubmitParameters: '--conf spark.executor.instances=2',
          },
        },
        ConfigurationOverrides: {
          MonitoringConfiguration: {
            PersistentAppUI: 'ENABLED',
          },
        },
        ExecutionRoleArn: {
          'Fn::GetAtt': [
            'DefaultEMRContainersStartJobRunJobExecutionRole3A34E219',
            'Arn',
          ],
        },
      },
    });
  });

  test('virtual cluster id from payload', () => {

    // WHEN
    const task = new EmrContainersStartJobRun(stack, 'EMR Containers Start Job Run', {
      virtualCluster: VirtualClusterInput.fromTaskInput(sfn.TaskInput.fromJsonPathAt('$.ClusterId')),
      releaseLabel: ReleaseLabel.EMR_6_2_0,
      executionRole: iam.Role.fromRoleArn(stack, 'Job Execution Role', 'arn:aws:iam::xxxxxxxxxxxx:role/JobExecutionRole'),
      jobDriver: {
        sparkSubmitJobDriver: {
          entryPoint: sfn.TaskInput.fromText('local:///usr/lib/spark/examples/src/main/python/pi.py'),
          sparkSubmitParameters: '--conf spark.executor.instances=2',
        },
      },
    });

    // THEN
    expect(stack.resolve(task.toStateJson())).toMatchObject({
      Parameters: {
        'VirtualClusterId.$': '$.ClusterId',
        'ExecutionRoleArn': 'arn:aws:iam::xxxxxxxxxxxx:role/JobExecutionRole',
      },
    });
  });

  test('Tags', () => {

    // WHEN
    const task = new EmrContainersStartJobRun(stack, 'EMR Containers Start Job Run', {
      virtualCluster: VirtualClusterInput.fromTaskInput(sfn.TaskInput.fromText(clusterId)),
      releaseLabel: ReleaseLabel.EMR_6_2_0,
      jobDriver: {
        sparkSubmitJobDriver: {
          entryPoint: sfn.TaskInput.fromText('local:///usr/lib/spark/examples/src/main/python/pi.py'),
          sparkSubmitParameters: '--conf spark.executor.instances=2',
        },
      },
      tags: {
        key: 'value',
      },
    });

    // THEN
    expect(stack.resolve(task.toStateJson())).toMatchObject({
      Parameters: {
        Tags: {
          key: 'value',
        },
      },
    });
  });


  test('Application Configuration', () => {

    // WHEN
    const task = new EmrContainersStartJobRun(stack, 'EMR Containers Start Job Run', {
      virtualCluster: VirtualClusterInput.fromTaskInput(sfn.TaskInput.fromText(clusterId)),
      releaseLabel: ReleaseLabel.EMR_6_2_0,
      jobDriver: {
        sparkSubmitJobDriver: {
          entryPoint: sfn.TaskInput.fromText('local:///usr/lib/spark/examples/src/main/python/pi.py'),
          sparkSubmitParameters: '--conf spark.executor.instances=2',
        },
      },
      applicationConfig: [{
        classification: Classification.SPARK_DEFAULTS,
        properties: {
          'spark.executor.instances': '1',
          'spark.executor.memory': '512M',
        },
      }],
    });

    // THEN
    expect(stack.resolve(task.toStateJson())).toMatchObject({
      Parameters: {
        ConfigurationOverrides: {
          ApplicationConfiguration: [{
            Classification: Classification.SPARK_DEFAULTS.classificationStatement,
            Properties: {
              'spark.executor.instances': '1',
              'spark.executor.memory': '512M',
            },
          }],
        },
      },
    });
  });

  test('Job Execution Role', () => {

    // WHEN
    const task = new EmrContainersStartJobRun(stack, 'EMR Containers Start Job Run', {
      virtualCluster: VirtualClusterInput.fromTaskInput(sfn.TaskInput.fromText(clusterId)),
      releaseLabel: ReleaseLabel.EMR_6_2_0,
      executionRole: iam.Role.fromRoleArn(stack, 'Job Execution Role', 'arn:aws:iam::xxxxxxxxxxxx:role/JobExecutionRole'),
      jobDriver: {
        sparkSubmitJobDriver: {
          entryPoint: sfn.TaskInput.fromText('local:///usr/lib/spark/examples/src/main/python/pi.py'),
          sparkSubmitParameters: '--conf spark.executor.instances=2',
        },
      },
    });

    // THEN
    expect(stack.resolve(task.toStateJson())).toMatchObject({
      Parameters: {
        ExecutionRoleArn: 'arn:aws:iam::xxxxxxxxxxxx:role/JobExecutionRole',
      },
    });

    // THEN
    expect(stack.resolve(task.toStateJson())).toEqual(expect.not.objectContaining({
      Type: 'AWS::CloudFormation::CustomResource',
    }));
  });

  test('Virtual Cluster Input from virtualClusterId', () => {
    // WHEN
    const task = new EmrContainersStartJobRun(stack, 'EMR Containers Start Job Run', {
      virtualCluster: VirtualClusterInput.fromVirtualClusterId(clusterId),
      releaseLabel: ReleaseLabel.EMR_6_2_0,
      jobDriver: {
        sparkSubmitJobDriver: {
          entryPoint: sfn.TaskInput.fromText('local:///usr/lib/spark/examples/src/main/python/pi.py'),
          sparkSubmitParameters: '--conf spark.executor.instances=2',
        },
      },
    });

    // THEN
    expect(stack.resolve(task.toStateJson())).toMatchObject({
      Parameters: {
        VirtualClusterId: clusterId,
      },
    });
  });

  test('no Spark Submit Job Driver', () => {

    // WHEN
    const task = new EmrContainersStartJobRun(stack, 'EMR Containers Start Job Run', {
      virtualCluster: VirtualClusterInput.fromTaskInput(sfn.TaskInput.fromText(clusterId)),
      releaseLabel: ReleaseLabel.EMR_6_2_0,
      jobDriver: {
      },
    });

    // THEN
    expect(stack.resolve(task.toStateJson())).toMatchObject({
      Parameters: {
        JobDriver: {
        },
      },
    });
  });
});

describe('Invoke EMR Containers Start Job Run with Monitoring ', () => {
  test('generated automatically', () => {
    // WHEN
    const task = new EmrContainersStartJobRun(stack, 'EMR Containers Start Job Run', {
      virtualCluster: VirtualClusterInput.fromTaskInput(sfn.TaskInput.fromText(clusterId)),
      releaseLabel: ReleaseLabel.EMR_6_2_0,
      jobDriver: {
        sparkSubmitJobDriver: {
          entryPoint: sfn.TaskInput.fromText('local:///usr/lib/spark/examples/src/main/python/pi.py'),
          sparkSubmitParameters: '--conf spark.executor.instances=2',
        },
      },
      monitoring: {
        logging: true,
      },
    });

    // THEN
    expect(stack).toHaveResourceLike('AWS::IAM::Policy', {
      PolicyDocument: {
        Statement: [
          {
            Action: [
              's3:GetObject*',
              's3:GetBucket*',
              's3:List*',
              's3:DeleteObject*',
              's3:PutObject*',
              's3:Abort*',
            ],
            Effect: 'Allow',
            Resource: [
              {
                'Fn::GetAtt': [
                  'EMRContainersStartJobRunMonitoringBucket8BB3FC54',
                  'Arn',
                ],
              },
              {
                'Fn::Join': [
                  '',
                  [
                    {
                      'Fn::GetAtt': [
                        'EMRContainersStartJobRunMonitoringBucket8BB3FC54',
                        'Arn',
                      ],
                    },
                    '/*',
                  ],
                ],
              },
            ],
          },
          {
            Action: [
              'logs:CreateLogStream',
              'logs:PutLogEvents',
            ],
            Effect: 'Allow',
            Resource: {
              'Fn::GetAtt': [
                'EMRContainersStartJobRunMonitoringLogGroup882D450C',
                'Arn',
              ],
            },
          },
          {
            Action: 'logs:DescribeLogStreams',
            Effect: 'Allow',
            Resource: {
              'Fn::GetAtt': [
                'EMRContainersStartJobRunMonitoringLogGroup882D450C',
                'Arn',
              ],
            },
          },
          {
            Action: 'logs:DescribeLogGroups',
            Effect: 'Allow',
            Resource: 'arn:aws:logs:*:*:*',
          },
        ],
        Version: '2012-10-17',
      },
      PolicyName: 'EMRContainersStartJobRunJobExecutionRoleDefaultPolicyCDBDF13E',
      Roles: [
        {
          Ref: 'EMRContainersStartJobRunJobExecutionRole40B8DD81',
        },
      ],
    });

    // THEN
    expect(stack.resolve(task.toStateJson())).toMatchObject({
      Parameters: {
        ConfigurationOverrides: {
          MonitoringConfiguration: {
            CloudWatchMonitoringConfiguration: {
              LogGroupName: {
                Ref: 'EMRContainersStartJobRunMonitoringLogGroup882D450C',
              },
            },
            PersistentAppUI: 'ENABLED',
            S3MonitoringConfiguration: {
              LogUri: {
                'Fn::Join': [
                  '',
                  [
                    's3://',
                    {
                      Ref: 'EMRContainersStartJobRunMonitoringBucket8BB3FC54',
                    },
                  ],
                ],
              },
            },
          },
        },
      },
    });
  });

  test('provided from user', () => {
    // WHEN
    const logGroup = logs.LogGroup.fromLogGroupName(stack, 'Monitoring Group', 'provided log group');
    const s3Bucket = s3.Bucket.fromBucketName(stack, 'Monitoring Bucket', 'provided bucket');;
    const prefixName = 'prefix';

    const task = new EmrContainersStartJobRun(stack, 'EMR Containers Start Job Run', {
      virtualCluster: VirtualClusterInput.fromTaskInput(sfn.TaskInput.fromText(clusterId)),
      releaseLabel: ReleaseLabel.EMR_6_2_0,
      jobDriver: {
        sparkSubmitJobDriver: {
          entryPoint: sfn.TaskInput.fromText('local:///usr/lib/spark/examples/src/main/python/pi.py'),
          sparkSubmitParameters: '--conf spark.executor.instances=2',
        },
      },
      monitoring: {
        logBucket: s3Bucket,
        logGroup: logGroup,
        logStreamNamePrefix: prefixName,
      },
    });

    // THEN
    expect(stack).toHaveResourceLike('AWS::IAM::Policy', {
      PolicyDocument: {
        Statement: [
          {
            Action: [
              's3:GetObject*',
              's3:GetBucket*',
              's3:List*',
              's3:DeleteObject*',
              's3:PutObject*',
              's3:Abort*',
            ],
            Effect: 'Allow',
            Resource: [
              {
                'Fn::GetAtt': [
                  'EMRContainersStartJobRunMonitoringBucket8BB3FC54',
                  'Arn',
                ],
              },
              {
                'Fn::Join': [
                  '',
                  [
                    {
                      'Fn::GetAtt': [
                        'EMRContainersStartJobRunMonitoringBucket8BB3FC54',
                        'Arn',
                      ],
                    },
                    '/*',
                  ],
                ],
              },
            ],
          },
          {
            Action: [
              'logs:CreateLogStream',
              'logs:PutLogEvents',
            ],
            Effect: 'Allow',
            Resource: {
              'Fn::GetAtt': [
                'EMRContainersStartJobRunMonitoringLogGroup882D450C',
                'Arn',
              ],
            },
          },
          {
            Action: 'logs:DescribeLogStreams',
            Effect: 'Allow',
            Resource: {
              'Fn::GetAtt': [
                'EMRContainersStartJobRunMonitoringLogGroup882D450C',
                'Arn',
              ],
            },
          },
          {
            Action: 'logs:DescribeLogGroups',
            Effect: 'Allow',
            Resource: 'arn:aws:logs:*:*:*',
          },
        ],
        Version: '2012-10-17',
      },
      PolicyName: 'EMRContainersStartJobRunJobExecutionRoleDefaultPolicyCDBDF13E',
      Roles: [
        {
          Ref: 'EMRContainersStartJobRunJobExecutionRole40B8DD81',
        },
      ],
    });

    // THEN
    expect(stack.resolve(task.toStateJson())).toMatchObject({
      Parameters: {
        ConfigurationOverrides: {
          MonitoringConfiguration: {
            CloudWatchMonitoringConfiguration: {
              LogGroupName: {
                Ref: 'EMRContainersStartJobRunMonitoringLogGroup882D450C',
              },
              LogStreamNamePrefix: prefixName,
            },
            S3MonitoringConfiguration: {
              LogUri: {
                'Fn::Join': [
                  '',
                  [
                    's3://',
                    {
                      Ref: 'EMRContainersStartJobRunMonitoringBucket8BB3FC54',
                    },
                  ],
                ],
              },
            },
          },
        },
        ExecutionRoleArn: {
          'Fn::GetAtt': [
            'EMRContainersStartJobRunJobExecutionRole40B8DD81',
            'Arn',
          ],
        },
      },
    });
  });

  test('PersistentAppUI to be disabled when set to false', () => {
    // WHEN
    const task = new EmrContainersStartJobRun(stack, 'EMR Containers Start Job Run', {
      virtualCluster: VirtualClusterInput.fromTaskInput(sfn.TaskInput.fromText(clusterId)),
      releaseLabel: ReleaseLabel.EMR_6_2_0,
      jobDriver: {
        sparkSubmitJobDriver: {
          entryPoint: sfn.TaskInput.fromText('local:///usr/lib/spark/examples/src/main/python/pi.py'),
          sparkSubmitParameters: '--conf spark.executor.instances=2',
        },
      },
      monitoring: {
        persistentAppUI: false,
      },
    });

    // THEN
    expect(stack.resolve(task.toStateJson())).toMatchObject({
      Parameters: {
        ConfigurationOverrides: {
          MonitoringConfiguration: {
            PersistentAppUI: 'DISABLED',
          },
        },
      },
    });
  });
});

describe('Task throws if ', () => {
  test('Application Configuration array is larger than 100', () => {
    // WHEN
    const struct = { classification: Classification.SPARK };
    const appConfig: ApplicationConfiguration[] = new Array(101).fill(struct);

    // THEN
    expect(() => {
      new EmrContainersStartJobRun(stack, 'Task', {
        virtualCluster: VirtualClusterInput.fromTaskInput(sfn.TaskInput.fromText(clusterId)),
        releaseLabel: ReleaseLabel.EMR_6_2_0,
        jobDriver: {
          sparkSubmitJobDriver: {
            entryPoint: sfn.TaskInput.fromText('job-location'),
          },
        },
        applicationConfig: appConfig,
      });
    }).toThrow(`Application configuration array must have 100 or fewer entries. Received ${appConfig.length}`);
  });

  test('Application Configuration nested configuration array is larger than 100', () => {
    // WHEN
    const struct = { classification: Classification.SPARK };
    let appConfig: ApplicationConfiguration[] = new Array(101).fill(struct);

    const nestedConfigStruct = { classification: Classification.SPARK, nestedConfig: appConfig };
    appConfig[0] = nestedConfigStruct;

    // THEN
    expect(() => {
      new EmrContainersStartJobRun(stack, 'Task', {
        virtualCluster: VirtualClusterInput.fromTaskInput(sfn.TaskInput.fromText(clusterId)),
        releaseLabel: ReleaseLabel.EMR_6_2_0,
        jobDriver: {
          sparkSubmitJobDriver: {
            entryPoint: sfn.TaskInput.fromText('job-location'),
          },
        },
        applicationConfig: appConfig,
      });
    }).toThrow(`Application configuration array must have 100 or fewer entries. Received ${appConfig.length}`);
  });

  test('Application Configuration properties is larger than 100 entries', () => {
    // WHEN
    const properties: { [key: string]: string } = {};
    for (let index = 0; index <= 100; index++) {
      properties[index.toString()] = 'value';
    }
    const appConfig: ApplicationConfiguration = { classification: Classification.SPARK, properties: properties };

    expect(() => {
      new EmrContainersStartJobRun(stack, 'Task', {
        virtualCluster: VirtualClusterInput.fromTaskInput(sfn.TaskInput.fromText(clusterId)),
        releaseLabel: ReleaseLabel.EMR_6_2_0,
        jobDriver: {
          sparkSubmitJobDriver: {
            entryPoint: sfn.TaskInput.fromText('job-location'),
          },
        },
        applicationConfig: [appConfig],
      });
    }).toThrow(`Application configuration properties must have 100 or fewer entries. Received ${Object.keys(properties).length}`);
  });

  test('Entry Point is not between 1 to 256 characters in length', () => {
    // WHEN
    const entryPointString = 'x'.repeat(257);

    // THEN
    expect(() => {
      new EmrContainersStartJobRun(stack, 'Start Job Run Task', {
        virtualCluster: VirtualClusterInput.fromTaskInput(sfn.TaskInput.fromText(clusterId)),
        releaseLabel: ReleaseLabel.EMR_6_2_0,
        jobDriver: {
          sparkSubmitJobDriver: {
            entryPoint: sfn.TaskInput.fromText(entryPointString),
          },
        },
      });
    }).toThrow(`Entry point must be between 1 and 256 characters in length. Received ${entryPointString.length}.`);

    // THEN
    expect(() => {
      new EmrContainersStartJobRun(stack, 'Task', {
        virtualCluster: VirtualClusterInput.fromTaskInput(sfn.TaskInput.fromText(clusterId)),
        releaseLabel: ReleaseLabel.EMR_6_2_0,
        jobDriver: {
          sparkSubmitJobDriver: {
            entryPoint: sfn.TaskInput.fromText(''),
          },
        },
      });
    }).toThrow('Entry point must be between 1 and 256 characters in length. Received 0.');
  });

  test('Entry Point Arguments is not an string array that is between 1 and 10280 entries in length', () => {
    // WHEN
    const entryPointArgs = sfn.TaskInput.fromObject(new Array(10281).fill('x', 10281));
    const entryPointArgsNone = sfn.TaskInput.fromObject([]);
    const entryPointNumbers = sfn.TaskInput.fromObject(new Array(1).fill(1));
    const entryPointJson = sfn.TaskInput.fromText('x');

    // THEN
    expect(() => {
      new EmrContainersStartJobRun(stack, 'String array error Task', {
        virtualCluster: VirtualClusterInput.fromTaskInput(sfn.TaskInput.fromText(clusterId)),
        releaseLabel: ReleaseLabel.EMR_6_2_0,
        jobDriver: {
          sparkSubmitJobDriver: {
            entryPoint: sfn.TaskInput.fromText('job-location'),
            entryPointArguments: entryPointNumbers,
          },
        },
      });
    }).toThrow(`Entry point arguments must be a string array. Received ${typeof entryPointNumbers.value}.`);

    // THEN
    expect(() => {
      new EmrContainersStartJobRun(stack, 'JSON Path error Task', {
        virtualCluster: VirtualClusterInput.fromTaskInput(sfn.TaskInput.fromText(clusterId)),
        releaseLabel: ReleaseLabel.EMR_6_2_0,
        jobDriver: {
          sparkSubmitJobDriver: {
            entryPoint: sfn.TaskInput.fromText('job-location'),
            entryPointArguments: entryPointJson,
          },
        },
      });
    }).toThrow(`Entry point arguments must be a string array. Received ${typeof entryPointJson.value}.`);

    // THEN
    expect(() => {
      new EmrContainersStartJobRun(stack, 'Greater than 256 Task', {
        virtualCluster: VirtualClusterInput.fromTaskInput(sfn.TaskInput.fromText(clusterId)),
        releaseLabel: ReleaseLabel.EMR_6_2_0,
        jobDriver: {
          sparkSubmitJobDriver: {
            entryPoint: sfn.TaskInput.fromText('job-location'),
            entryPointArguments: entryPointArgs,
          },
        },
      });
    }).toThrow(`Entry point arguments must be an string array between 1 and 10280 in length. Received ${entryPointArgs.value.length}.`);

    // THEN
    expect(() => {
      new EmrContainersStartJobRun(stack, 'Less than 1 Task', {
        virtualCluster: VirtualClusterInput.fromTaskInput(sfn.TaskInput.fromText(clusterId)),
        releaseLabel: ReleaseLabel.EMR_6_2_0,
        jobDriver: {
          sparkSubmitJobDriver: {
            entryPoint: sfn.TaskInput.fromText('job-location'),
            entryPointArguments: entryPointArgsNone,
          },
        },
      });
    }).toThrow(`Entry point arguments must be an string array between 1 and 10280 in length. Received ${entryPointArgsNone.value.length}.`);
  });

  test('Spark Submit Parameters is NOT between 1 characters and 102400 characters in length', () => {
    // WHEN
    const sparkSubmitParam = 'x'.repeat(102401);

    // THEN
    expect(() => {
      new EmrContainersStartJobRun(stack, 'Spark Submit Parameter Task', {
        virtualCluster: VirtualClusterInput.fromTaskInput(sfn.TaskInput.fromText(clusterId)),
        releaseLabel: ReleaseLabel.EMR_6_2_0,
        jobDriver: {
          sparkSubmitJobDriver: {
            entryPoint: sfn.TaskInput.fromText('job-location'),
            sparkSubmitParameters: sparkSubmitParam,
          },
        },
      });
    }).toThrow(`Spark submit parameters must be between 1 and 102400 characters in length. Received ${sparkSubmitParam.length}.`);
  });

  test('an execution role is undefined and the virtual cluster ID is not a concrete value', () => {
    // WHEN
    const jsonPath = '$.ClusterId';

    // THEN
    expect(() => {
      new EmrContainersStartJobRun(stack, 'Task', {
        virtualCluster: VirtualClusterInput.fromTaskInput(sfn.TaskInput.fromJsonPathAt(jsonPath)),
        releaseLabel: ReleaseLabel.EMR_6_2_0,
        jobDriver: {
          sparkSubmitJobDriver: {
            entryPoint: sfn.TaskInput.fromText('job-location'),
          },
        },
      });
    }).toThrow('Execution role cannot be undefined when the virtual cluster ID is not a concrete value. Provide an execution role with the correct trust policy');
  });
});

test('Permitted role actions and resources with Start Job Run for SYNC integration pattern', () => {

  // WHEN
  new sfn.StateMachine(stack, 'SM', {
    definition: defaultTask,
  });

  // THEN
  expect(stack).toHaveResourceLike('AWS::IAM::Policy', {
    PolicyDocument: {
      Statement: [{
        Action: 'emr-containers:StartJobRun',
        Condition: {
          StringEquals: {
            'emr-containers:ExecutionRoleArn': {
              'Fn::GetAtt': [
                'DefaultEMRContainersStartJobRunJobExecutionRole3A34E219',
                'Arn',
              ],
            },
          },
        },
        Resource: {
          'Fn::Join': [
            '',
            [
              'arn:',
              {
                Ref: 'AWS::Partition',
              },
              ':emr-containers:',
              {
                Ref: 'AWS::Region',
              },
              ':',
              {
                Ref: 'AWS::AccountId',
              },
              `:/virtualclusters/${clusterId}`,
            ],
          ],
        },
      },
      {
        Action: [
          'emr-containers:DescribeJobRun',
          'emr-containers:CancelJobRun',
        ],
        Effect: 'Allow',
        Resource: {
          'Fn::Join': [
            '',
            [
              'arn:',
              {
                Ref: 'AWS::Partition',
              },
              ':emr-containers:',
              {
                Ref: 'AWS::Region',
              },
              ':',
              {
                Ref: 'AWS::AccountId',
              },
              `:/virtualclusters/${clusterId}/jobruns/*`,
            ],
          ],
        },
      }],
    },
  });
});

test('Permitted role actions and resources with Start Job Run from payload', () => {
  // WHEN
  const task = new EmrContainersStartJobRun(stack, 'Task', {
    virtualCluster: VirtualClusterInput.fromTaskInput(sfn.TaskInput.fromJsonPathAt('$.ClusterId')),
    releaseLabel: ReleaseLabel.EMR_6_2_0,
    executionRole: iam.Role.fromRoleArn(stack, 'Job Role', 'arn:aws:iam::xxxxxxxxxxxx:role/JobExecutionRole'),
    jobDriver: {
      sparkSubmitJobDriver: {
        entryPoint: sfn.TaskInput.fromText('job-location'),
      },
    },
    integrationPattern: sfn.IntegrationPattern.RUN_JOB,
  });

  new sfn.StateMachine(stack, 'SM', {
    definition: task,
  });

  // THEN
  expect(stack).toHaveResourceLike('AWS::IAM::Policy', {
    PolicyDocument: {
      Statement: [{
        Action: 'emr-containers:StartJobRun',
        Condition: {
          StringEquals: {
            'emr-containers:ExecutionRoleArn': 'arn:aws:iam::xxxxxxxxxxxx:role/JobExecutionRole',
          },
        },
        Resource: {
          'Fn::Join': [
            '',
            [
              'arn:',
              {
                Ref: 'AWS::Partition',
              },
              ':emr-containers:',
              {
                Ref: 'AWS::Region',
              },
              ':',
              {
                Ref: 'AWS::AccountId',
              },
              ':/virtualclusters/*',
            ],
          ],
        },
      },
      {
        Action: [
          'emr-containers:DescribeJobRun',
          'emr-containers:CancelJobRun',
        ],
        Effect: 'Allow',
        Resource: {
          'Fn::Join': [
            '',
            [
              'arn:',
              {
                Ref: 'AWS::Partition',
              },
              ':emr-containers:',
              {
                Ref: 'AWS::Region',
              },
              ':',
              {
                Ref: 'AWS::AccountId',
              },
              ':/virtualclusters/*',
            ],
          ],
        },
      }],
    },
  });
});

test('Permitted role actions for Start Job Run with REQUEST/RESPONSE integration pattern', () => {
  // WHEN
  const task = new EmrContainersStartJobRun(stack, 'Task', {
    virtualCluster: VirtualClusterInput.fromTaskInput(sfn.TaskInput.fromText(clusterId)),
    releaseLabel: ReleaseLabel.EMR_6_2_0,
    jobDriver: {
      sparkSubmitJobDriver: {
        entryPoint: sfn.TaskInput.fromText('job-location'),
      },
    },
    integrationPattern: sfn.IntegrationPattern.REQUEST_RESPONSE,
  });

  new sfn.StateMachine(stack, 'SM', {
    definition: task,
  });

  // THEN
  expect(stack).toHaveResourceLike('AWS::IAM::Policy', {
    PolicyDocument: {
      Statement: [{
        Action: 'emr-containers:StartJobRun',
        Condition: {
          StringEquals: {
            'emr-containers:ExecutionRoleArn': {
              'Fn::GetAtt': [
                'TaskJobExecutionRole5D5BBA5A',
                'Arn',
              ],
            },
          },
        },
        Resource: {
          'Fn::Join': [
            '',
            [
              'arn:',
              {
                Ref: 'AWS::Partition',
              },
              ':emr-containers:',
              {
                Ref: 'AWS::Region',
              },
              ':',
              {
                Ref: 'AWS::AccountId',
              },
              `:/virtualclusters/${clusterId}`,
            ],
          ],
        },
      }],
    },
  });

});

test('Custom resource is created with EMR Containers Describe Virtual Cluster invocation and has correct IAM policy permissions', () => {
  // WHEN
  new sfn.StateMachine(stack, 'SM', {
    definition: defaultTask,
  });

  // THEN
  expect(stack).toHaveResourceLike('Custom::AWS', {
    ServiceToken: {
      'Fn::GetAtt': [
        'AWS679f53fac002430cb0da5b7982bd22872D164C4C',
        'Arn',
      ],
    },
    Create: '{\"service\":\"EMRcontainers\",\"action\":\"describeVirtualCluster\",\"parameters\":{\"id\":\"clusterId\"},\"outputPaths\":[\"virtualCluster.containerProvider.info.eksInfo.namespace\",\"virtualCluster.containerProvider.id\"],\"physicalResourceId\":{\"id\":\"id\"}}',
    InstallLatestAwsSdk: true,
  });

  // THEN
  expect(stack).toHaveResourceLike('AWS::IAM::Policy', {
    PolicyDocument: {
      Statement: [{
        Action: 'emr-containers:DescribeVirtualCluster',
        Resource: '*',
      }],
    },
  });
});

test('Custom resource is created that has correct EKS namespace, environment, AWSCLI layer, and IAM policy permissions', () => {
  // WHEN
  new sfn.StateMachine(stack, 'SM', {
    definition: defaultTask,
  });

  // THEN
  expect(stack).toHaveResourceLike('AWS::IAM::Policy', {
    PolicyDocument: {
      Statement: [{
        Action: 'lambda:InvokeFunction',
        Resource: {
          'Fn::GetAtt': [
            'SingletonLambda8693BB64968944B69AAFB0CC9EB8757CB6182A5B',
            'Arn',
          ],
        },
      }],
    },
  });

  // THEN
  expect(stack).toHaveResourceLike('AWS::IAM::Policy', {
    PolicyDocument: {
      Statement: [
        {
          Action: 'eks:DescribeCluster',
          Resource: {
            'Fn::Join': [
              '',
              [
                'arn:',
                {
                  Ref: 'AWS::Partition',
                },
                ':eks:',
                {
                  Ref: 'AWS::Region',
                },
                ':',
                {
                  Ref: 'AWS::AccountId',
                },
                ':cluster/',
                {
                  'Fn::GetAtt': [
                    'DefaultEMRContainersStartJobRunGetEksClusterInfo856F0CE2',
                    'virtualCluster.containerProvider.id',
                  ],
                },
              ],
            ],
          },
        },
        {
          Action: [
            'iam:GetRole',
            'iam:UpdateAssumeRolePolicy',
          ],
          Resource: {
            'Fn::GetAtt': [
              'DefaultEMRContainersStartJobRunJobExecutionRole3A34E219',
              'Arn',
            ],
          },
        },
      ],
    },
  });

  // THEN
  expect(stack).toHaveResourceLike('AWS::Lambda::Function', {
    Code: {
      S3Bucket: {
        Ref: 'AssetParametersb071da515a753b089ebbeaed1b03acccc511ddd6e412e61944809ebe4aab904dS3BucketA4134174',
      },
      S3Key: {
        'Fn::Join': [
          '',
          [
            {
              'Fn::Select': [
                0,
                {
                  'Fn::Split': [
                    '||',
                    {
                      Ref: 'AssetParametersb071da515a753b089ebbeaed1b03acccc511ddd6e412e61944809ebe4aab904dS3VersionKey8D410D66',
                    },
                  ],
                },
              ],
            },
            {
              'Fn::Select': [
                1,
                {
                  'Fn::Split': [
                    '||',
                    {
                      Ref: 'AssetParametersb071da515a753b089ebbeaed1b03acccc511ddd6e412e61944809ebe4aab904dS3VersionKey8D410D66',
                    },
                  ],
                },
              ],
            },
          ],
        ],
      },
    },
    Role: {
      'Fn::GetAtt': [
        'SingletonLambda8693BB64968944B69AAFB0CC9EB8757CServiceRoleF99BDB4C',
        'Arn',
      ],
    },
    Environment: {
      Variables: {
        eksNamespace: {
          'Fn::GetAtt': [
            'DefaultEMRContainersStartJobRunGetEksClusterInfo856F0CE2',
            'virtualCluster.containerProvider.info.eksInfo.namespace',
          ],
        },
        eksClusterId: {
          'Fn::GetAtt': [
            'DefaultEMRContainersStartJobRunGetEksClusterInfo856F0CE2',
            'virtualCluster.containerProvider.id',
          ],
        },
        roleName: {
          Ref: 'DefaultEMRContainersStartJobRunJobExecutionRole3A34E219',
        },
      },
    },
    Handler: 'index.handler',
    Layers: [
      {
        Ref: 'DefaultEMRContainersStartJobRunawsclilayer487A35D2',
      },
    ],
    MemorySize: 256,
    Runtime: 'python3.6',
    Timeout: 30,
  });
});

test('Task throws if WAIT_FOR_TASK_TOKEN is supplied as service integration pattern', () => {
  expect(() => {
    new EmrContainersStartJobRun(stack, 'Task', {
      virtualCluster: VirtualClusterInput.fromTaskInput(sfn.TaskInput.fromText(clusterId)),
      releaseLabel: ReleaseLabel.EMR_6_2_0,
      jobDriver: {
        sparkSubmitJobDriver: {
          entryPoint: sfn.TaskInput.fromText('job-location'),
        },
      },
      integrationPattern: sfn.IntegrationPattern.WAIT_FOR_TASK_TOKEN,
    });
  }).toThrow(/Unsupported service integration pattern. Supported Patterns: REQUEST_RESPONSE,RUN_JOB. Received: WAIT_FOR_TASK_TOKEN/);
});


