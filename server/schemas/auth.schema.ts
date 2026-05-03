import { z } from 'zod';

export const callbackBody = z.object({
  code: z.string().min(1).max(2048),
  // redirect_uri Keycloak : doit etre HTTP/HTTPS pour eviter open redirect.
  redirect_uri: z.string().url().refine(
    (u) => u.startsWith('http://') || u.startsWith('https://'),
    'redirect_uri doit etre HTTP/HTTPS',
  ),
});
