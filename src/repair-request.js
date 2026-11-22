import { deviceCategories, repairProblems } from './customer-copy.js'

export function repairSelection(params) {
  const category = params.get('device')
  const problem = params.get('problem')
  return {
    category: deviceCategories.some(({ id }) => id === category) ? category : '',
    problem: repairProblems.some(([id]) => id === problem) ? problem : '',
  }
}

export function validRepairPhone(value) {
  return /^\+?[0-9\s().-]+$/.test(value) && /^\d{7,15}$/.test(value.replace(/\D/g, ''))
}

export function repairSummary(data) {
  return [
    ['Device category', deviceCategories.find(({ id }) => id === data.category)?.label],
    ['Brand', data.brand],
    ['Model', data.model],
    ['Problem', repairProblems.find(([id]) => id === data.problem)?.[1]],
    ['Additional details', data.details],
    ['Name', data.name],
    ['Phone number', data.phone],
    ['Preferred contact', data.contact],
  ].filter(([, value]) => value?.trim()).map(([label, value]) => [label, value.trim()])
}

export function repairMessage(summary) {
  return ['Hi Bishop Technologies, I’d like to ask about a repair.', '', ...summary.map(([label, value]) => label + ': ' + value)].join('\n')
}
