import { beforeEach, describe, expect, it, vi } from 'vitest';

const getTcgCardIndexMock = vi.fn();
const getSetIndexMock = vi.fn();
const getDatabaseMock = vi.fn();

vi.mock('@/src/lib/catalog/catalog.lookup', () => ({
	getCatalogSetById: vi.fn(),
	getCatalogTcgCardById: vi.fn(),
	getSetIndex: getSetIndexMock,
	getTcgCardIndex: getTcgCardIndexMock,
}));

vi.mock('@/src/lib/db/client', () => ({
	getDatabase: getDatabaseMock,
}));

vi.mock('@/src/shared/config/tcg', () => ({
	getTcgTitle: (tcg: string) => tcg,
}));

describe('SqliteCatalogRepository language facets', () => {
	beforeEach(() => {
		getDatabaseMock.mockResolvedValue({
			getAllAsync: vi.fn().mockResolvedValue([]),
			getFirstAsync: vi.fn().mockResolvedValue(null),
			runAsync: vi.fn().mockResolvedValue(undefined),
		});

		getSetIndexMock.mockImplementation((tcg: string, language?: string) => {
			if (tcg !== 'pokemon') {
				return {};
			}

			if (language === 'ja') {
				return {
					jp1: { id: 'jp1', name: 'Japanese Set', language: 'ja', releaseDate: '2025-01-01' },
				};
			}

			return {
				en1: { id: 'en1', name: 'English Set', language: 'en', releaseDate: '2024-01-01' },
			};
		});

		getTcgCardIndexMock.mockImplementation((tcg: string, language?: string) => {
			if (tcg !== 'pokemon') {
				return {};
			}

			if (language === 'ja') {
				return {
					'jp-card-1': {
						id: 'jp-card-1',
						name: 'JP Card 1',
						setId: 'jp1',
						language: 'ja',
						number: '1',
					},
					'jp-card-2': {
						id: 'jp-card-2',
						name: 'JP Card 2',
						setId: 'jp1',
						language: 'ja',
						number: '2',
					},
				};
			}

			return {
				'en-card-1': {
					id: 'en-card-1',
					name: 'EN Card 1',
					setId: 'en1',
					language: 'en',
					number: '1',
				},
			};
		});
	});

	it('counts japanese cards before japanese is selected', async () => {
		const { SqliteCatalogRepository } = await import('@/src/features/catalog/catalog.repository.sqlite');
		const repository = new SqliteCatalogRepository();

		const facets = await repository.getCatalogCardFacets({
			filters: {
				tcgs: ['pokemon'],
			},
		});

		const japanese = facets.languages.find((option) => option.key === 'ja');
		expect(japanese?.count).toBe(2);
	});
});
