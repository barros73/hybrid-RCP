package main

import (
	"fmt"
	"sync"
)

type Data struct {
	Value int
}

func main() {
	d := Data{Value: 10}

	var wg sync.WaitGroup
	wg.Add(1)

	// Conflict: Goroutine usage
	go func() {
		defer wg.Done()
		fmt.Println(d.Value)
	}()

	wg.Wait()
}
