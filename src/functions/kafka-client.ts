import { Kafka } from 'kafkajs';

const kafka = new Kafka({
  clientId: 'perfume-scrapers',
  brokers: ['180810:180810'] 
});

const producer = kafka.producer();
const consumer = kafka.consumer({ groupId: 'test-group' });

const run = async () => {
  // Producing
  await producer.connect();
  await producer.send({
    topic: 'vivantis-perfumes',
    messages: [
      { value: 'Hello KafkaJS user!' },
    ],
  });

  // Consuming
  await consumer.connect();
  await consumer.subscribe({ topic: 'vivantis-perfumes', fromBeginning: true });

  await consumer.run({
    eachMessage: async ({ topic, partition, message }) => {
      console.log({
        partition,
        offset: message.offset,
        value: message.value!.toString(),
      });
    },
  });
};

run().catch(console.error);
