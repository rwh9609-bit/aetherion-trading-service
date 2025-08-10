#include "gtest/gtest.h"
extern "C" {
#include "orderbook_api.h"
// It's best to add ob_clear to orderbook_api.h, but for now we can declare it here.
void ob_clear();
}

// Test fixture for OrderBook tests to ensure a clean state for each test.
class OrderBookTest : public ::testing::Test {
protected:
    void SetUp() override {
        ob_clear();
    }
};

TEST_F(OrderBookTest, AddAndQueryOrder) {
    int buy_id = ob_add_order(100.0, 5, 1); // Should be id 1
    ASSERT_GT(buy_id, 0);
    double price = 0;
    int qty = 0;
    int oid = 0;
    ob_get_top_of_book(1, &price, &qty, &oid);
    EXPECT_EQ(oid, buy_id);
    EXPECT_DOUBLE_EQ(price, 100.0);
    EXPECT_EQ(qty, 5);
}

TEST_F(OrderBookTest, CancelOrder) {
    int buy_id_1 = ob_add_order(100.0, 5, 1);   // This will be order id 1
    int buy_id_2 = ob_add_order(101.0, 10, 1);  // This will be order id 2
    ASSERT_GT(buy_id_2, buy_id_1);

    int result = ob_cancel_order(buy_id_2);
    EXPECT_EQ(result, 1);

    double price = 0;
    int qty = 0;
    int oid = 0;
    ob_get_top_of_book(1, &price, &qty, &oid); // Top should now be the first order
    EXPECT_EQ(oid, buy_id_1);
    EXPECT_DOUBLE_EQ(price, 100.0);
    EXPECT_EQ(qty, 5);
}

TEST_F(OrderBookTest, PositionLimit) {
    // Assuming MAX_POSITION is 100, try to add an order that exceeds it
    int buy_id = ob_add_order(100.0, 101, 1); // Risk check happens after matching
    
    // Order should be rejected, so buy_id should be 0
    EXPECT_EQ(buy_id, 0);
}

int main(int argc, char **argv) {
    ::testing::InitGoogleTest(&argc, argv);
    return RUN_ALL_TESTS();
}

// --- New tests for matching logic ---

TEST_F(OrderBookTest, MatchFullTaker) {
    // Existing sell order
    int sell_id = ob_add_order(100.0, 10, 0);
    ASSERT_GT(sell_id, 0);

    // Incoming buy order that is smaller and should be fully filled (no new order added)
    int buy_id = ob_add_order(100.0, 5, 1);
    ASSERT_GT(buy_id, 0);

    // The buy order should have been matched and not added to the book.
    // The original sell order should be partially filled.
    double price = 0;
    int qty = 0;
    int oid = 0;
    ob_get_top_of_book(0, &price, &qty, &oid); // Check the ask side
    EXPECT_EQ(oid, sell_id);
    EXPECT_DOUBLE_EQ(price, 100.0);
    EXPECT_EQ(qty, 5); // 10 - 5 = 5

    // The bid side should be empty
    ob_get_top_of_book(1, &price, &qty, &oid);
    EXPECT_EQ(oid, 0);
}

TEST_F(OrderBookTest, MatchFullMaker) {
    // Existing sell order
    int sell_id = ob_add_order(100.0, 10, 0);
    ASSERT_GT(sell_id, 0);

    // Incoming buy order that is larger, fills the sell order,
    // and is added to the book with remaining quantity.
    int buy_id = ob_add_order(100.0, 15, 1);
    ASSERT_GT(buy_id, 0);

    // The sell side should now be empty
    double price = 0;
    int qty = 0;
    int oid = 0;
    ob_get_top_of_book(0, &price, &qty, &oid);
    EXPECT_EQ(oid, 0);

    // The bid side should have the new buy order with remaining quantity
    ob_get_top_of_book(1, &price, &qty, &oid);
    EXPECT_EQ(oid, buy_id);
    EXPECT_DOUBLE_EQ(price, 100.0);
    EXPECT_EQ(qty, 5); // 15 - 10 = 5
}

TEST_F(OrderBookTest, SellOrderMatchesBuyOrder) {
    // Existing buy order
    int buy_id = ob_add_order(100.0, 10, 1);
    ASSERT_GT(buy_id, 0);

    // Incoming sell order that should match
    int sell_id = ob_add_order(100.0, 5, 0);
    ASSERT_GT(sell_id, 0);

    // The original buy order should be partially filled.
    double price = 0;
    int qty = 0;
    int oid = 0;
    ob_get_top_of_book(1, &price, &qty, &oid); // Check the bid side
    EXPECT_EQ(oid, buy_id);
    EXPECT_DOUBLE_EQ(price, 100.0);
    EXPECT_EQ(qty, 5); // 10 - 5 = 5
}
