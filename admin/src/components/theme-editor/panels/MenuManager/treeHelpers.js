export function insertAtPath(tree, path, item) {
  if (!path.length) return [...tree, item];
  const [head, ...rest] = path;
  return tree.map((node, i) => {
    if (i !== head) return node;
    return { ...node, children: insertAtPath(node.children || [], rest, item) };
  });
}

export function updateAtPath(tree, path, patch) {
  if (!path.length) return tree.map((node) => ({ ...node, ...patch }));
  const [head, ...rest] = path;
  return tree.map((node, i) => {
    if (i !== head) return node;
    return { ...node, children: updateAtPath(node.children || [], rest, patch) };
  });
}

export function removeAtPath(tree, path) {
  if (!path.length) return [];
  const [head, ...rest] = path;
  return tree.map((node, i) => {
    if (i !== head) return node;
    if (!rest.length) return null;
    return { ...node, children: removeAtPath(node.children || [], rest) };
  }).filter(Boolean);
}

export function moveItem(tree, fromPath, toPath) {
  if (fromPath.length === 0 || toPath.length === 0) return tree;
  if (fromPath.length !== toPath.length) return tree;
  
  const item = getItemAtPath(tree, fromPath);
  if (!item) return tree;
  
  const newTree = removeAtPath(tree, fromPath);
  return insertAtPath(newTree, toPath, item);
}

export function getItemAtPath(tree, path) {
  let current = tree;
  for (const index of path) {
    if (!current[index]) return null;
    current = current[index].children || [];
  }
  return null;
}

export function reorderItem(tree, path, direction) {
  if (!path.length) return tree;
  const [head, ...rest] = path;
  if (rest.length > 0) {
    return tree.map((node, i) => {
      if (i !== head) return node;
      return { ...node, children: reorderItem(node.children || [], rest, direction) };
    });
  }
  
  const newTree = [...tree];
  const targetIndex = head + direction;
  if (targetIndex < 0 || targetIndex >= newTree.length) return tree;
  
  [newTree[head], newTree[targetIndex]] = [newTree[targetIndex], newTree[head]];
  return newTree;
}
