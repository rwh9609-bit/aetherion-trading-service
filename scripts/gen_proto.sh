#!/bin/bash
set -x

PROTO_DIR=protos
GO_GEN_DIR=go/gen

ls -l $PROTO_DIR

protoc --go_out=$GO_GEN_DIR --go-grpc_out=$GO_GEN_DIR --proto_path=$PROTO_DIR $PROTO_DIR/trading_api.proto

echo "Protobufs regenerated in $GO_GEN_DIR. Don't forget to commit the updated files!"