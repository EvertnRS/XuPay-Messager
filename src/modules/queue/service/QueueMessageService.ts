import { IQueueMessageRepository } from "../domain/repository/IQueueMessageRepository";
import { QueueMessage } from "../domain/entity/QueueMessage";
import { Socket } from "net";
import { ResponseParser } from "@/infra/parser/ResponseParser";
import { ErrorHandler } from "@/infra/middleware/Error";
import { QueueStatus } from '../../../infra/database/generated/enums';

export class QueueMessageService {
    constructor(
        private queueMessageRepository: IQueueMessageRepository
    ) {}

    private static readonly MAX_RETRIES = 3;
    
    public async saveQueueMessage(messageId: string): Promise<void> {
        await this.queueMessageRepository.saveMessage({
            messageId,
        });
    }

    public async updateQueueMessage(queueMessage: QueueMessage): Promise<void> {
        if (!Object.values(QueueStatus).includes(queueMessage.status as QueueStatus)){
            console.log(`Status inválido: ${queueMessage.status}`);
            return;
        }

        await this.queueMessageRepository.updateMessage(queueMessage);
    }

    public async retryMessage(kind: string, id: string, socket: Socket): Promise<void> {

        if (kind !== "QUEUE_MESSAGE_PAYLOAD") {
            return ErrorHandler.handle("Payload inválido para publicação", socket);
        }

        if (!id) {
            throw new Error("Payload deve conter um id para retry");
        }

        const queueMessage = await this.queueMessageRepository.findById(id);

        if (!queueMessage) {
            throw new Error(`Mensagem com id ${id} não encontrada`);
        }

        await this.internalRetryMessage(queueMessage);

        const responseBody = {
            id: queueMessage.id,
            status: queueMessage.status,
            retryCount: queueMessage.retryCount,
            timestamp: new Date().toISOString()
        };

        const response = ResponseParser.serializeResponse(200, responseBody);
        
        socket.write(response);
        socket.end();
    }

    public async internalRetryMessage(queueMessage: QueueMessage): Promise<void> {
        if(queueMessage.retryCount + 1 > QueueMessageService.MAX_RETRIES) {
            await this.queueMessageRepository.updateMessage({
                ...queueMessage,
                status: 'FAILED'
            });

            throw new Error(`Mensagem ${queueMessage.id} excedeu o número máximo de tentativas.`);
            
        } else {
            await this.queueMessageRepository.updateMessage({
                ...queueMessage,
                status: 'PENDING',
                retryCount: queueMessage.retryCount + 1
            });
        }
    }
}
