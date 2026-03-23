// Import theme
import { useAppTheme } from '@/src/theme/useAppTheme';

import {
  Search,
  House,
  LayoutGrid,
  Layers,
  Blocks,
  User,
  Star,
  ArrowLeft,
  X,
  Filter,
  SlidersHorizontal,
  ArrowDownWideNarrow,
  Library,
  RectangleVertical,
  Languages,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  Undo2,
  Redo2,
  BookOpen,
  Plus,
  Trash2,
  Hammer,
  CloudDownload,
  Check,
  Palette,
  ImagePlus,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from 'lucide-react-native';

export const APP_ICON_NAMES = {
	home: 'home',
  binder: 'bookOpen',
	tcg: 'tcg',
	set: 'set',
	card: 'card',
	back: 'back',
	refresh: 'refresh',
	undo: 'undo',
	redo: 'redo',
	settings: 'settings',
	close: 'close',
	filter: 'filter',
	sort: 'sort',
	library: 'library',
	languages: 'languages',
  bookOpen: 'bookOpen',
} as const;

export const ICONS = {
  search: Search,
  home: House,
  binder: Blocks,
  'book-open': BookOpen,
  bookOpen: BookOpen,
  binders: BookOpen,
  blocks: Blocks,
  tcg: LayoutGrid,
  user: User,
  settings: User,
  card: RectangleVertical,
  rectangleVertical: RectangleVertical,
  set: Layers,
  sets: Layers,
  wishlist: Star,
  back: ArrowLeft,
  arrowLeft: ArrowLeft,
  layoutGrid: LayoutGrid,
  close: X,
  x: X,
  refresh: RefreshCw,
  undo: Undo2,
  redo: Redo2,
  filter: Filter,
  slidersHorizontal: SlidersHorizontal,
  sort: ArrowDownWideNarrow,
  arrowDownWideNarrow: ArrowDownWideNarrow,
  library: Library,
  languages: Languages,
  layers: Layers,
  chevronDown: ChevronDown,
  chevronUp: ChevronUp,
  plus: Plus,
  trash2: Trash2,
  hammer: Hammer,
  cloudDownload: CloudDownload,
  'cloud-download': CloudDownload,
  check: Check,
  palette: Palette,
  imagePlus: ImagePlus,
  chevronLeft: ChevronLeft,
  chevronRight: ChevronRight,
  chevronsLeft: ChevronsLeft,
  chevronsRight: ChevronsRight,
};

export type IconName = keyof typeof ICONS;

type IconProps = {
  iconName: IconName;
  size?: number;
  color?: string;
};

export function Icon({
  iconName: icon,
  size = 24,
  color,
}: IconProps) {

  const theme = useAppTheme();
  const IconComponent = ICONS[icon];

  return (
    <IconComponent
      size={size}
      color={color ?? theme.colors.text}
    />
  );
}