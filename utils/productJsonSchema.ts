export function buildProductJsonSchema(gameKey: string, supplierKey: string) {
  return {
    type: 'object',
    required: ['scope', 'products'],
    properties: {
      scope: {
        type: 'object',
        required: ['gameKey', 'supplierKey'],
        properties: {
          gameKey: { type: 'string', const: gameKey },
          supplierKey: { type: 'string', const: supplierKey },
        },
        additionalProperties: false,
      },
      mode: { type: 'string', enum: ['merge', 'replace'] },
      products: {
        type: 'array',
        items: {
          type: 'object',
          required: ['name', 'amount', 'cost', 'selling'],
          properties: {
            id: { type: 'string', format: 'uuid' },
            gameKey: { type: 'string', const: gameKey },
            supplierKey: { type: 'string', const: supplierKey },
            name: { type: 'string', minLength: 1, maxLength: 200 },
            amount: {
              oneOf: [{ type: 'string' }, { type: 'number' }],
              description: 'Either a numeric denomination like "86" or a named pass like "weekly"',
            },
            combination: { type: 'string' },
            isBaseAmount: { type: 'boolean' },
            cost: { type: ['string', 'number'] },
            selling: { type: ['string', 'number'] },
            status: { type: 'string', enum: ['active', 'disabled'] },
            sortOrder: { type: 'integer' },
            metadata: {
              type: 'object',
              properties: {
                splitOverride: {
                  type: 'object',
                  additionalProperties: { type: 'string' },
                },
                bonusOnly: { type: 'boolean' },
                promo: { type: 'boolean' },
                notes: { type: 'string' },
                supplierServiceId: {
                  type: 'string',
                  description: 'Service/PID code the supplier API expects (e.g. quinngamingshop service_id)',
                },
              },
              additionalProperties: true,
            },
          },
          additionalProperties: false,
        },
      },
      deleteIds: {
        type: 'array',
        items: { type: 'string', format: 'uuid' },
      },
    },
    additionalProperties: false,
  }
}
