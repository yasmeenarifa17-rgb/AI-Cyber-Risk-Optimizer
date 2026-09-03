export const optimizeBudget = (budget, controls) => {
  const selected = []
  const safeBudget = Math.max(0, Number.isFinite(budget) ? budget : 0)
  let remaining = safeBudget
  ;[...controls].sort((a, b) => (b.reduction / b.cost) - (a.reduction / a.cost)).forEach((control) => {
    if (control.cost <= remaining) { selected.push(control); remaining -= control.cost }
  })
  return { selected, allocated: safeBudget - remaining, remaining, reduction: selected.reduce((sum, item) => sum + item.reduction, 0) }
}
