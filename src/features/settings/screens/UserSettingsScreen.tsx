import { useEffect, useMemo, useState } from 'react';
import { Alert, Image, Pressable, StyleSheet, View } from 'react-native';
import { PieChart, ShieldCheck, UserCircle2, KeyRound, ChevronRight, CircleHelp, Heart } from 'lucide-react-native';
import Svg, { Circle } from 'react-native-svg';
import * as ImagePicker from 'expo-image-picker';

import { Screen, Header, AppText, SlideUpMenu } from '@/src/shared/ui';
import { bindersRepository, catalogRepository, inventoryRepository } from '@/src/lib/repositories';
import type { CatalogLanguage, CatalogTcg } from '@/src/domain/catalog/catalog.types';
import {
	updateUserFilterDefaults,
	updateUserDownloadSettings,
	updateUserPreferences,
	updateUserProfile,
	useUserSettingsState,
	type DefaultOwnershipMode,
	type DefaultSetScope,
	type DownloadImageQuality,
} from '@/src/features/settings/settings.store';
import { useAppTheme } from '@/src/theme/useAppTheme';

type CompletionSlice = {
	label: string;
	completed: number;
	total: number;
	color: string;
};

type OwnedSetBucket = {
	tcg: CatalogTcg;
	setId: string;
	setName: string;
	language?: CatalogLanguage;
	ownedUnique: Set<string>;
};

const TCGS: CatalogTcg[] = ['pokemon', 'mtg', 'lorcana', 'one-piece'];

const AVATAR_COLORS = ['#2EC4B6', '#3B82F6', '#F4B81A', '#EF4444'];
const AVATAR_INITIALS = ['AU', 'MH', 'TC', 'BD'];

const FILTER_TCG_OPTIONS: { value: CatalogTcg; label: string }[] = [
	{ value: 'pokemon', label: 'Pokemon' },
	{ value: 'mtg', label: 'MTG' },
	{ value: 'lorcana', label: 'Lorcana' },
	{ value: 'one-piece', label: 'One Piece' },
];

const FILTER_OWNERSHIP_OPTIONS: { value: DefaultOwnershipMode; label: string }[] = [
	{ value: 'all', label: 'All cards' },
	{ value: 'owned', label: 'Owned first' },
	{ value: 'missing', label: 'Missing first' },
	{ value: 'binder-needed', label: 'Needed for binders' },
];

const FILTER_SET_SCOPE_OPTIONS: { value: DefaultSetScope; label: string }[] = [
	{ value: 'all', label: 'All sets' },
	{ value: 'favorites', label: 'Favorite sets' },
];

const DOWNLOAD_QUALITY_OPTIONS: { value: DownloadImageQuality; label: string }[] = [
	{ value: 'small', label: 'Small (recommended)' },
	{ value: 'medium', label: 'Medium' },
	{ value: 'large', label: 'Large' },
];

const RESET_FILTER_DEFAULTS = {
	defaultTcg: undefined,
	preferredLanguage: undefined,
	ownershipMode: undefined,
	setScope: undefined,
};

export function UserSettingsScreen() {
	const theme = useAppTheme();
	const styles = useMemo(() => createStyles(theme), [theme]);
	const { profile, filters, downloads, preferences } = useUserSettingsState();
	const [isAvatarMenuVisible, setIsAvatarMenuVisible] = useState(false);
	const [isLoadingCharts, setIsLoadingCharts] = useState(true);
	const [binderCompletion, setBinderCompletion] = useState<CompletionSlice[]>([]);
	const [tcgCompletion, setTcgCompletion] = useState<CompletionSlice[]>([]);
	const [setCompletion, setSetCompletion] = useState<CompletionSlice[]>([]);
	const [pendingFilters, setPendingFilters] = useState(filters);

	useEffect(() => {
		setPendingFilters(filters);
	}, [filters]);

	useEffect(() => {
		let cancelled = false;

		const loadChartData = async () => {
			setIsLoadingCharts(true);

			try {
				const [bindersData, ownedCounts, resolvedOwned] = await Promise.all([
					bindersRepository.getBindersData(),
					inventoryRepository.getOwnedCountByTcg(),
					inventoryRepository.getResolvedOwnedTcgCards(400),
				]);

				const totalByTcgEntries = await Promise.all(
					TCGS.map(async (tcg) => {
						const total = await catalogRepository.getTotalTcgCardsByTcg(tcg, filters.preferredLanguage);
						return [tcg, total] as const;
					})
				);

				const totalByTcg = Object.fromEntries(totalByTcgEntries) as Record<CatalogTcg, number>;

				const binderSlices = bindersData.binders.map((binder, index) => ({
					label: binder.title,
					completed: binder.current,
					total: binder.total,
					color: ['#2EC4B6', '#3B82F6', '#F4B81A'][index % 3],
				}));

				const recentTcgOrder = new Map<CatalogTcg, number>();
				for (const item of resolvedOwned) {
					if (!recentTcgOrder.has(item.tcg)) {
						recentTcgOrder.set(item.tcg, recentTcgOrder.size);
					}
				}

				const orderedTcgs = [...TCGS].sort((left, right) => {
					const leftOrder = recentTcgOrder.get(left) ?? Number.MAX_SAFE_INTEGER;
					const rightOrder = recentTcgOrder.get(right) ?? Number.MAX_SAFE_INTEGER;
					if (leftOrder !== rightOrder) {
						return leftOrder - rightOrder;
					}

					return left.localeCompare(right);
				});

				const tcgSlices = orderedTcgs.map((tcg, index) => ({
					label: tcg.toUpperCase().replace('-', ' '),
					completed: ownedCounts[tcg],
					total: totalByTcg[tcg],
					color: ['#2EC4B6', '#3B82F6', '#F4B81A', '#EF4444'][index % 4],
				}));

				const setBuckets = new Map<string, OwnedSetBucket>();
				for (const card of resolvedOwned) {
					if (!card.setId || !card.tcg) {
						continue;
					}

					const key = `${card.tcg}:${card.setId}:${card.language ?? ''}`;
					const existing = setBuckets.get(key);
					if (existing) {
						existing.ownedUnique.add(card.catalogTcgCardId);
						continue;
					}

					setBuckets.set(key, {
						tcg: card.tcg,
						setId: card.setId,
						setName: card.setName ?? card.setId,
						language: card.language as CatalogLanguage | undefined,
						ownedUnique: new Set([card.catalogTcgCardId]),
					});
				}

				const orderedSetBuckets = Array.from(setBuckets.values());

				const setSlices = await Promise.all(
					orderedSetBuckets.map(async (bucket, index) => {
						const cardsInSet = await catalogRepository.getTcgCardsBySet(bucket.tcg, bucket.setId, bucket.language);
						return {
							label: bucket.setName,
							completed: bucket.ownedUnique.size,
							total: cardsInSet.length,
							color: ['#F59E0B', '#8B5CF6', '#2EC4B6', '#3B82F6'][index % 4],
						};
					})
				);

				if (!cancelled) {
					setBinderCompletion(binderSlices);
					setTcgCompletion(tcgSlices);
					setSetCompletion(setSlices);
				}
			} finally {
				if (!cancelled) {
					setIsLoadingCharts(false);
				}
			}
		};

		void loadChartData();
		return () => {
			cancelled = true;
		};
	}, [filters.preferredLanguage]);

	const avatarMenuSections = [
		{
			title: 'Photo',
			options: [
				{
					key: 'photo-upload',
					label: 'Upload from library',
					onPress: () => {
						void pickAvatarImage();
					},
				},
				{
					key: 'photo-remove',
					label: 'Remove photo',
					selected: !profile.avatarImageUri,
					onPress: () => {
						updateUserProfile({ avatarImageUri: undefined });
					},
				},
			],
		},
		{
			title: 'Avatar initials',
			options: AVATAR_INITIALS.map((initials) => ({
				key: `initials-${initials}`,
				label: initials,
				selected: profile.avatarInitials === initials,
				onPress: () => updateUserProfile({ avatarInitials: initials }),
			})),
		},
		{
			title: 'Avatar color',
			options: AVATAR_COLORS.map((color) => ({
				key: `color-${color}`,
				label: color,
				selected: profile.avatarColor === color,
				onPress: () => updateUserProfile({ avatarColor: color }),
			})),
		},
	];

	const pickAvatarImage = async () => {
		const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
		if (!permission.granted) {
			return;
		}

		const result = await ImagePicker.launchImageLibraryAsync({
			mediaTypes: ['images'],
			allowsEditing: true,
			aspect: [1, 1],
			quality: 0.85,
		});

		if (result.canceled || result.assets.length === 0) {
			return;
		}

		updateUserProfile({ avatarImageUri: result.assets[0].uri });
	};

	return (
		<Screen edges={['left', 'right']}>
			<Header title="Settings" />

			<View style={styles.heroCard}>
				<View style={styles.heroBlobA} />
				<View style={styles.heroBlobB} />

				<Pressable
					style={[styles.avatar, { backgroundColor: profile.avatarColor }]}
					onPress={() => setIsAvatarMenuVisible(true)}
				>
					{profile.avatarImageUri ? (
						<Image source={{ uri: profile.avatarImageUri }} style={styles.avatarImage} />
					) : (
						<AppText weight="bold" style={styles.avatarText}>{profile.avatarInitials}</AppText>
					)}
					<View style={styles.avatarEditBadge}>
						<AppText weight="bold" style={styles.avatarEditText}>Edit</AppText>
					</View>
				</Pressable>

				<AppText weight="bold" style={styles.profileName}>{profile.displayName}</AppText>
				<AppText muted style={styles.profileMeta}>{profile.handle}</AppText>
				<AppText muted style={styles.profileMeta}>{profile.email}</AppText>
			</View>

			<View style={styles.sectionCard}>
				<SettingRow
					icon={<UserCircle2 size={20} color={theme.colors.secondary} />}
					title="Personal Info"
					description="Name, handle, email"
				/>
				<SettingRow
					icon={<KeyRound size={20} color={theme.colors.secondary} />}
					title="Passwords and Security"
					description="Sign-in and security controls"
				/>
			</View>

			<View style={styles.sectionCard}>
				<View style={styles.sectionHeaderRow}>
					<UserCircle2 size={20} color={theme.colors.secondary} />
					<AppText weight="semibold" style={styles.sectionTitle}>Offline Downloads & Testing</AppText>
				</View>
				<AppText muted style={styles.sectionDescription}>
					Choose image size for offline downloads and optionally simulate no internet for testing. Changing size does not auto-convert existing downloads; tap download again to refresh at the new size.
				</AppText>

				<FilterChipRow
					title="Offline image download quality"
					options={DOWNLOAD_QUALITY_OPTIONS}
					selectedValue={downloads.imageQuality}
					onSelect={(value) => updateUserDownloadSettings({ imageQuality: value as DownloadImageQuality })}
				/>

				{/* TODO(settings): Decide whether to keep forced offline mode after QA testing period. */}
				<FilterChipRow
					title="Offline mode (simulate no internet)"
					options={[
						{ label: 'On', value: 'on' },
						{ label: 'Off', value: 'off' },
					]}
					selectedValue={preferences.forceOfflineMode ? 'on' : 'off'}
					allowDeselect={false}
					onSelect={(value) => {
						updateUserPreferences({ forceOfflineMode: value === 'on' });
					}}
				/>
			</View>

			<View style={styles.sectionCard}>
				<View style={styles.sectionHeaderRow}>
					<PieChart size={20} color={theme.colors.secondary} />
					<AppText weight="semibold" style={styles.sectionTitle}>Default Filters</AppText>
				</View>

				<FilterChipRow
					title="Default TCG"
					options={FILTER_TCG_OPTIONS}
					selectedValue={pendingFilters.defaultTcg}
					onSelect={(value) => setPendingFilters({ ...pendingFilters, defaultTcg: value as CatalogTcg | undefined })}
				/>

				<FilterChipRow
					title="Default ownership mode"
					options={FILTER_OWNERSHIP_OPTIONS}
					selectedValue={pendingFilters.ownershipMode}
					onSelect={(value) => setPendingFilters({ ...pendingFilters, ownershipMode: value as DefaultOwnershipMode | undefined })}
				/>

				<FilterChipRow
					title="Default set scope"
					options={FILTER_SET_SCOPE_OPTIONS}
					selectedValue={pendingFilters.setScope}
					onSelect={(value) => setPendingFilters({ ...pendingFilters, setScope: value as DefaultSetScope | undefined })}
				/>

				<FilterChipRow
					title="Preferred language"
					options={[
						{ label: 'English', value: 'en' },
						{ label: 'Japanese', value: 'ja' },
					]}
					selectedValue={pendingFilters.preferredLanguage}
					onSelect={(value) => setPendingFilters({ ...pendingFilters, preferredLanguage: value as CatalogLanguage | undefined })}
				/>

				<FilterChipRow
					title="Remember catalog filters between sessions"
					options={[
						{ label: 'On', value: 'on' },
						{ label: 'Off', value: 'off' },
					]}
					selectedValue={preferences.rememberCatalogFilters ? 'on' : 'off'}
					allowDeselect={false}
					onSelect={(value) => {
						updateUserPreferences({ rememberCatalogFilters: value === 'on' });
					}}
				/>

				<View style={styles.filterActionsRow}>
					<Pressable
						style={styles.filterActionPrimary}
						onPress={() => {
							Alert.alert(
								'Apply default filters?',
								'This updates only your saved default filter preferences. It does not change your current catalog session filters.',
								[
									{ text: 'Cancel', onPress: () => {}, style: 'cancel' },
									{
										text: 'OK',
										onPress: () => {
											updateUserFilterDefaults(pendingFilters);
										},
									},
								],
							);
						}}
					>
						<AppText weight="bold" style={styles.filterActionPrimaryText}>Apply</AppText>
					</Pressable>

					<Pressable
						style={styles.filterActionSecondary}
						onPress={() => {
							Alert.alert(
								'Reset default filters?',
								'This resets only your saved default filter preferences. It does not clear your current catalog session filters.',
								[
									{ text: 'Cancel', onPress: () => {}, style: 'cancel' },
									{
										text: 'Reset',
										style: 'destructive',
										onPress: () => {
											setPendingFilters(RESET_FILTER_DEFAULTS);
											updateUserFilterDefaults(RESET_FILTER_DEFAULTS);
										},
									},
								],
							);
						}}
					>
							<AppText weight="bold" style={styles.filterActionSecondaryText}>Reset</AppText>
					</Pressable>
				</View>
			</View>

			<View style={styles.sectionCard}>
				<View style={styles.sectionHeaderRow}>
					<ShieldCheck size={20} color={theme.colors.secondary} />
					<AppText weight="semibold" style={styles.sectionTitle}>Completion Charts</AppText>
				</View>

				{isLoadingCharts ? <AppText muted>Loading completion charts...</AppText> : null}

				<ChartGroup title="Binders completion" items={binderCompletion} emptyText="Create or update binders to populate this chart." />
				<ChartGroup title="TCG completion" items={tcgCompletion} emptyText="Add cards to collection to populate this chart." />
				<ChartGroup title="Set completion" items={setCompletion} emptyText="Own cards from a set to show set completion." />
			</View>

			<View style={styles.sectionCard}>
				<SettingRow icon={<CircleHelp size={20} color={theme.colors.secondary} />} title="Help" description="FAQ and support" />
				<SettingRow icon={<Heart size={20} color={theme.colors.secondary} />} title="About" description="Version and credits" />
			</View>

			<SlideUpMenu
				visible={isAvatarMenuVisible}
				title="Edit avatar"
				onClose={() => setIsAvatarMenuVisible(false)}
				sections={avatarMenuSections}
			/>
		</Screen>
	);
}

type SettingRowProps = {
	icon: React.ReactNode;
	title: string;
	description?: string;
};

function SettingRow({ icon, title, description }: SettingRowProps) {
	const theme = useAppTheme();
	const styles = useMemo(() => createStyles(theme), [theme]);

	return (
		<Pressable style={styles.settingRow}>
			<View style={styles.settingRowLeft}>
				{icon}
				<View style={styles.settingRowTextWrap}>
					<AppText weight="semibold">{title}</AppText>
					{description ? <AppText muted style={styles.settingRowDesc}>{description}</AppText> : null}
				</View>
			</View>
			<ChevronRight size={18} color={theme.colors.textMuted} />
		</Pressable>
	);
}

type FilterChipRowProps = {
	title: string;
	options: { label: string; value: string }[];
	selectedValue?: string;
	allowDeselect?: boolean;
	onSelect: (value: string | undefined) => void;
};

function FilterChipRow({ title, options, selectedValue, allowDeselect = true, onSelect }: FilterChipRowProps) {
	const theme = useAppTheme();
	const styles = useMemo(() => createStyles(theme), [theme]);

	return (
		<View style={styles.filterRow}>
			<AppText muted style={styles.filterTitle}>{title}</AppText>
			<View style={styles.filterChipWrap}>
				{options.map((option) => {
					const selected = option.value === selectedValue;
					return (
						<Pressable
							key={option.value}
							style={[styles.filterChip, selected && styles.filterChipSelected]}
							onPress={() => onSelect(selected && allowDeselect ? undefined : option.value)}
						>
							<AppText style={selected ? styles.filterChipTextSelected : styles.filterChipText}>{option.label}</AppText>
						</Pressable>
					);
				})}
			</View>
		</View>
	);
}

type ChartGroupProps = {
	title: string;
	items: CompletionSlice[];
	emptyText: string;
};

function ChartGroup({ title, items, emptyText }: ChartGroupProps) {
	const theme = useAppTheme();
	const styles = useMemo(() => createStyles(theme), [theme]);
	const [isExpanded, setIsExpanded] = useState(false);
	const collapsedCount = 3;
	const hasOverflow = items.length > collapsedCount;
	const visibleItems = isExpanded ? items : items.slice(0, collapsedCount);

	useEffect(() => {
		setIsExpanded(false);
	}, [items]);

	return (
		<View style={styles.chartGroup}>
			<View style={styles.chartGroupHeader}>
				<AppText weight="semibold">{title}</AppText>
				{hasOverflow ? (
					<Pressable onPress={() => setIsExpanded((current) => !current)} style={styles.chartToggle}>
						<AppText weight="semibold" style={styles.chartToggleText}>
							{isExpanded ? 'Show less' : `Show ${items.length - collapsedCount} more`}
						</AppText>
					</Pressable>
				) : null}
			</View>
			{items.length === 0 ? <AppText muted>{emptyText}</AppText> : null}
			{visibleItems.map((item) => (
				<View key={item.label} style={styles.chartItemRow}>
					<View style={styles.chartItemText}>
						<AppText weight="semibold">{item.label}</AppText>
						<AppText muted>{formatCompletionText(item.completed, item.total)}</AppText>
					</View>
					<SmallDonutChart
						completed={item.completed}
						total={item.total}
						accentColor={item.color}
					/>
				</View>
			))}
		</View>
	);
}

type SmallDonutChartProps = {
	completed: number;
	total: number;
	accentColor: string;
};

function SmallDonutChart({ completed, total, accentColor }: SmallDonutChartProps) {
	const theme = useAppTheme();
	const size = 56;
	const strokeWidth = 8;
	const radius = (size - strokeWidth) / 2;
	const circumference = 2 * Math.PI * radius;
	const safeTotal = Math.max(0, total);
	const safeCompleted = Math.max(0, Math.min(completed, safeTotal));
	const progress = safeTotal > 0 ? safeCompleted / safeTotal : 0;
	const dashLength = circumference * progress;

	return (
		<View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
			<Svg width={size} height={size}>
				<Circle
					cx={size / 2}
					cy={size / 2}
					r={radius}
					stroke={theme.colors.borderSubtle}
					strokeWidth={strokeWidth}
					fill="none"
				/>
				<Circle
					cx={size / 2}
					cy={size / 2}
					r={radius}
					stroke={accentColor}
					strokeWidth={strokeWidth}
					fill="none"
					strokeDasharray={`${dashLength} ${circumference - dashLength}`}
					transform={`rotate(-90 ${size / 2} ${size / 2})`}
					strokeLinecap="round"
				/>
			</Svg>
			<AppText weight="bold" style={stylesForDonut.centerText}>{toPercentText(progress)}</AppText>
		</View>
	);
}

const stylesForDonut = StyleSheet.create({
	centerText: {
		position: 'absolute',
		fontSize: 10,
	},
});

function toPercentText(progress: number): string {
	return `${Math.round(progress * 100)}%`;
}

function formatCompletionText(completed: number, total: number): string {
	const safeTotal = Math.max(total, 0);
	if (safeTotal === 0) {
		return `${completed}/0`;
	}

	const pct = Math.round((Math.max(0, completed) / safeTotal) * 100);
	return `${completed}/${safeTotal} (${pct}%)`;
}

const createStyles = (theme: ReturnType<typeof useAppTheme>) =>
	StyleSheet.create({
		heroCard: {
			position: 'relative',
			overflow: 'hidden',
			backgroundColor: theme.colors.surface,
			borderRadius: theme.radius.lg,
			borderWidth: theme.border.width.default,
			borderColor: theme.colors.borderSubtle,
			alignItems: 'center',
			paddingVertical: theme.spacing.lg,
			paddingHorizontal: theme.spacing.md,
			gap: theme.spacing.xs,
			marginBottom: theme.spacing.md,
		},
		heroBlobA: {
			position: 'absolute',
			top: -40,
			right: -30,
			width: 170,
			height: 170,
			borderRadius: 85,
			backgroundColor: theme.colors.surfaceAlt,
		},
		heroBlobB: {
			position: 'absolute',
			bottom: -60,
			left: -35,
			width: 150,
			height: 150,
			borderRadius: 75,
			backgroundColor: theme.colors.borderSubtle,
		},
		avatar: {
			width: 108,
			height: 108,
			borderRadius: 54,
			alignItems: 'center',
			justifyContent: 'center',
			borderWidth: theme.border.width.strong,
			borderColor: theme.colors.surface,
		},
		avatarText: {
			fontSize: 34,
			color: '#1F1E1C',
		},
		avatarImage: {
			width: '100%',
			height: '100%',
			borderRadius: 54,
		},
		avatarEditBadge: {
			position: 'absolute',
			bottom: 0,
			backgroundColor: theme.colors.surface,
			borderRadius: theme.radius.xxl,
			paddingHorizontal: theme.spacing.sm,
			paddingVertical: 2,
			borderWidth: theme.border.width.default,
			borderColor: theme.colors.borderSubtle,
		},
		avatarEditText: {
			fontSize: theme.fontSize.sm,
			color: theme.colors.secondary,
		},
		profileName: {
			fontSize: theme.fontSize.xl,
			marginTop: theme.spacing.sm,
		},
		profileMeta: {
			fontSize: theme.fontSize.md,
		},
		sectionCard: {
			backgroundColor: theme.colors.surface,
			borderRadius: theme.radius.lg,
			borderWidth: theme.border.width.default,
			borderColor: theme.colors.borderSubtle,
			padding: theme.spacing.md,
			gap: theme.spacing.sm,
			marginBottom: theme.spacing.md,
		},
		sectionHeaderRow: {
			flexDirection: 'row',
			alignItems: 'center',
			gap: theme.spacing.sm,
		},
		sectionTitle: {
			fontSize: theme.fontSize.lg,
		},
		sectionDescription: {
			fontSize: theme.fontSize.sm,
			lineHeight: 18,
		},
		settingRow: {
			flexDirection: 'row',
			alignItems: 'center',
			justifyContent: 'space-between',
			paddingVertical: theme.spacing.xs,
		},
		settingRowLeft: {
			flexDirection: 'row',
			alignItems: 'center',
			gap: theme.spacing.sm,
			flex: 1,
		},
		settingRowTextWrap: {
			gap: 2,
		},
		settingRowDesc: {
			fontSize: theme.fontSize.sm,
		},
		filterRow: {
			gap: theme.spacing.xs,
		},
		filterTitle: {
			fontSize: theme.fontSize.sm,
		},
		filterChipWrap: {
			flexDirection: 'row',
			flexWrap: 'wrap',
			gap: theme.spacing.xs,
		},
		filterChip: {
			paddingHorizontal: theme.spacing.sm,
			paddingVertical: theme.spacing.xs,
			borderRadius: theme.radius.sm,
			borderWidth: theme.border.width.default,
			borderColor: theme.colors.borderSubtle,
			backgroundColor: theme.colors.surfaceAlt,
		},
		filterChipSelected: {
			borderColor: theme.colors.secondary,
			backgroundColor: theme.colors.surfaceAlt,
		},
		filterChipText: {
			fontSize: theme.fontSize.md,
			color: theme.colors.text,
		},
		filterChipTextSelected: {
			fontSize: theme.fontSize.md,
			color: theme.colors.secondary,
		},
		chartGroup: {
			gap: theme.spacing.xs,
			paddingTop: theme.spacing.xs,
		},
		chartGroupHeader: {
			flexDirection: 'row',
			alignItems: 'center',
			justifyContent: 'space-between',
			gap: theme.spacing.sm,
		},
		chartToggle: {
			paddingVertical: 2,
		},
		chartToggleText: {
			fontSize: theme.fontSize.md,
			color: theme.colors.secondary,
		},
		chartItemRow: {
			flexDirection: 'row',
			alignItems: 'center',
			justifyContent: 'space-between',
			paddingVertical: theme.spacing.xs,
			borderBottomWidth: theme.border.width.default,
			borderBottomColor: theme.colors.borderSubtle,
		},
		chartItemText: {
			flex: 1,
			gap: 2,
			paddingRight: theme.spacing.sm,
		},
		filterActionsRow: {
			marginTop: theme.spacing.md,
			flexDirection: 'row',
			gap: theme.spacing.sm,
		},
		filterActionPrimary: {
			flex: 3,
			minHeight: 48,
			borderRadius: theme.radius.md,
			backgroundColor: theme.colors.primary,
			alignItems: 'center',
			justifyContent: 'center',
			paddingHorizontal: theme.spacing.md,
		},
		filterActionPrimaryText: {
			color: theme.colors.background,
			fontSize: theme.fontSize.md,
		},
		filterActionSecondary: {
			flex: 1,
			minHeight: 48,
			borderRadius: theme.radius.md,
			backgroundColor: theme.colors.surfaceAlt,
			borderWidth: theme.border.width.default,
			borderColor: theme.colors.borderSubtle,
			alignItems: 'center',
			justifyContent: 'center',
			paddingHorizontal: theme.spacing.sm,
		},
		filterActionSecondaryText: {
			color: theme.colors.text,
			fontSize: theme.fontSize.md,
		},
	});
