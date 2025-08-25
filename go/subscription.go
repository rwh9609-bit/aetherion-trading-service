// subscription.go
package main

import (
	"context"
	"encoding/json"
	"io"
	"log"
	"net/http"
	"os"

	pb "aetherion/gen"

	"github.com/stripe/stripe-go/v72"
	"github.com/stripe/stripe-go/v72/checkout/session"
	"github.com/stripe/stripe-go/v72/webhook"
)

type subscriptionServer struct {
	pb.UnimplementedSubscriptionServiceServer
}

func newSubscriptionServer() *subscriptionServer {
	// Initialize Stripe API key
	stripe.Key = os.Getenv("STRIPE_API_KEY")
	return &subscriptionServer{}
}

func (s *subscriptionServer) GetProducts(ctx context.Context, req *pb.Empty) (*pb.GetProductsResponse, error) {
	// This is a placeholder. In a real application, you would fetch the products from the database.
	products := []*pb.Product{
		{
			Id:                   "prod_1",
			Name:                 "Pro",
			Description:          "Pro subscription with advanced features",
			PriceMonthly:         50.00,
			StripePriceIdMonthly: os.Getenv("STRIPE_PRICE_ID_MONTHLY"),
			PriceYearly:          500.00,
			StripePriceIdYearly:  os.Getenv("STRIPE_PRICE_ID_YEARLY"),
			Features:             []string{"Multiple bots", "Access to more advanced strategies", "Real-time data feeds"},
		},
	}
	return &pb.GetProductsResponse{Products: products}, nil
}

func (s *subscriptionServer) CreateCheckoutSession(ctx context.Context, req *pb.CreateCheckoutSessionRequest) (*pb.CreateCheckoutSessionResponse, error) {
	params := &stripe.CheckoutSessionParams{
		PaymentMethodTypes: stripe.StringSlice([]string{
			"card",
		}),
		LineItems: []*stripe.CheckoutSessionLineItemParams{
			{
				Price:    stripe.String(req.PriceId),
				Quantity: stripe.Int64(1),
			},
		},
		Mode:       stripe.String(string(stripe.CheckoutSessionModeSubscription)),
		SuccessURL: stripe.String("http://localhost:3000/success?session_id={CHECKOUT_SESSION_ID}"),
		CancelURL:  stripe.String("http://localhost:3000/cancel"),
	}

	sess, err := session.New(params)
	if err != nil {
		return nil, err
	}

	return &pb.CreateCheckoutSessionResponse{SessionId: sess.ID}, nil
}

func (s *subscriptionServer) GetUserSubscription(ctx context.Context, req *pb.Empty) (*pb.Subscription, error) {
	// Placeholder implementation
	return &pb.Subscription{Status: "active"}, nil
}

func (s *subscriptionServer) CancelUserSubscription(ctx context.Context, req *pb.Empty) (*pb.StatusResponse, error) {
	// Placeholder implementation
	return &pb.StatusResponse{Success: true, Message: "Subscription canceled"}, nil
}

func handleStripeWebhook(w http.ResponseWriter, r *http.Request) {
	const MaxBodyBytes = int64(65536)
	r.Body = http.MaxBytesReader(w, r.Body, MaxBodyBytes)
	payload, err := io.ReadAll(r.Body)
	if err != nil {
		log.Printf("Error reading webhook body: %v", err)
		http.Error(w, "Request body read error", http.StatusBadRequest)
		return
	}

	event, err := webhook.ConstructEvent(payload, r.Header.Get("Stripe-Signature"), os.Getenv("STRIPE_WEBHOOK_SECRET"))
	if err != nil {
		log.Printf("Error verifying webhook signature: %v", err)
		http.Error(w, "Signature verification failed", http.StatusBadRequest)
		return
	}

	switch event.Type {
	case "checkout.session.completed":
		var checkoutSession stripe.CheckoutSession
		err := json.Unmarshal(event.Data.Raw, &checkoutSession)
		if err != nil {
			log.Printf("Error unmarshalling checkout session: %v", err)
			http.Error(w, "Bad payload", http.StatusBadRequest)
			return
		}
		// Fulfill the purchase...
	case "customer.subscription.updated":
		var subscription stripe.Subscription
		err := json.Unmarshal(event.Data.Raw, &subscription)
		if err != nil {
			log.Printf("Error unmarshalling subscription: %v", err)
			http.Error(w, "Bad payload", http.StatusBadRequest)
			return
		}
		// Update subscription status...
	case "customer.subscription.deleted":
		var subscription stripe.Subscription
		err := json.Unmarshal(event.Data.Raw, &subscription)
		if err != nil {
			log.Printf("Error unmarshalling subscription: %v", err)
			http.Error(w, "Bad payload", http.StatusBadRequest)
			return
		}
		// Cancel subscription...
	default:
		log.Printf("Unhandled event type: %s", event.Type)
	}

	w.WriteHeader(http.StatusOK)
}
