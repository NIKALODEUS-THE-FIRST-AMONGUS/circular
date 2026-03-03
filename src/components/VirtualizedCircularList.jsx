import { memo, useMemo } from 'react';
import { FixedSizeList as List } from 'react-window';
import SelectableCircularCard from './SelectableCircularCard';

/**
 * Virtualized list for rendering large numbers of circulars efficiently
 * Only renders visible items, dramatically improving performance
 * Used by CircularCenter for the main feed
 */
const VirtualizedCircularList = memo(({
    circulars = [],
    profile,
    onDelete,
    onUpdate,
    selectionMode = false,
    selectedCirculars = [],
    onSelect,
    width = '100%',
    height = 600,
    itemSize = 280, // Approximate height of each circular card
    onLoadMore,
    hasMore = true,
    isLoadingMore = false
}) => {
    // Calculate number of items to render
    const itemCount = hasMore ? circulars.length + 1 : circulars.length;

    // Memoize the row renderer
    const Row = useMemo(() => ({ index, style }) => {
        // Show loading indicator at the end if more items available
        if (index === circulars.length) {
            return (
                <div style={style} className="flex items-center justify-center">
                    {isLoadingMore && (
                        <div className="animate-spin h-6 w-6 border-2 border-primary border-t-transparent rounded-full" />
                    )}
                </div>
            );
        }

        const circular = circulars[index];
        if (!circular) return null;

        return (
            <div style={style} className="px-4 py-2">
                <SelectableCircularCard
                    circular={circular}
                    profile={profile}
                    onDelete={onDelete}
                    onUpdate={onUpdate}
                    selectionMode={selectionMode}
                    isSelected={selectedCirculars.includes(circular.id)}
                    onSelect={onSelect}
                />
            </div>
        );
    }, [circulars, profile, onDelete, onUpdate, selectionMode, selectedCirculars, onSelect, isLoadingMore]);

    // Handle scroll to load more
    const handleScroll = ({ scrollOffset, scrollUpdateWasRequested }) => {
        if (!scrollUpdateWasRequested && onLoadMore) {
            // Calculate if we're near the bottom (within 500px)
            const scrollPercentage = (scrollOffset + height) / (itemCount * itemSize);
            if (scrollPercentage > 0.8 && hasMore && !isLoadingMore) {
                onLoadMore();
            }
        }
    };

    return (
        <List
            height={height}
            itemCount={itemCount}
            itemSize={itemSize}
            width={width}
            onScroll={handleScroll}
            className="scrollbar-thin scrollbar-thumb-primary/20 scrollbar-track-transparent"
        >
            {Row}
        </List>
    );
}, (prevProps, nextProps) => {
    // Custom comparison for memo
    return (
        prevProps.circulars.length === nextProps.circulars.length &&
        prevProps.selectionMode === nextProps.selectionMode &&
        prevProps.selectedCirculars.length === nextProps.selectedCirculars.length &&
        prevProps.isLoadingMore === nextProps.isLoadingMore &&
        prevProps.hasMore === nextProps.hasMore
    );
});

VirtualizedCircularList.displayName = 'VirtualizedCircularList';

export default VirtualizedCircularList;
