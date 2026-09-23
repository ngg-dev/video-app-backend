/**
 * Runs a chain of `count` scene image generations strictly one after
 * another — `generateImage(i, previous)` starts only after
 * `generateImage(i - 1)` has resolved, and `previous` is that resolved
 * image (`undefined` for `i === 0`). As soon as an image resolves, its
 * video generation is kicked off immediately, without waiting for the
 * next image(s) to be ready.
 *
 * Fails fast: a rejection of any image or video generation rejects the
 * overall promise with that error, and no further images are started once
 * a rejection has been observed. Already-started video generations are not
 * cancelled (there is no cancellation in the underlying SDK) — they are
 * simply left to settle in the background, with a handler attached
 * immediately so they never surface as an unhandled rejection.
 *
 * Resolves with the video results in the original scene order.
 */
export async function runSceneImageChain<TImage, TResult>(
  count: number,
  generateImage: (
    index: number,
    previous: TImage | undefined,
  ) => Promise<TImage>,
  generateVideo: (image: TImage) => Promise<TResult>,
): Promise<TResult[]> {
  const videoPromises: Promise<TResult>[] = [];

  let failed = false;
  let firstError: unknown;

  const recordFailure = (error: unknown): void => {
    if (!failed) {
      failed = true;
      firstError = error;
    }
  };

  let previous: TImage | undefined;

  for (let index = 0; index < count; index++) {
    if (failed) {
      break;
    }

    let image: TImage;

    try {
      image = await generateImage(index, previous);
    } catch (error) {
      recordFailure(error);
      break;
    }

    if (failed) {
      break;
    }

    previous = image;

    const videoPromise = generateVideo(image);
    videoPromise.catch(recordFailure);
    videoPromises.push(videoPromise);
  }

  if (failed) {
    throw firstError;
  }

  return Promise.all(videoPromises);
}
