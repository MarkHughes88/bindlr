import { Fragment, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import {
	Animated,
	Easing,
	Modal,
	Pressable,
	ScrollView,
	StyleSheet,
	View,
} from 'react-native';

import { catalogRepository } from '@/src/lib/repositories';
import { getSupportedCatalogLanguages } from '@/src/lib/catalog/catalog.lookup';
import {
	CatalogFilterSectionKey,
	CatalogScreenFilters,
	DEFAULT_CATALOG_FILTERS,
	formatCatalogCount,
	toCatalogCardFilters,
} from '@/src/features/catalog/catalog.filters';
import {
	GAME_SPECIFIC_FILTER_DESCRIPTORS,
	clearGameSpecificSelectionKey,
	type CatalogGameSpecificFilterKey,
	getDescriptorSelectionCount,
	getTotalGameSpecificSelectionCount,
} from '@/src/features/catalog/catalog.gameSpecific';
import type {
	CatalogCardFacets,
	CatalogSetFacetOption,
	CatalogTcg,
} from '@/src/features/catalog/catalog.types';
import { AppText, Button, Icon } from '@/src/shared/ui';
import { Input } from '@/src/shared/ui/Input';
import { useAppTheme } from '@/src/theme/useAppTheme';
import { getTcgTitle } from '@/src/shared/config/tcg';
import { normalizeSearchQuery } from '@/src/features/search/search.utils';

type CatalogFiltersSheetProps = {
	visible: boolean;
	query: string;
	appliedFilters: CatalogScreenFilters;
	initialExpandedSection?: CatalogFilterSectionKey;
	onClose: () => void;
	onApply: (filters: CatalogScreenFilters) => void;
};

const SHEET_ANIMATION_MS = 180;
const FACET_RECALC_DEBOUNCE_MS = 120;
const FACET_LIST_INITIAL_VISIBLE_COUNT = 20;

export function CatalogFiltersSheet({
	visible,
	query,
	appliedFilters,
	initialExpandedSection,
	onClose,
	onApply,
}: CatalogFiltersSheetProps) {
	const theme = useAppTheme();
	const styles = useMemo(() => createStyles(theme), [theme]);
	const [draftFilters, setDraftFilters] = useState<CatalogScreenFilters>(appliedFilters);
	const [facets, setFacets] = useState<CatalogCardFacets | null>(null);
	const [expandedSections, setExpandedSections] = useState<CatalogFilterSectionKey[]>([]);
	const [facetSearchByKey, setFacetSearchByKey] = useState<Record<string, string>>({});
	const [expandedFacetLists, setExpandedFacetLists] = useState<Record<string, boolean>>({});
	const translateY = useRef(new Animated.Value(480)).current;
	const opacity = useRef(new Animated.Value(0)).current;

	useEffect(() => {
		if (!visible) {
			translateY.setValue(480);
			opacity.setValue(0);
			return;
		}

		setDraftFilters(appliedFilters);
		setExpandedSections(initialExpandedSection ? [initialExpandedSection] : []);
		setFacetSearchByKey({});
		setExpandedFacetLists({});

		Animated.parallel([
			Animated.timing(translateY, {
				toValue: 0,
				duration: SHEET_ANIMATION_MS,
				easing: Easing.out(Easing.cubic),
				useNativeDriver: true,
			}),
			Animated.timing(opacity, {
				toValue: 1,
				duration: SHEET_ANIMATION_MS,
				easing: Easing.out(Easing.cubic),
				useNativeDriver: true,
			}),
		]).start();
	}, [appliedFilters, initialExpandedSection, opacity, translateY, visible]);

	useEffect(() => {
		if (!visible) {
			return;
		}

		let cancelled = false;
		const timer = setTimeout(() => {
			void (async () => {
				const result = await catalogRepository.getCatalogCardFacets({
					query,
					filters: toCatalogCardFilters(draftFilters),
				});

				if (!cancelled) {
					setFacets(result);
				}
			})();
		}, FACET_RECALC_DEBOUNCE_MS);

		return () => {
			cancelled = true;
			clearTimeout(timer);
		};
	}, [draftFilters, query, visible]);

	const toggleSection = (sectionKey: CatalogFilterSectionKey) => {
		setExpandedSections((prev) => (
			prev.includes(sectionKey)
				? prev.filter((key) => key !== sectionKey)
				: [...prev, sectionKey]
		));
	};

	const resetSetFilter = (filters: CatalogScreenFilters): CatalogScreenFilters => ({
		...filters,
		setIds: [],
		setNamesById: {},
	});

	const reconcileFilters = async (
		nextFilters: CatalogScreenFilters
	): Promise<CatalogScreenFilters> => {
		let reconciled = { ...nextFilters };

		if (reconciled.languages.length > 0 && reconciled.tcgs.length > 0) {
			const validTcgs = reconciled.tcgs.filter((tcg) => (
				reconciled.languages.some((language) => getSupportedCatalogLanguages(tcg).includes(language))
			));

			reconciled = {
				...reconciled,
				tcgs: validTcgs,
			};
		}

		if (reconciled.tcgs.length === 0) {
			return resetSetFilter(reconciled);
		}

		if (reconciled.setIds.length === 0) {
			return reconciled;
		}

		const selectedLanguages = reconciled.languages.length > 0
			? reconciled.languages
			: [undefined];

		const availableSetIds = new Set<string>();
		for (const tcg of reconciled.tcgs) {
			for (const language of selectedLanguages) {
				const sets = await catalogRepository.getSetsByTcg(tcg, language);
				sets.forEach((set) => {
					availableSetIds.add(`${tcg}:${set.id}`);
				});
			}
		}

		const nextSetIds = reconciled.setIds.filter((setId) => availableSetIds.has(setId));
		const nextSetNamesById = Object.fromEntries(
			Object.entries(reconciled.setNamesById).filter(([setId]) => nextSetIds.includes(setId))
		);

		reconciled = {
			...reconciled,
			setIds: nextSetIds,
			setNamesById: nextSetNamesById,
		};

		return reconciled;
	};

	const updateDraftFilters = async (
		nextFilters: CatalogScreenFilters
	) => {
		setDraftFilters(await reconcileFilters(nextFilters));
	};

	const handleTcgPress = async (tcg: CatalogTcg) => {
		const nextTcgs = draftFilters.tcgs.includes(tcg)
			? draftFilters.tcgs.filter((value) => value !== tcg)
			: [...draftFilters.tcgs, tcg];

		await updateDraftFilters({
			...draftFilters,
			tcgs: nextTcgs,
		});
	};

	const handleLanguagePress = async (language: CatalogScreenFilters['languages'][number]) => {
		const nextLanguages = draftFilters.languages.includes(language)
			? draftFilters.languages.filter((value) => value !== language)
			: [...draftFilters.languages, language];

		await updateDraftFilters({
			...draftFilters,
			languages: nextLanguages,
		});
	};

	const handleSetPress = async (set: CatalogSetFacetOption) => {
		const hasSet = draftFilters.setIds.includes(set.key);
		const nextSetIds = hasSet
			? draftFilters.setIds.filter((setId) => setId !== set.key)
			: [...draftFilters.setIds, set.key];

		const nextSetNamesById = { ...draftFilters.setNamesById };
		if (hasSet) {
			delete nextSetNamesById[set.key];
		} else {
			nextSetNamesById[set.key] = set.label;
		}

		await updateDraftFilters({
			...draftFilters,
			setIds: nextSetIds,
			setNamesById: nextSetNamesById,
		});
	};

	const handleRarityPress = async (rarity: string) => {
		const nextRarityKeys = draftFilters.rarityKeys.includes(rarity)
			? draftFilters.rarityKeys.filter((value) => value !== rarity)
			: [...draftFilters.rarityKeys, rarity];

		await updateDraftFilters({
			...draftFilters,
			rarityKeys: nextRarityKeys,
		});
	};

	const handleCardTypePress = async (cardType: string) => {
		const nextCardTypeKeys = draftFilters.cardTypeKeys.includes(cardType)
			? draftFilters.cardTypeKeys.filter((value) => value !== cardType)
			: [...draftFilters.cardTypeKeys, cardType];

		await updateDraftFilters({
			...draftFilters,
			cardTypeKeys: nextCardTypeKeys,
		});
	};

	const handleGameSpecificPress = async (
		filterKey: CatalogGameSpecificFilterKey,
		scopedValue: string,
	) => {
		const selectedValues = draftFilters.gameSpecificSelections[filterKey] ?? [];
		const nextValues = selectedValues.includes(scopedValue)
			? selectedValues.filter((value) => value !== scopedValue)
			: [...selectedValues, scopedValue];

		await updateDraftFilters({
			...draftFilters,
			gameSpecificSelections: {
				...draftFilters.gameSpecificSelections,
				[filterKey]: nextValues,
			},
		});
	};

	const clearGameSpecificFilterKey = async (filterKey: CatalogGameSpecificFilterKey) => {
		await updateDraftFilters({
			...draftFilters,
			gameSpecificSelections: clearGameSpecificSelectionKey(draftFilters.gameSpecificSelections, filterKey),
		});
	};

	const handleOwnershipModePress = async (ownershipMode: CatalogScreenFilters['ownershipMode']) => {
		await updateDraftFilters({
			...draftFilters,
			ownershipMode,
		});
	};

	const handleClearAll = async () => {
		await updateDraftFilters({
			...DEFAULT_CATALOG_FILTERS,
			recentlyViewed: draftFilters.recentlyViewed,
		});
	};

	const applyLabel = `Show (${formatCatalogCount(facets?.total ?? 0)}) cards`;
	const selectedTcgTitles = draftFilters.tcgs.map((tcg) => (
		facets?.tcgs.find((option) => option.key === tcg)?.label ?? tcg
	));
	const selectedTcgTitle = selectedTcgTitles.length === 1
		? selectedTcgTitles[0]
		: selectedTcgTitles.length > 1
			? `${selectedTcgTitles.length} selected`
			: null;
	const selectedOwnershipLabel = facets?.ownershipModes.find((option) => option.key === draftFilters.ownershipMode)?.label;
	const isMultiTcgMode = draftFilters.tcgs.length > 1;

	const groupedRarities = useMemo(() => {
		const groups = new Map<CatalogTcg, NonNullable<typeof facets>['rarities']>();
		(facets?.rarities ?? []).forEach((option) => {
			const current = groups.get(option.tcg) ?? [];
			current.push(option);
			groups.set(option.tcg, current);
		});
		return groups;
	}, [facets]);

	const groupedCardTypes = useMemo(() => {
		const groups = new Map<CatalogTcg, NonNullable<typeof facets>['cardTypes']>();
		(facets?.cardTypes ?? []).forEach((option) => {
			const current = groups.get(option.tcg) ?? [];
			current.push(option);
			groups.set(option.tcg, current);
		});
		return groups;
	}, [facets]);

	const renderFacetRow = ({
		label,
		count,
		selected,
		onPress,
		disabled,
	}: {
		label: string;
		count: number;
		selected: boolean;
		onPress: () => void;
		disabled?: boolean;
	}) => (
		<Pressable
			style={[
				styles.optionRow,
				selected && styles.optionRowSelected,
				disabled && styles.optionRowDisabled,
			]}
			onPress={onPress}
			disabled={disabled}
		>
			<View style={styles.optionTextWrap}>
				<AppText
					weight={selected ? 'semibold' : 'regular'}
					style={disabled ? styles.optionTextDisabled : undefined}
				>
					{label}
				</AppText>
			</View>
			<View style={styles.optionMeta}>
				<AppText muted>{formatCatalogCount(count)}</AppText>
			</View>
		</Pressable>
	);

	const getFacetSearchValue = (key: string): string => facetSearchByKey[key] ?? '';

	const setFacetSearchValue = (key: string, value: string) => {
		setFacetSearchByKey((prev) => ({
			...prev,
			[key]: value,
		}));
	};

	const filterOptionsBySearch = <T extends { label: string }>(
		key: string,
		options: T[]
	): T[] => {
		const normalizedQuery = normalizeSearchQuery(getFacetSearchValue(key));
		if (!normalizedQuery) {
			return options;
		}

		return options.filter((option) => normalizeSearchQuery(option.label).includes(normalizedQuery));
	};

	const renderFacetSearchInput = (key: string, placeholder: string, totalOptions: number) => {
		if (totalOptions < 8) {
			return null;
		}

		return (
			<Input
				value={getFacetSearchValue(key)}
				onChange={(value) => setFacetSearchValue(key, value)}
				placeholder={placeholder}
				leftIconName="search"
			/>
		);
	};

	const isFacetListExpanded = (key: string): boolean => Boolean(expandedFacetLists[key]);

	const setFacetListExpanded = (key: string, expanded: boolean) => {
		setExpandedFacetLists((prev) => ({
			...prev,
			[key]: expanded,
		}));
	};

	const renderExpandableFacetRows = <T extends { key: string },>(input: {
		listKey: string;
		options: T[];
		renderRow: (option: T) => ReactNode;
		expandLabel?: string;
		collapseLabel?: string;
	}) => {
		const {
			listKey,
			options,
			renderRow,
			expandLabel = 'Expand further',
			collapseLabel = 'Show less',
		} = input;

		if (options.length <= FACET_LIST_INITIAL_VISIBLE_COUNT) {
			return options.map((option) => (
				<Fragment key={option.key}>{renderRow(option)}</Fragment>
			));
		}

		const expanded = isFacetListExpanded(listKey);
		const visibleOptions = expanded
			? options
			: options.slice(0, FACET_LIST_INITIAL_VISIBLE_COUNT);

		return (
			<>
				{visibleOptions.map((option) => (
					<Fragment key={option.key}>{renderRow(option)}</Fragment>
				))}
				<Pressable
					onPress={() => setFacetListExpanded(listKey, !expanded)}
					style={styles.expandListButton}
				>
					<AppText muted>
						{expanded
							? collapseLabel
							: `${expandLabel} (${options.length - FACET_LIST_INITIAL_VISIBLE_COUNT} more)`}
					</AppText>
				</Pressable>
			</>
		);
	};

	const sections = [
		{
			key: 'myData' as const,
			title: 'My data',
			description: selectedOwnershipLabel ?? 'All cards',
			activeCount: draftFilters.ownershipMode === 'all' ? 0 : 1,
			onClear: () => {
				void handleOwnershipModePress('all');
			},
			disabled: false,
			content: (
				<View style={styles.sectionBody}>
					{(facets?.ownershipModes ?? []).map((option) => (
						<Fragment key={option.key}>{renderFacetRow({
							label: option.label,
							count: option.count,
							selected: draftFilters.ownershipMode === option.key,
							onPress: () => {
								void handleOwnershipModePress(option.key);
							},
							disabled: option.count === 0,
						})}</Fragment>
					))}
					<AppText muted>Inventory filters apply against your owned items saved in this app.</AppText>
				</View>
			),
		},
		{
			key: 'tcg' as const,
			title: 'TCG',
			description: selectedTcgTitle ?? 'Any game',
			activeCount: draftFilters.tcgs.length,
			onClear: () => {
				void updateDraftFilters({
					...draftFilters,
					tcgs: [],
				});
			},
			disabled: false,
			content: (
				<View style={styles.sectionBody}>
					{renderFacetRow({
						label: 'Any TCG',
						count: facets?.total ?? 0,
						selected: draftFilters.tcgs.length === 0,
						onPress: () => {
							void updateDraftFilters({
								...draftFilters,
								tcgs: [],
							});
						},
					})}
					{(facets?.tcgs ?? []).map((option) => (
						<Fragment key={option.key}>{renderFacetRow({
							label: option.label,
							count: option.count,
							selected: draftFilters.tcgs.includes(option.key),
							onPress: () => {
								void handleTcgPress(option.key);
							},
							disabled: option.count === 0,
						})}</Fragment>
					))}
				</View>
			),
		},
		{
			key: 'set' as const,
			title: 'Sets',
			description: draftFilters.setIds.length > 0
				? `${draftFilters.setIds.length} selected`
				: (draftFilters.tcgs.length > 0 ? 'Any set' : 'Select at least one TCG first'),
			activeCount: draftFilters.setIds.length,
			onClear: () => {
				void updateDraftFilters({
					...draftFilters,
					setIds: [],
					setNamesById: {},
				});
			},
			disabled: draftFilters.tcgs.length === 0,
			content: (
				<View style={styles.sectionBody}>
					{renderFacetSearchInput('sets', 'Search sets...', facets?.sets?.length ?? 0)}
					{renderFacetRow({
						label: 'Any set',
						count: facets?.total ?? 0,
						selected: draftFilters.setIds.length === 0,
						onPress: () => {
							void updateDraftFilters({
								...draftFilters,
								setIds: [],
								setNamesById: {},
							});
						},
					})}
					{renderExpandableFacetRows({
						listKey: 'sets',
						options: filterOptionsBySearch('sets', facets?.sets ?? []),
						renderRow: (option) => renderFacetRow({
							label: option.label,
							count: option.count,
							selected: draftFilters.setIds.includes(option.key),
							onPress: () => {
								void handleSetPress(option);
							},
							disabled: option.count === 0,
						}),
					})}
				</View>
			),
		},
		{
			key: 'language' as const,
			title: 'Language',
			description: draftFilters.languages.length > 0
				? `${draftFilters.languages.length} selected`
				: 'Any language',
			activeCount: draftFilters.languages.length,
			onClear: () => {
				void updateDraftFilters({
					...draftFilters,
					languages: [],
				});
			},
			disabled: false,
			content: (
				<View style={styles.sectionBody}>
					{renderFacetRow({
						label: 'Any language',
						count: facets?.total ?? 0,
						selected: draftFilters.languages.length === 0,
						onPress: () => {
							void updateDraftFilters({
								...draftFilters,
								languages: [],
							});
						},
					})}
					{(facets?.languages ?? []).map((option) => (
						<Fragment key={option.key}>{renderFacetRow({
							label: option.label,
							count: option.count,
							selected: draftFilters.languages.includes(option.key),
							onPress: () => {
								void handleLanguagePress(option.key);
							},
						})}</Fragment>
					))}
				</View>
			),
		},
		{
			key: 'setScope' as const,
			title: 'Set scope',
			description: draftFilters.setScope === 'all' ? 'All sets' : 'Favorite sets',
			activeCount: draftFilters.setScope === 'all' ? 0 : 1,
			onClear: () => {
				void updateDraftFilters({
					...draftFilters,
					setScope: 'all',
				});
			},
			disabled: false,
			content: (
				<View style={styles.sectionBody}>
					{renderFacetRow({
						label: 'All sets',
						count: 1,
						selected: draftFilters.setScope === 'all',
						onPress: () => {
							void updateDraftFilters({
								...draftFilters,
								setScope: 'all',
							});
						},
					})}
					{renderFacetRow({
						label: 'Favorite sets',
						count: 1,
						selected: draftFilters.setScope === 'favorites',
						onPress: () => {
							void updateDraftFilters({
								...draftFilters,
								setScope: 'favorites',
							});
						},
					})}
				</View>
			),
		},
		{
			key: 'gameSpecific' as const,
			title: 'Game-specific',
			description: draftFilters.tcgs.length > 0
				? `${selectedTcgTitle} filters${(draftFilters.rarityKeys.length > 0 || draftFilters.cardTypeKeys.length > 0 || getTotalGameSpecificSelectionCount(draftFilters.gameSpecificSelections) > 0) ? ' (active)' : ''}`
				: 'Select at least one TCG first',
			activeCount: draftFilters.rarityKeys.length + draftFilters.cardTypeKeys.length + getTotalGameSpecificSelectionCount(draftFilters.gameSpecificSelections),
			onClear: () => {
				void updateDraftFilters({
					...draftFilters,
					rarityKeys: [],
					cardTypeKeys: [],
					gameSpecificSelections: DEFAULT_CATALOG_FILTERS.gameSpecificSelections,
				});
			},
			disabled: draftFilters.tcgs.length === 0,
			content: (
				<View style={styles.sectionBody}>
					{renderFacetSearchInput('rarity', 'Search rarity...', facets?.rarities?.length ?? 0)}
					<AppText muted>These filters adapt to the selected TCG.</AppText>

					<View style={styles.subsectionItem}>
						<AppText weight="semibold">Rarity</AppText>
						{renderFacetRow({
							label: 'Any rarity',
							count: facets?.total ?? 0,
							selected: draftFilters.rarityKeys.length === 0,
							onPress: () => {
								void updateDraftFilters({
									...draftFilters,
									rarityKeys: [],
								});
							},
						})}
						{isMultiTcgMode
							? draftFilters.tcgs.map((tcg) => (
								<View key={`rarity:${tcg}`} style={styles.groupSection}>
									<AppText muted weight="semibold">{getTcgTitle(tcg)}</AppText>
									{renderExpandableFacetRows({
										listKey: `rarity:${tcg}`,
										options: filterOptionsBySearch('rarity', groupedRarities.get(tcg) ?? []),
										renderRow: (option) => renderFacetRow({
											label: option.label,
											count: option.count,
											selected: draftFilters.rarityKeys.includes(option.key),
											onPress: () => {
												void handleRarityPress(option.key);
											},
											disabled: option.count === 0,
										}),
									})}
								</View>
							))
							: renderExpandableFacetRows({
								listKey: 'rarity',
								options: filterOptionsBySearch('rarity', facets?.rarities ?? []),
								renderRow: (option) => renderFacetRow({
									label: option.label,
									count: option.count,
									selected: draftFilters.rarityKeys.includes(option.key),
									onPress: () => {
										void handleRarityPress(option.key);
									},
									disabled: option.count === 0,
								}),
							})}
					</View>

					<View style={styles.subsectionItem}>
						<AppText weight="semibold">Type</AppText>
						{renderFacetSearchInput('type', 'Search types...', facets?.cardTypes?.length ?? 0)}
						{renderFacetRow({
							label: 'Any type',
							count: facets?.total ?? 0,
							selected: draftFilters.cardTypeKeys.length === 0,
							onPress: () => {
								void updateDraftFilters({
									...draftFilters,
									cardTypeKeys: [],
								});
							},
						})}
						{isMultiTcgMode
							? draftFilters.tcgs.map((tcg) => (
								<View key={`type:${tcg}`} style={styles.groupSection}>
									<AppText muted weight="semibold">{getTcgTitle(tcg)}</AppText>
									{renderExpandableFacetRows({
										listKey: `type:${tcg}`,
										options: filterOptionsBySearch('type', groupedCardTypes.get(tcg) ?? []),
										renderRow: (option) => renderFacetRow({
											label: option.label,
											count: option.count,
											selected: draftFilters.cardTypeKeys.includes(option.key),
											onPress: () => {
												void handleCardTypePress(option.key);
											},
											disabled: option.count === 0,
										}),
									})}
								</View>
							))
							: renderExpandableFacetRows({
								listKey: 'type',
								options: filterOptionsBySearch('type', facets?.cardTypes ?? []),
								renderRow: (option) => renderFacetRow({
									label: option.label,
									count: option.count,
									selected: draftFilters.cardTypeKeys.includes(option.key),
									onPress: () => {
										void handleCardTypePress(option.key);
									},
									disabled: option.count === 0,
								}),
							})}
					</View>

					<View style={styles.subsectionList}>
						{GAME_SPECIFIC_FILTER_DESCRIPTORS
							.filter((descriptor) => draftFilters.tcgs.includes(descriptor.tcg))
							.map((descriptor) => {
								const options = filterOptionsBySearch(
									descriptor.key,
									facets?.gameSpecific[descriptor.key] ?? []
								);
								const selectedValues = draftFilters.gameSpecificSelections[descriptor.key] ?? [];

								return (
									<View key={descriptor.key} style={styles.subsectionItem}>
										<View style={styles.subsectionHeadingRow}>
											<AppText weight="semibold">{descriptor.label}</AppText>
											{getDescriptorSelectionCount(draftFilters.gameSpecificSelections, descriptor) > 0 ? (
												<Pressable onPress={() => { void clearGameSpecificFilterKey(descriptor.key); }}>
													<AppText muted>Clear</AppText>
												</Pressable>
											) : null}
										</View>
										{renderFacetSearchInput(
											descriptor.key,
											`Search ${descriptor.label.toLowerCase()}...`,
											facets?.gameSpecific[descriptor.key]?.length ?? 0,
										)}
										{renderFacetRow({
											label: `Any ${descriptor.label.toLowerCase()}`,
											count: facets?.total ?? 0,
											selected: selectedValues.length === 0,
											onPress: () => {
												void clearGameSpecificFilterKey(descriptor.key);
											},
										})}
										{renderExpandableFacetRows({
											listKey: descriptor.key,
											options,
											renderRow: (option) => renderFacetRow({
												label: option.label,
												count: option.count,
												selected: selectedValues.includes(option.key),
												onPress: () => {
													void handleGameSpecificPress(descriptor.key, option.key);
												},
												disabled: option.count === 0,
											}),
										})}
									</View>
								);
							})}
					</View>
				</View>
			),
		},
	];

	return (
		<Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
			<View style={styles.overlay}>
				<Pressable style={styles.backdrop} onPress={onClose} />

				<Animated.View
					style={[
						styles.sheet,
						{
							opacity,
							transform: [{ translateY }],
						},
					]}
				>
					<View style={styles.header}>
						<View style={styles.headerCopy}>
							<AppText weight="bold">Advanced Filters</AppText>
							<AppText muted>Use shortcuts above or open sections as needed.</AppText>
						</View>
						<Pressable onPress={onClose} style={styles.closeButton}>
							<Icon iconName="x" size={20} />
						</Pressable>
					</View>

					<ScrollView
						style={styles.scrollView}
						contentContainerStyle={styles.scrollContent}
						showsVerticalScrollIndicator={false}
					>
						{sections.map((section) => {
							const expanded = expandedSections.includes(section.key);

							return (
								<View key={section.key} style={[styles.accordion, section.disabled && styles.accordionDisabled]}>
									<Pressable
										style={styles.accordionHeader}
										onPress={() => toggleSection(section.key)}
										disabled={section.disabled}
									>
										<View style={styles.accordionHeaderText}>
											<AppText weight="semibold">{section.title}</AppText>
											<AppText muted>{section.description}</AppText>
										</View>
										<View style={styles.accordionHeaderActions}>
											{section.activeCount > 0 ? (
												<View style={styles.activeBadge}>
													<AppText style={styles.activeBadgeText} weight="semibold">{section.activeCount}</AppText>
												</View>
											) : null}

											{section.activeCount > 0 && !section.disabled ? (
												<Pressable
													onPress={(event) => {
														event.stopPropagation();
														section.onClear();
													}}
												>
													<AppText muted>Clear</AppText>
												</Pressable>
											) : null}

											<Icon
												iconName={expanded ? 'chevronUp' : 'chevronDown'}
												color={section.disabled ? theme.colors.textMuted : theme.colors.text}
												size={18}
											/>
										</View>
									</Pressable>

									{expanded ? section.content : null}
								</View>
							);
						})}
					</ScrollView>

					<View style={styles.footer}>
						<Button type="tertiary" text="Clear all" onPress={() => { void handleClearAll(); }} />
						<View style={styles.applyButtonWrap}>
							<Button type="primary" text={applyLabel} onPress={() => onApply(draftFilters)} />
						</View>
					</View>
				</Animated.View>
			</View>
		</Modal>
	);
}

const createStyles = (theme: ReturnType<typeof useAppTheme>) =>
	StyleSheet.create({
		overlay: {
			flex: 1,
			justifyContent: 'flex-end',
		},
		backdrop: {
			...StyleSheet.absoluteFillObject,
			backgroundColor: 'rgba(0, 0, 0, 0.45)',
		},
		sheet: {
			height: '92%',
			backgroundColor: theme.colors.background,
			borderTopLeftRadius: theme.radius.xl,
			borderTopRightRadius: theme.radius.xl,
			borderTopWidth: theme.border.width.default,
			borderColor: theme.colors.borderSubtle,
		},
		header: {
			paddingHorizontal: theme.spacing.lg,
			paddingTop: theme.spacing.lg,
			paddingBottom: theme.spacing.md,
			borderBottomWidth: theme.border.width.default,
			borderBottomColor: theme.colors.borderSubtle,
			flexDirection: 'row',
			alignItems: 'flex-start',
			justifyContent: 'space-between',
			gap: theme.spacing.md,
		},
		headerCopy: {
			flex: 1,
			gap: theme.spacing.xs,
		},
		closeButton: {
			padding: theme.spacing.xs,
		},
		scrollView: {
			flex: 1,
		},
		scrollContent: {
			padding: theme.spacing.lg,
			gap: theme.spacing.md,
			paddingBottom: theme.spacing.xl,
		},
		accordion: {
			borderWidth: theme.border.width.default,
			borderColor: theme.colors.borderSubtle,
			borderRadius: theme.radius.md,
			backgroundColor: theme.colors.surfaceAlt,
			overflow: 'hidden',
		},
		accordionDisabled: {
			opacity: 0.7,
		},
		accordionHeader: {
			paddingHorizontal: theme.spacing.md,
			paddingVertical: theme.spacing.md,
			flexDirection: 'row',
			alignItems: 'center',
			justifyContent: 'space-between',
			gap: theme.spacing.md,
		},
		accordionHeaderText: {
			flex: 1,
			gap: theme.spacing.xs,
		},
		accordionHeaderActions: {
			flexDirection: 'row',
			alignItems: 'center',
			gap: theme.spacing.sm,
		},
		activeBadge: {
			minWidth: 20,
			height: 20,
			paddingHorizontal: theme.spacing.xs,
			borderRadius: theme.radius.xl,
			backgroundColor: theme.colors.primary,
			alignItems: 'center',
			justifyContent: 'center',
		},
		activeBadgeText: {
			color: theme.colors.background,
			fontSize: theme.fontSize.sm,
		},
		sectionBody: {
			paddingHorizontal: theme.spacing.md,
			paddingBottom: theme.spacing.md,
			gap: theme.spacing.sm,
		},
		optionRow: {
			flexDirection: 'row',
			alignItems: 'center',
			justifyContent: 'space-between',
			gap: theme.spacing.md,
			paddingVertical: theme.spacing.sm,
			paddingHorizontal: theme.spacing.sm,
			borderRadius: theme.radius.sm,
		},
		optionRowSelected: {
			backgroundColor: theme.colors.surface,
		},
		optionRowDisabled: {
			opacity: 0.45,
		},
		optionTextWrap: {
			flex: 1,
		},
		optionMeta: {
			minWidth: 64,
			alignItems: 'flex-end',
		},
		optionTextDisabled: {
			color: theme.colors.textMuted,
		},
		subsectionList: {
			gap: theme.spacing.sm,
		},
		subsectionItem: {
			gap: theme.spacing.xs,
			paddingVertical: theme.spacing.xs,
		},
		subsectionHeadingRow: {
			flexDirection: 'row',
			alignItems: 'center',
			justifyContent: 'space-between',
			gap: theme.spacing.sm,
		},
		groupSection: {
			gap: theme.spacing.xs,
			marginTop: theme.spacing.xs,
		},
		footer: {
			paddingHorizontal: theme.spacing.lg,
			paddingTop: theme.spacing.md,
			paddingBottom: theme.spacing.xl,
			borderTopWidth: theme.border.width.default,
			borderTopColor: theme.colors.borderSubtle,
			flexDirection: 'row',
			alignItems: 'center',
			gap: theme.spacing.md,
		},
		expandListButton: {
			paddingVertical: theme.spacing.xs,
			paddingHorizontal: theme.spacing.sm,
			alignSelf: 'flex-start',
		},
		applyButtonWrap: {
			flex: 1,
		},
	});