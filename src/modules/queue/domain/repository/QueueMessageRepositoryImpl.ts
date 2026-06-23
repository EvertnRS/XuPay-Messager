import { prismaClient } from "@/infra/database/prismaClient";
import { QueueMessage } from "../entity/QueueMessage";
import { IQueueMessageRepository } from "./IQueueMessageRepository";

export class QueueMessageRepositoryImpl implements IQueueMessageRepository {
    public async saveMessage(queueMessage: Omit<QueueMessage, 'id' | 'status' | 'retryCount'>): Promise<void> {
        console.log("Salvando mensagem na fila:", queueMessage);

        await prismaClient.queueMessage.create({
            data: {
                messageId: queueMessage.messageId,
            }
        });
    }

    public async findFirstPendingMessage(): Promise<QueueMessage | null> {
        const result = await prismaClient.queueMessage.findFirst({
            where: { status: 'PENDING' },
            include: { message: true },
            orderBy: { message: { timestamp: 'asc' } }
        });
        
        if (!result) {
            return null;
        }
        return {
            id: result.id,
            messageId: result.messageId,
            retryCount: result.retryCount,
            status: result.status
        };
    }

    public async findMessagePayloadById(id: string): Promise<{
    message: {
        event: string;
        payloadHash: string;
    };
    } | null> {
        const result = await (prismaClient.queueMessage.findUnique as any)({
            where: { id },
            include: { message: true }
        });

        if (!result) {
            return null;
        }

        return {
            message: {
                event: result.message.event,
                payloadHash: result.message.payloadHash
            }
        };
    }

    findById(id: string): Promise<QueueMessage | null> {
        return prismaClient.queueMessage.findUnique({
            where: { id },
        }).then(result => {
            if (!result) {
                return null;
            }
            return {
                id: result.id,
                messageId: result.messageId,
                retryCount: result.retryCount,
                status: result.status
            };
        });
    }

    public async updateMessage(queueMessage: QueueMessage): Promise<void> {
        await prismaClient.queueMessage.update({
            where: { id: queueMessage.id },
            data: {
                status: queueMessage.status,
                retryCount: queueMessage.retryCount,
            }
        });
    }
}
