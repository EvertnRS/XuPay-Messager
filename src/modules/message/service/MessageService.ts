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

  public async publish(event: string, apiPayload: JsonValue, idempotencyKey: string, timestamp: string, socket: Socket): Promise<void> {
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

    const payloadEncrypted = this.generatePayloadEncrypted(apiPayload);

    const savedMessage = await this.messageRepository.saveMessage({
      event: event,
      payloadEncrypted,
      timestamp: timestamp ? new Date(timestamp) : new Date(),
      idempotencyKey: idempotencyKey
    });

    queueEventBus.emit("MESSAGE_CREATED", {
      messageId: savedMessage.id,
    });

    const responseBody = {
      event: event,
      payloadEncrypted,
      timestamp: new Date(timestamp).toISOString(),
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
