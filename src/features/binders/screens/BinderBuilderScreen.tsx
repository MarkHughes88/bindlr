import { useEffect, useMemo, useState } from 'react';
import { useCallback } from 'react';
import { Image, Modal, Pressable, StyleSheet, View, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { useAnimatedStyle, useSharedValue } from 'react-native-reanimated';

import { AppText, BackButton, Header, Icon, SkeletonBlock } from '@/src/shared/ui';
import { bindersRepository } from '@/src/lib/repositories';
import { useAppTheme } from '@/src/theme/useAppTheme';
import { lockLandscape, lockPortrait } from '@/src/lib/orientation';

const DEFAULT_BINDER_COLOR = '#111111';

const PRESET_COLORS = [
	'#111111', '#1e3a5f', '#7f1d1d', '#14532d',
	'#1a1a4f', '#3b0764', '#78350f', '#0c4a6e',
	'#dc2626', '#1d4ed8', '#7c3aed', '#0f766e',
	'#16a34a', '#d97706', '#ea580c', '#db2777',
	'#374151', '#6b7280', '#d1d5db', '#ffffff',
];

const MIN_SCALE = 0.8;
const MAX_SCALE = 4;

type Props = {
	binderId?: string;
};

type BinderDetail = {
	id: string;
	name: string;
	currentCount: number;
	totalCapacity: number;
	color: string | null;
	coverImageUri: string | null;
};

function clamp(value: number, min: number, max: number): number {
	'worklet';
	return Math.min(Math.max(value, min), max);
}

export function BinderBuilderScreen({ binderId }: Props) {
	const router = useRouter();
	const theme = useAppTheme();
	const styles = useMemo(() => createStyles(theme), [theme]);
	const { width, height } = useWindowDimensions();

	// Lock orientation to landscape on mount, restore portrait on unmount
	useEffect(() => {
		lockLandscape();
		return () => {
			lockPortrait();
		};
	}, []);

	const [binder, setBinder] = useState<BinderDetail | null>(null);
	const [isLoading, setIsLoading] = useState(true);
	const [colorPickerVisible, setColorPickerVisible] = useState(false);
	const scale = useSharedValue(1);
	const scaleStart = useSharedValue(1);
	const translateX = useSharedValue(0);
	const translateY = useSharedValue(0);
	const translateStartX = useSharedValue(0);
	const translateStartY = useSharedValue(0);
	const binderTransformStyle = useAnimatedStyle(() => ({
		transform: [
			 { translateX: translateX.value },
			 { translateY: translateY.value },
			 { scale: scale.value },
		],
	}));

	// Reset zoom and pan to defaults
	const resetZoomAndPan = () => {
		'worklet';
		scale.value = 1;
		translateX.value = 0;
		translateY.value = 0;
	};
       // Double-tap gesture to reset zoom/pan
       const doubleTapGesture = Gesture.Tap()
	       .numberOfTaps(2)
	       .onEnd((_event, success) => {
		       if (success) {
			       resetZoomAndPan();
		       }
	       });

	useEffect(() => {
		let cancelled = false;

		if (!binderId) {
			setBinder(null);
			setIsLoading(false);
			return;
		}

		setIsLoading(true);
		void bindersRepository.getBinderById(binderId).then((result) => {
			if (cancelled) return;
			setBinder(result);
			setIsLoading(false);
		});

		return () => {
			cancelled = true;
		};
	}, [binderId]);



	const bottomInset = 0;
	const navLift = theme.spacing.md;
	const backplateHeight = 33 + navLift;
	const bottomNavHeight = 58 + theme.spacing.xs + navLift;
	const coverColor = binder?.color ?? DEFAULT_BINDER_COLOR;
	const coverImageUri = binder?.coverImageUri ?? null;
	const availableCanvasHeight = Math.max(0, height - bottomNavHeight - theme.spacing.md);
	const availableCanvasWidth = Math.max(0, width);
	const coverHeight = Math.round(availableCanvasHeight);
	const coverWidth = Math.round(Math.min(availableCanvasWidth, coverHeight * 0.714));

	const pinchGesture = Gesture.Pinch()
		.onBegin(() => {
			scaleStart.value = scale.value;
		})
		.onUpdate((event) => {
			const nextScale = clamp(scaleStart.value * event.scale, MIN_SCALE, MAX_SCALE);
			scale.value = nextScale;

			const maxX = (coverWidth * (nextScale - 1)) / 2;
			const maxY = (coverHeight * (nextScale - 1)) / 2;
			translateX.value = clamp(translateX.value, -maxX, maxX);
			translateY.value = clamp(translateY.value, -maxY, maxY);
		});

	const panGesture = Gesture.Pan()
	       .minDistance(1)
	       .onBegin(() => {
		       translateStartX.value = translateX.value;
		       translateStartY.value = translateY.value;
	       })
	       .onUpdate((event) => {
			   // No extra leeway for binder builder screen
			   const maxX = (coverWidth * (scale.value - 1)) / 2;
			   const maxY = (coverHeight * (scale.value - 1)) / 2;
			   const nextX = translateStartX.value + event.translationX;
			   const nextY = translateStartY.value + event.translationY;
			   translateX.value = clamp(nextX, -maxX, maxX);
			   translateY.value = clamp(nextY, -maxY, maxY);
	       });

	const binderGesture = Gesture.Simultaneous(doubleTapGesture, pinchGesture, panGesture);

	async function handleChooseImage() {
		const result = await ImagePicker.launchImageLibraryAsync({
			mediaTypes: ['images'],
			allowsEditing: true,
			quality: 0.8,
		});
		if (!result.canceled && result.assets[0]?.uri && binderId) {
			const uri = result.assets[0].uri;
			await bindersRepository.updateBinderCover(binderId, { coverImageUri: uri });
			setBinder((prev) => (prev ? { ...prev, coverImageUri: uri } : prev));
		}
	}

	async function handleColorSelect(color: string) {
		setColorPickerVisible(false);
		if (!binderId) return;
		await bindersRepository.updateBinderCover(binderId, { color });
		setBinder((prev) => (prev ? { ...prev, color } : prev));
	}

	       return (
		       <SafeAreaView
			       edges={['top']}
			       style={styles.safeArea}
		       >
			       <View style={styles.builderShell}>
				<View style={styles.backBtnWrap}>
					<BackButton onPress={() => router.back()} />
				</View>

				{/* Binder canvas */}
				<View style={styles.canvasArea}>
					{isLoading ? (
						<SkeletonBlock width={coverWidth} height={coverHeight} borderRadius={theme.radius.md} />
					) : (
							       <GestureDetector gesture={binderGesture}>
								       {/* Entire canvas area is now gesturable */}
								       <View style={styles.canvasArea}>
									       {isLoading ? (
										       <SkeletonBlock width={coverWidth} height={coverHeight} borderRadius={theme.radius.md} />
									       ) : (
										       <Animated.View style={binderTransformStyle}>
											       <View style={[styles.binderCover, { width: coverWidth, height: coverHeight, backgroundColor: coverColor }]}> 
												       {coverImageUri ? (
													       <Image source={{ uri: coverImageUri }} style={StyleSheet.absoluteFill} resizeMode="cover" />
												       ) : null}
												       <View style={styles.coverButtons}>
													       <Pressable style={styles.coverBtn} onPress={() => void handleChooseImage()}>
														       <Icon iconName="imagePlus" size={16} color="#111111" />
														       <AppText weight="semibold" style={styles.coverBtnText}>Choose image</AppText>
													       </Pressable>
													       <Pressable style={styles.coverBtn} onPress={() => setColorPickerVisible(true)}>
														       <Icon iconName="palette" size={16} color="#111111" />
														       <AppText weight="semibold" style={styles.coverBtnText}>Choose colour</AppText>
													       </Pressable>
												       </View>
											       </View>
										       </Animated.View>
									       )}
								       </View>
							       </GestureDetector>
					)}
				</View>

				{/* Bottom nav */}
				<View style={[styles.bottomNavOuterWrap, { paddingBottom: bottomInset + navLift }]}> 
					<View pointerEvents="none" style={[styles.bottomNavBackplate, { height: backplateHeight }]} />
					<View style={styles.bottomNavRow}>
						<View style={[styles.bottomNavSideGroup, styles.bottomNavSideGroupLeft]}>
							<Pressable style={styles.bottomNavButton}>
								<View style={styles.bottomNavIconWrap}>
									<Icon iconName="chevronsLeft" size={24} color={theme.colors.text} />
								</View>
							</Pressable>
							<Pressable style={styles.bottomNavButton}>
								<View style={styles.bottomNavIconWrap}>
									<Icon iconName="chevronLeft" size={24} color={theme.colors.text} />
								</View>
							</Pressable>
						</View>
						<View style={styles.bottomNavCenterGroup}>
							<Pressable style={styles.bottomNavButton}>
								<View style={[styles.bottomNavIconWrap, styles.bottomNavIconWrapActive]}>
									<Icon iconName="plus" size={24} color={theme.colors.primary} />
								</View>
							</Pressable>
							<Pressable style={styles.bottomNavButton}>
								<View style={styles.bottomNavIconWrap}>
									<Icon iconName="search" size={24} color={theme.colors.text} />
								</View>
							</Pressable>
							<Pressable style={styles.bottomNavButton}>
								<View style={styles.bottomNavIconWrap}>
									<Icon iconName="layoutGrid" size={24} color={theme.colors.text} />
								</View>
							</Pressable>
							<Pressable style={styles.bottomNavButton}>
								<View style={styles.bottomNavIconWrap}>
									<Icon iconName="layers" size={24} color={theme.colors.text} />
								</View>
							</Pressable>
							<Pressable style={styles.bottomNavButton}>
								<View style={styles.bottomNavIconWrap}>
									<Icon iconName="palette" size={24} color={theme.colors.text} />
								</View>
							</Pressable>
							<Pressable style={styles.bottomNavButton}>
								<View style={styles.bottomNavIconWrap}>
									<Icon iconName="undo" size={24} color={theme.colors.text} />
								</View>
							</Pressable>
							<Pressable style={styles.bottomNavButton}>
								<View style={styles.bottomNavIconWrap}>
									<Icon iconName="redo" size={24} color={theme.colors.text} />
								</View>
							</Pressable>
							<Pressable style={styles.bottomNavButton}>
								<View style={styles.bottomNavIconWrap}>
									<Icon iconName="trash2" size={24} color={theme.colors.danger} />
								</View>
							</Pressable>
						</View>
						<View style={[styles.bottomNavSideGroup, styles.bottomNavSideGroupRight]}>
							<Pressable style={styles.bottomNavButton}>
								<View style={styles.bottomNavIconWrap}>
									<Icon iconName="chevronRight" size={24} color={theme.colors.text} />
								</View>
							</Pressable>
							<Pressable style={styles.bottomNavButton}>
								<View style={styles.bottomNavIconWrap}>
									<Icon iconName="chevronsRight" size={24} color={theme.colors.text} />
								</View>
							</Pressable>
						</View>
					</View>
				</View>
			</View>

			{/* Color picker modal */}
			<Modal
				visible={colorPickerVisible}
				transparent
				animationType="fade"
				onRequestClose={() => setColorPickerVisible(false)}
			>
				<Pressable style={styles.colorOverlay} onPress={() => setColorPickerVisible(false)}>
					<Pressable onPress={() => {}} style={styles.colorPanel}>
						<AppText weight="semibold" style={styles.colorTitle}>Choose colour</AppText>
						<View style={styles.colorSwatches}>
							{PRESET_COLORS.map((c) => (
								<Pressable
									key={c}
									style={[
										styles.colorSwatch,
										{ backgroundColor: c },
										c === coverColor && styles.colorSwatchActive,
									]}
									onPress={() => void handleColorSelect(c)}
								/>
							))}
						</View>
					</Pressable>
				</Pressable>
			</Modal>
		</SafeAreaView>
	);
}

const createStyles = (theme: ReturnType<typeof useAppTheme>) =>
	StyleSheet.create({
		safeArea: {
			flex: 1,
			backgroundColor: theme.colors.background,

        },
        // Initial loading state for binder cover
        loadingCover: {
            width: 200,
            height: 280,
            borderRadius: theme.radius.md,
            backgroundColor: theme.colors.surfaceAlt,
		},
		// Portrait / rotate
		rotateShell: {
			flex: 1,
		},
		rotateGate: {
			flex: 1,
			alignItems: 'center',
			justifyContent: 'center',
			paddingHorizontal: theme.spacing.lg,
			gap: theme.spacing.md,
		},
		rotateIconWrap: {
			width: 72,
			height: 72,
			borderRadius: 36,
			alignItems: 'center',
			justifyContent: 'center',
			borderWidth: theme.border.width.default,
			borderColor: theme.colors.border,
			backgroundColor: theme.colors.surfaceAlt,
		},
		rotateTitle: {
			fontSize: theme.fontSize.xl,
			textAlign: 'center',
		},
		rotateBody: {
			textAlign: 'center',
			maxWidth: 280,
		},
		// Landscape builder
		builderShell: {
			flex: 1,
		},
		backBtnWrap: {
			position: 'absolute',
			top: theme.spacing.md,
			left: theme.spacing.lg,
			zIndex: 10,
		},
		       canvasArea: {
			       flex: 1,
			       width: '100%',
			       alignItems: 'center',
			       justifyContent: 'center',
		       },
		binderCover: {
			borderRadius: theme.radius.md,
			overflow: 'hidden',
			alignItems: 'center',
			justifyContent: 'center',
		},
		coverButtons: {
			gap: theme.spacing.sm,
			alignItems: 'center',
		},
		coverBtn: {
			flexDirection: 'row',
			alignItems: 'center',
			gap: theme.spacing.sm,
			backgroundColor: theme.colors.primary,
			paddingHorizontal: theme.spacing.lg,
			paddingVertical: theme.spacing.sm,
			borderRadius: theme.radius.xl,
		},
		coverBtnText: {
			fontSize: theme.fontSize.md,
			color: '#111111',
		},
		// Bottom nav (mirrors main nav treatment)
		bottomNavOuterWrap: {
			backgroundColor: 'transparent',
			position: 'absolute',
			left: 0,
			right: 0,
			bottom: 0,
			zIndex: 20,
			paddingHorizontal: 0,
			paddingTop: 0,
			alignItems: 'stretch',
			justifyContent: 'flex-end',
		},
		bottomNavBackplate: {
			position: 'absolute',
			left: 0,
			right: 0,
			bottom: 0,
			backgroundColor: theme.colors.surfaceAlt,
			borderTopWidth: theme.border.width.default,
			borderTopColor: theme.colors.borderSubtle,
		},
		bottomNavRow: {
			width: '100%',
			flexDirection: 'row',
			alignItems: 'center',
			justifyContent: 'space-between',
			gap: theme.spacing.sm,
			backgroundColor: 'transparent',
		},
		bottomNavSideGroup: {
			flexDirection: 'row',
			alignItems: 'center',
			gap: theme.spacing.xs,
		},
		bottomNavSideGroupLeft: {
			marginLeft: theme.spacing.xl,
		},
		bottomNavSideGroupRight: {
			marginRight: theme.spacing.xl,
		},
		bottomNavCenterGroup: {
			flexDirection: 'row',
			alignItems: 'center',
			justifyContent: 'center',
			gap: theme.spacing.xs,
		},
		bottomNavButton: {
			flex: 0,
			alignItems: 'center',
			justifyContent: 'center',
			paddingVertical: theme.spacing.xs,
		},
		bottomNavIconWrap: {
			width: 58,
			height: 58,
			borderRadius: 19,
			alignItems: 'center',
			justifyContent: 'center',
			borderWidth: theme.border.width.default,
			borderColor: theme.colors.borderSubtle,
			backgroundColor: theme.colors.surfaceAlt,
		},
		bottomNavIconWrapActive: {
			borderWidth: theme.border.width.strong,
			borderColor: theme.colors.primary,
			backgroundColor: theme.colors.surface,
		},
		// Color picker modal
		colorOverlay: {
			flex: 1,
			backgroundColor: 'rgba(0,0,0,0.6)',
			alignItems: 'center',
			justifyContent: 'center',
		},
		colorPanel: {
			backgroundColor: theme.colors.surface,
			borderRadius: theme.radius.lg,
			padding: theme.spacing.lg,
			width: 320,
			gap: theme.spacing.md,
		},
		colorTitle: {
			fontSize: theme.fontSize.lg,
			textAlign: 'center',
		},
		colorSwatches: {
			flexDirection: 'row',
			flexWrap: 'wrap',
			gap: theme.spacing.sm,
			justifyContent: 'center',
		},
		colorSwatch: {
			width: 44,
			height: 44,
			borderRadius: theme.radius.sm,
			borderWidth: 2,
			borderColor: 'transparent',
		},
		colorSwatchActive: {
			borderColor: theme.colors.primary,
		},
	});

