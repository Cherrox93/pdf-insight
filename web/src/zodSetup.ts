import { z } from 'zod';

// Zod 4 sprawdza możliwość kompilacji walidatorów przez `new Function` (JIT) już przy definiowaniu
// schematów. Nasze CSP słusznie blokuje eval, a Firefox zgłasza wtedy błąd w konsoli - tryb
// jitless pomija tę próbę. Moduł musi być importowany jako PIERWSZY (przed definicjami schematów).
z.config({ jitless: true });
