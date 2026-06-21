import {
  createRequestSignature,
  normalizePath,
} from "../../@types/contracts/Request";
import type { Request, RequestHeaders } from "../../@types/contracts/Request";
import type { MessagePayload, JsonValue } from "@/@types/contracts/MessagePayload";
import type { QueueMessagePayload } from "@/@types/contracts/QueueMessagePayload";
import type { Payload } from "@/@types/contracts/MessageBody";
import { JsonCodec } from "./JsonCodec";
import type { JsonObject } from "./JsonCodec";

type SerializableRequest = {
  method: string;
  path: string;
  headers?: RequestHeaders;
  body: JsonObject;
  service?: string;
  secret?: string;
};

export class ResponseParser {
  public static deserialize(rawRequest: string): Request {
    const request = rawRequest.trim();

    if (!this.isHttpRequest(request)) {
      throw new Error("Protocolo inválido. Esperado HTTP/1.1 ou HTTP/1.0");
    }

    return this.deserializeHttpRequest(request);
  }

  public static serialize(request: SerializableRequest): string {
    const method = request.method.toUpperCase();
    const path = normalizePath(request.path);
    const rawBody = JsonCodec.stringify(request.body);
    const headers: RequestHeaders = {
      host: "xupay-mensageria",
      "content-type": "application/json",
      "content-length": Buffer.byteLength(rawBody).toString(),
      ...this.normalizeHeaders(request.headers || {}),
    };

    if (request.service && request.secret) {
      headers["x-xupay-service"] = request.service;
      headers["x-xupay-signature"] = createRequestSignature(
        method,
        path,
        rawBody,
        request.secret
      );
    }

    const headerLines = Object.entries(headers).map(
      ([key, value]) => `${this.toHttpHeaderName(key)}: ${value}`
    );

    return `${method} /${path} HTTP/1.1\r\n${headerLines.join(
      "\r\n"
    )}\r\n\r\n${rawBody}`;
  }

  public static serializeResponse(statusCode: number, body: JsonObject): string {
    const statusText = statusCode >= 400 ? "Error" : "OK";
    const rawBody = JsonCodec.stringify(body);

    return `HTTP/1.1 ${statusCode} ${statusText}\r\nContent-Type: application/json\r\nContent-Length: ${Buffer.byteLength(
      rawBody
    )}\r\n\r\n${rawBody}`;
  }

  private static isHttpRequest(request: string): boolean {
    return /^[A-Z]+ \S+ HTTP\/1\.[01]/.test(request);
  }

  private static deserializeHttpRequest(rawRequest: string): Request {
    const separator = rawRequest.indexOf("\r\n\r\n");

    if (separator === -1) {
      throw new Error("Requisição HTTP sem separador entre headers e body");
    }

    const headerPart = rawRequest.slice(0, separator);
    const rawBody = rawRequest.slice(separator + 4);
    const [requestLine, ...headerLines] = headerPart.split("\r\n");
    const [method, rawPath] = requestLine.split(" ");
    const headers = this.parseHeaders(headerLines);
    const parsedBody = this.parseJsonObject(rawBody);

    return {
      method: method.toUpperCase(),
      path: normalizePath(rawPath),
      headers,
      body: {
        payload: this.parsePayloadByPath(normalizePath(rawPath), parsedBody),
        timestamp: this.optionalString(parsedBody.timestamp),
      },
      rawBody
    };
  }

  private static parsePayloadByPath(path: string, body: JsonObject): Payload {
    if (path === "publish") {
      return this.parseMessagePayload(body);
    }

    if (path === "retry") {
      return this.parseQueueMessagePayload(body);
    }

    if (typeof body.id === "string") {
      return this.parseQueueMessagePayload(body);
    }

    return this.parseMessagePayload(body);
  }

  private static parseMessagePayload(body: JsonObject): MessagePayload {
    if (typeof body.service !== "string" || !body.service.trim()) {
      throw new Error("Payload inválido. Campo service ausente.");
    }

    if (
      typeof body.idempotencyKey !== "string" ||
      !body.idempotencyKey.trim()
    ) {
      throw new Error("Payload inválido. Campo idempotencyKey ausente.");
    }

    if (!("apiPayload" in body)) {
      throw new Error("Payload inválido. Campo apiPayload ausente.");
    }

    return {
      kind: "MESSAGE_PAYLOAD",
      service: body.service,
      idempotencyKey: body.idempotencyKey,
      apiPayload: body.apiPayload,
    };
  }

  private static parseQueueMessagePayload(body: JsonObject): QueueMessagePayload {
    if (typeof body.id !== "string" || !body.id.trim()) {
      throw new Error("Payload inválido. Campo id ausente.");
    }

    return {
      kind: "QUEUE_MESSAGE_PAYLOAD",
      id: body.id,
    };
  }

  private static parseHeaders(headerLines: string[]): RequestHeaders {
    const headers: RequestHeaders = {};

    for (const line of headerLines) {
      const separatorIndex = line.indexOf(":");

      if (separatorIndex === -1) {
        continue;
      }

      const key = line.slice(0, separatorIndex).trim().toLowerCase();
      const value = line.slice(separatorIndex + 1).trim();

      if (key) {
        headers[key] = value;
      }
    }

    return headers;
  }

  private static parseJsonObject(rawBody: string): JsonObject {
    return JsonCodec.parseObject(rawBody);
  }

  private static optionalString(value: JsonValue | undefined): string | undefined {
    return typeof value === "string" ? value : undefined;
  }

  private static normalizeHeaders(headers: RequestHeaders): RequestHeaders {
    const normalizedHeaders: RequestHeaders = {};

    for (const [key, value] of Object.entries(headers)) {
      normalizedHeaders[key.toLowerCase()] = value;
    }

    return normalizedHeaders;
  }

  private static toHttpHeaderName(header: string): string {
    return header
      .split("-")
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join("-");
  }
}
