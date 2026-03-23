import type { HomeRepository } from "@/src/features/home/home.repository";
import { SqliteHomeRepository } from "@/src/features/home/home.repository.sqlite";

import type { BindersRepository } from "@/src/features/binders/binders.repository";
import { SqliteBindersRepository } from "@/src/features/binders/binders.repository.sqlite";

import type { SearchRepository } from "@/src/features/search/search.repository";
import { SqliteSearchRepository } from "@/src/features/search/search.repository.sqlite";

import type { InventoryRepository } from "@/src/features/inventory/inventory.repository";
import { SqliteInventoryRepository } from "@/src/features/inventory/inventory.repository.sqlite";

import type { CatalogRepository } from "@/src/features/catalog/catalog.repository";
import { SqliteCatalogRepository } from "@/src/features/catalog/catalog.repository.sqlite";
import type { WishlistRepository } from "@/src/features/wishlist/wishlist.repository";
import { SqliteWishlistRepository } from "@/src/features/wishlist/wishlist.repository.sqlite";
import type { DownloadsRepository } from '@/src/features/downloads/downloads.repository';
import { SqliteDownloadsRepository } from '@/src/features/downloads/downloads.repository.sqlite';

export const catalogRepository: CatalogRepository = new SqliteCatalogRepository();

export const inventoryRepository: InventoryRepository = new SqliteInventoryRepository();

export const bindersRepository: BindersRepository = new SqliteBindersRepository();

export const wishlistRepository: WishlistRepository = new SqliteWishlistRepository();

export const homeRepository: HomeRepository = new SqliteHomeRepository(
	inventoryRepository,
	catalogRepository,
	bindersRepository
);

export const searchRepository: SearchRepository = new SqliteSearchRepository();

export const downloadsRepository: DownloadsRepository = new SqliteDownloadsRepository(
	catalogRepository
);