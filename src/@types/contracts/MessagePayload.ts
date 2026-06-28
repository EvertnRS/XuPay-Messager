import { Payload } from "./PayloadBase";
import { JsonValue } from "./JsonValue";

export type MessagePayload = Payload & {
  kind: "MESSAGE_PAYLOAD";
  event: string;
  idempotencyKey: string;
  apiPayload: JsonValue;
  timestamp: string;
};
