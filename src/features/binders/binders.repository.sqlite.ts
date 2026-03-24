import type { BindersRepository } from "./binders.repository";
import type { BindersData } from "./binders.types";
import type { CatalogLanguage, CatalogTcg } from '@/src/domain/catalog/catalog.types';
import { getDatabase } from "@/src/lib/db/client";

type BinderRow = {
    id: string;
    name: string;
    description: string | null;
    current_count: number;
    total_capacity: number;
    cover_image_uri: string | null;
    color: string | null;
    inside_color: string | null;
    page_color: string | null;
};

function createLocalId(prefix: string): string {
    return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

export class SqliteBindersRepository implements BindersRepository {
    async createBinder(input: {
        name: string;
        description?: string | null;
        totalCapacity?: number;
        color?: string | null;
        insideColor?: string | null;
        pageColor?: string | null;
        rows?: number;
        columns?: number;
    }): Promise<{ id: string; name: string; currentCount: number; totalCapacity: number; rows?: number; columns?: number }> {
        const db = await getDatabase();
        const binderId = createLocalId('binder');
        const now = new Date().toISOString();
        const totalCapacity = input.totalCapacity ?? 360;
        const color = input.color ?? null;
        const insideColor = input.insideColor ?? null;
        const pageColor = input.pageColor ?? null;
        const rowsVal = input.rows ?? 3;
        const columnsVal = input.columns ?? 3;
        await db.runAsync(
            `INSERT INTO binders (
                id, name, description, current_count, total_capacity, cover_image_uri, color, inside_color, page_color, rows, columns, created_at, updated_at
            ) VALUES (?, ?, ?, 0, ?, NULL, ?, ?, ?, ?, ?, ?, ?)`,
            [
                binderId,
                input.name,
                input.description ?? null,
                totalCapacity,
                color,
                insideColor,
                pageColor,
                rowsVal,
                columnsVal,
                now,
                now
            ]
        );
        return {
            id: binderId,
            name: input.name,
            currentCount: 0,
            totalCapacity,
            rows: rowsVal,
            columns: columnsVal,
        };
    }
    async getCardsForBinder(binderId: string): Promise<{ slotIndex: number; catalogTcgCardId: string; id: string; tcg: string; language: string | null }[]> {
        const db = await getDatabase();
        const rows = await db.getAllAsync<{
            id: string;
            slot_index: number;
            catalog_tcg_card_id: string;
            tcg: string;
            language: string | null;
        }>(
            `SELECT id, slot_index, catalog_tcg_card_id, tcg, language
             FROM binder_cards
             WHERE binder_id = ?
             ORDER BY slot_index ASC`,
            [binderId]
        );
        return rows.map(row => ({
            id: row.id,
            slotIndex: row.slot_index,
            catalogTcgCardId: row.catalog_tcg_card_id,
            tcg: row.tcg,
            language: row.language,
        }));
    }
    async getBindersData(): Promise<BindersData> {
        const db = await getDatabase();
        const rows = await db.getAllAsync<BinderRow & { rows?: number; columns?: number }>(
            `SELECT id, name, current_count, total_capacity, cover_image_uri, rows, columns
             FROM binders`
        );
        return {
            binders: rows.map(row => ({
                id: row.id,
                title: row.name,
                current: row.current_count,
                total: row.total_capacity,
                coverImageUri: row.cover_image_uri ?? undefined,
                rows: row.rows ?? undefined,
                columns: row.columns ?? undefined,
            }))
        };
    }

    async getBinderById(binderId: string): Promise<import('./binders.types').BinderDetail | null> {
        const db = await getDatabase();
        const row = await db.getFirstAsync<{
            id: string;
            name: string;
            current_count: number;
            total_capacity: number;
            color: string | null;
            cover_image_uri: string | null;
            inside_color: string | null;
            page_color: string | null;
            rows?: number;
            columns?: number;
        }>(
            `SELECT id, name, current_count, total_capacity, color, cover_image_uri, inside_color, page_color, rows, columns
             FROM binders WHERE id = ?`,
            [binderId]
        );
        if (!row) {
            return null;
        }
        return {
            id: row.id,
            name: row.name,
            currentCount: row.current_count,
            totalCapacity: row.total_capacity,
            color: row.color,
            coverImageUri: row.cover_image_uri,
            insideColor: row.inside_color,
            pageColor: row.page_color,
            rows: row.rows ?? undefined,
            columns: row.columns ?? undefined,
        };
    }

    async addCardToFirstFreeSlot(input: {
        binderId: string;
        catalogTcgCardId: string;
        tcg: CatalogTcg;
        language?: CatalogLanguage;
        variantName?: string;
    }): Promise<{ added: boolean; reason?: 'full' | 'missing' }> {
        const db = await getDatabase();
        const binder = await this.getBinderById(input.binderId);

        if (!binder) {
            return { added: false, reason: 'missing' };
        }

        const occupiedSlots = await db.getAllAsync<{ slot_index: number }>(
            `SELECT slot_index
             FROM binder_cards
             WHERE binder_id = ?
             ORDER BY slot_index ASC`,
            [binder.id]
        );

        if (occupiedSlots.length >= binder.totalCapacity) {
            return { added: false, reason: 'full' };
        }

        const taken = new Set(occupiedSlots.map((row) => row.slot_index));
        let targetSlot = 1;
        while (taken.has(targetSlot) && targetSlot <= binder.totalCapacity) {
            targetSlot += 1;
        }

        if (targetSlot > binder.totalCapacity) {
            return { added: false, reason: 'full' };
        }

        const now = new Date().toISOString();

        await db.runAsync(
            `INSERT INTO binder_cards (
                id,
                binder_id,
                catalog_tcg_card_id,
                tcg,
                language,
                variant_name,
                slot_index,
                added_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                createLocalId('binder-card'),
                binder.id,
                input.catalogTcgCardId,
                input.tcg,
                input.language ?? null,
                input.variantName ?? null,
                targetSlot,
                now,
            ]
        );

        await db.runAsync(
            `UPDATE binders
             SET current_count = ?,
                 updated_at = ?
             WHERE id = ?`,
            [occupiedSlots.length + 1, now, binder.id]
        );

        return { added: true };
    }

    async deleteBinders(binderIds: string[]): Promise<void> {
        if (binderIds.length === 0) {
            return;
        }

        const db = await getDatabase();
        const placeholders = binderIds.map(() => '?').join(', ');

        await db.runAsync(
            `DELETE FROM binders
             WHERE id IN (${placeholders})`,
            binderIds
        );
    }

    async updateBinderCover(binderId: string, update: { color?: string | null; coverImageUri?: string | null; insideColor?: string | null }): Promise<void> {
        const db = await getDatabase();
        const now = new Date().toISOString();
        const sets: string[] = [];
        const values: (string | null)[] = [];

        if ('color' in update) {
            sets.push('color = ?');
            values.push(update.color ?? null);
        }
        if ('coverImageUri' in update) {
            sets.push('cover_image_uri = ?');
            values.push(update.coverImageUri ?? null);
        }
        if ('insideColor' in update) {
            sets.push('inside_color = ?');
            values.push(update.insideColor ?? null);
        }

        if (sets.length === 0) return;

        sets.push('updated_at = ?');
        values.push(now);
        values.push(binderId);

        await db.runAsync(
            `UPDATE binders SET ${sets.join(', ')} WHERE id = ?`,
            values
        );
    }
    }
