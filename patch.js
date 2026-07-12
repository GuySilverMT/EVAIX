const fs = require('fs');
const content = fs.readFileSync('apps/ui/src/components/core/primitives/TheGrid.tsx', 'utf8');
const fixed = content.replace('  // Filter cards by displayId / screenspaceId\n  const activeCards = activeCardsStore.filter(\n    c => (c.displayId ?? c.screenspaceId ?? 0) === displayId\n  ), [cards, displayId]);\n\n  const columnsMap = React.useMemo(() => {\n    const map: Record<number, CardData[]> = {};\n\n\n    for (let colIdx = 0; colIdx < totalColumns; colIdx++) {\n      map[colIdx] = [];\n    }', `  // Filter cards by displayId / screenspaceId
  const activeCards = React.useMemo(() => activeCardsStore.filter(
    c => (c.displayId ?? c.screenspaceId ?? 0) === displayId
  ), [activeCardsStore, displayId]);

  const columnsMap = React.useMemo(() => {
    const map: Record<number, CardData[]> = {};

    for (let colIdx = 0; colIdx < totalColumns; colIdx++) {
      map[colIdx] = [];
    }

    activeCards.forEach(c => {
      const col = c.columnId ?? c.column ?? 0;
      if (map[col]) {
        map[col].push(c);
      } else {
        map[col] = [c];
      }
    });

    return map;
  }, [activeCards, totalColumns]);`);

fs.writeFileSync('apps/ui/src/components/core/primitives/TheGrid.tsx', fixed);
