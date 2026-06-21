import { Message } from "../entity/Message";

export interface IMessageRepository {
    saveMessage(message: Omit<Message, 'id' | 'queueMessages'>): Promise<Message>;
    findById(id: string): Promise<Message | null>;
    findByIdempotencyKey(idempotencyKey: string): Promise<Message | null>
}
