export const customerLimits = {
  name: 120,
  phone: 20,
  address: 280,
  neighborhood: 120,
  reference: 280,
  notes: 500,
  itemNotes: 280,
} as const;

export type RequiredCustomerField = 'name' | 'phone' | 'address' | 'neighborhood';

const phonePattern = /^[0-9+()\-\s]{8,20}$/;

export function validateCustomerField(
  field: RequiredCustomerField,
  value: string,
  neighborhoodMode: 'list' | 'text',
) {
  const trimmed = value.trim();

  if (field === 'name') {
    if (trimmed.length < 2) return 'Informe seu nome.';
    return null;
  }

  if (field === 'phone') {
    if (trimmed.length === 0) return 'Informe o telefone.';
    if (!phonePattern.test(trimmed)) {
      return 'Use um telefone com 8 a 20 caracteres. Vale número, espaço e + ( ) -.';
    }
    return null;
  }

  if (field === 'address') {
    if (trimmed.length < 2) return 'Informe o endereço.';
    return null;
  }

  if (neighborhoodMode === 'list') {
    if (trimmed.length === 0) return 'Escolha o bairro.';
    return null;
  }

  if (trimmed.length < 2) return 'Informe o bairro.';
  return null;
}

export function validateCustomer(
  values: Record<RequiredCustomerField, string>,
  neighborhoodMode: 'list' | 'text',
) {
  const errors: Partial<Record<RequiredCustomerField, string>> = {};
  for (const field of ['name', 'phone', 'address', 'neighborhood'] as const) {
    const message = validateCustomerField(field, values[field], neighborhoodMode);
    if (message) errors[field] = message;
  }
  return errors;
}
