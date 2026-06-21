import { prismaClient } from "@/infra/database/prismaClient";
import { IMessageRepository } from "./IMessageRepository";
import { Message } from "../entity/Message";

export class MessageRepositoryImpl implements IMessageRepository {
    public async saveMessage(message: Omit<Message, 'id' | 'queueMessages'>): Promise<Message> {
        return await (prismaClient.message.create as any)({
            data: {
                service: message.service,
                payloadHash: message.payloadHash,
                timestamp: message.timestamp,
                idempotencyKey: message.idempotencyKey
            }
        });
    }

    public async findById(id: string): Promise<Message | null> {
        return await (prismaClient.message.findUnique as any)({
            where: { id }
        });
    }

    public async findByIdempotencyKey(idempotencyKey: string): Promise<Message | null> {
        return await (prismaClient.message.findUnique as any)({
            where: {
                idempotencyKey: idempotencyKey
            }
        });
    }
}
