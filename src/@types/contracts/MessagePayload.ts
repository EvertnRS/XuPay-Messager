import { Payload } from "./PayloadBase";

export type JsonValue =
  | string
  | number
  | boolean
  | null
  | JsonValue[]
  | { [key: string]: JsonValue };

export type MessagePayload = Payload & {
  kind: "MESSAGE_PAYLOAD";
  event: string;
  idempotencyKey: string;
  apiPayload: JsonValue;
};
