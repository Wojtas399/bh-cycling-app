import { requiredString } from '@/lib/validation';
import * as v from 'valibot';

const confirmWithPasswordSchema = v.object({
  password: requiredString('validation.passwordRequired'),
});

export type DeleteAccountInput = v.InferInput<typeof confirmWithPasswordSchema>;
export type DeleteAccountValues = v.InferOutput<
  typeof confirmWithPasswordSchema
>;

const confirmWithGoogleSchema: v.GenericSchema<
  DeleteAccountInput,
  DeleteAccountValues
> = v.object({ password: v.string() });

export function deleteAccountSchema(requiresPassword: boolean) {
  return requiresPassword ? confirmWithPasswordSchema : confirmWithGoogleSchema;
}
