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
    ASSERT_GT(buy_id, 0);
    int result = ob_cancel_order(buy_id);
    EXPECT_EQ(result, 1);
    double price = 0;
    int qty = 0;
    int oid = 0;
    ob_get_top_of_book(1, &price, &qty, &oid);
    // After cancelling the order, the top of the book should either be 0
    // Or the initial order
    // This test needs to be improved to handle the case where the cancelled order was the top of the book
    EXPECT_EQ(oid, 1);
    EXPECT_DOUBLE_EQ(price, 100);
    EXPECT_EQ(qty, 5);
}

int main(int argc, char **argv) {
    ::testing::InitGoogleTest(&argc, argv);
    return RUN_ALL_TESTS();
}
