import { Socket } from "net";
import type { Request }  from "../@types/contracts/Request";
import { MessageController } from "../modules/message/controller/MessageController";
import { MessageRepositoryImpl } from "@/modules/message/domain/repository/MessageRepositoryimpl";
import { QueueMessageRepositoryImpl } from "@/modules/queue/domain/repository/QueueMessageRepositoryImpl";
import { ErrorHandler } from "../infra/middleware/Error";
import { QueueWorker } from '../modules/worker/QueueWorker';
import { MessageService } from "@/modules/message/service/MessageService";
import { QueueMessageService } from "@/modules/queue/service/QueueMessageService";
import { QueueMessageController } from "@/modules/queue/controller/QueueMessageController";


export class Routes {
    private readonly messageRepository: MessageRepositoryImpl;
    private readonly queueMessageRepository: QueueMessageRepositoryImpl;
    private readonly queueMessageService: QueueMessageService;
    private readonly messageService: MessageService;
    private readonly queueWorker: QueueWorker;
    private readonly messageController: MessageController;
    private readonly queueMessageController: QueueMessageController;

    constructor(
    ) {
        this.messageRepository = new MessageRepositoryImpl();
        this.queueMessageRepository = new QueueMessageRepositoryImpl();
        this.queueMessageService = new QueueMessageService(this.queueMessageRepository);
        this.messageService = new MessageService(this.messageRepository, this.queueMessageService);
        this.queueWorker = new QueueWorker(this.queueMessageService, this.queueMessageRepository);
        this.messageController = new MessageController(this.messageService);
        this.queueMessageController = new QueueMessageController(this.queueMessageService);

        this.queueWorker.start();
    }

	public handle(request:Request, socket:Socket):void  {
        
        if (request.method == 'POST' && request.path == 'publish'){
            this.messageController.publish(request, socket);
        }

        else if (request.method == 'POST' && request.path == 'retry'){
            this.queueMessageController.retry(request, socket);
        }
        
        else {
            ErrorHandler.handle("Rota não encontrada", socket);       
        }
    }
}
