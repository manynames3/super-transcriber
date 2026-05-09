# ADR-002: Upload Audio Directly from the Browser to S3

## Status

Accepted

## Context

Audio files can be much larger than the JSON requests handled by the rest of the API. Proxying file uploads through Lambda would add latency, increase Lambda cost, and complicate progress reporting.

## Decision

Expose a `POST /upload-url` route that returns a presigned S3 `PUT` URL. The browser uploads the MP3 or M4A file directly to the private uploads bucket with XHR progress events, then calls `POST /transcribe` with the resulting S3 key.

## Consequences

- Lambda does not need to stream or buffer user audio files.
- The upload UX can show native progress updates.
- The backend must validate that the S3 key belongs to the authenticated user before starting transcription.
