import { Storage } from "@google-cloud/storage";

const storage = new Storage();

export async function savePayloadtoGCS(
  bucketName: string,
  destination: string,
  payload: any
) {
  await storage
    .bucket(bucketName)
    .file(destination)
    .save(JSON.stringify(payload), {
      contentType: "application/json",
    });
}
