import net from "net";

const delay = (ms: number) =>
  new Promise<void>((resolve) => setTimeout(resolve, ms));

export class SocketClient {
  public async send(
    host: string,
    port: number,
    message: string
  ): Promise<string> {
    try {
      return await this.connect(host, port, message);
    } catch (err: any) {
      const internet = await hasInternet();
      if (!internet) {
        console.log(`Tentando novamente enviar mensagem para ${host}:${port}`);
        await delay(1000);
        return this.send(host, port, message);
      }
      throw err;
    }
  }

  private connect(
    host: string,
    port: number,
    message: string
  ): Promise<string> {
    return new Promise((resolve, reject) => {
      const client = new net.Socket();
      let response = "";

      client.setTimeout(5000);

      client.connect(port, host, () => {
        client.write(message);
      });

      client.on("data", (data) => {
        response += data.toString();
      });

      client.on("end", () => resolve(response));

      client.on("timeout", () => {
        client.destroy();
        reject(new Error(`Timeout ao conectar em ${host}:${port}`));
      });

      client.on("error", reject);

      client.on("close", () => {
        if (!response) {
          reject(new Error(`Conexão encerrada sem resposta de ${host}:${port}`));
        }
      });
    });
  }
}

async function hasInternet(): Promise<boolean> {
  try {
    const response = await fetch("https://cp.cloudflare.com/generate_204", {
      cache: "no-store",
    });

    return response.status === 204;
  } catch {
    return false;
  }
}