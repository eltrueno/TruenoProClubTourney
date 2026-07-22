import { EventEmitter } from 'events';
import amqp, { Connection, Channel } from 'amqplib';

export const EVENTS = {
  // Disparado cuando cambian los jugadores de un partido o se confirma/desconfirma
  // Payload: { eaPlayerIds: string[] }
  PLAYER_STATS_UPDATE_REQUESTED: 'PLAYER_STATS_UPDATE_REQUESTED',
};

const EXCHANGE_NAME = 'tourney_events';

export class RabbitMQManager {
  private connection: any = null;
  public channel: Channel | null = null;
  private isConnecting = false;
  private url: string;

  constructor() {
    this.url = process.env.RABBITMQ_URI || 'amqp://localhost';
  }

  async connect(onConsume?: (msg: amqp.ConsumeMessage | null) => void): Promise<void> {
    if (this.isConnecting) return;
    this.isConnecting = true;

    try {
      const connection = await amqp.connect(this.url);
      this.connection = connection;

      connection.on('error', (err) => {
        console.error('[RabbitMQ] Connection error', err);
        this.handleDisconnect(onConsume);
      });

      connection.on('close', () => {
        console.warn('[RabbitMQ] Connection closed');
        this.handleDisconnect(onConsume);
      });

      const channel = await connection.createChannel();
      this.channel = channel;

      channel.on('error', (err) => {
        console.error('[RabbitMQ] Channel error', err);
      });

      channel.on('close', () => {
        console.warn('[RabbitMQ] Channel closed');
        this.channel = null;
      });

      await channel.assertExchange(EXCHANGE_NAME, 'topic', { durable: true });

      // Si se provee un callback, configuramos la cola consumidora
      if (onConsume) {
        const q = await channel.assertQueue('player_stats_updates', { durable: true });
        await channel.bindQueue(q.queue, EXCHANGE_NAME, EVENTS.PLAYER_STATS_UPDATE_REQUESTED);
        channel.consume(q.queue, onConsume);
      }

      console.info('[RabbitMQ] Connected successfully');
      this.isConnecting = false;
    } catch (error: any) {
      console.error('[RabbitMQ] connection failed:', error.message);
      this.isConnecting = false;
      this.handleDisconnect(onConsume);
    }
  }

  private handleDisconnect(onConsume?: (msg: amqp.ConsumeMessage | null) => void) {
    this.connection = null;
    this.channel = null;
    setTimeout(() => this.connect(onConsume), 5000);
  }

  async publish(routingKey: string, content: any): Promise<boolean> {
    if (!this.channel) {
      console.warn(`[RabbitMQ] Failed to publish ${routingKey}: channel not available`);
      return false;
    }

    try {
      return this.channel.publish(
        EXCHANGE_NAME,
        routingKey,
        Buffer.from(JSON.stringify(content)),
        { persistent: true }
      );
    } catch (error) {
      console.error(`[RabbitMQ] Publish error on ${routingKey}:`, error);
      return false;
    }
  }
}

class EventBus extends EventEmitter {
  private mqManager: RabbitMQManager | null = null;
  private isRabbitMQEnabled = !!process.env.RABBITMQ_URI;

  async init(): Promise<void> {
    if (!this.isRabbitMQEnabled) {
      console.info('[EventBus] RabbitMQ disabled (no RABBITMQ_URI), using local EventEmitter');
      return;
    }

    this.mqManager = new RabbitMQManager();
    await this.mqManager.connect((msg) => this.handleMessage(msg));
  }

  private handleMessage(msg: amqp.ConsumeMessage | null) {
    if (msg !== null && this.mqManager?.channel) {
      try {
        const payload = JSON.parse(msg.content.toString());
        super.emit(EVENTS.PLAYER_STATS_UPDATE_REQUESTED, payload);
        this.mqManager.channel.ack(msg);
      } catch (e) {
        console.error('[EventBus] Error processing message from RabbitMQ:', e);
        this.mqManager.channel.nack(msg, false, false);
      }
    }
  }

  emitEvent(event: string, payload: any) {
    if (this.isRabbitMQEnabled && this.mqManager) {
      this.mqManager.publish(event, payload);
    } else {
      this.emit(event, payload);
    }
  }
}

export const eventBus = new EventBus();

