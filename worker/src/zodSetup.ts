import { z } from 'zod';

// Cloudflare Workers nie pozwalają na `new Function` - Zod nie próbuje kompilacji JIT.
// Moduł musi być importowany jako PIERWSZY (przed definicjami schematów).
z.config({ jitless: true });
