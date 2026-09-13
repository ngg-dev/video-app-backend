import {
  AWS_KEY_ID,
  AWS_SECRET_KEY,
  BUCKET_NAME,
  STORAGE_REGION,
  STORAGE_ENDPOINT,
} from 'src/shared/constants/config';

export { STORAGE_REGION, STORAGE_ENDPOINT };

export const STORAGE_BUCKET = BUCKET_NAME.trim();
export const STORAGE_ACCESS_KEY = AWS_KEY_ID.trim();
export const STORAGE_SECRET_KEY = AWS_SECRET_KEY.trim();
