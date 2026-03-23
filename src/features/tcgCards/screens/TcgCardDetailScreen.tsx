import { useEffect, useMemo, useState } from "react";
import { Pressable, StyleSheet, TextInput, View, useWindowDimensions } from "react-native";
import { useRouter } from 'expo-router';

// Import theme
import { useAppTheme } from "@/src/theme/useAppTheme";

// Import components
import { Screen, AppText, TcgCard, Header, SlideUpMenu, Icon, SkeletonBlock, FadeInView, useTopBanner } from "@/src/shared/ui";
import type { TcgCardItem } from "@/src/shared/ui";

// Import feature
import { useTcgCardDetail } from "../hooks/useTcgCardDetail";

// Import lib
import { resolveTcgCardImageSource } from "@/src/lib/catalog/resolveTcgCardImageSource";
import { bindersRepository, inventoryRepository, wishlistRepository, downloadsRepository } from '@/src/lib/repositories';

// Import types
import type {
	CatalogLegality,
	CatalogLanguage,
	CatalogResolvedTcgCard,
	CatalogTcg,
	CatalogTcgCardAttributes,
} from "@/src/domain/catalog/catalog.types";
import type { BinderListItem } from '@/src/features/binders/binders.types';
import type { WishlistSummary } from '@/src/features/wishlist/wishlist.types';
import type { InventoryTcg } from '@/src/features/inventory/inventory.types';

type Props = {
	tcgCardId: string;
	tcg: CatalogTcg;
	language?: CatalogLanguage;
};

type DetailStat = {
	label: string;
	value: string;
};

type DetailSection = {
	title: string;
	lines: string[];
};

type OwnedVariantSummary = {
	variantName?: string;
	quantity: number;
};

const EMPTY_VALUE = "-";

function formatList(values: (string | number | null | undefined)[], separator = ", "): string {
	const normalized = values
		.map((value) => (value == null ? "" : String(value).trim()))
		.filter(Boolean);

	if (normalized.length === 0) {
		return EMPTY_VALUE;
	}

	return normalized.join(separator);
}

function formatLegalities(legalities?: CatalogLegality[] | null): string[] {
	if (!legalities || legalities.length === 0) {
		return [];
	}

	return legalities
		.map((entry) => {
			const format = entry.format?.trim();
			const status = entry.status?.trim();
			if (!format && !status) {
				return "";
			}

			return `${format || "Unknown"}: ${status || "Unknown"}`;
		})
		.filter(Boolean);
}

function getPrimaryStats(card: CatalogResolvedTcgCard): DetailStat[] {
	const attributes = card.attributes;

	if (!attributes) {
		return [];
	}

	if (attributes.tcg === "pokemon") {
		return [
			{ label: "HP", value: attributes.hp ?? EMPTY_VALUE },
			{ label: "Type", value: formatList(card.types ?? []) },
			{ label: "Weakness", value: formatList((attributes.weaknesses ?? []).map((w) => `${w.type} ${w.value}`)) },
			{
				label: "Retreat",
				value: attributes.convertedRetreatCost != null
					? String(attributes.convertedRetreatCost)
					: String(attributes.retreatCost?.length ?? 0),
			},
		];
	}

	if (attributes.tcg === "mtg") {
		return [
			{ label: "Mana cost", value: attributes.manaCost ?? EMPTY_VALUE },
			{ label: "Mana value", value: attributes.manaValue != null ? String(attributes.manaValue) : EMPTY_VALUE },
			{ label: "Power", value: attributes.power ?? EMPTY_VALUE },
			{ label: "Toughness", value: attributes.toughness ?? EMPTY_VALUE },
		];
	}

	if (attributes.tcg === "lorcana") {
		return [
			{ label: "Cost", value: attributes.cost != null ? String(attributes.cost) : EMPTY_VALUE },
			{ label: "Lore", value: attributes.loreValue != null ? String(attributes.loreValue) : EMPTY_VALUE },
			{ label: "Strength", value: attributes.strength != null ? String(attributes.strength) : EMPTY_VALUE },
			{ label: "Willpower", value: attributes.willpower != null ? String(attributes.willpower) : EMPTY_VALUE },
		];
	}

	return [
		{ label: "Cost", value: attributes.cost != null ? String(attributes.cost) : EMPTY_VALUE },
		{ label: "Power", value: attributes.power ?? EMPTY_VALUE },
		{ label: "Counter", value: attributes.counter ?? EMPTY_VALUE },
		{ label: "Attribute", value: attributes.attribute ?? EMPTY_VALUE },
	];
}

function getDetailRows(card: CatalogResolvedTcgCard): DetailStat[] {
	const rows: DetailStat[] = [
		{ label: "Set", value: card.setName ?? card.setId ?? EMPTY_VALUE },
		{ label: "Card number", value: card.number ?? card.localId ?? EMPTY_VALUE },
		{ label: "Rarity", value: card.rarity ?? EMPTY_VALUE },
		{ label: "Supertype", value: card.supertype ?? EMPTY_VALUE },
		{ label: "Subtypes", value: formatList(card.subtypes ?? []) },
		{ label: "Types", value: formatList(card.types ?? []) },
		{ label: "Artist", value: card.artist ?? EMPTY_VALUE },
	];

	const attributes = card.attributes;
	if (!attributes) {
		return rows;
	}

	if (attributes.tcg === "pokemon") {
		rows.push({
			label: "Regulation mark",
			value: attributes.regulationMark ?? EMPTY_VALUE,
		});
		rows.push({
			label: "Pokedex",
			value: formatList(attributes.nationalPokedexNumbers ?? []),
		});
	}

	if (attributes.tcg === "mtg") {
		rows.push({ label: "Layout", value: attributes.layout ?? EMPTY_VALUE });
		rows.push({ label: "Colors", value: formatList(attributes.colors ?? []) });
		rows.push({ label: "Color identity", value: formatList(attributes.colorIdentity ?? []) });
		rows.push({ label: "Loyalty", value: attributes.loyalty ?? EMPTY_VALUE });
	}

	if (attributes.tcg === "lorcana") {
		rows.push({ label: "Version", value: attributes.version ?? EMPTY_VALUE });
		rows.push({ label: "Inkable", value: attributes.inkwell ? "Yes" : "No" });
		rows.push({ label: "Source", value: attributes.source ?? EMPTY_VALUE });
	}

	if (attributes.tcg === "one-piece") {
		rows.push({ label: "Colors", value: formatList(attributes.colors ?? []) });
		rows.push({ label: "Tags", value: formatList(attributes.tags ?? []) });
		rows.push({ label: "Source", value: attributes.source ?? EMPTY_VALUE });
	}

	return rows;
}

function getTextSections(attributes?: CatalogTcgCardAttributes): DetailSection[] {
	if (!attributes) {
		return [];
	}

	if (attributes.tcg === "pokemon") {
		const attackLines = (attributes.attacks ?? []).map((attack) => {
			const cost = attack.cost?.length ? `[${attack.cost.join("/")}]` : "";
			const damage = attack.damage?.trim() ? ` ${attack.damage}` : "";
			const text = attack.text?.trim() ? ` - ${attack.text.trim()}` : "";
			return `${cost} ${attack.name}${damage}${text}`.trim();
		});

		const sections: DetailSection[] = [];
		if (attackLines.length > 0) {
			sections.push({ title: "Attacks", lines: attackLines });
		}

		if (attributes.flavorText?.trim()) {
			sections.push({ title: "Flavor text", lines: [attributes.flavorText.trim()] });
		}

		return sections;
	}

	if (attributes.tcg === "mtg") {
		if (!attributes.text?.trim()) {
			return [];
		}

		return [{ title: "Rules text", lines: [attributes.text.trim()] }];
	}

	if (attributes.tcg === "lorcana") {
		const sections: DetailSection[] = [];
		const abilityLines = (attributes.abilities ?? []).map((ability) => `${ability.name}: ${ability.text}`);
		if (abilityLines.length > 0) {
			sections.push({ title: "Abilities", lines: abilityLines });
		}

		if ((attributes.rules ?? []).length > 0) {
			sections.push({ title: "Rules text", lines: attributes.rules ?? [] });
		}

		return sections;
	}

	const onePieceSections: DetailSection[] = [];
	if (attributes.effect?.trim()) {
		onePieceSections.push({ title: "Effect", lines: [attributes.effect.trim()] });
	}

	if (attributes.trigger?.trim()) {
		onePieceSections.push({ title: "Trigger", lines: [attributes.trigger.trim()] });
	}

	return onePieceSections;
}

function getKeywords(attributes?: CatalogTcgCardAttributes): string[] {
	if (!attributes) {
		return [];
	}

	if (attributes.tcg === "mtg") {
		return attributes.keywords ?? [];
	}

	if (attributes.tcg === "lorcana") {
		return attributes.keywords ?? [];
	}

	return [];
}

function getLegalities(attributes?: CatalogTcgCardAttributes): string[] {
	if (!attributes) {
		return [];
	}

	return formatLegalities(attributes.legalities ?? null);
}

function getTcgBadgeText(tcg: CatalogTcg): string {
	return tcg.toUpperCase().replace("-", " ");
}

function getVariantNames(attributes?: CatalogTcgCardAttributes): string[] {
	if (!attributes) {
		return [];
	}

	if (attributes.tcg === 'pokemon' || attributes.tcg === 'lorcana') {
		return (attributes.variants ?? [])
			.map((variant) => variant.name?.trim())
			.filter((name): name is string => Boolean(name));
	}

	return [];
}

function getNextName(existingNames: string[], baseName: string): string {
	if (!existingNames.includes(baseName)) {
		return baseName;
	}

	let counter = 2;
	while (existingNames.includes(`${baseName} ${counter}`)) {
		counter += 1;
	}

	return `${baseName} ${counter}`;
}

function toStatTableRows(stats: DetailStat[]): DetailStat[][] {
	const rows: DetailStat[][] = [];

	for (let index = 0; index < stats.length; index += 2) {
		rows.push([stats[index], stats[index + 1]].filter(Boolean) as DetailStat[]);
	}

	return rows;
}

function formatVariantLabel(variantName?: string): string {
	return variantName ? variantName : 'Default printing';
}

function formatCopyAction(action: 'Add' | 'Remove', quantity: number, variantName?: string): string {
	const copyLabel = quantity === 1 ? 'copy' : 'copies';
	const variantLabel = variantName ? ` (${variantName})` : '';
	return `${action} ${quantity} ${copyLabel}${variantLabel}`;
}

function parseCollectionQuantity(value: string): number {
	const parsed = Number.parseInt(value, 10);
	if (!Number.isFinite(parsed) || parsed < 1) {
		return 1;
	}

	return parsed;
}

export function TcgCardDetailScreen({ tcgCardId, tcg, language }: Props) {
	const router = useRouter();
	const theme = useAppTheme();
	const styles = useMemo(() => createStyles(theme), [theme]);
	const { showBanner } = useTopBanner();
	const { width } = useWindowDimensions();
	const isWide = width >= 820;
	const [isAddMenuVisible, setIsAddMenuVisible] = useState(false);
	const [isRemoveMenuVisible, setIsRemoveMenuVisible] = useState(false);
	const [isWishlistMenuVisible, setIsWishlistMenuVisible] = useState(false);
	const [isBindersMenuVisible, setIsBindersMenuVisible] = useState(false);
	const [isBinderActionMenuVisible, setIsBinderActionMenuVisible] = useState(false);
	const [wishlists, setWishlists] = useState<WishlistSummary[]>([]);
	const [binders, setBinders] = useState<BinderListItem[]>([]);
	const [selectedBinderId, setSelectedBinderId] = useState<string | null>(null);
	const [selectedVariantName, setSelectedVariantName] = useState<string | undefined>(undefined);
	const [ownedVariants, setOwnedVariants] = useState<OwnedVariantSummary[]>([]);
	const [localImageUri, setLocalImageUri] = useState<string | null>(null);
	const [collectionQuantityText, setCollectionQuantityText] = useState('1');
	const [isSaving, setIsSaving] = useState(false);

	const { card, isLoading } = useTcgCardDetail({
		tcg,
		catalogTcgCardId: tcgCardId,
		language,
	});
	const cardId = card?.id;

	useEffect(() => {
		if (!cardId) {
			return;
		}

		setSelectedVariantName(undefined);
	}, [cardId]);

	useEffect(() => {
		if (!cardId) {
			setOwnedVariants([]);
			return;
		}

		let cancelled = false;

		const loadOwnership = async () => {
			const ownership = await inventoryRepository.getCatalogCardOwnership({
				tcg: tcg as InventoryTcg,
				catalogTcgCardId: cardId,
				language,
			});

			if (!cancelled) {
				setOwnedVariants(ownership.variants);
			}
		};

		void loadOwnership();

		return () => {
			cancelled = true;
		};
	}, [cardId, language, tcg]);

	useEffect(() => {
		if (!card) {
			setLocalImageUri(null);
			return;
		}

		let cancelled = false;
		const loadLocalUri = async () => {
			const uri = await downloadsRepository.getCardImageLocalUri({
				tcg,
				catalogTcgCardId: card.id,
				setId: card.setId,
				language,
			});

			if (!cancelled) {
				setLocalImageUri(uri);
			}
		};

		void loadLocalUri();
		return () => {
			cancelled = true;
		};
	}, [card, language, tcg]);

	if (isLoading || !card) {
		return (
			<Screen contentContainerStyle={{ paddingTop: theme.spacing.md }}>
				<Header hasBackBtn />
				<View style={[styles.mainLayout, isWide && styles.mainLayoutWide]}>
					<View style={[styles.mediaColumn, isWide && styles.mediaColumnWide]}>
						<SkeletonBlock width="100%" height={420} borderRadius={theme.radius.md} />
					</View>

					<View style={[styles.details, isWide && styles.detailsWide]}>
						<View style={styles.collectionActionsRow}>
							<SkeletonBlock style={styles.loadingActionPrimary} width="100%" height={48} borderRadius={theme.radius.md} />
							<SkeletonBlock style={styles.loadingActionSecondary} width="100%" height={48} borderRadius={theme.radius.md} />
						</View>
						<SkeletonBlock width="40%" height={14} borderRadius={theme.radius.xs} />
						<SkeletonBlock width="64%" height={24} borderRadius={theme.radius.xs} />
						<SkeletonBlock width="52%" height={16} borderRadius={theme.radius.xs} />
						<SkeletonBlock width="100%" height={220} borderRadius={theme.radius.md} />
					</View>
				</View>
			</Screen>
		);
	}

	const tcgCardItem: TcgCardItem = {
		id: card.id,
		title: card.name,
		imageSource: resolveTcgCardImageSource({
			imageLargeLocal: localImageUri ?? undefined,
			imageLarge: card.imageLarge,
			imageMedium: card.imageMedium,
			imageSmall: card.imageSmall,
		}),
	};

	const subtitle = [card.setName, card.number ? `#${card.number}` : undefined, card.rarity]
		.filter(Boolean)
		.join("  ·  ");
	const primaryStats = getPrimaryStats(card);
	const detailRows = getDetailRows(card);
	const textSections = getTextSections(card.attributes);
	const keywords = getKeywords(card.attributes);
	const legalities = getLegalities(card.attributes);
	const statTableRows = toStatTableRows(primaryStats);
	const variantNames = getVariantNames(card.attributes);
	const selectedBinder = binders.find((binder) => binder.id === selectedBinderId) ?? null;
	const selectedOwnedVariant = ownedVariants.find((item) => item.variantName === selectedVariantName)
		?? ownedVariants.find((item) => item.variantName == null)
		?? null;
	const ownedTotal = ownedVariants.reduce((sum, item) => sum + item.quantity, 0);
	const selectedQuantity = parseCollectionQuantity(collectionQuantityText);

	const refreshOwnership = async () => {
		if (!cardId) {
			return;
		}

		const ownership = await inventoryRepository.getCatalogCardOwnership({
			tcg: tcg as InventoryTcg,
			catalogTcgCardId: cardId,
			language,
		});

		setOwnedVariants(ownership.variants);
	};

	const closeAllMenus = () => {
		setIsAddMenuVisible(false);
		setIsRemoveMenuVisible(false);
		setIsWishlistMenuVisible(false);
		setIsBindersMenuVisible(false);
		setIsBinderActionMenuVisible(false);
	};

	const increaseSelectedQuantity = () => {
		setCollectionQuantityText(String(selectedQuantity + 1));
	};

	const decreaseSelectedQuantity = () => {
		setCollectionQuantityText(String(Math.max(1, selectedQuantity - 1)));
	};

	const handleCollectionQuantityChange = (nextText: string) => {
		const digitsOnly = nextText.replace(/[^0-9]/g, '');
		if (!digitsOnly) {
			setCollectionQuantityText('');
			return;
		}

		setCollectionQuantityText(String(parseCollectionQuantity(digitsOnly)));
	};

	const normalizeCollectionQuantity = () => {
		setCollectionQuantityText(String(parseCollectionQuantity(collectionQuantityText)));
	};

	const changeCollectionQuantity = async (quantityDelta: number) => {
		setIsSaving(true);
		try {
			await inventoryRepository.upsertCatalogCardOwnedItem({
				tcg: tcg as InventoryTcg,
				catalogTcgCardId: card.id,
				language,
				variantName: selectedVariantName,
				quantityDelta,
			});
			await refreshOwnership();
			setCollectionQuantityText('1');
			showBanner({
				message: quantityDelta > 0
					? formatCopyAction('Add', quantityDelta, selectedVariantName)
					: formatCopyAction('Remove', Math.abs(quantityDelta), selectedVariantName),
				tone: 'success',
			});
			closeAllMenus();
		} catch {
			showBanner({
				message: quantityDelta > 0 ? 'Could not add card to collection.' : 'Could not remove card from collection.',
				tone: 'error',
			});
		} finally {
			setIsSaving(false);
		}
	};

	const openRemoveMenu = async () => {
		setIsSaving(true);
		try {
			await refreshOwnership();
			setIsRemoveMenuVisible(true);
		} finally {
			setIsSaving(false);
		}
	};

	const openWishlistMenu = async () => {
		setIsSaving(true);
		try {
			const list = await wishlistRepository.getWishlists();
			setWishlists(list);
			setIsAddMenuVisible(false);
			setIsWishlistMenuVisible(true);
		} finally {
			setIsSaving(false);
		}
	};

	const addToWishlist = async (wishlistId: string) => {
		setIsSaving(true);
		try {
			await wishlistRepository.addCardToWishlists({
				catalogTcgCardId: card.id,
				tcg,
				language,
				wishlistIds: [wishlistId],
				variantName: selectedVariantName,
			});
			showBanner({ message: 'Added to wishlist.', tone: 'success' });
			closeAllMenus();
		} catch {
			showBanner({ message: 'Could not add card to wishlist.', tone: 'error' });
		} finally {
			setIsSaving(false);
		}
	};

	const createWishlistAndAdd = async () => {
		setIsSaving(true);
		try {
			const name = getNextName(wishlists.map((item) => item.name), 'New Wishlist');
			const wishlist = await wishlistRepository.createWishlist(name);
			await wishlistRepository.addCardToWishlists({
				catalogTcgCardId: card.id,
				tcg,
				language,
				wishlistIds: [wishlist.id],
				variantName: selectedVariantName,
			});
			showBanner({ message: `Added to ${wishlist.name}.`, tone: 'success' });
			closeAllMenus();
		} catch {
			showBanner({ message: 'Could not create wishlist.', tone: 'error' });
		} finally {
			setIsSaving(false);
		}
	};

	const openBindersMenu = async () => {
		setIsSaving(true);
		try {
			const data = await bindersRepository.getBindersData();
			setBinders(data.binders);
			setIsAddMenuVisible(false);
			setIsBindersMenuVisible(true);
		} finally {
			setIsSaving(false);
		}
	};

	const createBinderAndOpenActions = async () => {
		setIsSaving(true);
		try {
			const name = getNextName(binders.map((item) => item.title), 'New Binder');
			const created = await bindersRepository.createBinder({ name });
			setBinders((prev) => [
				{
					id: created.id,
					title: created.name,
					current: created.currentCount,
					total: created.totalCapacity,
				},
				...prev,
			]);
			setSelectedBinderId(created.id);
			setIsBindersMenuVisible(false);
			setIsBinderActionMenuVisible(true);
		} catch {
			showBanner({ message: 'Could not create binder.', tone: 'error' });
		} finally {
			setIsSaving(false);
		}
	};

	const addToBinderFirstFreeSlot = async () => {
		if (!selectedBinderId) {
			return;
		}

		setIsSaving(true);
		try {
			const result = await bindersRepository.addCardToFirstFreeSlot({
				binderId: selectedBinderId,
				catalogTcgCardId: card.id,
				tcg,
				language,
				variantName: selectedVariantName,
			});

			if (!result.added) {
				showBanner({
					message: result.reason === 'full' ? 'Binder is full.' : 'Binder could not be found.',
					tone: 'error',
				});
				return;
			}

			await inventoryRepository.upsertCatalogCardOwnedItem({
				tcg: tcg as InventoryTcg,
				catalogTcgCardId: card.id,
				language,
				variantName: selectedVariantName,
				quantityDelta: 1,
			});

			await refreshOwnership();
			showBanner({
				message: `Added to ${selectedBinder?.title ?? 'binder'} in first free slot.`,
				tone: 'success',
			});
			closeAllMenus();
			router.push(`/binder-builder?binderId=${selectedBinderId}`);
		} catch {
			showBanner({ message: 'Could not add card to binder.', tone: 'error' });
		} finally {
			setIsSaving(false);
		}
	};

	const openSelectedBinder = () => {
		if (!selectedBinderId) {
			return;
		}

		closeAllMenus();
		router.push(`/binder-builder?binderId=${selectedBinderId}`);
	};

	const variantSection = variantNames.length > 0
		? [{
			title: 'Variant',
			options: [
				{
					key: 'variant-default',
					label: 'Default printing',
					selected: !selectedVariantName,
					onPress: () => setSelectedVariantName(undefined),
				},
				...variantNames.map((name) => ({
					key: `variant-${name}`,
					label: name,
					selected: selectedVariantName === name,
					onPress: () => setSelectedVariantName(name),
				})),
			],
		}]
		: [];

	const canRemoveSelectedQuantity = (selectedOwnedVariant?.quantity ?? 0) >= selectedQuantity;

	const addMenuSections = [
		...variantSection,
		{
			title: `Add to collection${selectedVariantName ? ` (${selectedVariantName})` : ''}`,
			options: [{
				key: `add-collection-${selectedQuantity}`,
				label: formatCopyAction('Add', selectedQuantity, selectedVariantName),
				disabled: isSaving,
				onPress: () => {
					void changeCollectionQuantity(selectedQuantity);
				},
			}],
		},
		{
			title: 'Add to lists',
			options: [
				{
					key: 'add-wishlist',
					label: 'Wishlist',
					disabled: isSaving,
					onPress: () => {
						void openWishlistMenu();
					},
				},
				{
					key: 'add-binder',
					label: 'Binders',
					disabled: isSaving,
					onPress: () => {
						void openBindersMenu();
					},
				},
			],
		},
	];

	const removeMenuSections = [
		...variantSection,
		{
			title: `In collection: ${selectedOwnedVariant?.quantity ?? 0}`,
			options: [{
				key: `remove-collection-${selectedQuantity}`,
				label: canRemoveSelectedQuantity
					? formatCopyAction('Remove', selectedQuantity, selectedVariantName)
					: `Only ${selectedOwnedVariant?.quantity ?? 0} ${formatVariantLabel(selectedVariantName).toLowerCase()} ${selectedOwnedVariant?.quantity === 1 ? 'copy' : 'copies'} owned`,
				disabled: isSaving || !canRemoveSelectedQuantity,
				onPress: () => {
					void changeCollectionQuantity(-selectedQuantity);
				},
			}],
		},
	];

	const wishlistMenuSections = [
		{
			title: 'Choose wishlist',
			options: wishlists.map((wishlist) => ({
				key: wishlist.id,
				label: wishlist.name,
				onPress: () => {
					void addToWishlist(wishlist.id);
				},
			})),
		},
		{
			title: 'Actions',
			options: [
				{
					key: 'wishlist-create',
					label: 'Create new wishlist',
					onPress: () => {
						void createWishlistAndAdd();
					},
				},
			],
		},
	];

	const bindersMenuSections = [
		{
			title: 'Choose binder',
			options: binders.map((binder) => ({
				key: binder.id,
				label: `${binder.title} (${binder.current}/${binder.total})`,
				onPress: () => {
					setSelectedBinderId(binder.id);
					setIsBindersMenuVisible(false);
					setIsBinderActionMenuVisible(true);
				},
			})),
		},
		{
			title: 'Actions',
			options: [
				{
					key: 'binder-create',
					label: 'Create new binder',
					onPress: () => {
						void createBinderAndOpenActions();
					},
				},
			],
		},
	];

	const binderActionSections = [
		{
			title: selectedBinder ? `${selectedBinder.title} (${selectedBinder.current}/${selectedBinder.total})` : 'Binder actions',
			options: [
				{
					key: 'binder-add-slot',
					label: 'Add to first free slot',
					onPress: () => {
						void addToBinderFirstFreeSlot();
					},
				},
				{
					key: 'binder-open',
					label: 'Go to binder page',
					onPress: openSelectedBinder,
				},
			],
		},
	];

	return (
		<Screen contentContainerStyle={{ paddingTop: theme.spacing.md }}>
			<FadeInView>
			<Header
                hasBackBtn
                rightAlignedContent={
                    <View style={styles.tcgBadge}>
                        <AppText style={styles.tcgBadgeText}>
                            {getTcgBadgeText(card.tcg)}
                        </AppText>
                    </View>
                }    
            />
			<View style={[styles.mainLayout, isWide && styles.mainLayoutWide]}>
				<View style={[styles.mediaColumn, isWide && styles.mediaColumnWide]}>
					<View style={styles.imageContainer}>
						<TcgCard tcgCard={tcgCardItem} resizeMode="contain" />
					</View>
				</View>

				<View style={[styles.details, isWide && styles.detailsWide]}>
					<View style={styles.collectionActionsRow}>
						<Pressable
							disabled={isSaving}
							onPress={() => setIsAddMenuVisible(true)}
							style={[styles.collectionActionPrimary, isSaving && styles.collectionActionDisabled]}
						>
							<Icon iconName="library" color={theme.colors.background} size={20} />
							<AppText weight="bold" style={styles.collectionActionPrimaryText}>
								{isSaving ? 'Working...' : 'Add to Collection'}
							</AppText>
						</Pressable>

						<Pressable
							disabled={isSaving}
							onPress={() => {
								void openRemoveMenu();
							}}
							style={[styles.collectionActionSecondary, isSaving && styles.collectionActionDisabled]}
						>
							<AppText weight="bold" style={styles.collectionActionSecondaryText}>
								Remove
							</AppText>
						</Pressable>
					</View>

					<View style={styles.collectionQuantityRow}>
						<AppText muted style={styles.collectionQuantityLabel}>Qty</AppText>
						<Pressable
							disabled={isSaving}
							onPress={decreaseSelectedQuantity}
							style={[styles.quantityStepperButton, isSaving && styles.collectionActionDisabled]}
						>
							<AppText weight="bold" style={styles.quantityStepperText}>-</AppText>
						</Pressable>
						<TextInput
							value={collectionQuantityText}
							onChangeText={handleCollectionQuantityChange}
							onBlur={normalizeCollectionQuantity}
							keyboardType="number-pad"
							editable={!isSaving}
							style={styles.quantityInput}
							maxLength={4}
						/>
						<Pressable
							disabled={isSaving}
							onPress={increaseSelectedQuantity}
							style={[styles.quantityStepperButton, isSaving && styles.collectionActionDisabled]}
						>
							<AppText weight="bold" style={styles.quantityStepperText}>+</AppText>
						</Pressable>
					</View>

					<AppText muted style={styles.feedbackText}>
						Owned {ownedTotal} {ownedTotal === 1 ? 'copy' : 'copies'}
					</AppText>

					<AppText weight="bold" style={styles.name}>
						{card.name}
					</AppText>
					{subtitle ? <AppText muted style={styles.subtitle}>{subtitle}</AppText> : null}

					<View style={styles.panel}>
						<View style={styles.sectionBlock}>
							<AppText weight="semibold" style={styles.sectionTitle}>Key stats</AppText>
							<View style={styles.statsTable}>
								{statTableRows.map((row, rowIndex) => (
									<View
										key={`stats-row-${rowIndex}`}
										style={[
											styles.statsTableRow,
											rowIndex === statTableRows.length - 1 && styles.statsTableRowLast,
										]}
									>
										{row.map((stat, statIndex) => (
											<View
												key={stat.label}
												style={[
													styles.statsTableCell,
													statIndex === row.length - 1 && styles.statsTableCellLast,
												]}
											>
												<AppText muted style={styles.statLabel}>{stat.label}</AppText>
												<AppText weight="semibold" style={styles.statValue}>{stat.value}</AppText>
											</View>
										))}
										{row.length === 1 ? <View style={styles.statsTableCell} /> : null}
									</View>
								))}
							</View>
						</View>

						<View style={styles.majorDivider} />

						{textSections.map((section, index) => (
							<View key={section.title}>
								<View style={styles.textSectionBlock}>
									<AppText weight="semibold" style={styles.sectionTitle}>{section.title}</AppText>
									{section.lines.map((line, lineIndex) => (
										<AppText key={`${section.title}-${lineIndex}`} style={styles.longText}>{line}</AppText>
									))}
								</View>
								{index !== textSections.length - 1 ? <View style={styles.majorDivider} /> : null}
							</View>
						))}

						{textSections.length > 0 ? <View style={styles.majorDivider} /> : null}

						<View style={styles.sectionBlock}>
							<AppText weight="semibold" style={styles.sectionTitle}>Card details</AppText>
							{detailRows.map((row, index) => (
								<View
									key={row.label}
									style={[
										styles.detailRow,
										index === detailRows.length - 1 && styles.detailRowLast,
									]}
								>
									<AppText muted style={styles.detailLabel}>{row.label}</AppText>
									<AppText weight="semibold" style={styles.detailValue}>{row.value}</AppText>
								</View>
							))}
						</View>

						{keywords.length > 0 ? (
							<>
								<View style={styles.majorDivider} />
								<View style={styles.sectionBlock}>
									<AppText weight="semibold" style={styles.sectionTitle}>Keywords</AppText>
									<AppText>{formatList(keywords)}</AppText>
								</View>
							</>
						) : null}

						{legalities.length > 0 ? (
							<>
								<View style={styles.majorDivider} />
								<View style={styles.sectionBlock}>
									<AppText weight="semibold" style={styles.sectionTitle}>Legalities</AppText>
									{legalities.map((legality) => (
										<AppText key={legality}>{legality}</AppText>
									))}
								</View>
							</>
						) : null}
					</View>
				</View>
			</View>
			</FadeInView>

			<SlideUpMenu
				visible={isAddMenuVisible}
				title="Add card"
				onClose={() => setIsAddMenuVisible(false)}
				sections={addMenuSections}
			/>

			<SlideUpMenu
				visible={isRemoveMenuVisible}
				title="Remove card"
				onClose={() => setIsRemoveMenuVisible(false)}
				sections={removeMenuSections}
			/>

			<SlideUpMenu
				visible={isWishlistMenuVisible}
				title="Add to wishlist"
				onClose={() => setIsWishlistMenuVisible(false)}
				sections={wishlistMenuSections}
			/>

			<SlideUpMenu
				visible={isBindersMenuVisible}
				title="Add to binder"
				onClose={() => setIsBindersMenuVisible(false)}
				sections={bindersMenuSections}
			/>

			<SlideUpMenu
				visible={isBinderActionMenuVisible}
				title="Binder action"
				onClose={() => setIsBinderActionMenuVisible(false)}
				sections={binderActionSections}
			/>
		</Screen>
	);
}

const createStyles = (theme: ReturnType<typeof useAppTheme>) =>
	StyleSheet.create({
		mainLayout: {
			gap: theme.spacing.md,
		},
		mainLayoutWide: {
			flexDirection: "row",
			alignItems: "flex-start",
			gap: theme.spacing.lg,
		},
		mediaColumn: {
			width: "100%",
		},
		mediaColumnWide: {
			width: "40%",
			maxWidth: 460,
		},
		imageContainer: {
			width: "100%",
		},
		details: {
			gap: theme.spacing.sm,
		},
		detailsWide: {
			flex: 1,
		},
		collectionActionsRow: {
			flexDirection: 'row',
			gap: theme.spacing.sm,
		},
		collectionActionPrimary: {
			flex: 3,
			minHeight: 48,
			borderRadius: theme.radius.md,
			backgroundColor: theme.colors.primary,
			flexDirection: 'row',
			alignItems: 'center',
			justifyContent: 'center',
			gap: theme.spacing.sm,
			paddingHorizontal: theme.spacing.md,
		},
		collectionActionSecondary: {
			flex: 1,
			minHeight: 48,
			borderRadius: theme.radius.md,
			backgroundColor: theme.colors.surface,
			borderWidth: theme.border.width.default,
			borderColor: theme.colors.borderSubtle,
			alignItems: 'center',
			justifyContent: 'center',
			paddingHorizontal: theme.spacing.sm,
		},
		collectionActionDisabled: {
			opacity: 0.55,
		},
		loadingActionPrimary: {
			flex: 3,
		},
		loadingActionSecondary: {
			flex: 1,
		},
		collectionQuantityRow: {
			flexDirection: 'row',
			alignItems: 'center',
			gap: theme.spacing.sm,
		},
		collectionQuantityLabel: {
			fontSize: theme.fontSize.md,
		},
		quantityStepperButton: {
			minWidth: 36,
			height: 36,
			borderRadius: theme.radius.sm,
			borderWidth: theme.border.width.default,
			borderColor: theme.colors.borderSubtle,
			backgroundColor: theme.colors.surface,
			alignItems: 'center',
			justifyContent: 'center',
		},
		quantityStepperText: {
			fontSize: theme.fontSize.lg,
		},
		quantityInput: {
			minWidth: 64,
			height: 36,
			borderRadius: theme.radius.sm,
			borderWidth: theme.border.width.default,
			borderColor: theme.colors.borderSubtle,
			backgroundColor: theme.colors.surface,
			paddingHorizontal: theme.spacing.sm,
			fontSize: theme.fontSize.md,
			color: theme.colors.text,
			textAlign: 'center',
		},
		collectionActionPrimaryText: {
			color: theme.colors.background,
			fontSize: theme.fontSize.md,
		},
		collectionActionSecondaryText: {
			color: theme.colors.text,
			fontSize: theme.fontSize.md,
		},
		feedbackText: {
			fontSize: theme.fontSize.md,
		},
		name: {
			fontSize: theme.fontSize.xl,
		},
		subtitle: {
			fontSize: theme.fontSize.md,
		},
		tcgBadge: {
			alignSelf: "flex-start",
			paddingHorizontal: theme.spacing.sm,
			paddingVertical: theme.spacing.xs,
			backgroundColor: theme.colors.primary,
			borderRadius: theme.radius.xs,
			marginTop: theme.spacing.xs,
		},
		tcgBadgeText: {
			fontSize: theme.fontSize.lg,
			color: "#1F1E1C",
		},
		panel: {
			marginTop: theme.spacing.md,
			padding: theme.spacing.md,
			borderRadius: theme.radius.md,
			borderWidth: theme.border.width.default,
			borderColor: theme.colors.borderSubtle,
			backgroundColor: theme.colors.surfaceAlt,
			gap: theme.spacing.md,
		},
		sectionBlock: {
			gap: theme.spacing.xs,
		},
		sectionTitle: {
			fontSize: theme.fontSize.md,
		},
		statsTable: {
			borderWidth: theme.border.width.default,
			borderColor: theme.colors.borderSubtle,
			borderRadius: theme.radius.sm,
			overflow: "hidden",
			backgroundColor: theme.colors.surface,
		},
		statsTableRow: {
			flexDirection: "row",
			borderBottomWidth: theme.border.width.default,
			borderColor: theme.colors.borderSubtle,
		},
		statsTableRowLast: {
			borderBottomWidth: 0,
		},
		statsTableCell: {
			flex: 1,
			paddingHorizontal: theme.spacing.sm,
			paddingVertical: theme.spacing.sm,
			gap: theme.spacing.xs,
			borderRightWidth: theme.border.width.default,
			borderRightColor: theme.colors.borderSubtle,
		},
		statsTableCellLast: {
			borderRightWidth: 0,
		},
		statLabel: {
			fontSize: theme.fontSize.sm,
			textTransform: "uppercase",
		},
		statValue: {
			fontSize: theme.fontSize.lg,
		},
		textSectionBlock: {
			gap: theme.spacing.xs,
			padding: theme.spacing.sm,
			borderWidth: theme.border.width.default,
			borderColor: theme.colors.borderSubtle,
			borderLeftWidth: theme.border.width.strong,
			borderLeftColor: theme.colors.primary,
			borderRadius: theme.radius.sm,
			backgroundColor: theme.colors.surface,
		},
		majorDivider: {
			height: theme.border.width.strong,
			backgroundColor: theme.colors.borderMedium,
		},
		detailRow: {
			flexDirection: "row",
			justifyContent: "space-between",
			alignItems: "flex-start",
			paddingVertical: theme.spacing.xs,
			borderBottomWidth: theme.border.width.default,
			borderBottomColor: theme.colors.borderSubtle,
			gap: theme.spacing.md,
		},
		detailRowLast: {
			borderBottomWidth: 0,
		},
		detailLabel: {
			fontSize: theme.fontSize.md,
		},
		detailValue: {
			fontSize: theme.fontSize.md,
			maxWidth: "62%",
			textAlign: "right",
		},
		longText: {
			fontSize: theme.fontSize.md,
			lineHeight: theme.fontSize.lg,
		},
	});
