import { bindBaseTargetConfig, singletonEventRole } from './util';
import * as events from '../../aws-events';
import * as iam from '../../aws-iam';
import * as secretsmanager from '../../aws-secretsmanager';
import * as sqs from '../../aws-sqs';

/**
 * Configuration properties of an Amazon Redshift Query event.
 */
export interface RedshiftQueryProps {

  /**
   * The Amazon Redshift database to run the query against.
   */
  readonly database: string;

  /**
   * The Amazon Redshift database user to run the query as. This is required when authenticating via temporary credentials.
   *
   * @default - No Database user is specified
   */
  readonly dbUser?: string;

  /**
   * The secret containing the password for the database user. This is required when authenticating via Secrets Manager.
   * If the full secret ARN is not specified, this will instead use the secret name.
   *
   * @default - No secret is specified
   */
  readonly secret?: secretsmanager.ISecret;

  /**
   * The SQL query to run. This will use the `executeStatement` API.
   *
   * @default - No SQL query is specified
   */
  readonly sql?: string;

  /**
   * The SQL queries to be executed. Each query is run sequentially within a single transaction; the next query in the array will only execute after the previous one has successfully completed.
   * If any statement fails, the entire transaction is rolled back. This will use the `batchExecuteStatement` API.
   *
   * @default - No SQL queries are specified
   */
  readonly batchSQL?: string[];

  /**
   * The name of the SQL statement. You can name the SQL statement for identitfication purposes. It is recommended to append a `QS2-` prefix to the statement name, to allow Amazon Redshift to identify the Event Bridge rule, and present it in the Amazon Redshift console.
   *
   * @default - No statement name is specified
   */
  readonly statementName?: string;

  /**
   * Should an event be sent back to Event Bridge when the SQL statement is executed.
   *
   * @default - false
   */
  readonly withEvent?: boolean;

  /**
   * The queue to be used as dead letter queue.
   *
   * @default - No dead letter queue is specified
   */
  readonly deadLetterQueue?: sqs.IQueue;

  /**
   * The IAM role to be used to execute the SQL statement.
   *
   * @default - a new role will be created.
   */
  readonly role?: iam.IRole;

  /**
   * The input to the state machine execution
   *
   * @default the entire EventBridge event
   */
  readonly input?: events.RuleTargetInput;
}

/**
 * Schedule an Amazon Redshift Query to be run, using the Redshift Data API.
 * It is recommended to append a `QS2-` prefix to both `statementName` and `ruleName`, to allow Amazon Redshift to identify the Event Bridge rule, and present it in the Amazon Redshift console.
 */
export class RedshiftQuery implements events.IRuleTarget {
  constructor(
    private readonly clusterArn: string,
    private readonly props: RedshiftQueryProps) {
  }

  bind(rule: events.IRule, _id?: string): events.RuleTargetConfig {
    const role = this.props.role ?? singletonEventRole(rule);
    if (this.props.sql) {
      role.addToPrincipalPolicy(this.putEventStatement());
    }
    if (this.props.batchSQL) {
      role.addToPrincipalPolicy(this.putBatchEventStatement());
    }
    if (this.props.sql && this.props.batchSQL) {
      throw new Error('Only one of `sql` or `batchSQL` can be specified, not both.');
    }
    if (!this.props.sql && !this.props.batchSQL) {
      throw new Error('One of `sql` or `batchSQL` must be specified.');
    }

    return {
      ...bindBaseTargetConfig(this.props),
      arn: this.clusterArn,
      role,
      input: this.props.input,
      redshiftDataParameters: {
        database: this.props.database,
        dbUser: this.props.dbUser,
        secretManagerArn: this.props.secret?.secretFullArn ?? this.props.secret?.secretName,
        sql: this.props.sql,
        sqls: this.props.batchSQL,
        statementName: this.props.statementName,
        withEvent: this.props.withEvent,
      },
    };
  }

  private putEventStatement() {
    return new iam.PolicyStatement({
      actions: ['redshift-data:ExecuteStatement'],
      resources: [this.clusterArn],
    });
  }

  private putBatchEventStatement() {
    return new iam.PolicyStatement({
      actions: ['redshift-data:BatchExecuteStatement'],
      resources: [this.clusterArn],
    });
  }
}
