import { Socket } from "net";
import { IMessageRepository } from "../domain/repository/IMessageRepository";
import { queueEventBus } from "../../../infra/event/QueueEventBus";
import { ErrorHandler } from "@/infra/middleware/Error";
import { QueueMessageService } from "@/modules/queue/service/QueueMessageService";
import { MessageWorker } from "@/modules/worker/MessageWorker";
import { ResponseParser } from "@/infra/parser/ResponseParser";
import crypto from "crypto";
import { JsonValue } from "@/@types/contracts/MessagePayload";
import { JsonCodec } from "@/infra/parser/JsonCodec";

export class MessageService {
  private readonly messageWorker: MessageWorker;

  constructor(
    private messageRepository: IMessageRepository,
    private queueMessageService: QueueMessageService
  ) {
    this.messageWorker = new MessageWorker(this.queueMessageService);
    this.messageWorker.register();
  }

  public async publish(messageBody: any, socket: Socket): Promise<void> {
    if (messageBody.payload.kind !== "MESSAGE_PAYLOAD") {
      return ErrorHandler.handle("Payload inválido para publicação", socket);
    }

    const apiPayload = messageBody.payload.apiPayload;

    const existingMessage = await this.messageRepository.findByIdempotencyKey(
      messageBody.payload.idempotencyKey
    );

    if (existingMessage) {
      return ErrorHandler.handle("Mensagem já existe", socket);
    }

    const payloadHash = this.generatePayloadHash(apiPayload);

    const savedMessage = await this.messageRepository.saveMessage({
      service: messageBody.payload.service,
      payloadHash,
      timestamp: messageBody.timestamp ? new Date(messageBody.timestamp) : new Date(),
      idempotencyKey: messageBody.payload.idempotencyKey
    });

    queueEventBus.emit("MESSAGE_CREATED", {
      messageId: savedMessage.id,
    });

    const responseBody = {
      service: messageBody.payload.service,
      payloadHash,
      timestamp: new Date().toISOString(),
    };

    const response = ResponseParser.serializeResponse(201, responseBody);

    socket.write(response);
    socket.end();
  }

  private generatePayloadHash(payload: JsonValue): string {
    return crypto
      .createHash("sha256")
      .update(JsonCodec.stableStringify(payload))
      .digest("hex");
  }
}
