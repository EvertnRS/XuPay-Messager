import { QueueMessagePayload } from "./QueueMessagePayload";
import { MessagePayload } from "./MessagePayload";

export type Payload = MessagePayload | QueueMessagePayload;

export type MessageBody = {
    payload: Payload;
};
