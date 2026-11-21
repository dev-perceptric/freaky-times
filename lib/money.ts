/** "$34.00". Kept out of lib/products so browser code can use it without loading the catalog. */
export function formatPrice(n: number) {
  return '$' + n.toFixed(2);
}
