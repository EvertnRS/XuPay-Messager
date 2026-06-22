import { QueueMessage } from "../entity/QueueMessage";

export interface IQueueMessageRepository {
    saveMessage(queueMessage: Omit<QueueMessage, 'id' | 'status' | 'retryCount'>): Promise<void>;
    updateMessage(queueMessage: QueueMessage): Promise<void>;

    findMessagePayloadById(id: string): Promise<{
    message: {
        event: string;
        payloadEncrypted: string;
    };
    } | null>
    findById(id: string): Promise<QueueMessage | null>;
    findFirstPendingMessage(): Promise<QueueMessage | null>;
}
