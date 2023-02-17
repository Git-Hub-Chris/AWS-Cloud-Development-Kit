import * as sfn from '@aws-cdk/aws-stepfunctions';
import { Stack } from '@aws-cdk/core';
import { GlueStartCrawlerRun } from '../../lib/glue/start-crawler-run';

const glueCrawlerName = 'GlueCrawler';
let stack: Stack;
beforeEach(() => {
  stack = new Stack();
});

test('Invoke glue job with just job ARN', () => {
  const task = new GlueStartCrawlerRun(stack, 'Task', {
    glueCrawlerName,
  });
  new sfn.StateMachine(stack, 'SM', {
    definition: task,
  });

  expect(stack.resolve(task.toStateJson())).toEqual({
    Type: 'Task',
    Resource: 'arn:aws:states:::aws-sdk:glue:startCrawler',
    End: true,
    Parameters: {
      Name: glueCrawlerName,
    },
  });
});
