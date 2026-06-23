import { SocketClient } from "@/infra/client/SocketClient";
import { ResponseParser } from "@/infra/parser/ResponseParser";

export class ServiceClient {
  constructor(
    private readonly socketClient: SocketClient,
    private readonly serviceHost: string,
    private readonly servicePort: number
  ) {}

  public async send(queueMessageId: string, event: string, payloadHash: string): Promise<void> {
    const request = this.buildSendRequest(queueMessageId, event, payloadHash);

    await this.socketClient.send(
      this.serviceHost,
      this.servicePort,
      request
    );

    }

  private buildSendRequest(queueMessageId: string, event: string, payloadHash: string): string {
    return ResponseParser.serialize({
      method: "POST",
      path: "redirect",
      service: process.env.XUPAY_SERVICE_NAME || "xupay-mensageria",
      secret: process.env.XUPAY_SERVICE_SECRET,
      body: {
        payload:{
          queueMessageId,
          event,
          payloadHash
        }
      }
    });
  }
}
