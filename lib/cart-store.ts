import { create } from "zustand";
import { persist } from "zustand/middleware";

// ─── Cart Item Type ──────────────────────────────────────────
export interface CartItem {
    id: string;              // unique cart item ID (generated)
    serviceId: string;
    serviceName: string;
    price: number;
    imageUrl: string;
    diveSiteCategory?: string;
    date: string;            // ISO date string (YYYY-MM-DD)
    participants: number;
}

// ─── Cart Store Interface ────────────────────────────────────
interface CartStore {
    items: CartItem[];
    isOpen: boolean;         // sidebar visibility

    // Actions
    addItem: (item: Omit<CartItem, "id">) => { success: boolean; message: string };
    removeItem: (id: string) => void;
    updateItem: (id: string, updates: Partial<Pick<CartItem, "date" | "participants">>) => { success: boolean; message: string };
    clearCart: () => void;
    toggleSidebar: () => void;
    openSidebar: () => void;
    closeSidebar: () => void;

    // Derived
    getTotal: () => number;
    getItemCount: () => number;
}

// ─── Helpers ─────────────────────────────────────────────────
function generateId(): string {
    return `cart_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Check for date conflicts:
 * Same serviceId on the same date is not allowed.
 * Different services on the same date ARE allowed.
 */
function hasDateConflict(
    items: CartItem[],
    serviceId: string,
    date: string,
    excludeId?: string
): boolean {
    return items.some(
        (item) =>
            item.serviceId === serviceId &&
            item.date === date &&
            item.id !== excludeId
    );
}

// ─── Store ───────────────────────────────────────────────────
export const useCartStore = create<CartStore>()(
    persist(
        (set, get) => ({
            items: [],
            isOpen: false,

            addItem: (newItem) => {
                const { items } = get();

                // Validate: no same service on same date
                if (hasDateConflict(items, newItem.serviceId, newItem.date)) {
                    return {
                        success: false,
                        message: `"${newItem.serviceName}" is already in your cart for ${newItem.date}. Please choose a different date.`,
                    };
                }

                // Validate: max 10 items
                if (items.length >= 10) {
                    return {
                        success: false,
                        message: "Cart is full. You can add a maximum of 10 activities per trip.",
                    };
                }

                const cartItem: CartItem = {
                    ...newItem,
                    id: generateId(),
                };

                set({ items: [...items, cartItem] });

                return {
                    success: true,
                    message: `"${newItem.serviceName}" added to your trip!`,
                };
            },

            removeItem: (id) => {
                set({ items: get().items.filter((item) => item.id !== id) });
            },

            updateItem: (id, updates) => {
                const { items } = get();
                const item = items.find((i) => i.id === id);
                if (!item) return { success: false, message: "Item not found." };

                // If date is changing, check for conflict
                if (updates.date && updates.date !== item.date) {
                    if (hasDateConflict(items, item.serviceId, updates.date, id)) {
                        return {
                            success: false,
                            message: `"${item.serviceName}" is already scheduled for ${updates.date}.`,
                        };
                    }
                }

                set({
                    items: items.map((i) =>
                        i.id === id ? { ...i, ...updates } : i
                    ),
                });

                return { success: true, message: "Item updated." };
            },

            clearCart: () => set({ items: [] }),

            toggleSidebar: () => set({ isOpen: !get().isOpen }),
            openSidebar: () => set({ isOpen: true }),
            closeSidebar: () => set({ isOpen: false }),

            getTotal: () => {
                return get().items.reduce(
                    (sum, item) => sum + item.price * item.participants,
                    0
                );
            },

            getItemCount: () => get().items.length,
        }),
        {
            name: "sulutdive-cart",
            // Don't persist the sidebar open state
            partialize: (state) => ({ items: state.items }),
        }
    )
);
