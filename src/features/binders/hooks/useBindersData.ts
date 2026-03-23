import { useEffect, useState } from "react";
import { bindersRepository } from "@/src/lib/repositories";
import type { BindersData } from "../binders.types";

export function useBindersData() {
	const [data, setData] = useState<BindersData | null>(null);
	const [isLoading, setIsLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		let isMounted = true;

		async function load() {
			try {
				setIsLoading(true);
				const result = await bindersRepository.getBindersData();

				if (isMounted) {
					setData(result);
					setError(null);
				}
			} catch {
				if (isMounted) {
					setError("Failed to load binders.");
				}
			} finally {
				if (isMounted) {
					setIsLoading(false);
				}
			}
		}

		load();

		return () => {
			isMounted = false;
		};
	}, []);

	return { data, isLoading, error };
}