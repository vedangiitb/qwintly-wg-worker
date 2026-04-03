import { EventType, GenStep } from "../../types/events.js";
import { sendStatusToRedis } from "./redis.service.js";
import {
  GenStatusRepository,
  PersistedStatusEvent,
} from "../../repository/genStatus.repository.js";

type StatusLogger = Pick<typeof console, "error">;

export type StatusErrorCode =
  | "INVALID_ARGUMENTS"
  | "PERSISTENCE_FAILED"
  | "REDIS_PUBLISH_FAILED";

export class StatusServiceError extends Error {
  public readonly code: StatusErrorCode;
  public readonly cause?: unknown;
  public readonly context?: Record<string, unknown>;

  constructor(
    code: StatusErrorCode,
    message: string,
    options?: { cause?: unknown; context?: Record<string, unknown> },
  ) {
    super(message);
    this.name = "StatusServiceError";
    this.code = code;
    this.cause = options?.cause;
    this.context = options?.context;
  }
}

export interface StatusRepository {
  persist(
    chatId: string,
    sessionId: string,
    eventType: EventType,
    step: GenStep,
    message: string,
    source: string,
  ): Promise<PersistedStatusEvent>;
}

export interface StatusPublisher {
  publish(chatId: string, event: PersistedStatusEvent): Promise<void>;
}

export interface StatusServiceDeps {
  repository: StatusRepository;
  publisher: StatusPublisher;
  logger?: StatusLogger;
}

const genStatusRepository = new GenStatusRepository();

const defaultDeps: StatusServiceDeps = {
  repository: {
    persist: (chatId, sessionId, eventType, step, message, source) =>
      genStatusRepository.persistStatusMessage(
        chatId,
        sessionId,
        eventType,
        step,
        message,
        source,
      ),
  },
  publisher: {
    publish: sendStatusToRedis,
  },
  logger: console,
};

export const statusService = async (
  chatId: string,
  sessionId: string,
  eventType: EventType,
  step: GenStep,
  message: string,
  source: string,
  deps: StatusServiceDeps = defaultDeps,
): Promise<PersistedStatusEvent> => {
  const { repository, publisher, logger = console } = deps;

  assertNonEmpty(chatId, "chatId");
  assertNonEmpty(message, "message");
  assertNonEmpty(source, "source");

  let persistedEvent: PersistedStatusEvent;

  try {
    persistedEvent = await repository.persist(
      chatId,
      sessionId,
      eventType,
      step,
      message,
      source,
    );
  } catch (error) {
    throw new StatusServiceError(
      "PERSISTENCE_FAILED",
      "Failed to persist status event",
      {
        cause: error,
        context: { chatId, eventType, step, source },
      },
    );
  }

  try {
    await publisher.publish(chatId, persistedEvent);
    return persistedEvent;
  } catch (error) {
    logger.error("Failed publishing status event to Redis", {
      chatId,
      seq_num: persistedEvent.seq_num,
      error,
    });

    throw new StatusServiceError(
      "REDIS_PUBLISH_FAILED",
      "Status event persisted but failed to publish to Redis",
      {
        cause: error,
        context: {
          chatId,
          persistedEvent,
        },
      },
    );
  }
};

const assertNonEmpty = (value: string, field: string): void => {
  if (!value || !value.trim()) {
    throw new StatusServiceError(
      "INVALID_ARGUMENTS",
      `\`${field}\` must be a non-empty string`,
      { context: { field } },
    );
  }
};
