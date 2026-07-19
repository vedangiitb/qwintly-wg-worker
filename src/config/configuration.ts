const configuration = () => ({
  port: Number.parseInt(process.env.PORT || "8080", 10),
  gcp: {
    projectId: process.env.GCP_PROJECT_ID_QWINTLY,
    region: process.env.REGION || "asia-south1",
    builderJobName: "qwintly-builder",
    deployerJobName: "qwintly-deployer",
    pubsubPushAudience: process.env.PUBSUB_PUSH_AUDIENCE,
  },
  supabase: {
    url: process.env.NEXT_PUBLIC_SUPABASE_URL,
    secretKey: process.env.SUPABASE_SECRET_KEY,
  },
  upstash: {
    url: process.env.UPSTASH_REDIS_REST_URL_GEN_EVENTS,
    token: process.env.UPSTASH_REDIS_REST_TOKEN_GEN_EVENTS,
  },
  publishSecret: process.env.PUBLISH_SECRET,
});
export default configuration;
