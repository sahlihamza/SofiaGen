export function createVirtualGrid({ itemCount, itemHeight = 64, itemWidth = 80, containerHeight = 500, overscan = 5 } = {}) {
  const cols = Math.max(1, Math.floor((containerHeight || 500) / itemWidth));
  const rows = Math.ceil(itemCount / cols);
  const totalHeight = rows * itemHeight;

  return {
    cols,
    rows,
    totalHeight,
    getVisibleRange: (scrollTop = 0) => {
      const startRow = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan);
      const endRow = Math.min(rows - 1, Math.ceil((scrollTop + containerHeight) / itemHeight) + overscan);
      return { startRow, endRow, startIndex: startRow * cols, endIndex: Math.min(itemCount - 1, endRow * cols + cols - 1) };
    },
  };
}

export function useVirtualGrid({ itemCount, itemHeight = 64, itemWidth = 80, containerHeight = 500, overscan = 5 } = {}) {
  const [scrollTop, setScrollTop] = React.useState(0);

  const grid = createVirtualGrid({ itemCount, itemHeight, itemWidth, containerHeight, overscan });
  const { startIndex, endIndex } = grid.getVisibleRange(scrollTop);

  return {
    ...grid,
    scrollTop,
    setScrollTop,
    visibleItems: { startIndex, endIndex, count: endIndex - startIndex + 1 },
  };
}
