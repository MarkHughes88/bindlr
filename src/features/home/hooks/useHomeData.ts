import { useCallback, useEffect, useState } from "react";
import { homeRepository } from "@/src/lib/repositories";
import type { HomeData } from "../home.types";

export function useHomeData() {
	const [data, setData] = useState<HomeData | null>(null);
	const [isLoading, setIsLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [isRefreshing, setIsRefreshing] = useState(false);

	const load = useCallback(async (showLoader: boolean) => {
		try {
			if (showLoader) {
				setIsLoading(true);
			} else {
				setIsRefreshing(true);
			}

			const result = await homeRepository.getHomeData();
			setData(result);
			setError(null);
		} catch {
			setError("Failed to load home data.");
		} finally {
			setIsLoading(false);
			setIsRefreshing(false);
		}
	}, []);

	useEffect(() => {
		void load(true);
	}, [load]);

	const reload = useCallback(async () => {
		await load(false);
	}, [load]);

	return { data, isLoading, isRefreshing, error, reload };
}