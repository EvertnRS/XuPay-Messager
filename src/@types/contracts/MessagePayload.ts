import { Payload } from "./PayloadBase";

export type MessagePayload = Payload & {
  kind: "MESSAGE_PAYLOAD";
  event: string;
  idempotencyKey: string;
  apiPayload: string;
  timestamp: string;
};
