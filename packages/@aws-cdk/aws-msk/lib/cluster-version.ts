/**
 * Kafka cluster version
 */
export class KafkaVersion {
  /**
   * Kafka version 1.1.1
   */
  public static readonly V1_1_1 = KafkaVersion.of('1.1.1');

  /**
   * Kafka version 2.2.1
   */
  public static readonly V2_2_1 = KafkaVersion.of('2.2.1');

  /**
   * Kafka version 2.3.1
   */
  public static readonly V2_3_1 = KafkaVersion.of('2.3.1');

  /**
   * Kafka version 2.4.1
   */
  public static readonly V2_4_1 = KafkaVersion.of('2.4.1');

  /**
   * Custom cluster version
   * @param version custom version number
   */
  public static of(version: string) {
    return new KafkaVersion(version);
  }
  /**
   *
   * @param version cluster version number
   */
  private constructor(public readonly version: string) {}
}
