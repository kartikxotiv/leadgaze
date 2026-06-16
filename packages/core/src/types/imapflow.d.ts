declare module 'imapflow' {
  export class ImapFlow {
    constructor(config: Record<string, unknown>);
    connect(): Promise<void>;
    logout(): Promise<void>;
    list(): Promise<
      Array<{
        path?: string;
        name?: string;
        specialUse?: string;
      }>
    >;
    getMailboxLock(mailbox: string): Promise<{ release(): void }>;
    search(criteria: Record<string, unknown>): Promise<number[]>;
    fetchOne(
      sequence: string,
      options: Record<string, unknown>,
    ): Promise<{
      source?: Buffer;
      envelope?: { date?: string | Date };
      internalDate?: string | Date;
    } | null>;
  }
}
