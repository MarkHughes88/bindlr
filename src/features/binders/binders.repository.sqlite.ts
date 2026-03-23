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
};

function createLocalId(prefix: string): string {
    return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

export class SqliteBindersRepository implements BindersRepository {
    async getBindersData(): Promise<BindersData> {
        const db = await getDatabase();
        const rows = await db.getAllAsync<BinderRow>(
            `SELECT id, name, description, current_count, total_capacity, cover_image_uri
             FROM binders
             ORDER BY updated_at DESC`
        );

        return {
            binders: rows.map((row) => ({
                id: row.id,
                title: row.name,
                current: row.current_count,
                total: row.total_capacity,
                coverImageUri: row.cover_image_uri ?? undefined,
            })),
        };
    }

    async createBinder(input: {
        name: string;
        description?: string | null;
        totalCapacity?: number;
    }): Promise<{ id: string; name: string; currentCount: number; totalCapacity: number }> {
        const db = await getDatabase();
        const now = new Date().toISOString();
        const binderId = createLocalId('binder');
        const totalCapacity = input.totalCapacity ?? 360;

        await db.runAsync(
            `INSERT INTO binders (
                id,
                user_id,
                name,
                description,
                current_count,
                total_capacity,
                cover_image_uri,
                created_at,
                updated_at
            ) VALUES (?, 'local', ?, ?, 0, ?, NULL, ?, ?)`,
            [binderId, input.name, input.description ?? null, totalCapacity, now, now]
        );

        return {
            id: binderId,
            name: input.name,
            currentCount: 0,
            totalCapacity,
        };
    }

    async getBinderById(binderId: string): Promise<{ id: string; name: string; currentCount: number; totalCapacity: number; color: string | null; coverImageUri: string | null } | null> {
        const db = await getDatabase();
        const row = await db.getFirstAsync<{
            id: string;
            name: string;
            current_count: number;
            total_capacity: number;
            color: string | null;
            cover_image_uri: string | null;
        }>(
            `SELECT id, name, current_count, total_capacity, color, cover_image_uri
             FROM binders
             WHERE id = ?
             LIMIT 1`,
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

    async updateBinderCover(binderId: string, update: { color?: string | null; coverImageUri?: string | null }): Promise<void> {
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