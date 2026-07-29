// lib/db owns the Prisma client and persistence adapters. This is the
// only library boundary that imports Prisma. Schema v1 and the client
// wiring (lib/db/client.ts) are a later work unit; prisma/schema.prisma
// currently declares only the datasource and generator. See
// context/architecture.md.

export {};
