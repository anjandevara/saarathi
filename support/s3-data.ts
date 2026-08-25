/**
 * support/s3-data.ts
 *
 * One job: move data in and out of Amazon Web Services (AWS) Simple
 * Storage Service (S3). Two situations this covers:
 *
 *   1. A large file a test needs (like a CSV to upload) lives in S3
 *      instead of a hard-coded path or the fixtures folder.
 *   2. Data one test creates (like a saved form) gets written to S3, so a
 *      completely different test suite, running later, can read it back.
 *      The fixtures folder is local JSON only and does not carry data
 *      between separate test suites, this file is what does.
 *
 * Credentials only ever come from environment variables. Locally that
 * means a .env file (never checked into the repository). In the CI/CD
 * (continuous integration and continuous delivery) pipeline, the same
 * variable names are set directly in the pipeline's own settings.
 *
 * Guardrail: only ever put synthetic test data in this bucket. Never
 * upload real personal information, real credentials, or real payment
 * details, even by accident. If a test needs a realistic-looking value,
 * generate a fake one.
 */
import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { Readable } from 'stream';
import * as fs from 'fs';

/** Builds an S3 client from environment variables only. Throws a clear error if any are missing. */
function buildS3Client(): S3Client {
  const region = process.env.AWS_REGION;
  const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
  const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;

  if (!region || !accessKeyId || !secretAccessKey) {
    throw new Error(
      'Missing AWS credentials. Set AWS_REGION, AWS_ACCESS_KEY_ID, and ' +
        'AWS_SECRET_ACCESS_KEY as environment variables (a local .env file, ' +
        'or the CI/CD pipeline settings). This framework never guesses or ' +
        'falls back to a default credential.'
    );
  }

  return new S3Client({ region, credentials: { accessKeyId, secretAccessKey } });
}

/** Reads the S3 bucket name from an environment variable. Throws if it is missing. */
function getBucketName(): string {
  const bucketName = process.env.S3_BUCKET_NAME;
  if (!bucketName) {
    throw new Error('Missing S3_BUCKET_NAME environment variable.');
  }
  return bucketName;
}

/** Turns an S3 response body stream into one complete string. */
async function streamToString(stream: Readable): Promise<string> {
  const chunks: Buffer[] = [];
  for await (const chunk of stream) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  return Buffer.concat(chunks).toString('utf-8');
}

/**
 * Uploads a large local file (like a CSV) to S3 under the given key.
 * Use this instead of checking large files into the fixtures folder.
 */
export async function uploadFileToS3(localFilePath: string, s3Key: string): Promise<void> {
  const client = buildS3Client();
  const bucketName = getBucketName();
  const fileStream = fs.createReadStream(localFilePath);

  await client.send(
    new PutObjectCommand({ Bucket: bucketName, Key: s3Key, Body: fileStream })
  );
}

/**
 * Downloads a large file from S3 to a local path, so a test can then use
 * it the normal way (for example, as a file upload input's value).
 */
export async function downloadFileFromS3(s3Key: string, localDestinationPath: string): Promise<void> {
  const client = buildS3Client();
  const bucketName = getBucketName();

  const response = await client.send(
    new GetObjectCommand({ Bucket: bucketName, Key: s3Key })
  );

  if (!response.Body) {
    throw new Error(`S3 object "${s3Key}" had no content.`);
  }

  const content = await streamToString(response.Body as Readable);
  fs.writeFileSync(localDestinationPath, content);
}

/**
 * Saves data created during a test (like a submitted form) to S3 as JSON,
 * under a shared-data prefix, so any other test suite can read it back
 * later with readSharedData().
 */
export async function saveSharedData(key: string, data: unknown): Promise<void> {
  const client = buildS3Client();
  const bucketName = getBucketName();
  const sharedDataKey = `shared-data/${key}.json`;

  await client.send(
    new PutObjectCommand({
      Bucket: bucketName,
      Key: sharedDataKey,
      Body: JSON.stringify(data, null, 2),
      ContentType: 'application/json',
    })
  );
}

/** Reads back data a different test suite saved earlier with saveSharedData(). */
export async function readSharedData<TData = unknown>(key: string): Promise<TData> {
  const client = buildS3Client();
  const bucketName = getBucketName();
  const sharedDataKey = `shared-data/${key}.json`;

  const response = await client.send(
    new GetObjectCommand({ Bucket: bucketName, Key: sharedDataKey })
  );

  if (!response.Body) {
    throw new Error(`Shared data "${key}" had no content.`);
  }

  const content = await streamToString(response.Body as Readable);
  return JSON.parse(content) as TData;
}
