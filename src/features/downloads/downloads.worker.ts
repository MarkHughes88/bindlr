import type { DownloadsRepository } from './downloads.repository';

export async function processDownloadQueue(input: {
	repository: DownloadsRepository;
	maxJobs?: number;
}): Promise<{ processedCount: number }> {
	const maxJobs = Math.max(1, input.maxJobs ?? 16);
	let processedCount = 0;

	for (let index = 0; index < maxJobs; index += 1) {
		const processed = await input.repository.processNextJob();
		if (!processed) {
			break;
		}

		processedCount += 1;
	}

	return { processedCount };
}
