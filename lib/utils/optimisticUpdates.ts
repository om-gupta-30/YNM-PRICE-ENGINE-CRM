/**
 * Optimistic Update Utilities
 * 
 * Provides utilities for instant UI updates regardless of backend speed.
 * The UI updates immediately, backend syncs in background.
 */

/**
 * Optimistic update pattern for create operations
 * Adds item to list immediately, syncs with backend in background
 */
export function optimisticCreate<T extends { id: number }>(
  setItems: React.Dispatch<React.SetStateAction<T[]>>,
  newItem: T,
  onSuccess?: () => void,
  onError?: (error: Error) => void
) {
  // Add to list immediately
  setItems(prev => [newItem, ...prev]);
  
  // Call success callback immediately
  if (onSuccess) {
    onSuccess();
  }
  
  // Return a promise that handles backend sync
  return {
    sync: async (apiCall: () => Promise<T>) => {
      try {
        const savedItem = await apiCall();
        // Replace temporary item with real one from backend
        setItems(prev => prev.map(item => 
          item.id === newItem.id ? savedItem : item
        ));
        return savedItem;
      } catch (error) {
        // Remove optimistic item on error
        setItems(prev => prev.filter(item => item.id !== newItem.id));
        if (onError) {
          onError(error as Error);
        }
        throw error;
      }
    }
  };
}

/**
 * Optimistic update pattern for update operations
 * Updates item in list immediately, syncs with backend in background
 */
export function optimisticUpdate<T extends { id: number }>(
  setItems: React.Dispatch<React.SetStateAction<T[]>>,
  itemId: number,
  updates: Partial<T>,
  onSuccess?: () => void,
  onError?: (error: Error) => void
) {
  // Store original for potential revert
  let originalItem: T | null = null;
  
  // Update in list immediately
  setItems(prev => {
    const item = prev.find(i => i.id === itemId);
    if (item) {
      originalItem = { ...item };
      return prev.map(i => i.id === itemId ? { ...i, ...updates } : i);
    }
    return prev;
  });
  
  // Call success callback immediately
  if (onSuccess) {
    onSuccess();
  }
  
  // Return a promise that handles backend sync
  return {
    sync: async (apiCall: () => Promise<T>) => {
      try {
        const updatedItem = await apiCall();
        // Replace with real data from backend
        setItems(prev => prev.map(item => 
          item.id === itemId ? updatedItem : item
        ));
        return updatedItem;
      } catch (error) {
        // Revert optimistic update on error
        if (originalItem) {
          setItems(prev => prev.map(item => 
            item.id === itemId ? originalItem! : item
          ));
        }
        if (onError) {
          onError(error as Error);
        }
        throw error;
      }
    }
  };
}

/**
 * Optimistic update pattern for delete operations
 * Removes item from list immediately, syncs with backend in background
 */
export function optimisticDelete<T extends { id: number }>(
  setItems: React.Dispatch<React.SetStateAction<T[]>>,
  itemId: number,
  onSuccess?: () => void,
  onError?: (error: Error) => void
) {
  // Store item for potential revert
  let deletedItem: T | null = null;
  
  // Remove from list immediately
  setItems(prev => {
    const item = prev.find(i => i.id === itemId);
    if (item) {
      deletedItem = item;
    }
    return prev.filter(i => i.id !== itemId);
  });
  
  // Call success callback immediately
  if (onSuccess) {
    onSuccess();
  }
  
  // Return a promise that handles backend sync
  return {
    sync: async (apiCall: () => Promise<void>) => {
      try {
        await apiCall();
        // Success - item already removed
      } catch (error) {
        // Revert optimistic delete on error
        if (deletedItem) {
          setItems(prev => {
            const restored = [...prev, deletedItem!];
            // Maintain sort order if needed
            return restored;
          });
        }
        if (onError) {
          onError(error as Error);
        }
        throw error;
      }
    }
  };
}

/**
 * Execute async operation with optimistic UI update
 * UI updates immediately, backend syncs in background
 */
export async function withOptimisticUpdate<T>(
  optimisticAction: () => void,
  apiCall: () => Promise<T>,
  onError?: (error: Error) => void
): Promise<T> {
  // Execute optimistic update immediately
  optimisticAction();
  
  try {
    // Sync with backend in background
    const result = await apiCall();
    return result;
  } catch (error) {
    if (onError) {
      onError(error as Error);
    }
    throw error;
  }
}

