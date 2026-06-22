import type { QueueMessage } from "@/modules/queue/domain/entity/QueueMessage";

export type Message = {
  id: string;
  service: string;
  payloadEncrypted: string;
  timestamp: Date;
  idempotencyKey: string;
  queueMessages?: QueueMessage[];
};
