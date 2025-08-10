#include "gtest/gtest.h"
extern "C" {
#include "orderbook_api.h"
}

TEST(OrderBookTest, AddAndQueryOrder) {
    int buy_id = ob_add_order(100.0, 5, 1);
    ASSERT_GT(buy_id, 0);
    double price = 0;
    int qty = 0;
    int oid = 0;
    ob_get_top_of_book(1, &price, &qty, &oid);
    EXPECT_EQ(oid, buy_id);
    EXPECT_DOUBLE_EQ(price, 100.0);
    EXPECT_EQ(qty, 5);
}

TEST(OrderBookTest, CancelOrder) {
    int buy_id = ob_add_order(101.0, 10, 1);
    int result = ob_cancel_order(buy_id);
    EXPECT_EQ(result, 1);
    double price = 0;
    int qty = 0;
    int oid = 0;
    ob_get_top_of_book(1, &price, &qty, &oid);
    EXPECT_EQ(oid, 1);
    EXPECT_DOUBLE_EQ(price, 100);
    EXPECT_EQ(qty, 5);
}

TEST(OrderBookTest, PositionLimit) {
    // Assuming MAX_POSITION is 100, try to add an order that exceeds it
    int buy_id = ob_add_order(100.0, 101, 1);
    
    // Order should be rejected, so buy_id should be 0
    EXPECT_EQ(buy_id, 0);
}

int main(int argc, char **argv) {
    ::testing::InitGoogleTest(&argc, argv);
    return RUN_ALL_TESTS();
}
