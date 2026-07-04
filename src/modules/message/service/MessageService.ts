import { Socket } from "net";
import { IMessageRepository } from "../domain/repository/IMessageRepository";
import { queueEventBus } from "../../../infra/event/QueueEventBus";
import { ErrorHandler } from "@/infra/middleware/Error";
import { QueueMessageService } from "@/modules/queue/service/QueueMessageService";
import { MessageWorker } from "@/modules/worker/MessageWorker";
import { ResponseParser } from "@/infra/parser/ResponseParser";
import crypto from "crypto";
import { Event } from '../../../infra/database/generated/enums';

export class MessageService {
  private readonly messageWorker: MessageWorker;

  constructor(
    private messageRepository: IMessageRepository,
    private queueMessageService: QueueMessageService
  ) {
    this.messageWorker = new MessageWorker(this.queueMessageService);
    this.messageWorker.register();
  }

  public async publish(event: string, apiPayload: string, idempotencyKey: string, timestamp: string, socket: Socket): Promise<void> {
    if (!Object.values(Event).includes(event as Event)){
      return ErrorHandler.handle(`Evento inválido: ${event}`, socket);
    }

    console.log(`Publicando evento: ${event} com idempotencyKey: ${idempotencyKey}`);

    const existingMessage = await this.messageRepository.findByIdempotencyKey(
      idempotencyKey
    );

    if (existingMessage) {
      return ErrorHandler.handle("Mensagem já existe", socket);
    }

    const payloadHash = this.generatePayloadHash(apiPayload);

    const savedMessage = await this.messageRepository.saveMessage({
      event: event,
      payloadHash,
      timestamp: new Date(timestamp),
      idempotencyKey: idempotencyKey
    });

    queueEventBus.emit("MESSAGE_CREATED", {
      messageId: savedMessage.id,
    });

    const responseBody = {
      event: event,
      payload: apiPayload,
      timestamp: timestamp
    };

    const response = ResponseParser.serializeResponse(201, responseBody);

    socket.write(response);
    socket.end();
  }

  private generatePayloadHash(payload: string): string {
    return crypto
      .createHash("sha256")
      .update(payload)
      .digest("hex");
  }
}
