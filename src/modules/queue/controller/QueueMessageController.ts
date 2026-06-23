import { Socket } from "net";
import { QueueMessageService } from "../service/QueueMessageService";
import type { Request }  from "../../../@types/contracts/Request";
import { isValidRequest } from "@/@types/contracts/Request";
import type { QueueMessagePayload } from "@/@types/contracts/QueueMessagePayload";

export class QueueMessageController{
    constructor(
        private readonly queueMessageService: QueueMessageService
    ) {}

    public async retry(request: Request, socket: Socket): Promise<void> {
        const validRequest = isValidRequest(request, socket);

        if (!validRequest) {
            return;
        }

        const payload = request.body.payload;

        const { kind, queueMessageId } = payload as QueueMessagePayload;

        void this.queueMessageService.retryMessage(kind, queueMessageId, socket);

    }
    
}
