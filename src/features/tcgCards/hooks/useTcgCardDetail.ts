import { useEffect, useState } from "react";

import { catalogRepository, homeRepository } from "@/src/lib/repositories";
import type { CatalogResolvedTcgCard } from "@/src/features/catalog/catalog.types";
import type { CatalogTcg, CatalogLanguage } from "@/src/domain/catalog/catalog.types";

type Params = {
	tcg: CatalogTcg;
	catalogTcgCardId: string;
	language?: CatalogLanguage;
};

export function useTcgCardDetail({ tcg, catalogTcgCardId, language }: Params) {
	const [card, setCard] = useState<CatalogResolvedTcgCard | null>(null);
	const [isLoading, setIsLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		let isMounted = true;

		async function load() {
			try {
				setIsLoading(true);

				const result = await catalogRepository.getCatalogTcgCardById(
					tcg,
					catalogTcgCardId,
					language
				);

				if (isMounted) {
					setCard(result);
					setError(null);
				}

				if (result) {
					void homeRepository
						.recordRecentView({
							kind: "catalog-tcg-card",
							tcg,
							catalogTcgCardId,
							language,
						})
						.catch(() => {
							// Recent views are non-blocking; ignore write failures here.
						});
				}
			} catch {
				if (isMounted) {
					setError("Failed to load card.");
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
	}, [tcg, catalogTcgCardId, language]);

	return { card, isLoading, error };
}
