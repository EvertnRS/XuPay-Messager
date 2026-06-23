import { queueEventBus } from "../../infra/event/QueueEventBus";
import { IQueueMessageRepository } from "../queue/domain/repository/IQueueMessageRepository";
import { QueueMessageService } from "../queue/service/QueueMessageService";
import { ServiceClient } from "./client/ServiceClient";
import { SocketClient } from "@/infra/client/SocketClient";

export class QueueWorker {
    private readonly serviceClient: ServiceClient;

    constructor(
        private readonly queueMessageService : QueueMessageService,
        private readonly queueMessageRepository : IQueueMessageRepository
    ) {
        const socketClient = new SocketClient();
        this.serviceClient = new ServiceClient(
            socketClient, 
            process.env.SERVICE_CLIENT_HOST || ' ', 
            parseInt(process.env.SERVICE_CLIENT_PORT || ' ')
        );

    }

    private isProcessing = false;

    public start() {
        console.log("[Worker] Observer iniciado. Aguardando eventos NEW_MESSAGE...");
        
        //Inicia o processamento da fila quando um novo evento de mensagem é emitido
        queueEventBus.on('NEW_MESSAGE', async () => {
            await this.processQueue();
        });

        // Inicia o processamento da fila imediatamente ao iniciar o worker
        this.processQueue(); 
    }

    private async processQueue() {
        if (this.isProcessing) return;
        this.isProcessing = true;
        let nextMessage;

        try {
            while (true) {
                nextMessage = await this.queueMessageRepository.findFirstPendingMessage();

                if (!nextMessage) {
                    break;
                }

                console.log(`[Worker] Observer pegou a mensagem ID: ${nextMessage.id}`);

                await this.queueMessageService.updateQueueMessage({
                    ...nextMessage,
                    status: 'PROCESSING'
                });

                const payloadData = await this.queueMessageRepository.findMessagePayloadById(nextMessage.id);

                if (!payloadData) {
                    console.error(`[Worker] Payload não encontrado para a mensagem ID: ${nextMessage.id}`);
                    await this.queueMessageService.internalRetryMessage(nextMessage);
                    continue;
                }

                await this.serviceClient.send(nextMessage.id, payloadData.message.event, payloadData.message.payloadHash);

                await this.queueMessageService.updateQueueMessage({
                    ...nextMessage,
                    status: 'DONE'
                });

                console.log(`[Worker] Mensagem ID: ${nextMessage.id} concluída.`);
            }
        } catch (error) {
            console.error("[Worker] Erro ao processar mensagem:", error);
            if (nextMessage) {
                await this.queueMessageService.internalRetryMessage(nextMessage);
            }
            
        } finally {
            this.isProcessing = false;
        }
    }
}
