let seedResolve: () => void;
let seedReject: (err: Error) => void;
const seedPromise = new Promise<void>((resolve, reject) => {
  seedResolve = resolve;
  seedReject = reject;
});
let seedCompleted = false;

export const markSeedComplete = (): void => {
  seedCompleted = true;
  seedResolve();
};

export const markSeedFailed = (err: Error): void => {
  seedReject(err);
};

export const waitForSeed = async (timeoutMs = 30000): Promise<boolean> => {
  if (seedCompleted) return true;
  try {
    await Promise.race([
      seedPromise,
      new Promise<void>((_, reject) => setTimeout(() => reject(new Error('Seed timeout')), timeoutMs)),
    ]);
    return true;
  } catch {
    return false;
  }
};
