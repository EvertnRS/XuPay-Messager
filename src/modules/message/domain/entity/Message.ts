import type { QueueMessage } from "@/modules/queue/domain/entity/QueueMessage";

export type Message = {
  id: string;
  event: string;
  payloadHash: string;
  timestamp: Date;
  idempotencyKey: string;
  queueMessages?: QueueMessage[];
};
