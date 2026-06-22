import { Socket } from "net";
import { Request, isValidRequest} from "@/@types/contracts/Request";
import { MessageService } from "../service/MessageService";
import { MessagePayload } from "@/@types/contracts/MessagePayload";

export class MessageController{
    constructor(
        private messageService: MessageService
    ) {}

    public publish(request: Request, socket: Socket): void {
        const validRequest = isValidRequest(request, socket);

        if (!validRequest) {
            return;
        }

        const payload = request.body.payload;

        const { event, apiPayload, idempotencyKey } = payload as MessagePayload;
        const { timestamp } = request.body;

        void this.messageService.publish(
            event,
            apiPayload,
            idempotencyKey,
            timestamp || "",
            socket
        );
    }
}
