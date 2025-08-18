package main

import (
	"io/ioutil"
	"net/http"
	"strings"
	"testing"
)

func TestGetTopLevelsReturnsCorrectLength(t *testing.T) {
	ob := &OrderBookManager{
		bids: &OrderBookSide{},
		asks: &OrderBookSide{},
	}
	ob.AddBid(100.0, 1.0)
	ob.AddAsk(101.0, 2.0)
	bids, asks := ob.GetTopLevels(1)
	if len(bids) != 1 {
		t.Errorf("expected 1 bid, got %d", len(bids))
	}
	if len(asks) != 1 {
		t.Errorf("expected 1 ask, got %d", len(asks))
	}
}

func TestGetCoinbasePriceMocked(t *testing.T) {
	// Save original httpGet
	origHttpGet := httpGet
	defer func() { httpGet = origHttpGet }()

	// Mock httpGet
	httpGet = func(url string) (*http.Response, error) {
		resp := &http.Response{
			StatusCode: 200,
			Body:       ioutil.NopCloser(strings.NewReader(`{"data":{"amount":"123.45"}}`)),
		}
		return resp, nil
	}

	price, err := getCoinbasePrice("BTC-USD")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if price != 123.45 {
		t.Errorf("expected price 123.45, got %f", price)
	}
}
