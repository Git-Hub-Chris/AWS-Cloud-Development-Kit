import * as cdk from '@aws-cdk/core';
import { Construct } from 'constructs';
import { CfnNotificationRule } from './codestarnotifications.generated';
import * as events from './event';
import { INotificationSource, NotificationSourceConfig, SourceType } from './source';
import { INotificationTarget, NotificationTargetConfig } from './target';

/**
 * The level of detail to include in the notifications for this resource.
 */
export enum DetailType {
  /**
   * BASIC will include only the contents of the event as it would appear in AWS CloudWatch
   */
  BASIC = 'BASIC',

  /**
   * FULL will include any supplemental information provided by AWS CodeStar Notifications and/or the service for the resource for which the notification is created.
   */
  FULL = 'FULL',
}

/**
 * The status of the notification rule.
 */
export enum Status {

  /**
   * If the status is set to DISABLED, notifications aren't sent.
   */
  DISABLED = 'DISABLED',

  /**
   * If the status is set to ENABLED, notifications are sent.
   */
  ENABLED = 'ENABLED',
}

/**
 * The options for AWS Codebuild and AWS Codepipeline notification integration
 */
export interface RuleOptions {

  /**
   * The name for the notification rule.
   * Notification rule names must be unique in your AWS account.
   */
  readonly notificationRuleName: string;

  /**
   * The status of the notification rule.
   * If the status is set to DISABLED, notifications aren't sent for the notification rule.
   *
   * @default Status.ENABLED
   */
  readonly status?: Status;

  /**
   * The level of detail to include in the notifications for this resource.
   * BASIC will include only the contents of the event as it would appear in AWS CloudWatch.
   * FULL will include any supplemental information provided by AWS CodeStar Notifications and/or the service for the resource for which the notification is created.
   *
   * @default DetailType.FULL
   */
  readonly detailType?: DetailType;

  /**
   * A list of Amazon Resource Names (ARNs) of Amazon SNS topics and AWS Chatbot clients to associate with the notification rule.
   *
   * @see https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-properties-codestarnotifications-notificationrule-target.html
   */
  readonly targets: INotificationTarget[];

  /**
   * A list of event types associated with this notification rule.
   * For a complete list of event types and IDs, see Notification concepts in the Developer Tools Console User Guide.
   *
   * @see https://docs.aws.amazon.com/dtconsole/latest/userguide/concepts.html#concepts-api
   */
  readonly events: events.RepositoryEvent[] | events.ProjectEvent[] | events.PipelineEvent[] | events.ApplicationEvent[] | string[];
}

/**
 * Properties for a new notification rule
 */
export interface NotificationRuleProps extends RuleOptions {

  /**
   * The Amazon Resource Name (ARN) of the resource to associate with the notification rule.
   * Supported sources include pipelines in AWS CodePipeline and build projects in AWS CodeBuild.
   */
  readonly source: INotificationSource;
}

/**
 * Represents a notification rule
 */
export interface INotificationRule extends cdk.IResource {

  /**
   * The ARN of the notification rule (i.e. arn:aws:codestar-notifications:::notificationrule/01234abcde)
   * @attribute
   */
  readonly notificationRuleArn: string;
}

/**
 * Either a new or imported notification rule
 */
abstract class NotificationRuleBase extends cdk.Resource implements INotificationRule {
  abstract readonly notificationRuleArn: string;
}

/**
 * A new notification rule
 */
export class NotificationRule extends NotificationRuleBase {
  /**
   * Import an existing notification rule provided an ARN
   * @param scope The parent creating construct
   * @param id The construct's name
   * @param notificationRuleArn Notification rule ARN (i.e. arn:aws:codestar-notifications:::notificationrule/01234abcde)
   */
  public static fromNotificationRuleArn(scope: Construct, id: string, notificationRuleArn: string): INotificationRule {
    class Import extends NotificationRuleBase {
      readonly notificationRuleArn = notificationRuleArn;
    }

    return new Import(scope, id);
  }

  /**
   * @attribute
   */
  readonly notificationRuleArn: string;

  /**
   * The source config of notification rule
   */
  readonly source: NotificationSourceConfig;

  /**
   * The target config of notification rule
   */
  readonly targets: NotificationTargetConfig[] = [];

  constructor(scope: Construct, id: string, props: NotificationRuleProps) {
    super(scope, id, {
      physicalName: props.notificationRuleName,
    });

    this.source = props.source.bind(this);

    this.sourceEventValidate(props);

    props.targets.forEach((target) => {
      this.addTarget(target);
    });

    this.notificationRuleArn = new CfnNotificationRule(this, 'Resource', {
      name: props.notificationRuleName,
      status: props?.status,
      detailType: props.detailType || DetailType.FULL,
      targets: this.targets,
      eventTypeIds: props.events,
      resource: this.source.sourceAddress,
    }).ref;
  }

  /**
   * Adds target to notification rule
   * @param target The SNS topic or AWS Chatbot Slack target
   */
  public addTarget(target: INotificationTarget) {
    this.targets.push(target.bind(this));
  }

  private sourceEventValidate(props: NotificationRuleProps): void {
    if (props.events.length === 0) {
      throw new Error('"events" property must set at least 1 event');
    }

    const validationMapping = {
      [SourceType.CODE_COMMIT]: Object.values(events.RepositoryEvent),
      [SourceType.CODE_BUILD]: Object.values(events.ProjectEvent),
      [SourceType.CODE_PIPELINE]: Object.values(events.PipelineEvent),
      [SourceType.CODE_DEPLOY]: Object.values(events.ApplicationEvent),
    };

    const validEvents: string[] = validationMapping[this.source.sourceType];

    Object.values(props.events).forEach(event => {
      if (!validEvents.includes(event)) {
        throw new Error(`${event} event id is not valid in ${this.source.sourceType}`);
      }
    });
  }
}