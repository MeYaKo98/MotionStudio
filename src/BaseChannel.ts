/**
 * Interface for basic communication
 */
export abstract class BaseChannel {
  /**
   * Open the communication channel
   */
  abstract connect(): Promise<boolean>;

  /**
   * Close the communication channel
   */
  abstract disconnect(): Promise<boolean>;

  /**
   * Read data from the Communication channel
   */
  abstract read(): Promise<Buffer | null>;

  /**
   * Write data to the communication channel
   * @param data The data to write
   */
  abstract write(data: Buffer): Promise<boolean>;
}
