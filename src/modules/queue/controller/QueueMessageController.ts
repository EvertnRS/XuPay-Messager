import { Socket } from "net";
import { QueueMessageService } from "../service/QueueMessageService";
import type { Request }  from "../../../@types/contracts/Request";
import { isValidRequest } from "@/@types/contracts/Request";

export class QueueMessageController{
    constructor(
        private readonly queueMessageService: QueueMessageService
    ) {}

    public async retry(request: Request, socket: Socket): Promise<void> {
        const validRequest = isValidRequest(request, socket);

        if (!validRequest) {
            return;
        }

        this.queueMessageService.retryMessage(validRequest, socket);

    }
    
}
