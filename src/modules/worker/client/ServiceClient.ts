import { SocketClient } from "@/infra/client/SocketClient";
import { ResponseParser } from "@/infra/parser/ResponseParser";

export class ServiceClient {
  constructor(
    private readonly socketClient: SocketClient,
    private readonly serviceHost: string,
    private readonly servicePort: number
  ) {}

  public async send(queueMessageId: string, service: string, payloadHash: string): Promise<void> {
    const request = this.buildSendRequest(queueMessageId, service, payloadHash);

    await this.socketClient.send(
      this.serviceHost,
      this.servicePort,
      request
    );

    }

  private buildSendRequest(queueMessageId: string, service: string, payloadHash: string): string {
    return ResponseParser.serialize({
      method: "POST",
      path: "redirect",
      service: process.env.XUPAY_SERVICE_NAME || "xupay-mensageria",
      secret: process.env.XUPAY_SERVICE_SECRET,
      body: {
        queueMessageId,
        service,
        payloadHash,
        timestamp: new Date().toISOString(),
      },
    });
  }
}
