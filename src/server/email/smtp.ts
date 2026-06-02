import net from "node:net";
import tls from "node:tls";
import { env } from "../env.js";

export function smtpConfigured() {
  return Boolean(env.smtpHost && env.smtpFrom);
}

export async function sendSmtpEmail(toEmail: string, subject: string, bodyText: string) {
  let client = await SmtpClient.connect();
  const hostname = env.baseHostname;
  try {
    await client.expect([220]);
    await client.command(`EHLO ${hostname}`, [250]);
    if (!env.smtpSecure && env.smtpStartTls) {
      await client.command("STARTTLS", [220]);
      client = await client.upgradeToTls();
      await client.command(`EHLO ${hostname}`, [250]);
    }
    if (env.smtpUser || env.smtpPassword) {
      const auth = Buffer.from(`\0${env.smtpUser}\0${env.smtpPassword}`).toString("base64");
      await client.command(`AUTH PLAIN ${auth}`, [235]);
    }
    await client.command(`MAIL FROM:${smtpAddress(env.smtpFrom)}`, [250]);
    await client.command(`RCPT TO:${smtpAddress(toEmail)}`, [250, 251]);
    await client.command("DATA", [354]);
    client.write(`${emailMessage(toEmail, subject, bodyText)}\r\n.\r\n`);
    await client.expect([250]);
    await client.command("QUIT", [221]);
  } finally {
    client.close();
  }
}

function emailMessage(toEmail: string, subject: string, bodyText: string) {
  return [
    `Date: ${new Date().toUTCString()}`,
    `From: ${emailHeader(env.smtpFrom)}`,
    `To: ${emailHeader(toEmail)}`,
    `Subject: ${emailHeader(subject)}`,
    "MIME-Version: 1.0",
    "Content-Type: text/plain; charset=UTF-8",
    "Content-Transfer-Encoding: 8bit",
    "",
    dotStuff(bodyText)
  ].join("\r\n");
}

function dotStuff(value: string) {
  return value.replace(/\r\n/g, "\n").replace(/\r/g, "\n").split("\n").map((line) => (line.startsWith(".") ? `.${line}` : line)).join("\r\n");
}

function smtpAddress(value: string) {
  return `<${value.replace(/[<>\r\n]/g, "").trim()}>`;
}

function emailHeader(value: string) {
  return value.replace(/[\r\n]+/g, " ").trim();
}

class SmtpClient {
  private buffer = "";
  private waiters: Array<() => void> = [];

  private constructor(private socket: net.Socket | tls.TLSSocket) {
    this.socket.setEncoding("utf8");
    this.socket.setTimeout(15000);
    this.socket.on("data", (chunk) => {
      this.buffer += chunk;
      this.flushWaiters();
    });
    this.socket.on("error", () => this.flushWaiters());
    this.socket.on("end", () => this.flushWaiters());
    this.socket.on("timeout", () => {
      this.socket.destroy(new Error("SMTP connection timed out."));
      this.flushWaiters();
    });
  }

  static connect() {
    return new Promise<SmtpClient>((resolve, reject) => {
      const socket = env.smtpSecure
        ? tls.connect({ host: env.smtpHost, port: env.smtpPort, servername: env.smtpHost })
        : net.connect({ host: env.smtpHost, port: env.smtpPort });
      const connectEvent = env.smtpSecure ? "secureConnect" : "connect";
      const onError = (error: Error) => {
        socket.off(connectEvent, onConnect);
        reject(error);
      };
      const onConnect = () => {
        socket.off("error", onError);
        resolve(new SmtpClient(socket));
      };
      socket.once(connectEvent, onConnect);
      socket.once("error", onError);
    });
  }

  async upgradeToTls() {
    this.socket.removeAllListeners("data");
    this.socket.removeAllListeners("error");
    this.socket.removeAllListeners("end");
    this.socket.removeAllListeners("timeout");
    const tlsSocket = tls.connect({ socket: this.socket, servername: env.smtpHost });
    await new Promise<void>((resolve, reject) => {
      const onError = (error: Error) => {
        tlsSocket.off("secureConnect", onConnect);
        reject(error);
      };
      const onConnect = () => {
        tlsSocket.off("error", onError);
        resolve();
      };
      tlsSocket.once("secureConnect", onConnect);
      tlsSocket.once("error", onError);
    });
    return new SmtpClient(tlsSocket);
  }

  write(value: string) {
    this.socket.write(value);
  }

  async command(value: string, expected: number[]) {
    this.write(`${value}\r\n`);
    await this.expect(expected);
  }

  async expect(expected: number[]) {
    const response = await this.readResponse();
    if (!expected.includes(response.code)) {
      throw new Error(`SMTP ${response.code}: ${response.text}`);
    }
  }

  close() {
    this.socket.end();
  }

  private async readResponse() {
    while (true) {
      const parsed = parseSmtpResponse(this.buffer);
      if (parsed) {
        this.buffer = this.buffer.slice(parsed.consumed);
        return parsed;
      }
      if (this.socket.destroyed) throw new Error("SMTP connection closed.");
      await new Promise<void>((resolve) => this.waiters.push(resolve));
    }
  }

  private flushWaiters() {
    const waiters = this.waiters.splice(0);
    for (const waiter of waiters) waiter();
  }
}

function parseSmtpResponse(buffer: string) {
  const match = buffer.match(/(?:^|\r?\n)(\d{3}) [^\r\n]*(?:\r?\n|$)/);
  if (!match || match.index === undefined) return undefined;
  const end = match.index + match[0].length;
  const text = buffer.slice(0, end).trim();
  return { code: Number(match[1]), text, consumed: end };
}
