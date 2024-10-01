import { SNSHandler, SNSEvent, SNSEventRecord } from 'aws-lambda';

/*
    SNS Topics don't expect a return value. Usually you either publish to another topic or just do some work and finish
*/
export const handler: SNSHandler = async (event: SNSEvent) => {
  const records: SNSEventRecord[] = event.Records;
  records.forEach(record => {
    console.log('Message is: ', record.Sns.Message);
  });
};
