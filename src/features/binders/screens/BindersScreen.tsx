import { useEffect, useMemo, useState } from 'react';
import { Alert, Modal, Pressable, StyleSheet, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';

import { bindersRepository } from '@/src/lib/repositories';
import { useAppTheme } from '@/src/theme/useAppTheme';
import { AppText, FadeInView, Icon, Screen, SkeletonBlock, useTopBanner } from '@/src/shared/ui';

import type { BinderListItem } from '../binders.types';
import { BinderCard } from '../components/BinderCard';
import { useBindersData } from '../hooks/useBindersData';

type BinderSizePreset = {
	id: string;
	label: string;
	rows: number;
	columns: number;
	totalSlots: number;
};

const BINDER_SIZE_PRESETS: BinderSizePreset[] = [
	{ id: '2x2-160', label: '4 pocket', rows: 2, columns: 2, totalSlots: 160 },
	{ id: '3x3-360', label: '9 pocket', rows: 3, columns: 3, totalSlots: 360 },
	{ id: '4x3-480', label: '9 pocket XL', rows: 4, columns: 3, totalSlots: 480 },
	{ id: '4x3-624', label: '12 pocket', rows: 4, columns: 3, totalSlots: 624 },
	{ id: '4x4-1088', label: '16 pocket', rows: 4, columns: 4, totalSlots: 1088 },
	{ id: '5x4-1280', label: '20 pocket', rows: 5, columns: 4, totalSlots: 1280 },
];

const BINDER_COLOR_PRESETS = ['black', 'navy', 'forest', 'red', 'teal', 'yellow'] as const;

const COLOR_SWATCH_BY_NAME: Record<(typeof BINDER_COLOR_PRESETS)[number], string> = {
	black: '#111111',
	navy: '#1f3f72',
	forest: '#1f5a3f',
	red: '#a5363b',
	teal: '#1f7a7a',
	yellow: '#d1a221',
};

function parsePositiveInt(value: string): number | null {
	const parsed = Number.parseInt(value, 10);
	if (!Number.isFinite(parsed) || parsed <= 0) {
		return null;
	}

	return parsed;
}

function getNextBinderName(existingNames: string[]): string {
	if (!existingNames.includes('New Binder')) {
		return 'New Binder';
	}

	let index = 2;
	while (existingNames.includes(`New Binder ${index}`)) {
		index += 1;
	}

	return `New Binder ${index}`;
}

export function BindersScreen() {
	const router = useRouter();
	const theme = useAppTheme();
	const styles = useMemo(() => createStyles(theme), [theme]);
	const { showBanner } = useTopBanner();
	const { data, isLoading, error } = useBindersData();
	const [binders, setBinders] = useState<BinderListItem[]>([]);
	const [isCreatingBinder, setIsCreatingBinder] = useState(false);
	const [isDeletingBinders, setIsDeletingBinders] = useState(false);
	const [isCreateMenuVisible, setIsCreateMenuVisible] = useState(false);
	const [isDeleteMode, setIsDeleteMode] = useState(false);
	const [selectedBinderIds, setSelectedBinderIds] = useState<string[]>([]);
	const [binderName, setBinderName] = useState('');
	const [selectedPresetId, setSelectedPresetId] = useState(BINDER_SIZE_PRESETS[1].id);
	const [sizeMode, setSizeMode] = useState<'preset' | 'custom'>('preset');
	const [customRows, setCustomRows] = useState('3');
	const [customColumns, setCustomColumns] = useState('3');
	const [customTotalSlots, setCustomTotalSlots] = useState('360');
	const [coverColor, setCoverColor] = useState<(typeof BINDER_COLOR_PRESETS)[number]>('black');
	const [insideColor, setInsideColor] = useState<(typeof BINDER_COLOR_PRESETS)[number]>('black');
	const [pageColor, setPageColor] = useState<(typeof BINDER_COLOR_PRESETS)[number]>('black');

	useEffect(() => {
		if (!data) {
			return;
		}

		setBinders(data.binders);
	}, [data]);

	if (isLoading || !data) {
		return (
			<Screen>
				<View style={styles.headerRow}>
					<SkeletonBlock width="52%" height={38} borderRadius={theme.radius.md} />
					<SkeletonBlock width={36} height={36} borderRadius={10} />
				</View>

				<View style={styles.grid}>
					{Array.from({ length: 6 }).map((_, index) => (
						<View key={`binder-skeleton-${index}`} style={styles.tile}>
							<SkeletonBlock width="100%" height={132} borderRadius={theme.radius.md} />
							<SkeletonBlock style={styles.loadingTileLinePrimary} width="74%" height={14} borderRadius={theme.radius.xs} />
							<SkeletonBlock style={styles.loadingTileLineSecondary} width="52%" height={12} borderRadius={theme.radius.xs} />
						</View>
					))}
				</View>
			</Screen>
		);
	}

	if (error) {
		return <Screen />;
	}

	const resetCreateForm = () => {
		setBinderName(getNextBinderName(binders.map((binder) => binder.title)));
		setSelectedPresetId(BINDER_SIZE_PRESETS[1].id);
		setSizeMode('preset');
		setCustomRows('3');
		setCustomColumns('3');
		setCustomTotalSlots('360');
		setCoverColor('black');
		setInsideColor('black');
		setPageColor('black');
	};

	const openCreateMenu = () => {
		resetCreateForm();
		setIsCreateMenuVisible(true);
	};

	const closeCreateMenu = () => {
		setIsCreateMenuVisible(false);
	};

	const openDeleteMode = () => {
		if (binders.length === 0) {
			showBanner({ message: 'No binders to delete.', tone: 'info' });
			return;
		}

		setIsDeleteMode(true);
		setSelectedBinderIds([]);
	};

	const closeDeleteMode = () => {
		setIsDeleteMode(false);
		setSelectedBinderIds([]);
	};

	const toggleBinderSelection = (binderId: string) => {
		setSelectedBinderIds((prev) => {
			if (prev.includes(binderId)) {
				return prev.filter((id) => id !== binderId);
			}

			return [...prev, binderId];
		});
	};

	const deleteSelectedBinders = async () => {
		if (selectedBinderIds.length === 0) {
			showBanner({ message: 'Select at least one binder.', tone: 'error' });
			return;
		}

		setIsDeletingBinders(true);
		try {
			await bindersRepository.deleteBinders(selectedBinderIds);
			setBinders((prev) => prev.filter((binder) => !selectedBinderIds.includes(binder.id)));
			showBanner({
				message: selectedBinderIds.length === 1 ? 'Deleted binder.' : `Deleted ${selectedBinderIds.length} binders.`,
				tone: 'success',
			});
			closeDeleteMode();
		} catch {
			showBanner({ message: 'Could not delete selected binders.', tone: 'error' });
		} finally {
			setIsDeletingBinders(false);
		}
	};

	const confirmDeleteSelected = () => {
		if (selectedBinderIds.length === 0) {
			showBanner({ message: 'Select at least one binder.', tone: 'error' });
			return;
		}

		const title = selectedBinderIds.length === 1 ? 'Delete binder?' : `Delete ${selectedBinderIds.length} binders?`;
		const message = selectedBinderIds.length === 1
			? 'This removes the binder and its card placements.'
			: 'This removes all selected binders and their card placements.';

		Alert.alert(title, message, [
			{ text: 'Cancel', style: 'cancel' },
			{
				text: 'Delete',
				style: 'destructive',
				onPress: () => {
					void deleteSelectedBinders();
				},
			},
		]);
	};

	const createBinder = async () => {
		const trimmedName = binderName.trim();
		if (!trimmedName) {
			showBanner({ message: 'Please enter a binder name.', tone: 'error' });
			return;
		}

		const selectedPreset = BINDER_SIZE_PRESETS.find((preset) => preset.id === selectedPresetId) ?? BINDER_SIZE_PRESETS[1];
		const parsedRows = parsePositiveInt(customRows);
		const parsedColumns = parsePositiveInt(customColumns);
		const parsedTotalSlots = parsePositiveInt(customTotalSlots);

		if (sizeMode === 'custom' && (!parsedRows || !parsedColumns || !parsedTotalSlots)) {
			showBanner({ message: 'Custom rows, columns, and total slots must be valid.', tone: 'error' });
			return;
		}

		const totalCapacity = sizeMode === 'custom' ? parsedTotalSlots! : selectedPreset.totalSlots;

		setIsCreatingBinder(true);
		try {
			       const created = await bindersRepository.createBinder({
				       name: trimmedName,
				       totalCapacity,
				       color: COLOR_SWATCH_BY_NAME[coverColor] ?? '#111111',
				       insideColor: COLOR_SWATCH_BY_NAME[insideColor] ?? COLOR_SWATCH_BY_NAME[coverColor] ?? '#111111',
				       pageColor: COLOR_SWATCH_BY_NAME[pageColor] ?? COLOR_SWATCH_BY_NAME[coverColor] ?? '#111111',
			       });
			setBinders((prev) => [
				{
					id: created.id,
					title: created.name,
					current: created.currentCount,
					total: created.totalCapacity,
				},
				...prev,
			]);
			showBanner({ message: `Created ${created.name}.`, tone: 'success' });
			closeCreateMenu();
			router.push(`/binder-builder?binderId=${created.id}`);
		} catch {
			showBanner({ message: 'Could not create binder.', tone: 'error' });
		} finally {
			setIsCreatingBinder(false);
		}
	};

	return (
		<Screen>
			<View style={styles.headerRow}>
				<AppText weight="bold" style={styles.title}>{isDeleteMode ? 'Delete Binders' : 'Binders'}</AppText>
				<View style={styles.headerActionsRow}>
					{isDeleteMode ? (
						<Pressable onPress={closeDeleteMode} style={styles.cancelDeleteButton}>
							<AppText weight="semibold">Cancel</AppText>
						</Pressable>
					) : null}
					<Pressable
						onPress={() => {
							if (isDeleteMode) {
								confirmDeleteSelected();
								return;
							}

							openDeleteMode();
						}}
						style={[styles.deleteButton, (isDeletingBinders || binders.length === 0) && styles.addTileDisabled]}
						disabled={isDeletingBinders || binders.length === 0}
					>
						<Icon iconName="trash2" color={theme.colors.danger} size={18} />
					</Pressable>
				</View>
			</View>

			<View style={styles.grid}>
				{binders.map((binder, index) => (
					<FadeInView key={binder.id} delay={Math.min(index * 60, 360)} style={styles.tile}>
					<Pressable
						onPress={() => {
							if (isDeleteMode) {
								if (!isDeletingBinders) {
									toggleBinderSelection(binder.id);
								}
								return;
							}

							router.push(`/binder-builder?binderId=${binder.id}`);
						}}
						style={[
							isDeleteMode && styles.deleteModeTile,
							isDeleteMode && selectedBinderIds.includes(binder.id) && styles.deleteModeTileSelected,
						]}
					>
						<BinderCard
							title={binder.title}
							current={binder.current}
							total={binder.total}
						/>
					</Pressable>
					</FadeInView>
				))}

				{!isDeleteMode ? (
					<Pressable
						disabled={isCreatingBinder}
						onPress={() => {
							openCreateMenu();
						}}
						style={[styles.tile, styles.addTile, isCreatingBinder && styles.addTileDisabled]}
					>
						<View style={styles.addButton}>
							<Icon iconName="plus" color={theme.colors.background} size={20} />
						</View>
					</Pressable>
				) : null}
			</View>

			{isDeleteMode ? (
				<View style={styles.deleteActionBar}>
					<AppText muted style={styles.deleteSelectionText}>
						{selectedBinderIds.length} selected
					</AppText>
					<Pressable
						onPress={confirmDeleteSelected}
						disabled={selectedBinderIds.length === 0 || isDeletingBinders}
						style={[
							styles.deleteSelectedButton,
							(selectedBinderIds.length === 0 || isDeletingBinders) && styles.addTileDisabled,
						]}
					>
						<Icon iconName="trash2" color={theme.colors.background} size={16} />
						<AppText weight="bold" style={styles.deleteSelectedButtonText}>
							{isDeletingBinders ? 'Deleting...' : `Delete (${selectedBinderIds.length})`}
						</AppText>
					</Pressable>
				</View>
			) : null}

			<Modal
				transparent
				visible={isCreateMenuVisible}
				animationType="slide"
				onRequestClose={closeCreateMenu}
			>
				<Pressable style={styles.modalBackdrop} onPress={closeCreateMenu}>
					<Pressable style={styles.modalSheet} onPress={() => {}}>
						<AppText weight="bold" style={styles.modalTitle}>Create binder</AppText>

						<View style={styles.formSection}>
							<AppText weight="semibold">Binder name</AppText>
							<TextInput
								value={binderName}
								onChangeText={setBinderName}
								placeholder="My binder"
								placeholderTextColor={theme.colors.textMuted}
								style={styles.input}
							/>
						</View>

						<View style={styles.formSection}>
							<AppText weight="semibold">Binder size presets</AppText>
							<View style={styles.presetGrid}>
								{BINDER_SIZE_PRESETS.map((preset) => {
									const selected = sizeMode === 'preset' && selectedPresetId === preset.id;
									return (
										<Pressable
											key={preset.id}
											onPress={() => {
												setSelectedPresetId(preset.id);
												setSizeMode('preset');
											}}
											style={[styles.presetButton, selected && styles.presetButtonActive]}
										>
											<AppText style={styles.presetButtonLabel}>{preset.label}</AppText>
											<AppText muted style={styles.presetButtonMeta}>
												{preset.rows}x{preset.columns} / {preset.totalSlots}
											</AppText>
										</Pressable>
									);
								})}
							</View>
						</View>

						<View style={styles.formSection}>
							<View style={styles.customHeaderRow}>
								<AppText weight="semibold">Custom binder</AppText>
								<Pressable
									onPress={() => setSizeMode('custom')}
									style={[styles.customModeButton, sizeMode === 'custom' && styles.customModeButtonActive]}
								>
									<AppText style={styles.customModeButtonLabel}>Use custom</AppText>
								</Pressable>
							</View>
							<View style={styles.customInputsRow}>
								<View style={styles.customInputField}>
									<AppText muted style={styles.customInputLabel}>Rows</AppText>
									<TextInput
										value={customRows}
										onChangeText={(next) => {
											setCustomRows(next.replace(/[^0-9]/g, ''));
											setSizeMode('custom');
										}}
										placeholder="Rows"
										placeholderTextColor={theme.colors.textMuted}
										keyboardType="number-pad"
										style={[styles.input, styles.compactInput]}
									/>
								</View>
								<View style={styles.customInputField}>
									<AppText muted style={styles.customInputLabel}>Columns</AppText>
									<TextInput
										value={customColumns}
										onChangeText={(next) => {
											setCustomColumns(next.replace(/[^0-9]/g, ''));
											setSizeMode('custom');
										}}
										placeholder="Columns"
										placeholderTextColor={theme.colors.textMuted}
										keyboardType="number-pad"
										style={[styles.input, styles.compactInput]}
									/>
								</View>
								<View style={styles.customInputField}>
									<AppText muted style={styles.customInputLabel}>Total slots</AppText>
									<TextInput
										value={customTotalSlots}
										onChangeText={(next) => {
											setCustomTotalSlots(next.replace(/[^0-9]/g, ''));
											setSizeMode('custom');
										}}
										placeholder="Total slots"
										placeholderTextColor={theme.colors.textMuted}
										keyboardType="number-pad"
										style={[styles.input, styles.compactInput]}
									/>
								</View>
							</View>
						</View>

						<View style={styles.formSection}>
							<AppText weight="semibold">Binder colour</AppText>
							<View style={styles.colorRow}>
								{BINDER_COLOR_PRESETS.map((name) => (
									<Pressable
										key={`cover-${name}`}
										onPress={() => setCoverColor(name)}
										style={[styles.colorSwatch, coverColor === name && styles.colorSwatchActive]}
									>
										<View style={[styles.colorDot, { backgroundColor: COLOR_SWATCH_BY_NAME[name] }]} />
									</Pressable>
								))}
							</View>
						</View>

						<View style={styles.formSection}>
							<AppText weight="semibold">Inside binder colour</AppText>
							<View style={styles.colorRow}>
								{BINDER_COLOR_PRESETS.map((name) => (
									<Pressable
										key={`inside-${name}`}
										onPress={() => setInsideColor(name)}
										style={[styles.colorSwatch, insideColor === name && styles.colorSwatchActive]}
									>
										<View style={[styles.colorDot, { backgroundColor: COLOR_SWATCH_BY_NAME[name] }]} />
									</Pressable>
								))}
							</View>
						</View>

						<View style={styles.formSection}>
							<AppText weight="semibold">Page colour</AppText>
							<View style={styles.colorRow}>
								{BINDER_COLOR_PRESETS.map((name) => (
									<Pressable
										key={`page-${name}`}
										onPress={() => setPageColor(name)}
										style={[styles.colorSwatch, pageColor === name && styles.colorSwatchActive]}
									>
										<View style={[styles.colorDot, { backgroundColor: COLOR_SWATCH_BY_NAME[name] }]} />
									</Pressable>
								))}
							</View>
						</View>

						<View style={styles.formSection}>
							<AppText weight="semibold">Binder presets</AppText>
							<AppText muted>Coming soon.</AppText>
						</View>

						<View style={styles.formActions}>
							<Pressable style={styles.formActionSecondary} onPress={closeCreateMenu}>
								<AppText weight="semibold">Cancel</AppText>
							</Pressable>
							<Pressable
								disabled={isCreatingBinder}
								style={[styles.formActionPrimary, isCreatingBinder && styles.addTileDisabled]}
								onPress={() => {
									void createBinder();
								}}
							>
								<AppText weight="bold" style={styles.formActionPrimaryText}>
									{isCreatingBinder ? 'Creating...' : 'Create binder'}
								</AppText>
							</Pressable>
						</View>
					</Pressable>
				</Pressable>
			</Modal>
		</Screen>
	);
}

const createStyles = (theme: ReturnType<typeof useAppTheme>) =>
	StyleSheet.create({
		headerRow: {
			flexDirection: 'row',
			alignItems: 'center',
			justifyContent: 'space-between',
			marginBottom: theme.spacing.lg,
		},
		headerActionsRow: {
			flexDirection: 'row',
			alignItems: 'center',
			gap: theme.spacing.sm,
		},
		title: {
			fontSize: theme.fontSize.xxxl,
		},
		cancelDeleteButton: {
			height: 36,
			paddingHorizontal: theme.spacing.sm,
			borderRadius: 10,
			alignItems: 'center',
			justifyContent: 'center',
			borderWidth: theme.border.width.default,
			borderColor: theme.colors.borderSubtle,
			backgroundColor: theme.colors.surface,
		},
		deleteButton: {
			width: 36,
			height: 36,
			borderRadius: 10,
			alignItems: 'center',
			justifyContent: 'center',
			borderWidth: theme.border.width.default,
			borderColor: theme.colors.danger,
			backgroundColor: theme.colors.surface,
		},
		grid: {
			flexDirection: 'row',
			flexWrap: 'wrap',
			justifyContent: 'space-between',
			rowGap: theme.spacing.md,
		},
		tile: {
			width: '48.2%',
		},
		deleteModeTile: {
			borderRadius: theme.radius.md,
			borderWidth: theme.border.width.default,
			borderColor: theme.colors.borderSubtle,
		},
		deleteModeTileSelected: {
			borderColor: theme.colors.danger,
			borderWidth: theme.border.width.strong,
		},
		addTile: {
			minHeight: 132,
			borderRadius: theme.radius.md,
			borderWidth: theme.border.width.default,
			borderColor: theme.colors.secondary,
			backgroundColor: 'transparent',
			alignItems: 'center',
			justifyContent: 'center',
		},
		addTileDisabled: {
			opacity: 0.6,
		},
		addButton: {
			width: 42,
			height: 42,
			borderRadius: 12,
			backgroundColor: theme.colors.primary,
			alignItems: 'center',
			justifyContent: 'center',
		},
		loadingTileLinePrimary: {
			marginTop: theme.spacing.sm,
		},
		loadingTileLineSecondary: {
			marginTop: theme.spacing.xs,
		},
		modalBackdrop: {
			flex: 1,
			backgroundColor: 'rgba(0,0,0,0.45)',
			justifyContent: 'flex-end',
		},
		modalSheet: {
			backgroundColor: theme.colors.surfaceAlt,
			borderTopLeftRadius: theme.radius.xl,
			borderTopRightRadius: theme.radius.xl,
			paddingHorizontal: theme.spacing.lg,
			paddingTop: theme.spacing.lg,
			paddingBottom: theme.spacing.xl,
			gap: theme.spacing.md,
			maxHeight: '86%',
		},
		modalTitle: {
			fontSize: theme.fontSize.xl,
		},
		formSection: {
			gap: theme.spacing.sm,
		},
		input: {
			height: 44,
			borderWidth: theme.border.width.default,
			borderColor: theme.colors.borderSubtle,
			borderRadius: theme.radius.sm,
			backgroundColor: theme.colors.surface,
			paddingHorizontal: theme.spacing.sm,
			fontSize: theme.fontSize.md,
			color: theme.colors.text,
		},
		presetGrid: {
			flexDirection: 'row',
			flexWrap: 'wrap',
			gap: theme.spacing.sm,
		},
		presetButton: {
			width: '48%',
			paddingVertical: theme.spacing.sm,
			paddingHorizontal: theme.spacing.sm,
			borderWidth: theme.border.width.default,
			borderColor: theme.colors.borderSubtle,
			borderRadius: theme.radius.sm,
			backgroundColor: theme.colors.surface,
			gap: theme.spacing.xs,
		},
		presetButtonActive: {
			borderColor: theme.colors.primary,
			borderWidth: theme.border.width.strong,
		},
		presetButtonLabel: {
			fontSize: theme.fontSize.md,
		},
		presetButtonMeta: {
			fontSize: theme.fontSize.sm,
		},
		customHeaderRow: {
			flexDirection: 'row',
			justifyContent: 'space-between',
			alignItems: 'center',
		},
		customModeButton: {
			paddingHorizontal: theme.spacing.sm,
			paddingVertical: theme.spacing.xs,
			borderRadius: theme.radius.sm,
			borderWidth: theme.border.width.default,
			borderColor: theme.colors.borderSubtle,
			backgroundColor: theme.colors.surface,
		},
		customModeButtonActive: {
			borderColor: theme.colors.primary,
		},
		customModeButtonLabel: {
			fontSize: theme.fontSize.sm,
		},
		customInputsRow: {
			flexDirection: 'row',
			gap: theme.spacing.sm,
		},
		customInputField: {
			flex: 1,
			gap: theme.spacing.xs,
		},
		customInputLabel: {
			fontSize: theme.fontSize.sm,
		},
		compactInput: {
			flex: 0,
		},
		colorRow: {
			flexDirection: 'row',
			gap: theme.spacing.sm,
		},
		colorSwatch: {
			width: 40,
			height: 40,
			borderRadius: 20,
			alignItems: 'center',
			justifyContent: 'center',
			borderWidth: theme.border.width.default,
			borderColor: theme.colors.borderSubtle,
			backgroundColor: theme.colors.surface,
		},
		colorSwatchActive: {
			borderColor: theme.colors.primary,
			borderWidth: theme.border.width.strong,
		},
		colorDot: {
			width: 22,
			height: 22,
			borderRadius: 11,
		},
		formActions: {
			flexDirection: 'row',
			gap: theme.spacing.sm,
			marginTop: theme.spacing.xs,
		},
		formActionSecondary: {
			flex: 1,
			height: 44,
			borderRadius: theme.radius.md,
			borderWidth: theme.border.width.default,
			borderColor: theme.colors.borderSubtle,
			backgroundColor: theme.colors.surface,
			alignItems: 'center',
			justifyContent: 'center',
		},
		formActionPrimary: {
			flex: 1,
			height: 44,
			borderRadius: theme.radius.md,
			backgroundColor: theme.colors.primary,
			alignItems: 'center',
			justifyContent: 'center',
		},
		formActionPrimaryText: {
			color: theme.colors.background,
		},
		deleteActionBar: {
			marginTop: theme.spacing.lg,
			padding: theme.spacing.sm,
			borderWidth: theme.border.width.default,
			borderColor: theme.colors.borderSubtle,
			borderRadius: theme.radius.md,
			backgroundColor: theme.colors.surfaceAlt,
			flexDirection: 'row',
			alignItems: 'center',
			justifyContent: 'space-between',
			gap: theme.spacing.sm,
		},
		deleteSelectionText: {
			fontSize: theme.fontSize.md,
		},
		deleteSelectedButton: {
			height: 40,
			paddingHorizontal: theme.spacing.md,
			borderRadius: theme.radius.sm,
			backgroundColor: theme.colors.danger,
			flexDirection: 'row',
			alignItems: 'center',
			justifyContent: 'center',
			gap: theme.spacing.xs,
		},
		deleteSelectedButtonText: {
			color: theme.colors.background,
		},
	});