/** Result of uploading a file to S3. */
export interface UploadResult {
  key: string;
  url: string;
  etag?: string;
}

/** Shape of file from multer (memory storage) when using FileInterceptor('file'). */
export interface MulterFile {
  buffer: Buffer;
  mimetype: string;
  originalname?: string;
}

/** Structural shape of an AI-generated file (e.g. `GeneratedFile` from the `ai` package). */
export interface GeneratedFileLike {
  uint8Array: Uint8Array;
  mediaType?: string;
}
