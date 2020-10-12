import * as chatbot from '@aws-cdk/aws-chatbot';
import * as codebuild from '@aws-cdk/aws-codebuild';
import * as notifications from '@aws-cdk/aws-codestarnotifications';
import * as sns from '@aws-cdk/aws-sns';
import * as cdk from '@aws-cdk/core';
import * as targets from '../lib';
import { FakeCodeBuildSource } from './helpers';
import '@aws-cdk/assert/jest';

describe('NotificationRule', () => {
  let stack: cdk.Stack;

  beforeEach(() => {
    stack = new cdk.Stack();
  });

  test('notification added targets', () => {
    const project = codebuild.Project.fromProjectArn(stack, 'MyCodebuildProject', 'arn:aws:codebuild::1234567890:project/MyCodebuildProject');

    const dummySource = new FakeCodeBuildSource(project);

    const target1 = new sns.Topic(stack, 'MyTopic1', {});
    const target2 = new sns.Topic(stack, 'MyTopic2', {});

    const target3 = new chatbot.SlackChannelConfiguration(stack, 'MySlackChannel', {
      slackChannelConfigurationName: 'MySlackChannel',
      slackWorkspaceId: 'ABC123',
      slackChannelId: 'DEF456',
    });

    const notifier = new notifications.NotificationRule(stack, 'MyNotificationRule', {
      notificationRuleName: 'MyNotificationRule',
      events: [
        notifications.ProjectEvent.BUILD_STATE_SUCCEEDED,
        notifications.ProjectEvent.BUILD_STATE_FAILED,
      ],
      targets: [],
      source: dummySource,
    });

    notifier.addTarget(new targets.SnsTopicNotificationTarget(target1));
    notifier.addTarget(new targets.SnsTopicNotificationTarget(target2));
    notifier.addTarget(new targets.SlackNotificationTarget(target3));

    expect(stack).toHaveResourceLike('AWS::CodeStarNotifications::NotificationRule', {
      DetailType: 'FULL',
      EventTypeIds: [
        'codebuild-project-build-state-succeeded',
        'codebuild-project-build-state-failed',
      ],
      Name: 'MyNotificationRule',
      Resource: 'arn:aws:codebuild::1234567890:project/MyCodebuildProject',
      Targets: [
        {
          TargetAddress: {
            Ref: 'MyTopic13BD94FE8',
          },
          TargetType: 'SNS',
        },
        {
          TargetAddress: {
            Ref: 'MyTopic288CE2107',
          },
          TargetType: 'SNS',
        },
        {
          TargetAddress: {
            Ref: 'MySlackChannelA8E0B56C',
          },
          TargetType: 'AWSChatbotSlack',
        },
      ],
    });
  });
});

