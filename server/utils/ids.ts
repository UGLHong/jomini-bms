import { customAlphabet } from 'nanoid'

const ORDER_ID_ALPHABET = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ'

const orderIdGenerator = customAlphabet(ORDER_ID_ALPHABET, 10)
const externalIdGenerator = customAlphabet(ORDER_ID_ALPHABET, 10)

export function newOrderId(): string {
  return orderIdGenerator()
}

export function newExternalId(): string {
  return externalIdGenerator()
}
