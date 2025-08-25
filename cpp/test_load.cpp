#include <stdio.h>
#include <dlfcn.h>

int main() {
    void *handle = dlopen("../bin/libcpp.dylib", RTLD_LAZY);
    if (!handle) {
        fprintf(stderr, "dlopen failed: %s\n", dlerror());
        return 1;
    }
    typedef int (*add_order_fn)(double, int, int);
    add_order_fn ob_add_order = (add_order_fn)dlsym(handle, "ob_add_order");
    if (!ob_add_order) {
        fprintf(stderr, "dlsym failed: %s\n", dlerror());
        return 2;
    }
    int id = ob_add_order(100.0, 1, 1);
    printf("ob_add_order returned id=%d\n", id);
    dlclose(handle);
    return 0;
}
