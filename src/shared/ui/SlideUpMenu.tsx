import { useEffect, useMemo, useRef } from 'react';
import {
  Animated,
  Easing,
  Modal,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';

// Import theme
import { useAppTheme } from '@/src/theme/useAppTheme';

// Import components
import { AppText } from './AppText';

type SlideUpMenuOption = {
  key: string;
  label: string;
  selected?: boolean;
  disabled?: boolean;
  onPress: () => void;
};

type SlideUpMenuSection = {
  title?: string;
  options: SlideUpMenuOption[];
};

type SlideUpMenuProps = {
  visible: boolean;
  title: string;
  onClose: () => void;
  sections: SlideUpMenuSection[];
};

const MENU_ANIMATION_MS = 180;

export function SlideUpMenu({
  visible,
  title,
  onClose,
  sections,
}: SlideUpMenuProps) {
  const theme = useAppTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  const translateY = useRef(new Animated.Value(320)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(translateY, {
          toValue: 0,
          duration: MENU_ANIMATION_MS,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 1,
          duration: MENU_ANIMATION_MS,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
      ]).start();
      return;
    }

    translateY.setValue(320);
    opacity.setValue(0);
  }, [opacity, translateY, visible]);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <Pressable style={styles.backdrop} onPress={onClose} />

        <Animated.View
          style={[
            styles.menu,
            {
              opacity,
              transform: [{ translateY }],
            },
          ]}
        >
          <View style={styles.header}>
            <AppText weight="bold">{title}</AppText>
          </View>

          <View style={styles.content}>
            {sections.map((section) => (
              <View key={section.title ?? 'section'} style={styles.section}>
                {section.title ? (
                  <AppText muted weight="semibold" style={styles.sectionTitle}>
                    {section.title}
                  </AppText>
                ) : null}

                {section.options.map((option) => (
                  <Pressable
                    key={option.key}
                    style={[styles.option, option.disabled && styles.optionDisabled]}
                    onPress={option.disabled ? undefined : option.onPress}
                    disabled={option.disabled}
                  >
                    <AppText weight={option.selected ? 'bold' : undefined}>
                      {option.label}
                    </AppText>
                  </Pressable>
                ))}
              </View>
            ))}
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
    menu: {
      backgroundColor: theme.colors.background,
      borderTopLeftRadius: theme.radius.lg,
      borderTopRightRadius: theme.radius.lg,
      borderTopWidth: theme.border.width.default,
      borderColor: theme.colors.borderSubtle,
      paddingBottom: theme.spacing.xl,
    },
    header: {
      paddingHorizontal: theme.spacing.lg,
      paddingTop: theme.spacing.lg,
      paddingBottom: theme.spacing.md,
      borderBottomWidth: theme.border.width.default,
      borderBottomColor: theme.colors.borderSubtle,
    },
    content: {
      paddingHorizontal: theme.spacing.lg,
      paddingTop: theme.spacing.md,
      gap: theme.spacing.md,
    },
    section: {
      gap: theme.spacing.xs,
    },
    sectionTitle: {
      marginBottom: theme.spacing.xs,
    },
    option: {
      paddingVertical: theme.spacing.sm,
    },
    optionDisabled: {
      opacity: 0.45,
    },
  });
