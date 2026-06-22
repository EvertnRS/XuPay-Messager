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

  public async publish(messageBody: any, socket: Socket): Promise<void> {
    if (messageBody.payload.kind !== "MESSAGE_PAYLOAD") {
      return ErrorHandler.handle("Payload inválido para publicação", socket);
    }

    if (!Object.values(Event).includes(messageBody.payload.event as Event)){
        return ErrorHandler.handle(`Evento inválido: ${messageBody.payload.event}`, socket);
    }

    const apiPayload = messageBody.payload.apiPayload;

    const existingMessage = await this.messageRepository.findByIdempotencyKey(
      messageBody.payload.idempotencyKey
    );

    if (existingMessage) {
      return ErrorHandler.handle("Mensagem já existe", socket);
    }

    const payloadEncrypted = this.generatePayloadEncrypted(apiPayload);

    const savedMessage = await this.messageRepository.saveMessage({
      event: messageBody.payload.event,
      payloadEncrypted,
      timestamp: messageBody.timestamp ? new Date(messageBody.timestamp) : new Date(),
      idempotencyKey: messageBody.payload.idempotencyKey
    });

    queueEventBus.emit("MESSAGE_CREATED", {
      messageId: savedMessage.id,
    });

    const responseBody = {
      event: messageBody.payload.event,
      payloadEncrypted,
      timestamp: new Date().toISOString(),
    };

    const response = ResponseParser.serializeResponse(201, responseBody);

    socket.write(response);
    socket.end();
  }

  private generatePayloadEncrypted(payload: JsonValue): string {
    const key = Buffer.from(
      process.env.XUPAY_ENCRYPTION_KEY || "",
      "hex"
    );

    const iv = crypto.randomBytes(16);

    const cipher = crypto.createCipheriv(
      "aes-256-cbc",
      key,
      iv
    );

    const encrypted =
    cipher.update(
      JsonCodec.stableStringify(payload),
      "utf8",
      "hex"
    ) +
    cipher.final("hex");

    const result = `${iv.toString("hex")}:${encrypted}`;

    return result;
  }
}
