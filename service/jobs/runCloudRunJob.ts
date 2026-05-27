import { jobsClient } from "../../config/jobsClient.config.js";
import { JobParams } from "../../types/jobParams.types.js";

type Logger<EventType> = (
  message: string,
  eventType: EventType,
) => Promise<void>;

type RequiredEventTypes<EventType> = {
  STEP_STARTED: EventType;
  GENERATION_FAILED: EventType;
};

function buildSessionEnv(params: JobParams) {
  const jobParams = {
    SESSION_ID: params.sessionId,
    JOB_TOKEN: params.jobToken,
  };

  return Object.entries(jobParams).map(([name, value]) => ({
    name,
    value: String(value),
  }));
}

export async function runCloudRunJob<EventType>(options: {
  params: JobParams;
  jobResource: string;
  executionSuffix?: string;
  pipelineLabel?: string;
  messages: {
    starting: string;
    started: string;
    failedPrefix: string;
  };
  eventTypes: RequiredEventTypes<EventType>;
  logger: Logger<EventType>;
}) {
  const {
    params,
    jobResource,
    executionSuffix,
    pipelineLabel,
    messages,
    eventTypes,
    logger,
  } = options;

  try {
    const request = {
      name: jobResource,
      ...(executionSuffix ? { executionSuffix } : {}),
      overrides: {
        ...(pipelineLabel ? { labels: { pipeline: pipelineLabel } } : {}),
        containerOverrides: [
          {
            env: buildSessionEnv(params),
          },
        ],
      },
    };

    await logger(messages.starting, eventTypes.STEP_STARTED);
    await jobsClient.runJob(request);
    await logger(messages.started, eventTypes.STEP_STARTED);
  } catch (err) {
    await logger(
      `${messages.failedPrefix}: ${(err as Error).message}`,
      eventTypes.GENERATION_FAILED,
    );
    throw err;
  }
}

