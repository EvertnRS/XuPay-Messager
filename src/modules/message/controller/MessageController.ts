import { Socket } from "net";
import { Request, isValidRequest} from "@/@types/contracts/Request";
import { MessageService } from "../service/MessageService";

export class MessageController{
    constructor(
        private messageService: MessageService
    ) {}

    public publish(request: Request, socket: Socket): void {
        const validRequest = isValidRequest(request, socket);

        if (!validRequest) {
            return;
        }

        const messageBody = request.body;

        this.messageService.publish(messageBody, socket);
    }
}
