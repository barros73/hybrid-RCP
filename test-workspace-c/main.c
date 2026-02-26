#include <stdio.h>
#include <stdlib.h>
#include "utils.h"

int main() {
    int* ptr = (int*)malloc(sizeof(int));
    *ptr = 10;

    printf("Result: %d\n", add(*ptr, 5));

    // Missing free(ptr) -> Conflict
    return 0;
}
