FROM golang:1.24-alpine AS builder
WORKDIR /app
COPY Backend/ .
RUN go build -o server .

FROM node:20-alpine AS widget-builder
WORKDIR /widget
RUN npm install -g javascript-obfuscator
COPY Widgets/ .
RUN javascript-obfuscator widget.js --output widget.js \
    --compact true \
    --control-flow-flattening true \
    --control-flow-flattening-threshold 0.75 \
    --dead-code-injection true \
    --dead-code-injection-threshold 0.4 \
    --identifier-names-generator hexadecimal \
    --rename-globals false \
    --self-defending true \
    --string-array true \
    --string-array-encoding rc4 \
    --string-array-threshold 0.85 \
    --transform-object-keys true \
    --unicode-escape-sequence false

FROM alpine:latest
WORKDIR /app
COPY --from=builder /app/server .
COPY --from=widget-builder /widget/ ./Widgets/
COPY Backend/migrations/ ./migrations/
EXPOSE 8080
CMD ["./server"]
