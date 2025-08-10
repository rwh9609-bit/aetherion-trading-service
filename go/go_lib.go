package main

import "C"
import "fmt"


//export greet_from_go
func greet_from_go() {
	fmt.Println("Hello from Go!")
	go_strategy_demo()
}

func main() {
	// A main function is required for Go to compile this as a shared library,
	// but it won't be called directly.
}
