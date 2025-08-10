#include <iostream>
#include "go_lib.h"
#include <string>

// A C++ internal function. Its name can be mangled.
void greet_from_cpp() {
    std::cout << "Hello from C++!" << std::endl;
}

// Block for all functions that need C-style linkage.
extern "C" {
    // Declare the external function from Rust.
    void greet_from_rust();

    // Define the master function that will be called from Python.
    // Its name will not be mangled.
    void master_greet() {
        std::cout << "\n";
            // Using a C++ raw string literal (R"(...)") to store the multi-line art.
    // This makes it easy to write and read without escaping characters.
    std::string cat_art = R"(
      /\_/\
     ( o.o )  ♡
      > ^ <
     /  -  \
    / | | | \
   /  | | |  \
   |  | | |  |
   \_|_|_|_/_/
      )"
      "\n" // Adding a newline for better spacing
    ;

    // Print the sweet art to the console.
    std::cout << cat_art;
        std::cout << "Starting multi-language greeting..." << std::endl;
        greet_from_cpp();
        greet_from_go();
        greet_from_rust();
        std::cout << "All languages have greeted successfully!" << std::endl;
    }
}
