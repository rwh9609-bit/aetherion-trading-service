package main

import (
	"encoding/json"
	"io/ioutil"
	"net/http"
	"strconv"
	"strings"
	"testing"
)

func TestGetTopLevelsReturnsCorrectLength(t *testing.T) {
	ob := &OrderBookManager{
		Bids: &OrderBookSide{},
		Asks: &OrderBookSide{},
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
	origHttpGet := HttpGet
	defer func() { HttpGet = origHttpGet }()

	// Mock httpGet
	HttpGet = func(url string) (*http.Response, error) {
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

// getCoinbasePrice fetches the price from Coinbase API and parses the response.
func getCoinbasePrice(pair string) (float64, error) {
	resp, err := HttpGet("https://api.coinbase.com/v2/prices/" + pair + "/spot")
	if err != nil {
		return 0, err
	}
	defer resp.Body.Close()
	body, err := ioutil.ReadAll(resp.Body)
	if err != nil {
		return 0, err
	}
	// Minimal parsing for test purposes
	type coinbaseResp struct {
		Data struct {
			Amount string `json:"amount"`
		} `json:"data"`
	}
	var cr coinbaseResp
	err = json.Unmarshal(body, &cr)
	if err != nil {
		return 0, err
	}
	price, err := strconv.ParseFloat(cr.Data.Amount, 64)
	if err != nil {
		return 0, err
	}
	return price, nil
}
