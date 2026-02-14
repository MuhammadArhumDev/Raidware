#ifndef RANDOMBYTES_H
#define RANDOMBYTES_H

#include <stddef.h>
#include <stdint.h>

// Standard randombytes API expected by PQClean
#ifdef __cplusplus
extern "C" {
#endif

int randombytes(uint8_t *out, size_t outlen);

#ifdef __cplusplus
}
#endif

#endif
